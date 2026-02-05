"""
User and Team proxy API endpoints.

Proxies requests to PocketBase for user/team management.
"""
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel


POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://localhost:8090")


# Response models


class UserResponse(BaseModel):
    """Response model for a user."""
    id: str
    email: str
    name: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None


class TeamResponse(BaseModel):
    """Response model for a team."""
    id: str
    name: str
    description: Optional[str] = None


class TeamMemberResponse(BaseModel):
    """Response model for a team member."""
    id: str
    team: str
    user: str
    role: Optional[str] = None


# Helper functions (module-level, for easy mocking in tests)


async def fetch_users_from_pocketbase() -> list[dict]:
    """
    Fetch all users from PocketBase.

    Returns:
        List of user dicts with id, email, name, role, avatar.

    Raises:
        httpx.HTTPError: If the request to PocketBase fails.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{POCKETBASE_URL}/api/collections/users/records",
            params={"perPage": 200},
        )
        response.raise_for_status()
        data = response.json()
        return [
            {
                "id": record.get("id", ""),
                "email": record.get("email", ""),
                "name": record.get("name"),
                "role": record.get("role"),
                "avatar": record.get("avatar"),
            }
            for record in data.get("items", [])
        ]


async def fetch_teams_from_pocketbase() -> list[dict]:
    """
    Fetch all teams from PocketBase.

    Returns:
        List of team dicts with id, name, description.

    Raises:
        httpx.HTTPError: If the request to PocketBase fails.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{POCKETBASE_URL}/api/collections/teams/records",
            params={"perPage": 200},
        )
        response.raise_for_status()
        data = response.json()
        return [
            {
                "id": record.get("id", ""),
                "name": record.get("name", ""),
                "description": record.get("description"),
            }
            for record in data.get("items", [])
        ]


async def fetch_team_members_from_pocketbase(
    team_id: Optional[str] = None,
) -> list[dict]:
    """
    Fetch team members from PocketBase, optionally filtered by team_id.

    Args:
        team_id: If provided, filter members by this team ID.

    Returns:
        List of team member dicts with id, team, user, role.

    Raises:
        httpx.HTTPError: If the request to PocketBase fails.
    """
    params: dict = {"perPage": 200}
    if team_id:
        params["filter"] = f'team="{team_id}"'

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{POCKETBASE_URL}/api/collections/team_members/records",
            params=params,
        )
        response.raise_for_status()
        data = response.json()
        return [
            {
                "id": record.get("id", ""),
                "team": record.get("team", ""),
                "user": record.get("user", ""),
                "role": record.get("role"),
            }
            for record in data.get("items", [])
        ]


# Router factory function


def create_users_router() -> APIRouter:
    """Create the users/teams API router."""
    router = APIRouter()

    @router.get("/users", response_model=list[UserResponse])
    async def list_users() -> list[UserResponse]:
        """List all users from PocketBase."""
        try:
            users = await fetch_users_from_pocketbase()
            return [UserResponse(**u) for u in users]
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to fetch users from PocketBase",
            )

    @router.get("/teams", response_model=list[TeamResponse])
    async def list_teams() -> list[TeamResponse]:
        """List all teams from PocketBase."""
        try:
            teams = await fetch_teams_from_pocketbase()
            return [TeamResponse(**t) for t in teams]
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to fetch teams from PocketBase",
            )

    @router.get("/teams/{team_id}/members", response_model=list[TeamMemberResponse])
    async def list_team_members(team_id: str) -> list[TeamMemberResponse]:
        """List members of a specific team."""
        try:
            members = await fetch_team_members_from_pocketbase(team_id=team_id)
            return [TeamMemberResponse(**m) for m in members]
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to fetch team members from PocketBase",
            )

    return router
