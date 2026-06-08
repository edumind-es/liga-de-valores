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

"""
Tests for authentication endpoints.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.main import app
from app.models.user import User
from app.utils.security import get_password_hash
from app.config import settings
from app.services import oidc_service

@pytest.mark.asyncio
class TestAuth:
    """Tests for authentication endpoints."""
    
    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "test_user",
                "email": "test@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["codigo"] == "test_user"
        assert data["email"] == "test@example.com"
        assert "hashed_password" not in data
        assert "password" not in data
    
    async def test_register_duplicate_codigo(self, client: AsyncClient):
        """Test registration with duplicate codigo."""
        # First registration
        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "duplicate",
                "email": "user1@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )
        
        # Second registration with same codigo
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "duplicate",
                "email": "user2@example.com",
                "password": "password456",
                "acepta_privacidad": True
            }
        )
        
        assert response.status_code == 400
        assert "Código ya registrado" in response.json()["detail"]
    
    async def test_login_success(self, client: AsyncClient):
        """Test successful login."""
        # Register user first
        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "login_test",
                "email": "login@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )
        
        # Login
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "login_test",
                "password": "password123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        set_cookie_headers = response.headers.get_list("set-cookie")
        assert any(settings.AUTH_ACCESS_COOKIE_NAME in header for header in set_cookie_headers)
        assert any(settings.AUTH_REFRESH_COOKIE_NAME in header for header in set_cookie_headers)
    
    async def test_login_wrong_password(self, client: AsyncClient):
        """Test login with wrong password."""
        # Register user
        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "wrong_pass",
                "email": "wrong@example.com",
                "password": "correct_password",
                "acepta_privacidad": True
            }
        )
        
        # Login with wrong password
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "wrong_pass",
                "password": "wrong_password"
            }
        )
        
        assert response.status_code == 401
        assert "incorrectos" in response.json()["detail"].lower()
    
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "nonexistent",
                "password": "password123"
            }
        )
        
        assert response.status_code == 401
    
    async def test_get_me_success(self, client: AsyncClient):
        """Test getting current user."""
        # Register and login
        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "me_test",
                "email": "me@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )
        
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "me_test",
                "password": "password123"
            }
        )
        
        token = login_response.json()["access_token"]
        
        # Get current user
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["codigo"] == "me_test"
        assert data["email"] == "me@example.com"
    
    async def test_get_me_no_token(self, client: AsyncClient):
        """Test getting current user without token."""
        response = await client.get("/api/v1/auth/me")
        
        assert response.status_code == 401
    
    async def test_get_me_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token."""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401

    async def test_refresh_token_body_disabled_by_default(self, client: AsyncClient):
        """Refresh token flow must not accept body tokens unless explicitly enabled."""
        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "refresh_test",
                "email": "refresh@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )

        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "refresh_test",
                "password": "password123"
            }
        )
        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]
        client.cookies.clear()

        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert refresh_response.status_code == 401

    async def test_refresh_token_success_when_body_refresh_enabled(self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
        """Legacy body refresh remains available only when explicitly enabled."""
        monkeypatch.setattr(settings, "AUTH_ALLOW_REFRESH_TOKEN_IN_BODY", True)

        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "refresh_body_on",
                "email": "refresh_body_enabled@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )

        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "refresh_body_on",
                "password": "password123"
            }
        )
        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]
        client.cookies.clear()

        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()
        assert "access_token" in refresh_data
        assert refresh_data["refresh_token"] == refresh_token

        me_response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {refresh_data['access_token']}"}
        )
        assert me_response.status_code == 200

    async def test_refresh_token_rejects_access_token(self, client: AsyncClient):
        """Refresh endpoint must reject access tokens."""
        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "refresh_reject_test",
                "email": "refresh_reject@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )

        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "refresh_reject_test",
                "password": "password123"
            }
        )
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]
        client.cookies.clear()

        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access_token}
        )
        assert refresh_response.status_code == 401

    async def test_refresh_token_from_cookie(self, client: AsyncClient):
        """Refresh endpoint should accept refresh token from secure cookie."""
        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "refresh_cookie_test",
                "email": "refresh_cookie@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )

        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "refresh_cookie_test",
                "password": "password123"
            }
        )
        assert login_response.status_code == 200

        refresh_response = await client.post("/api/v1/auth/refresh")
        assert refresh_response.status_code == 200
        assert "access_token" in refresh_response.json()

    async def test_get_me_with_access_cookie(self, client: AsyncClient):
        """Authenticated endpoint should work when access token is provided by cookie."""
        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "cookie_me_test",
                "email": "cookie_me@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )

        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "cookie_me_test",
                "password": "password123"
            }
        )
        assert login_response.status_code == 200

        me_response = await client.get("/api/v1/auth/me")
        assert me_response.status_code == 200
        assert me_response.json()["codigo"] == "cookie_me_test"

    async def test_logout_clears_auth_cookies(self, client: AsyncClient):
        """Logout must clear auth cookies and invalidate the browser session."""
        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "logout_cookie_test",
                "email": "logout_cookie@example.com",
                "password": "password123",
                "acepta_privacidad": True
            }
        )

        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "codigo": "logout_cookie_test",
                "password": "password123"
            }
        )
        assert login_response.status_code == 200

        logout_response = await client.post("/api/v1/auth/logout")
        assert logout_response.status_code == 200

        set_cookie_headers = logout_response.headers.get_list("set-cookie")
        assert any(settings.AUTH_ACCESS_COOKIE_NAME in header for header in set_cookie_headers)
        assert any(settings.AUTH_REFRESH_COOKIE_NAME in header for header in set_cookie_headers)

        me_response = await client.get("/api/v1/auth/me")
        assert me_response.status_code == 401

    async def test_oidc_start_sets_ephemeral_cookies_and_redirects(self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(settings, "AUTHENTIK_ENABLED", True)

        async def fake_build_authorization_url(*, state: str, nonce: str) -> str:
            assert state
            assert nonce
            return "https://auth.edumind.es/application/o/authorize/?mock=1"

        monkeypatch.setattr(oidc_service, "build_authorization_url", fake_build_authorization_url)

        response = await client.get("/api/v1/auth/oidc/start?next=/ligas/7", follow_redirects=False)
        assert response.status_code == 302
        assert response.headers["location"] == "https://auth.edumind.es/application/o/authorize/?mock=1"
        set_cookie_headers = response.headers.get_list("set-cookie")
        assert any("edumind_oidc_state" in header for header in set_cookie_headers)
        assert any("edumind_oidc_nonce" in header for header in set_cookie_headers)
        assert any("edumind_oidc_next" in header for header in set_cookie_headers)

    async def test_oidc_callback_issues_local_session_and_redirects(self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(settings, "AUTHENTIK_ENABLED", True)

        await client.post(
            "/api/v1/auth/register",
            json={
                "codigo": "oidc_user",
                "email": "oidc@example.com",
                "password": "password123",
                "acepta_privacidad": True,
            },
        )

        async def fake_authenticate_oidc_code(db, *, code: str, nonce: str, client_ip: str | None):
            assert code == "oidc-code"
            assert nonce == "nonce-123"
            response = await db.execute(select(User).where(User.codigo == "oidc_user"))
            return response.scalar_one()

        monkeypatch.setattr(oidc_service, "authenticate_oidc_code", fake_authenticate_oidc_code)

        client.cookies.set("edumind_oidc_state", "state-123")
        client.cookies.set("edumind_oidc_nonce", "nonce-123")
        client.cookies.set("edumind_oidc_next", "/ligas")

        response = await client.get(
            "/api/v1/auth/oidc/callback?code=oidc-code&state=state-123",
            follow_redirects=False,
        )
        assert response.status_code == 303
        assert response.headers["location"] == f"{settings.FRONTEND_URL}/ligas"
        set_cookie_headers = response.headers.get_list("set-cookie")
        assert any(settings.AUTH_ACCESS_COOKIE_NAME in header for header in set_cookie_headers)
        assert any(settings.AUTH_REFRESH_COOKIE_NAME in header for header in set_cookie_headers)

    async def test_oidc_callback_rejects_invalid_state(self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(settings, "AUTHENTIK_ENABLED", True)

        client.cookies.set("edumind_oidc_state", "expected-state")
        client.cookies.set("edumind_oidc_nonce", "nonce-456")
        client.cookies.set("edumind_oidc_next", "/ligas")

        response = await client.get(
            "/api/v1/auth/oidc/callback?code=oidc-code&state=other-state",
            follow_redirects=False,
        )
        assert response.status_code == 303
        assert response.headers["location"].startswith(f"{settings.FRONTEND_URL}/login?authError=")
