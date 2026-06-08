#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

import secrets
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta, datetime, timezone

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, UserPasswordChange, RefreshTokenRequest
from app.utils.security import get_password_hash, verify_password, verify_and_update_password, create_access_token, create_refresh_token, verify_token, create_password_reset_token, create_email_verification_token
from app.api.deps import get_current_user
from app.config import settings
from app.core.rate_limit import limiter
from app.services.league_entitlement_service import should_grant_grandfathering
from app.services.email_service import send_email
from app.services import oidc_service

router = APIRouter()

OIDC_STATE_COOKIE = "edumind_oidc_state"
OIDC_NONCE_COOKIE = "edumind_oidc_nonce"
OIDC_NEXT_COOKIE = "edumind_oidc_next"
OIDC_EPHEMERAL_COOKIE_MAX_AGE = 10 * 60


def _normalized_samesite() -> str:
    value = settings.AUTH_COOKIE_SAMESITE.lower()
    if value in {"lax", "strict", "none"}:
        return value
    return "lax"


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str | None = None) -> None:
    common = {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": _normalized_samesite(),
        "domain": settings.AUTH_COOKIE_DOMAIN,
        "path": settings.AUTH_COOKIE_PATH,
    }
    response.set_cookie(
        key=settings.AUTH_ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **common,
    )
    if refresh_token:
        response.set_cookie(
            key=settings.AUTH_REFRESH_COOKIE_NAME,
            value=refresh_token,
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            **common,
        )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        key=settings.AUTH_ACCESS_COOKIE_NAME,
        domain=settings.AUTH_COOKIE_DOMAIN,
        path=settings.AUTH_COOKIE_PATH,
    )
    response.delete_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        domain=settings.AUTH_COOKIE_DOMAIN,
        path=settings.AUTH_COOKIE_PATH,
    )


def _set_ephemeral_oidc_cookie(response: Response, key: str, value: str) -> None:
    response.set_cookie(
        key=key,
        value=value,
        max_age=OIDC_EPHEMERAL_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="lax",
        domain=settings.AUTH_COOKIE_DOMAIN,
        path=settings.AUTH_COOKIE_PATH,
    )


def _clear_oidc_cookies(response: Response) -> None:
    for cookie_name in (OIDC_STATE_COOKIE, OIDC_NONCE_COOKIE, OIDC_NEXT_COOKIE):
        response.delete_cookie(
            key=cookie_name,
            domain=settings.AUTH_COOKIE_DOMAIN,
            path=settings.AUTH_COOKIE_PATH,
        )


def _sanitize_frontend_path(candidate: str | None, *, default: str = "/ligas") -> str:
    if not candidate:
        return default

    parsed = urlparse(candidate)
    if parsed.scheme or parsed.netloc:
        return default
    if not candidate.startswith("/") or candidate.startswith("//"):
        return default
    return candidate


