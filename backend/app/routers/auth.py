from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole
from app.models.session import RefreshToken
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    UserOut,
    TokenResponse,
    TokenRefreshRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    UserUpdate
)
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    generate_token
)
from app.utils.dependencies import get_current_user
from app.utils.responses import SmartLensException
from app.services.email_service import send_verification_email, send_password_reset_email

router = APIRouter(prefix="/auth")
limiter = Limiter(key_func=get_remote_address)

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise SmartLensException(status.HTTP_400_BAD_REQUEST, "An account with this email address already exists.")

    verification_token = generate_token()
    is_auto_verified = not settings.EMAIL_VERIFICATION

    new_user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=UserRole.user,
        is_active=True,
        is_verified=is_auto_verified,
        email_verification_token=verification_token if not is_auto_verified else None
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    if not is_auto_verified:
        await send_verification_email(new_user.email, new_user.full_name, verification_token)

    return {
        "message": "Registration successful." + (
            " Please check your email to verify your account." if not is_auto_verified else " You can now log in."
        ),
        "is_verified": new_user.is_verified
    }

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")

    if not user.is_active:
        raise SmartLensException(status.HTTP_403_FORBIDDEN, "Your account has been deactivated. Please contact support.")

    if settings.EMAIL_VERIFICATION and not user.is_verified:
        raise SmartLensException(status.HTTP_403_FORBIDDEN, "Your email is not verified. Please check your inbox for the verification link.")

    # Update last login
    user.last_login = datetime.now(timezone.utc)

    # Generate tokens
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    # Store refresh token hash in DB
    rt_hash = hash_token(refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(RefreshToken(user_id=user.id, token_hash=rt_hash, expires_at=expires_at))
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user)
    )

@router.post("/refresh")
async def refresh_tokens(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        decoded = decode_token(payload.refresh_token)
        if decoded.get("type") != "refresh":
            raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Invalid token type.")
        user_id = decoded.get("sub")
    except Exception:
        raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Refresh token is invalid or expired.")

    rt_hash = hash_token(payload.refresh_token)
    stored = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == rt_hash))
    token_entry = stored.scalar_one_or_none()

    if not token_entry:
        raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Refresh token has been revoked.")

    user_res = await db.execute(select(User).where(User.id == int(user_id)))
    user = user_res.scalar_one_or_none()
    if not user or not user.is_active:
        raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "User inactive or not found.")

    new_access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    rt_hash = hash_token(payload.refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == rt_hash))
    token_entry = result.scalar_one_or_none()
    if token_entry:
        await db.delete(token_entry)
        await db.commit()
    return {"message": "Logged out successfully."}

@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email_verification_token == token))
    user = result.scalar_one_or_none()
    if not user:
        raise SmartLensException(status.HTTP_400_BAD_REQUEST, "Invalid or expired verification token.")

    user.is_verified = True
    user.email_verification_token = None
    await db.commit()
    return {"message": "Email successfully verified. You may now log in to SmartLens AI."}

@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    if user:
        reset_token = generate_token()
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.commit()
        await send_password_reset_email(user.email, user.full_name, reset_token)

    return {"message": "If this email is registered, password reset instructions have been dispatched."}

@router.post("/reset-password")
async def reset_password(payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.password_reset_token == payload.token))
    user = result.scalar_one_or_none()
    if not user:
        raise SmartLensException(status.HTTP_400_BAD_REQUEST, "Invalid reset token.")

    now = datetime.now(timezone.utc)
    if user.password_reset_expires:
        expiry = user.password_reset_expires
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if now > expiry:
            raise SmartLensException(status.HTTP_400_BAD_REQUEST, "Password reset token has expired.")

    user.hashed_password = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    await db.commit()
    return {"message": "Password successfully reset. Please log in with your new password."}

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.patch("/me", response_model=UserOut)
async def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if payload.full_name:
        current_user.full_name = payload.full_name.strip()

    if payload.new_password:
        if not payload.old_password or not verify_password(payload.old_password, current_user.hashed_password):
            raise SmartLensException(status.HTTP_400_BAD_REQUEST, "Incorrect current password.")
        current_user.hashed_password = hash_password(payload.new_password)

    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)
