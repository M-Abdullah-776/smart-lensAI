from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import logging

from app.config import settings
from app.database import init_db, get_db, AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.analysis import AnalysisResult
from app.models.admin import Announcement
from app.utils.security import hash_password
from app.utils.responses import SmartLensException
from app.routers import (
    auth,
    documents,
    youtube,
    pdf_qa,
    resume,
    url_analyzer,
    history,
    admin
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("smartlens")

limiter = Limiter(key_func=get_remote_address)

async def seed_initial_admin():
    async with AsyncSessionLocal() as db:
        admin_res = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL.lower()))
        existing_admin = admin_res.scalar_one_or_none()
        if not existing_admin:
            admin_user = User(
                email=settings.ADMIN_EMAIL.lower(),
                full_name="System Administrator",
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.admin,
                is_active=True,
                is_verified=True,
            )
            db.add(admin_user)
            await db.commit()
            logger.info(f"Initialized System Administrator account: {settings.ADMIN_EMAIL}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SmartLens AI database...")
    await init_db()
    await seed_initial_admin()
    logger.info("SmartLens AI backend ready.")
    yield

app = FastAPI(
    title="SmartLens AI API",
    description="Production-grade AI Multi-Source Content Analysis Platform",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Comprehensive CORS — allow_credentials=True requires explicit origin list (not wildcard)
ALLOWED_ORIGINS = [
    "https://smart-lens-ai.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(SmartLensException)
async def smartlens_exception_handler(request: Request, exc: SmartLensException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Rule BRL-018: Never expose stack traces to users. Log on server only.
    logger.error(f"Internal server error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Please try again later."}
    )

# Register feature routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(documents.router, prefix="/api/document", tags=["Document Analyzer"])
app.include_router(youtube.router, prefix="/api/youtube", tags=["YouTube Summarizer"])
app.include_router(pdf_qa.router, prefix="/api/pdfqa", tags=["PDF Q&A"])
app.include_router(resume.router, prefix="/api/resume", tags=["Resume Analyzer"])
app.include_router(url_analyzer.router, prefix="/api/url", tags=["URL Analyzer"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(admin.router, prefix="/admin", tags=["Admin Panel"])

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "SmartLens AI",
        "version": "1.0.0"
    }

@app.get("/api/stats/public")
async def public_statistics(db: AsyncSession = Depends(get_db)):
    """
    Returns real measured counts from the database — no hardcoded or fake counters!
    """
    total_analyses = (await db.execute(select(func.count()).select_from(AnalysisResult))).scalar() or 0
    total_users = (await db.execute(select(func.count()).select_from(User).where(User.is_active == True))).scalar() or 0
    return {
        "total_analyses": total_analyses,
        "total_users": total_users,
        "tools_count": 5
    }

@app.get("/api/announcements/active")
async def get_active_announcements(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Announcement).where(Announcement.is_active == True)
    )
    return result.scalars().all()