def _frontend_url(path: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


def _oidc_error_redirect(message: str, *, status_code: int = status.HTTP_303_SEE_OTHER) -> RedirectResponse:
    params = urlencode({"authError": message})
    response = RedirectResponse(url=f"{_frontend_url('/login')}?{params}", status_code=status_code)
    _clear_oidc_cookies(response)
    _clear_auth_cookies(response)
    return response


def _humanize_oidc_error(exc: HTTPException) -> str:
    detail = exc.detail if isinstance(exc.detail, str) else "No se pudo completar el acceso EDUmind."
    return detail

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user with GDPR consent tracking.
    """
    # Validate privacy acceptance (RGPD compliance)
    if not user_data.acepta_privacidad:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe aceptar la Política de Privacidad para registrarse"
        )
    
    # Check if codigo already exists
    result = await db.execute(
        select(User).where(User.codigo == user_data.codigo)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código ya registrado"
        )
    
    # Check if email already exists (if provided)
    if user_data.email:
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        existing_email = result.scalar_one_or_none()
        
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ya registrado"
            )
    
    # Get client IP for consent tracking (RGPD Art. 7)
    client_ip = request.client.host if request.client else None
    
    now_utc = datetime.now(timezone.utc)
    is_grandfathered = should_grant_grandfathering(now_utc)

    # Create new user with GDPR consent data
    verification_token = create_email_verification_token(user_data.email) if user_data.email else None

    new_user = User(
        codigo=user_data.codigo,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        acepta_privacidad=user_data.acepta_privacidad,
        fecha_consentimiento=now_utc,
        ip_consentimiento=client_ip,
        plan_code="founding_teacher" if is_grandfathered else "free",
        grandfathered_unlimited=is_grandfathered,
        grandfathered_at=now_utc if is_grandfathered else None,
        email_verificado=False if user_data.email else True,
        email_verification_token=verification_token,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Enviar email de verificación en background
    if user_data.email and verification_token:
        from fastapi import BackgroundTasks
        from app.services.email_service import send_email
        verify_url = f"{settings.FRONTEND_URL}/verificar-email?token={verification_token}"
        background_tasks = BackgroundTasks()
        background_tasks.add_task(
            send_email,
            to_email=user_data.email,
            subject="Liga EDUmind — Verifica tu email",
            body=(
                f"Hola,\n\n"
                f"Confirma tu dirección de email haciendo clic en el siguiente enlace "
                f"(válido durante 24 horas):\n\n{verify_url}\n\n"
                f"Si no has creado una cuenta en Liga EDUmind, ignora este mensaje.\n\n"
                f"— Equipo EDUmind"
            ),
        )

    return new_user

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    user_credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with codigo or email, and password. Returns JWT token.
    """
    # Try lookup by codigo first, then by email
    identifier = user_credentials.codigo.strip()
    result = await db.execute(
        select(User).where(User.codigo == identifier)
    )
    user = result.scalar_one_or_none()

    if not user and "@" in identifier:
        result = await db.execute(
            select(User).where(User.email == identifier)
        )
        user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password — auto-rehash si el hash es de un esquema deprecado (pbkdf2 → argon2)
    password_valid, updated_hash = verify_and_update_password(
        user_credentials.password, user.hashed_password
    )
    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if updated_hash:
        user.hashed_password = updated_hash

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    access_token = create_access_token(
        data={"sub": user.codigo},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.codigo},
        expires_delta=refresh_token_expires
    )

    _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    response: Response,
    token_payload: RefreshTokenRequest | None = Body(default=None),
    db: AsyncSession = Depends(get_db)
):
    """
    Exchange refresh token for a new access token.
    """
    refresh_token_value: str | None = None
    if settings.AUTH_ALLOW_REFRESH_TOKEN_IN_BODY and token_payload and token_payload.refresh_token:
        refresh_token_value = token_payload.refresh_token

    if not refresh_token_value:
        refresh_token_value = request.cookies.get(settings.AUTH_REFRESH_COOKIE_NAME)

    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(refresh_token_value, expected_token_type="refresh")
    if payload is None:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    codigo: str | None = payload.get("sub")
    if not codigo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.codigo == codigo))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.codigo},
        expires_delta=access_token_expires
    )

    _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token_value)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_value,
        "token_type": "bearer",
    }


@router.post("/logout", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def logout(request: Request, response: Response):
    """Clear authentication cookies."""
    _clear_auth_cookies(response)
    return {"message": "Sesión cerrada correctamente"}


@router.get("/oidc/start", include_in_schema=False)
async def oidc_start(next: str = Query("/ligas")):
    """Start OIDC login against Authentik."""
    safe_next = _sanitize_frontend_path(next)
    state = secrets.token_urlsafe(24)
    nonce = secrets.token_urlsafe(24)
    authorization_url = await oidc_service.build_authorization_url(state=state, nonce=nonce)

    response = RedirectResponse(url=authorization_url, status_code=status.HTTP_302_FOUND)
    _set_ephemeral_oidc_cookie(response, OIDC_STATE_COOKIE, state)
    _set_ephemeral_oidc_cookie(response, OIDC_NONCE_COOKIE, nonce)
    _set_ephemeral_oidc_cookie(response, OIDC_NEXT_COOKIE, safe_next)
    return response


@router.get("/oidc/callback", include_in_schema=False)
async def oidc_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
):
    """Complete OIDC login, issue local cookies and redirect back to frontend."""
    if error:
        return _oidc_error_redirect(
            error_description or "El acceso EDUmind fue cancelado o no pudo completarse."
        )

    expected_state = request.cookies.get(OIDC_STATE_COOKIE)
    expected_nonce = request.cookies.get(OIDC_NONCE_COOKIE)
    next_path = _sanitize_frontend_path(request.cookies.get(OIDC_NEXT_COOKIE), default="/ligas")

    if not code or not state or not expected_state or not expected_nonce:
        return _oidc_error_redirect("No se pudo completar el acceso EDUmind.")

    if not secrets.compare_digest(state, expected_state):
        return _oidc_error_redirect("La sesión de acceso EDUmind no es válida o ha caducado.")

    try:
        user = await oidc_service.authenticate_oidc_code(
            db,
            code=code,
            nonce=expected_nonce,
            client_ip=request.client.host if request.client else None,
        )
    except HTTPException as exc:
        return _oidc_error_redirect(_humanize_oidc_error(exc))

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    access_token = create_access_token(
        data={"sub": user.codigo},
        expires_delta=access_token_expires,
    )
    refresh_token = create_refresh_token(
        data={"sub": user.codigo},
        expires_delta=refresh_token_expires,
    )

    response = RedirectResponse(url=_frontend_url(next_path), status_code=status.HTTP_303_SEE_OTHER)
    _clear_oidc_cookies(response)
    _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)
    return response


