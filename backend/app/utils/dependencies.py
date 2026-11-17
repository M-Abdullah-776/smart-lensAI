from fastapi import Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from datetime import datetime, timezone, timedelta
import json

from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole
from app.models.admin import SystemSetting
from app.utils.security import decode_token
from app.utils.responses import SmartLensException

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not auth or not auth.credentials:
        raise SmartLensException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in."
        )

    try:
        payload = decode_token(auth.credentials)
        if payload.get("type") != "access":
            raise SmartLensException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type."
            )
        user_id = payload.get("sub")
        if not user_id:
            raise SmartLensException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session token."
            )
    except JWTError:
        raise SmartLensException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again."
        )

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise SmartLensException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists."
        )

    if not user.is_active:
        raise SmartLensException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )

    # In development or if EMAIL_VERIFICATION is disabled, allow unverified users if desired;
    # but if EMAIL_VERIFICATION is true, enforce it strictly.
    if settings.EMAIL_VERIFICATION and not user.is_verified:
        raise SmartLensException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address not verified. Please verify your email before proceeding."
        )

    return user

async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.admin:
        raise SmartLensException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required for this action."
        )
    return current_user

async def check_daily_limit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    now = datetime.now(timezone.utc)
    # Check if 24 hours have passed since last reset
    if current_user.daily_requests_reset_at:
        # Normalize timezone
        reset_time = current_user.daily_requests_reset_at
        if reset_time.tzinfo is None:
            reset_time = reset_time.replace(tzinfo=timezone.utc)
        if (now - reset_time) >= timedelta(days=1):
            current_user.daily_requests_used = 0
            current_user.daily_requests_reset_at = now
    else:
        current_user.daily_requests_used = 0
        current_user.daily_requests_reset_at = now

    # Fetch daily limit from settings or config
    limit_setting = await db.execute(select(SystemSetting).where(SystemSetting.key == "daily_ai_request_limit"))
    limit_row = limit_setting.scalar_one_or_none()
    daily_limit = int(limit_row.value) if limit_row and limit_row.value.isdigit() else settings.DAILY_AI_REQUEST_LIMIT

    if current_user.daily_requests_used >= daily_limit and current_user.role != UserRole.admin:
        raise SmartLensException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily AI request limit reached ({daily_limit} requests/day). Limit resets in 24 hours."
        )

    current_user.daily_requests_used += 1
    await db.commit()
    await db.refresh(current_user)
    return current_user

async def check_tool_enabled(tool_name: str, db: AsyncSession):
    setting = await db.execute(select(SystemSetting).where(SystemSetting.key == "tools_enabled"))
    row = setting.scalar_one_or_none()
    if row and row.value:
        try:
            tools_map = json.loads(row.value)
            if not tools_map.get(tool_name, True):
                raise SmartLensException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"The '{tool_name}' tool is temporarily disabled by the system administrator."
                )
        except json.JSONDecodeError:
            pass
