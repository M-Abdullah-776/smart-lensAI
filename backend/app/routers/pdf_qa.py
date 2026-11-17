from fastapi import APIRouter, Depends, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.analysis import AnalysisResult, ToolType
from app.models.admin import AuditLog
from app.utils.dependencies import get_current_user, check_daily_limit, check_tool_enabled
from app.utils.responses import SmartLensException
from app.services.pdf_qa_service import (
    create_pdf_qa_session,
    answer_pdf_question,
    delete_pdf_qa_session
)

router = APIRouter()

class AskQuestionRequest(BaseModel):
    session_id: str
    question: str

@router.post("/upload")
async def upload_pdf_for_qa(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await check_tool_enabled("pdf_qa", db)

    filename = file.filename or "document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise SmartLensException(status.HTTP_400_BAD_REQUEST, "Only PDF files are supported for PDF Q&A.")

    file_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise SmartLensException(
            status.HTTP_400_BAD_REQUEST,
            f"File exceeds maximum allowed upload size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    session_info = create_pdf_qa_session(file_bytes, filename, current_user.id)
    del file_bytes

    return session_info

@router.post("/ask")
async def ask_question(
    payload: AskQuestionRequest,
    current_user: User = Depends(check_daily_limit),
    db: AsyncSession = Depends(get_db)
):
    await check_tool_enabled("pdf_qa", db)

    answer_data = await answer_pdf_question(payload.session_id, payload.question, current_user.id)

    # Save to history
    record = AnalysisResult(
        user_id=current_user.id,
        tool=ToolType.pdf_qa,
        input_name=f"Q&A: {payload.question[:60]}",
        result_json=json.dumps(answer_data)
    )
    db.add(record)

    db.add(AuditLog(
        user_id=current_user.id,
        action="PDF_QA",
        detail=f"Asked: {payload.question[:100]}"
    ))

    await db.commit()
    return answer_data

@router.delete("/session/{session_id}")
async def end_qa_session(session_id: str, current_user: User = Depends(get_current_user)):
    success = delete_pdf_qa_session(session_id, current_user.id)
    return {"message": "Session closed.", "success": success}