@router.get("/oidc/logout", include_in_schema=False)
async def oidc_logout(next: str = Query("/login")):
    """Clear local cookies and, when available, redirect through Authentik logout."""
    safe_next = _sanitize_frontend_path(next, default="/login")
    redirect_target = _frontend_url(safe_next)

    provider_logout_url: str | None = None
    if settings.AUTHENTIK_ENABLED:
        try:
            provider_logout_url = await oidc_service.build_end_session_url(redirect_target)
        except HTTPException:
            provider_logout_url = None

    response = RedirectResponse(
        url=provider_logout_url or redirect_target,
        status_code=status.HTTP_303_SEE_OTHER,
    )
    _clear_oidc_cookies(response)
    _clear_auth_cookies(response)
    return response

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user.
    """
    return current_user

@router.post("/change-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change user password.
    """
    from app.schemas.user import UserPasswordChange # Avoid circular import if needed, but here it's fine
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    
    db.add(current_user)
    await db.commit()
    
    return {"message": "Contraseña actualizada correctamente"}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    db: AsyncSession = Depends(get_db),
    identifier: str = Body(..., embed=True),
):
    """
    Request a password reset email. Accepts either codigo or email.
    Always returns success to prevent user enumeration.
    """
    identifier = identifier.strip()

    # Lookup by email first (most common for recovery), then by codigo
    user = None
    if "@" in identifier:
        result = await db.execute(select(User).where(User.email == identifier))
        user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(User.codigo == identifier))
        user = result.scalar_one_or_none()

    if user and user.email and user.is_active:
        token = create_password_reset_token(user.codigo)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

        body = (
            f"Hola {user.codigo},\n\n"
            f"Has solicitado restablecer tu contraseña en Liga EDUmind.\n\n"
            f"Haz clic en el siguiente enlace para crear una nueva contraseña:\n"
            f"{reset_url}\n\n"
            f"Este enlace expirará en 30 minutos.\n\n"
            f"Si no solicitaste este cambio, puedes ignorar este correo.\n\n"
            f"— Equipo Liga EDUmind"
        )

        await send_email(
            to_email=user.email,
            subject="Restablecer contraseña - Liga EDUmind",
            body=body,
        )

    # Always return success to prevent enumeration
    return {"message": "Si el usuario existe y tiene email configurado, recibirá un correo con instrucciones."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    token: str = Body(...),
    new_password: str = Body(..., min_length=6),
    db: AsyncSession = Depends(get_db),
):
    """
    Reset password using a valid password_reset token.
    """
    payload = verify_token(token, expected_token_type="password_reset")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación ha expirado o no es válido. Solicita uno nuevo.",
        )

    codigo: str | None = payload.get("sub")
    if not codigo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido.",
        )

    result = await db.execute(select(User).where(User.codigo == codigo))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario no encontrado o inactivo.",
        )

    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    await db.commit()

    return {"message": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."}


@router.get("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Verificar la dirección de email del docente usando el token recibido por correo.
    El frontend navega a /verificar-email?token=<jwt> y llama a este endpoint.
    """
    payload = verify_token(token, expected_token_type="email_verification")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de verificación ha expirado o no es válido. Inicia sesión para solicitar uno nuevo.",
        )

    email: str | None = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido.")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    if user.email_verificado:
        return {"message": "El email ya estaba verificado. Puedes iniciar sesión normalmente."}

    user.email_verificado = True
    user.email_verification_token = None
    await db.commit()

    return {"message": "Email verificado correctamente. Ya puedes acceder a todas las funciones."}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def resend_verification_email(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reenviar el email de verificación al docente autenticado.
    Útil si el correo original se perdió o expiró.
    """
    if current_user.email_verificado:
        return {"message": "Tu email ya está verificado."}

    if not current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes email configurado en tu cuenta.",
        )

    new_token = create_email_verification_token(current_user.email)
    current_user.email_verification_token = new_token
    await db.commit()

    from app.services.email_service import send_email
    verify_url = f"{settings.FRONTEND_URL}/verificar-email?token={new_token}"
    await send_email(
        to_email=current_user.email,
        subject="Liga EDUmind — Verifica tu email",
        body=(
            f"Hola,\n\n"
            f"Aquí tienes un nuevo enlace para verificar tu dirección de email "
            f"(válido durante 24 horas):\n\n{verify_url}\n\n"
            f"— Equipo EDUmind"
        ),
    )

    return {"message": "Email de verificación reenviado. Revisa tu bandeja de entrada."}
