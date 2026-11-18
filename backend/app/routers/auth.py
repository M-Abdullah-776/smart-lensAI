from fastapi import APIRouter, Depends, status, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlencode
import httpx
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
    UserUpdate,
    GoogleAuthRequest
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
@limiter.limit("15/minute")
async def login(
    request: Request,
    response: Response,
    payload: UserLogin,
    db: AsyncSession = Depends(get_db)
):
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

    # Set secure HttpOnly cookie for refresh token
    response.set_cookie(
        key="smartlens_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user)
    )

@router.post("/refresh")
async def refresh_tokens(
    request: Request,
    response: Response,
    payload: Optional[TokenRefreshRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    token = None
    if payload and payload.refresh_token:
        token = payload.refresh_token
    if not token:
        token = request.cookies.get("smartlens_refresh_token")

    if not token:
        raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Refresh token is missing.")

    try:
        decoded = decode_token(token)
        if decoded.get("type") != "refresh":
            raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Invalid token type.")
        user_id = decoded.get("sub")
    except Exception:
        raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Refresh token is invalid or expired.")

    rt_hash = hash_token(token)
    stored = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == rt_hash))
    token_entry = stored.scalar_one_or_none()

    if not token_entry:
        raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Refresh token has been revoked.")

    user_res = await db.execute(select(User).where(User.id == int(user_id)))
    user = user_res.scalar_one_or_none()
    if not user or not user.is_active:
        raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "User inactive or not found.")

    # Token rotation: remove old token, issue new pair
    await db.delete(token_entry)
    await db.flush()
    
    new_access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    new_rt_hash = hash_token(new_refresh_token)
    new_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(RefreshToken(user_id=user.id, token_hash=new_rt_hash, expires_at=new_expires_at))
    await db.commit()

    # Update HttpOnly cookie
    response.set_cookie(
        key="smartlens_refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    payload: Optional[TokenRefreshRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    token = None
    if payload and payload.refresh_token:
        token = payload.refresh_token
    if not token:
        token = request.cookies.get("smartlens_refresh_token")

    if token:
        rt_hash = hash_token(token)
        result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == rt_hash))
        token_entry = result.scalar_one_or_none()
        if token_entry:
            await db.delete(token_entry)
            await db.commit()

    response.delete_cookie(key="smartlens_refresh_token", path="/")
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

def get_safe_frontend_url(state: Optional[str] = None) -> str:
    import os
    default_url = (settings.FRONTEND_URL or "https://smart-lens-ai.vercel.app").rstrip("/")
    if "localhost" in default_url and (os.getenv("RENDER") or os.getenv("PORT") or not os.path.exists("C:\\")):
        default_url = "https://smart-lens-ai.vercel.app"

    if state:
        try:
            import base64
            import json
            decoded = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
            candidate = decoded.get("origin", "").rstrip("/")
            if candidate and (
                "vercel.app" in candidate or 
                "smartlens" in candidate or 
                candidate.startswith("http://localhost:") or 
                candidate.startswith("http://127.0.0.1:")
            ):
                return candidate
        except Exception:
            pass
    return default_url

@router.get("/google/url")
async def get_google_auth_url(origin: Optional[str] = None):
    """Returns the Google OAuth consent URL for frontend redirection."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise SmartLensException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables."
        )
    redirect_uri = settings.GOOGLE_REDIRECT_URI or "https://smart-lensai.onrender.com/auth/google/callback"
    
    import base64
    import json
    safe_origin = origin or settings.FRONTEND_URL or "https://smart-lens-ai.vercel.app"
    state_str = base64.urlsafe_b64encode(json.dumps({"origin": safe_origin}).encode()).decode()

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state_str
    }
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"}

@router.get("/google/login")
async def google_login(origin: Optional[str] = None):
    """Direct redirect to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise SmartLensException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    redirect_uri = settings.GOOGLE_REDIRECT_URI or "https://smart-lensai.onrender.com/auth/google/callback"
    
    import base64
    import json
    safe_origin = origin or settings.FRONTEND_URL or "https://smart-lens-ai.vercel.app"
    state_str = base64.urlsafe_b64encode(json.dumps({"origin": safe_origin}).encode()).decode()

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state_str
    }
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")

