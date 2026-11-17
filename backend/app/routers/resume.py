from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import json

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.analysis import AnalysisResult, ToolType
from app.models.admin import AuditLog
from app.utils.dependencies import check_daily_limit, check_tool_enabled
from app.utils.responses import SmartLensException
from app.services.resume_service import extract_resume_text, analyze_and_score_resume
from app.services.document_service import extract_text_from_pdf, extract_text_from_docx

router = APIRouter()

@router.post("/analyze")
async def analyze_resume(
    resume_file: UploadFile = File(...),
    job_description: Optional[str] = Form(None),
    jd_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(check_daily_limit),
    db: AsyncSession = Depends(get_db)
):
    await check_tool_enabled("resume", db)

    filename = resume_file.filename or "resume.pdf"
    file_bytes = await resume_file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise SmartLensException(
            status.HTTP_400_BAD_REQUEST,
            f"Resume file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    resume_text = extract_resume_text(file_bytes, filename)
    del file_bytes

    # Handle Job Description if provided via file or text
    jd_text = (job_description or "").strip()
    if jd_file and jd_file.filename:
        jd_bytes = await jd_file.read()
        jd_fname = jd_file.filename.lower()
        if jd_fname.endswith(".pdf"):
            parsed_jd, _, _ = extract_text_from_pdf(jd_bytes)
            jd_text = parsed_jd
        elif jd_fname.endswith(".docx"):
            parsed_jd, _, _ = extract_text_from_docx(jd_bytes)
            jd_text = parsed_jd
        else:
            try:
                jd_text = jd_bytes.decode("utf-8")
            except Exception:
                jd_text = jd_bytes.decode("latin-1", errors="replace")
        del jd_bytes

    analysis_data = await analyze_and_score_resume(
        resume_text=resume_text,
        job_description=jd_text if jd_text else None
    )
    analysis_data["filename"] = filename

    # Save to history
    record = AnalysisResult(
        user_id=current_user.id,
        tool=ToolType.resume,
        input_name=f"Resume: {filename}" + (" (+ Job Match)" if jd_text else ""),
        result_json=json.dumps(analysis_data)
    )
    db.add(record)

    db.add(AuditLog(
        user_id=current_user.id,
        action="RESUME_ANALYSIS",
        detail=f"Scored {filename}: {analysis_data['overall_score']}/100"
    ))

    await db.commit()
    await db.refresh(record)

    analysis_data["id"] = record.id
    return analysis_data
