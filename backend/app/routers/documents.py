from fastapi import APIRouter, Depends, UploadFile, File, Query, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import json

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.analysis import AnalysisResult, ToolType
from app.models.admin import AuditLog
from app.utils.dependencies import get_current_user, check_daily_limit, check_tool_enabled
from app.utils.responses import SmartLensException
from app.services.document_service import (
    compute_file_hash,
    extract_text_from_pdf,
    extract_text_from_docx,
    extract_text_from_txt,
    summarize_document
)

router = APIRouter()

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}

@router.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    key_points: bool = Query(True),
    detailed: bool = Query(False),
    x_file_hash: Optional[str] = Header(None),
    current_user: User = Depends(check_daily_limit),
    db: AsyncSession = Depends(get_db)
):
    await check_tool_enabled("document", db)

    filename = file.filename or "uploaded_document"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in SUPPORTED_EXTENSIONS:
        raise SmartLensException(
            status.HTTP_400_BAD_REQUEST,
            f"Unsupported file type '{ext}'. Allowed formats: PDF, DOCX, TXT."
        )

    file_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise SmartLensException(
            status.HTTP_400_BAD_REQUEST,
            f"File exceeds maximum allowed upload size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    file_hash = compute_file_hash(file_bytes)
    is_duplicate = (x_file_hash == file_hash)

    # Extract text based on file format
    if ext == ".pdf":
        text, page_count, word_count = extract_text_from_pdf(file_bytes)
    elif ext == ".docx":
        text, page_count, word_count = extract_text_from_docx(file_bytes)
    else:
        text, page_count, word_count = extract_text_from_txt(file_bytes)

    # Immediate memory release of uploaded bytes
    del file_bytes

    # Generate real AI summary
    result_data = await summarize_document(
        text=text,
        page_count=page_count,
        word_count=word_count,
        include_key_points=key_points,
        detailed=detailed
    )
    result_data["file_hash"] = file_hash
    result_data["filename"] = filename
    result_data["is_duplicate"] = is_duplicate

    # Save to history
    record = AnalysisResult(
        user_id=current_user.id,
        tool=ToolType.document,
        input_name=filename,
        result_json=json.dumps(result_data)
    )
    db.add(record)

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_ANALYSIS",
        detail=f"Analyzed {filename} ({page_count} pages, {word_count} words)"
    ))

    await db.commit()
    await db.refresh(record)

    result_data["id"] = record.id
    return result_data
