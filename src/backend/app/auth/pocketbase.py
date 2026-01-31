"""
PocketBase Authentication Service for Framer Backend.

TDD Phase 3: Authentication implementation.
"""
from typing import Optional
import httpx
from pydantic import BaseModel
from fastapi import Request, HTTPException


# Exception classes
class InvalidTokenError(Exception):
    """Raised when a token is invalid or malformed."""
    pass


class TokenExpiredError(Exception):
    """Raised when a token has expired."""
    pass


# User model
class User(BaseModel):
    """User model for authenticated users."""
    id: str
    email: str
    name: Optional[str] = None
    verified: bool = False


# Auth service singleton
_auth_service: Optional["PocketBaseAuthService"] = None


def get_auth_service() -> "PocketBaseAuthService":
    """Get or create the PocketBase auth service singleton."""
    global _auth_service
    if _auth_service is None:
        _auth_service = PocketBaseAuthService()
    return _auth_service


class PocketBaseAuthService:
    """
    Authentication service that validates tokens against PocketBase.
    """

    def __init__(self, pocketbase_url: str = "http://localhost:8090"):
        """
        Initialize the auth service.

        Args:
            pocketbase_url: URL of the PocketBase server
        """
        self.pocketbase_url = pocketbase_url

    async def validate_token(self, token: str) -> dict:
        """
        Validate a JWT token against PocketBase.

        Args:
            token: JWT token to validate

        Returns:
            User info dict with id, email, name, verified

        Raises:
            InvalidTokenError: If the token is invalid
            TokenExpiredError: If the token has expired
        """
        return await self._verify_with_pocketbase(token)

    async def _verify_with_pocketbase(self, token: str) -> dict:
        """
        Verify token with PocketBase API.

        Args:
            token: JWT token to verify

        Returns:
            User info from PocketBase

        Raises:
            InvalidTokenError: If the token is invalid
            TokenExpiredError: If the token has expired
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.pocketbase_url}/api/collections/users/auth-refresh",
                    headers={"Authorization": token}
                )

                if response.status_code == 401:
                    raise InvalidTokenError("Invalid or expired token")

                if response.status_code == 400:
                    data = response.json()
                    if "expired" in str(data).lower():
                        raise TokenExpiredError("Token has expired")
                    raise InvalidTokenError("Invalid token")

                response.raise_for_status()
                data = response.json()

                record = data.get("record", {})
                return {
                    "id": record.get("id"),
                    "email": record.get("email"),
                    "name": record.get("name"),
                    "verified": record.get("verified", False),
                }

            except httpx.RequestError as e:
                raise InvalidTokenError(f"Failed to verify token: {e}")


async def get_current_user(request: Request) -> User:
    """
    FastAPI dependency to get the current authenticated user.

    Extracts Bearer token from Authorization header and validates it.

    Args:
        request: FastAPI request object

    Returns:
        Authenticated User object

    Raises:
        HTTPException: 401 if no token or invalid token
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = auth_header[7:]  # Remove "Bearer " prefix

    try:
        auth_service = get_auth_service()
        user_info = await auth_service.validate_token(token)
        return User(**user_info)
    except (InvalidTokenError, TokenExpiredError) as e:
        raise HTTPException(status_code=401, detail=str(e))


async def get_optional_user(request: Request) -> Optional[User]:
    """
    FastAPI dependency to optionally get the current user.

    Returns None instead of raising if no token or invalid token.

    Args:
        request: FastAPI request object

    Returns:
        User object if valid token present, None otherwise
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None

    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]  # Remove "Bearer " prefix

    try:
        auth_service = get_auth_service()
        user_info = await auth_service.validate_token(token)
        return User(**user_info)
    except (InvalidTokenError, TokenExpiredError):
        return None
