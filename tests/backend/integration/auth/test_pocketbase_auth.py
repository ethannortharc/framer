"""
Tests for PocketBase Authentication.

TDD Phase 3: Authentication
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta


class TestPocketBaseAuthService:
    """Tests for PocketBase authentication service."""

    def test_auth_service_creation(self):
        """Auth service should be created with PocketBase URL."""
        from app.auth.pocketbase import PocketBaseAuthService

        service = PocketBaseAuthService(pocketbase_url="http://localhost:8090")

        assert service.pocketbase_url == "http://localhost:8090"

    def test_auth_service_default_url(self):
        """Auth service should have default PocketBase URL."""
        from app.auth.pocketbase import PocketBaseAuthService

        service = PocketBaseAuthService()

        assert service.pocketbase_url is not None

    @pytest.mark.asyncio
    async def test_validate_valid_token(self):
        """Should return user info for valid token."""
        from app.auth.pocketbase import PocketBaseAuthService

        service = PocketBaseAuthService(pocketbase_url="http://localhost:8090")

        mock_response = {
            "id": "user-123",
            "email": "test@example.com",
            "name": "Test User",
            "verified": True,
        }

        with patch.object(service, '_verify_with_pocketbase', new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = mock_response

            user = await service.validate_token("valid-jwt-token")

            assert user["id"] == "user-123"
            assert user["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_validate_invalid_token_raises(self):
        """Should raise error for invalid token."""
        from app.auth.pocketbase import PocketBaseAuthService, InvalidTokenError

        service = PocketBaseAuthService(pocketbase_url="http://localhost:8090")

        with patch.object(service, '_verify_with_pocketbase', new_callable=AsyncMock) as mock_verify:
            mock_verify.side_effect = InvalidTokenError("Invalid token")

            with pytest.raises(InvalidTokenError):
                await service.validate_token("invalid-token")

    @pytest.mark.asyncio
    async def test_validate_expired_token_raises(self):
        """Should raise error for expired token."""
        from app.auth.pocketbase import PocketBaseAuthService, TokenExpiredError

        service = PocketBaseAuthService(pocketbase_url="http://localhost:8090")

        with patch.object(service, '_verify_with_pocketbase', new_callable=AsyncMock) as mock_verify:
            mock_verify.side_effect = TokenExpiredError("Token expired")

            with pytest.raises(TokenExpiredError):
                await service.validate_token("expired-token")


class TestUserModel:
    """Tests for User model."""

    def test_user_creation(self):
        """User model should hold user information."""
        from app.auth.pocketbase import User

        user = User(
            id="user-123",
            email="test@example.com",
            name="Test User",
            verified=True,
        )

        assert user.id == "user-123"
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.verified is True

    def test_user_optional_fields(self):
        """User model should have optional fields."""
        from app.auth.pocketbase import User

        user = User(
            id="user-123",
            email="test@example.com",
        )

        assert user.name is None
        assert user.verified is False


class TestAuthDependency:
    """Tests for FastAPI auth dependency."""

    @pytest.mark.asyncio
    async def test_get_current_user_with_valid_token(self):
        """Should return user for valid Bearer token."""
        from app.auth.pocketbase import get_current_user, PocketBaseAuthService

        mock_request = MagicMock()
        mock_request.headers = {"Authorization": "Bearer valid-token"}

        mock_service = MagicMock(spec=PocketBaseAuthService)
        mock_service.validate_token = AsyncMock(return_value={
            "id": "user-123",
            "email": "test@example.com",
            "name": "Test User",
            "verified": True,
        })

        with patch('app.auth.pocketbase.get_auth_service', return_value=mock_service):
            user = await get_current_user(mock_request)

            assert user.id == "user-123"
            assert user.email == "test@example.com"

    @pytest.mark.asyncio
    async def test_get_current_user_missing_token_raises(self):
        """Should raise 401 for missing token."""
        from app.auth.pocketbase import get_current_user
        from fastapi import HTTPException

        mock_request = MagicMock()
        mock_request.headers = {}

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_request)

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token_raises(self):
        """Should raise 401 for invalid token."""
        from app.auth.pocketbase import get_current_user, PocketBaseAuthService, InvalidTokenError
        from fastapi import HTTPException

        mock_request = MagicMock()
        mock_request.headers = {"Authorization": "Bearer invalid-token"}

        mock_service = MagicMock(spec=PocketBaseAuthService)
        mock_service.validate_token = AsyncMock(side_effect=InvalidTokenError("Invalid"))

        with patch('app.auth.pocketbase.get_auth_service', return_value=mock_service):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(mock_request)

            assert exc_info.value.status_code == 401


class TestOptionalAuth:
    """Tests for optional authentication."""

    @pytest.mark.asyncio
    async def test_get_optional_user_with_token(self):
        """Should return user when token is provided."""
        from app.auth.pocketbase import get_optional_user, PocketBaseAuthService

        mock_request = MagicMock()
        mock_request.headers = {"Authorization": "Bearer valid-token"}

        mock_service = MagicMock(spec=PocketBaseAuthService)
        mock_service.validate_token = AsyncMock(return_value={
            "id": "user-123",
            "email": "test@example.com",
        })

        with patch('app.auth.pocketbase.get_auth_service', return_value=mock_service):
            user = await get_optional_user(mock_request)

            assert user is not None
            assert user.id == "user-123"

    @pytest.mark.asyncio
    async def test_get_optional_user_without_token(self):
        """Should return None when no token is provided."""
        from app.auth.pocketbase import get_optional_user

        mock_request = MagicMock()
        mock_request.headers = {}

        user = await get_optional_user(mock_request)

        assert user is None

    @pytest.mark.asyncio
    async def test_get_optional_user_invalid_token(self):
        """Should return None for invalid token (not raise)."""
        from app.auth.pocketbase import get_optional_user, PocketBaseAuthService, InvalidTokenError

        mock_request = MagicMock()
        mock_request.headers = {"Authorization": "Bearer invalid-token"}

        mock_service = MagicMock(spec=PocketBaseAuthService)
        mock_service.validate_token = AsyncMock(side_effect=InvalidTokenError("Invalid"))

        with patch('app.auth.pocketbase.get_auth_service', return_value=mock_service):
            user = await get_optional_user(mock_request)

            assert user is None


class TestProtectedEndpoints:
    """Tests for protected API endpoints."""

    def test_frames_api_requires_auth(self, temp_data_dir_with_structure):
        """Frame creation should require authentication."""
        from app.main import create_app
        from fastapi.testclient import TestClient

        app = create_app(data_path=temp_data_dir_with_structure, require_auth=True)
        client = TestClient(app)

        # Request without token should fail
        response = client.post("/api/frames", json={
            "type": "bug",
            "owner": "user-001",
        })

        assert response.status_code == 401

    def test_frames_api_with_valid_auth(self, temp_data_dir_with_structure):
        """Frame creation should work with valid auth."""
        from app.main import create_app
        from app.auth.pocketbase import PocketBaseAuthService
        from fastapi.testclient import TestClient

        app = create_app(data_path=temp_data_dir_with_structure, require_auth=True)

        # Mock the auth service
        with patch.object(
            PocketBaseAuthService,
            'validate_token',
            new_callable=AsyncMock,
            return_value={
                "id": "user-123",
                "email": "test@example.com",
                "name": "Test User",
                "verified": True,
            }
        ):
            client = TestClient(app)

            response = client.post(
                "/api/frames",
                json={"type": "bug", "owner": "user-123"},
                headers={"Authorization": "Bearer valid-token"}
            )

            assert response.status_code == 201
