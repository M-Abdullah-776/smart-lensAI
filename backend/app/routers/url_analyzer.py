from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.models.user import User
from app.models.analysis import AnalysisResult, ToolType
from app.models.admin import AuditLog
from app.utils.dependencies import check_daily_limit, check_tool_enabled
from app.services.url_service import analyze_url_content

router = APIRouter()

class UrlRequest(BaseModel):
    url: str

@router.post("/analyze")
async def analyze_url(
    payload: UrlRequest,
    current_user: User = Depends(check_daily_limit),
    db: AsyncSession = Depends(get_db)
):
    await check_tool_enabled("url", db)

    result_data = await analyze_url_content(payload.url)

    # Save to history
    record = AnalysisResult(
        user_id=current_user.id,
        tool=ToolType.url,
        input_name=result_data.get("title", payload.url),
        result_json=json.dumps(result_data)
    )
    db.add(record)

    db.add(AuditLog(
        user_id=current_user.id,
        action="URL_ANALYSIS",
        detail=f"Analyzed URL: {payload.url} ({result_data.get('word_count', 0)} words)"
    ))

    await db.commit()
    await db.refresh(record)

    result_data["id"] = record.id
    return result_data