@router.get("/google/callback")
async def google_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    state: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Google OAuth callback: exchanges authorization code, verifies identity, creates/updates user in database, and issues application JWT tokens."""
    frontend_url = get_safe_frontend_url(state)
    if error or not code:
        return RedirectResponse(f"{frontend_url}/login?error=google_auth_failed")

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return RedirectResponse(f"{frontend_url}/login?error=google_oauth_not_configured")

    redirect_uri = settings.GOOGLE_REDIRECT_URI or "https://smart-lensai.onrender.com/auth/google/callback"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                }
            )
            if token_res.status_code != 200:
                return RedirectResponse(f"{frontend_url}/login?error=token_exchange_failed")

            token_data = token_res.json()
            access_token_google = token_data.get("access_token")

            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token_google}"}
            )
            if userinfo_res.status_code != 200:
                return RedirectResponse(f"{frontend_url}/login?error=userinfo_failed")

            userinfo = userinfo_res.json()

        google_id = userinfo.get("sub")
        email = userinfo.get("email", "").lower()
        full_name = userinfo.get("name") or (email.split("@")[0] if email else "Google User")
        avatar_url = userinfo.get("picture")

        if not email:
            return RedirectResponse(f"{frontend_url}/login?error=no_email_provided")

        # Safely find existing user by google_id or email
        user_query = await db.execute(select(User).where((User.google_id == google_id) | (User.email == email)))
        user = user_query.scalar_one_or_none()

        if user:
            if not user.google_id:
                user.google_id = google_id
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            user.is_verified = True
            user.last_login = datetime.now(timezone.utc)
        else:
            user = User(
                email=email,
                full_name=full_name,
                google_id=google_id,
                avatar_url=avatar_url,
                auth_provider="google",
                is_active=True,
                is_verified=True,
                last_login=datetime.now(timezone.utc)
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)

        # Issue SmartLens JWT access and refresh tokens
        app_access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
        app_refresh_token = create_refresh_token({"sub": str(user.id)})

        rt_hash = hash_token(app_refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db.add(RefreshToken(user_id=user.id, token_hash=rt_hash, expires_at=expires_at))
        await db.commit()

        redirect_target = f"{frontend_url}/login?token={app_access_token}&refresh_token={app_refresh_token}"
        resp = RedirectResponse(redirect_target, status_code=status.HTTP_302_FOUND)
        resp.set_cookie(
            key="smartlens_refresh_token",
            value=app_refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            path="/"
        )
        return resp
    except Exception as exc:
        return RedirectResponse(f"{frontend_url}/login?error=google_callback_exception")

@router.post("/google", response_model=TokenResponse)
async def google_auth_credential(
    payload: GoogleAuthRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Google Identity Services ID Token credential exchange endpoint."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            verify_res = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}"
            )
            if verify_res.status_code != 200:
                raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired Google credential.")

            id_info = verify_res.json()
    except SmartLensException:
        raise
    except Exception as exc:
        raise SmartLensException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Google token verification failed: {str(exc)}")

    # Verify audience if GOOGLE_CLIENT_ID is configured
    if settings.GOOGLE_CLIENT_ID and id_info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise SmartLensException(status.HTTP_401_UNAUTHORIZED, "Google credential audience mismatch.")

    google_id = id_info.get("sub")
    email = id_info.get("email", "").lower()
    full_name = id_info.get("name") or (email.split("@")[0] if email else "Google User")
    avatar_url = id_info.get("picture")

    if not email:
        raise SmartLensException(status.HTTP_400_BAD_REQUEST, "Google credential has no associated email address.")

    user_query = await db.execute(select(User).where((User.google_id == google_id) | (User.email == email)))
    user = user_query.scalar_one_or_none()

    if user:
        if not user.google_id:
            user.google_id = google_id
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        user.is_verified = True
        user.last_login = datetime.now(timezone.utc)
    else:
        user = User(
            email=email,
            full_name=full_name,
            google_id=google_id,
            avatar_url=avatar_url,
            auth_provider="google",
            is_active=True,
            is_verified=True,
            last_login=datetime.now(timezone.utc)
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    rt_hash = hash_token(refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(RefreshToken(user_id=user.id, token_hash=rt_hash, expires_at=expires_at))
    await db.commit()

    response.set_cookie(
        key="smartlens_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user)
    )
