"""
Admin API endpoints for managing application configuration.
"""
import os
import logging
from typing import Optional

import httpx
import yaml
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.agents.config import get_ai_config, reload_ai_config

logger = logging.getLogger(__name__)

POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://localhost:8090")
AI_CONFIG_PATH = os.getenv("AI_CONFIG_PATH", "/config/ai.yaml")


# --- Models ---

class AIConfigResponse(BaseModel):
    """Response model for AI configuration."""
    provider: str
    model: str
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    temperature: float
    max_tokens: int
    timeout: int
    ssl_verify: bool


class AIConfigUpdateRequest(BaseModel):
    """Request model for partial AI configuration updates."""
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=None, ge=1)
    timeout: Optional[int] = Field(default=None, ge=1)
    ssl_verify: Optional[bool] = None


# --- Auth ---

async def validate_admin_token(request: Request) -> None:
    """
    Validate that the request carries a valid PocketBase admin token.

    Extracts the Bearer token from the Authorization header and verifies it
    against the PocketBase admin auth-refresh endpoint.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = auth_header[len("Bearer "):]

    try:
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            resp = await client.post(
                f"{POCKETBASE_URL}/api/collections/_superusers/auth-refresh",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired admin token",
                )
    except httpx.RequestError as exc:
        logger.error("PocketBase auth check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify admin token",
        )


# --- Router ---

def create_admin_router() -> APIRouter:
    """Create the admin API router."""
    router = APIRouter()

    @router.get("/config", response_model=AIConfigResponse)
    async def get_config(request: Request) -> AIConfigResponse:
        """Get the current AI configuration."""
        await validate_admin_token(request)

        config = get_ai_config()
        return AIConfigResponse(
            provider=config.provider,
            model=config.model,
            api_key=config.api_key,
            endpoint=config.endpoint,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            timeout=config.timeout,
            ssl_verify=config.ssl_verify,
        )

    @router.put("/config", response_model=AIConfigResponse)
    async def update_config(
        update: AIConfigUpdateRequest,
        request: Request,
    ) -> AIConfigResponse:
        """Update the AI configuration (partial update)."""
        await validate_admin_token(request)

        # Read the current YAML config file (or start with empty dict)
        try:
            with open(AI_CONFIG_PATH) as f:
                current_data = yaml.safe_load(f) or {}
        except FileNotFoundError:
            current_data = {}

        # Merge only the fields that were explicitly provided
        update_fields = update.model_dump(exclude_none=True)
        current_data.update(update_fields)

        # Write updated config back to YAML
        with open(AI_CONFIG_PATH, "w") as f:
            yaml.dump(current_data, f, default_flow_style=False, sort_keys=False)

        # Reload the singleton so the app picks up changes
        config = reload_ai_config()

        return AIConfigResponse(
            provider=config.provider,
            model=config.model,
            api_key=config.api_key,
            endpoint=config.endpoint,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            timeout=config.timeout,
            ssl_verify=config.ssl_verify,
        )

    return router
