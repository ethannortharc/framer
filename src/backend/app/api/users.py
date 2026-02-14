"""
User and Team proxy API endpoints.

Proxies requests to PocketBase for user/team management.
"""
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field


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


class CreateTeamRequest(BaseModel):
    """Request body for creating a team (project)."""
    name: str
    description: Optional[str] = None


class AddTeamMemberRequest(BaseModel):
    """Request body for adding a member to a team."""
    user_id: str
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


async def create_team_in_pocketbase(name: str, description: Optional[str] = None) -> dict:
    """Create a new team in PocketBase."""
    async with httpx.AsyncClient() as client:
        body: dict = {"name": name}
        if description:
            body["description"] = description
        response = await client.post(
            f"{POCKETBASE_URL}/api/collections/teams/records",
            json=body,
        )
        response.raise_for_status()
        record = response.json()
        return {
            "id": record.get("id", ""),
            "name": record.get("name", ""),
            "description": record.get("description"),
        }


async def add_team_member_in_pocketbase(team_id: str, user_id: str, role: Optional[str] = None) -> dict:
    """Add a member to a team in PocketBase."""
    async with httpx.AsyncClient() as client:
        body: dict = {"team": team_id, "user": user_id}
        if role:
            body["role"] = role
        response = await client.post(
            f"{POCKETBASE_URL}/api/collections/team_members/records",
            json=body,
        )
        response.raise_for_status()
        record = response.json()
        return {
            "id": record.get("id", ""),
            "team": record.get("team", ""),
            "user": record.get("user", ""),
            "role": record.get("role"),
        }


async def remove_team_member_in_pocketbase(member_record_id: str) -> None:
    """Remove a team member record from PocketBase."""
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{POCKETBASE_URL}/api/collections/team_members/records/{member_record_id}",
        )
        response.raise_for_status()


async def fetch_user_teams_from_pocketbase(user_id: str) -> list[dict]:
    """Fetch teams that a user belongs to."""
    async with httpx.AsyncClient() as client:
        # Get team_members for this user
        response = await client.get(
            f"{POCKETBASE_URL}/api/collections/team_members/records",
            params={"perPage": 200, "filter": f'user="{user_id}"'},
        )
        response.raise_for_status()
        members_data = response.json()
        team_ids = [m.get("team") for m in members_data.get("items", []) if m.get("team")]

        if not team_ids:
            return []

        # Fetch team details
        filter_parts = [f'id="{tid}"' for tid in team_ids]
        team_filter = " || ".join(filter_parts)
        response = await client.get(
            f"{POCKETBASE_URL}/api/collections/teams/records",
            params={"perPage": 200, "filter": team_filter},
        )
        response.raise_for_status()
        teams_data = response.json()
        return [
            {
                "id": record.get("id", ""),
                "name": record.get("name", ""),
                "description": record.get("description"),
            }
            for record in teams_data.get("items", [])
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

    @router.post("/teams", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
    async def create_team(request: CreateTeamRequest) -> TeamResponse:
        """Create a new team (project) in PocketBase."""
        try:
            team = await create_team_in_pocketbase(request.name, request.description)
            return TeamResponse(**team)
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to create team in PocketBase",
            )

    @router.post("/teams/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
    async def add_team_member(team_id: str, request: AddTeamMemberRequest) -> TeamMemberResponse:
        """Add a user to a team."""
        try:
            member = await add_team_member_in_pocketbase(team_id, request.user_id, request.role)
            return TeamMemberResponse(**member)
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to add team member in PocketBase",
            )

    @router.delete("/teams/{team_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def remove_team_member(team_id: str, member_id: str):
        """Remove a member from a team."""
        try:
            await remove_team_member_in_pocketbase(member_id)
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to remove team member from PocketBase",
            )

    @router.get("/users/{user_id}/teams", response_model=list[TeamResponse])
    async def get_user_teams(user_id: str) -> list[TeamResponse]:
        """Get teams for a specific user."""
        try:
            teams = await fetch_user_teams_from_pocketbase(user_id)
            return [TeamResponse(**t) for t in teams]
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to fetch user teams from PocketBase",
            )

    return router
