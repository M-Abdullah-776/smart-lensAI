from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete
from typing import Optional
import json

from app.database import get_db
from app.models.user import User
from app.models.analysis import AnalysisResult, ToolType
from app.schemas.analysis import AnalysisOut, AnalysisListResponse
from app.utils.dependencies import get_current_user
from app.utils.responses import SmartLensException

router = APIRouter()

@router.get("", response_model=AnalysisListResponse)
async def list_history(
    tool: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AnalysisResult).where(
        AnalysisResult.user_id == current_user.id,
        AnalysisResult.is_deleted == 0
    )

    if tool:
        try:
            tool_enum = ToolType(tool)
            query = query.where(AnalysisResult.tool == tool_enum)
        except ValueError:
            pass

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    paged_query = query.order_by(desc(AnalysisResult.created_at)).offset(offset).limit(limit)
    items_res = await db.execute(paged_query)
    records = items_res.scalars().all()

    items = []
    for r in records:
        try:
            parsed = json.loads(r.result_json)
        except Exception:
            parsed = {}
        items.append(AnalysisOut(
            id=r.id,
            tool=r.tool.value,
            input_name=r.input_name,
            result=parsed,
            created_at=r.created_at
        ))

    return AnalysisListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit
    )

@router.get("/{analysis_id}", response_model=AnalysisOut)
async def get_history_item(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.id == analysis_id,
            AnalysisResult.user_id == current_user.id,
            AnalysisResult.is_deleted == 0
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise SmartLensException(status.HTTP_404_NOT_FOUND, "History record not found.")

    try:
        parsed = json.loads(item.result_json)
    except Exception:
        parsed = {}

    return AnalysisOut(
        id=item.id,
        tool=item.tool.value,
        input_name=item.input_name,
        result=parsed,
        created_at=item.created_at
    )

@router.delete("/{analysis_id}")
async def delete_history_item(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.id == analysis_id,
            AnalysisResult.user_id == current_user.id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise SmartLensException(status.HTTP_404_NOT_FOUND, "History record not found.")

    item.is_deleted = 1
    await db.commit()
    return {"message": "Record deleted successfully."}

@router.delete("")
async def clear_all_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    records = await db.execute(
        select(AnalysisResult).where(AnalysisResult.user_id == current_user.id)
    )
    for r in records.scalars().all():
        r.is_deleted = 1
    await db.commit()
    return {"message": "All history cleared."}
