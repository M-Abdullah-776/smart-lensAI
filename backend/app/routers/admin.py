from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update, delete
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import json

from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole
from app.models.analysis import AnalysisResult, ToolType
from app.models.admin import SystemSetting, Announcement, AuditLog, ErrorLog
from app.schemas.admin import (
    UserAdminOut,
    SystemSettingUpdate,
    AnnouncementCreate,
    AnnouncementOut,
    StatsResponse
)
from app.utils.dependencies import require_admin
from app.utils.responses import SmartLensException

router = APIRouter(dependencies=[Depends(require_admin)])

@router.get("/users", response_model=List[UserAdminOut])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).order_by(desc(User.created_at)).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    
    out = []
    for u in users:
        # Count total analyses for this user
        count_res = await db.execute(
            select(func.count()).select_from(AnalysisResult).where(AnalysisResult.user_id == u.id)
        )
        total_a = count_res.scalar() or 0
        out.append(UserAdminOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value,
            is_active=u.is_active,
            is_verified=u.is_verified,
            created_at=u.created_at,
            last_login=u.last_login,
            daily_requests_used=u.daily_requests_used,
            total_analyses=total_a
        ))
    return out

@router.patch("/users/{user_id}/status")
async def toggle_user_status(
    user_id: int,
    is_active: bool,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if user_id == admin.id:
        raise SmartLensException(status.HTTP_400_BAD_REQUEST, "Administrators cannot deactivate their own account.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise SmartLensException(status.HTTP_404_NOT_FOUND, "User not found.")

    user.is_active = is_active
    db.add(AuditLog(
        user_id=admin.id,
        action="ADMIN_TOGGLE_USER_STATUS",
        detail=f"Admin {admin.email} set user {user.email} active={is_active}"
    ))
    await db.commit()
    return {"message": f"User status updated to {'active' if is_active else 'inactive'}."}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if user_id == admin.id:
        raise SmartLensException(status.HTTP_400_BAD_REQUEST, "Administrators cannot delete their own account.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise SmartLensException(status.HTTP_404_NOT_FOUND, "User not found.")

    deleted_email = user.email
    await db.delete(user)
    db.add(AuditLog(
        user_id=admin.id,
        action="ADMIN_DELETE_USER",
        detail=f"Admin {admin.email} deleted user {deleted_email}"
    ))
    await db.commit()
    return {"message": f"User {deleted_email} has been permanently deleted."}

@router.get("/stats", response_model=StatsResponse)
async def get_system_stats(db: AsyncSession = Depends(get_db)):
    total_u = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    active_u = (await db.execute(select(func.count()).select_from(User).where(User.is_active == True))).scalar() or 0
    total_a = (await db.execute(select(func.count()).select_from(AnalysisResult))).scalar() or 0

    # Group by tool
    tool_counts: Dict[str, int] = {}
    for t in ToolType:
        count = (await db.execute(
            select(func.count()).select_from(AnalysisResult).where(AnalysisResult.tool == t)
        )).scalar() or 0
        tool_counts[t.value] = count

    # Group by day for the last 7 days
    now = datetime.now(timezone.utc)
    daily_usage = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_count = (await db.execute(
            select(func.count()).select_from(AnalysisResult).where(
                AnalysisResult.created_at >= day_start,
                AnalysisResult.created_at < day_end
            )
        )).scalar() or 0
        daily_usage.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": day_count
        })

    return StatsResponse(
        total_users=total_u,
        active_users=active_u,
        total_analyses=total_a,
        analyses_by_tool=tool_counts,
        daily_usage=daily_usage
    )

@router.get("/logs/audit")
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)
    )
    logs = result.scalars().all()
    return logs

@router.get("/logs/errors")
async def get_error_logs(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ErrorLog).order_by(desc(ErrorLog.created_at)).limit(limit)
    )
    logs = result.scalars().all()
    return logs

@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSetting))
    rows = result.scalars().all()
    settings_dict = {r.key: r.value for r in rows}
    
    # Defaults
    max_upload = int(settings_dict.get("max_upload_size_mb", settings.MAX_UPLOAD_SIZE_MB))
    daily_limit = int(settings_dict.get("daily_ai_request_limit", settings.DAILY_AI_REQUEST_LIMIT))
    
    tools_enabled = {
        "document": True,
        "youtube": True,
        "pdf_qa": True,
        "resume": True,
        "url": True
    }
    if "tools_enabled" in settings_dict:
        try:
            tools_enabled.update(json.loads(settings_dict["tools_enabled"]))
        except Exception:
            pass

    return {
        "max_upload_size_mb": max_upload,
        "daily_ai_request_limit": daily_limit,
        "tools_enabled": tools_enabled
    }

@router.patch("/settings")
async def update_settings(
    payload: SystemSettingUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if payload.max_upload_size_mb is not None:
        setting = await db.execute(select(SystemSetting).where(SystemSetting.key == "max_upload_size_mb"))
        row = setting.scalar_one_or_none()
        if row:
            row.value = str(payload.max_upload_size_mb)
        else:
            db.add(SystemSetting(key="max_upload_size_mb", value=str(payload.max_upload_size_mb)))

    if payload.daily_ai_request_limit is not None:
        setting = await db.execute(select(SystemSetting).where(SystemSetting.key == "daily_ai_request_limit"))
        row = setting.scalar_one_or_none()
        if row:
            row.value = str(payload.daily_ai_request_limit)
        else:
            db.add(SystemSetting(key="daily_ai_request_limit", value=str(payload.daily_ai_request_limit)))

    if payload.tools_enabled is not None:
        setting = await db.execute(select(SystemSetting).where(SystemSetting.key == "tools_enabled"))
        row = setting.scalar_one_or_none()
        tools_str = json.dumps(payload.tools_enabled)
        if row:
            row.value = tools_str
        else:
            db.add(SystemSetting(key="tools_enabled", value=tools_str))

    db.add(AuditLog(
        user_id=admin.id,
        action="ADMIN_UPDATE_SETTINGS",
        detail="Updated system settings"
    ))
    await db.commit()
    return {"message": "Settings updated successfully."}

@router.get("/announcements", response_model=List[AnnouncementOut])
async def list_announcements(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Announcement).order_by(desc(Announcement.created_at))
    )
    return result.scalars().all()

@router.post("/announcements", response_model=AnnouncementOut)
async def create_announcement(
    payload: AnnouncementCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    new_ann = Announcement(message=payload.message.strip(), is_active=True)
    db.add(new_ann)
    db.add(AuditLog(
        user_id=admin.id,
        action="ADMIN_POST_ANNOUNCEMENT",
        detail=f"Posted announcement: {payload.message[:80]}"
    ))
    await db.commit()
    await db.refresh(new_ann)
    return new_ann

@router.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    ann = result.scalar_one_or_none()
    if ann:
        await db.delete(ann)
        await db.commit()
    return {"message": "Announcement removed."}
