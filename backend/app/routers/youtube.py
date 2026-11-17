from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.models.user import User
from app.models.analysis import AnalysisResult, ToolType
from app.models.admin import AuditLog
from app.utils.dependencies import check_daily_limit, check_tool_enabled
from app.services.youtube_service import summarize_youtube_video

router = APIRouter()

class YouTubeRequest(BaseModel):
    url: str

@router.post("/summarize")
async def summarize_video(
    payload: YouTubeRequest,
    current_user: User = Depends(check_daily_limit),
    db: AsyncSession = Depends(get_db)
):
    await check_tool_enabled("youtube", db)

    result_data = await summarize_youtube_video(payload.url)

    # Save to history
    record = AnalysisResult(
        user_id=current_user.id,
        tool=ToolType.youtube,
        input_name=result_data.get("title", payload.url),
        result_json=json.dumps(result_data)
    )
    db.add(record)

    db.add(AuditLog(
        user_id=current_user.id,
        action="YOUTUBE_SUMMARY",
        detail=f"Summarized video: {result_data.get('title', payload.url)}"
    ))

    await db.commit()
    await db.refresh(record)

    result_data["id"] = record.id
    return result_data
