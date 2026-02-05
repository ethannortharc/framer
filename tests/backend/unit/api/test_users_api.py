"""
Tests for User/Team proxy API endpoints.

Tests use mocked PocketBase fetch functions to avoid real HTTP calls.
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(temp_data_dir_with_structure):
    """Create a test client with a minimal app."""
    app = create_app(data_path=temp_data_dir_with_structure)
    return TestClient(app)


class TestListUsers:
    """Tests for GET /api/users."""

    def test_list_users_returns_200(self, client):
        """GET /api/users should return 200 with a list of users."""
        mock_users = [
            {
                "id": "user001",
                "email": "alice@example.com",
                "name": "Alice",
                "role": "admin",
                "avatar": "avatar1.png",
            },
            {
                "id": "user002",
                "email": "bob@example.com",
                "name": "Bob",
                "role": None,
                "avatar": None,
            },
        ]
        with patch(
            "app.api.users.fetch_users_from_pocketbase",
            new_callable=AsyncMock,
            return_value=mock_users,
        ):
            response = client.get("/api/users")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "user001"
        assert data[0]["email"] == "alice@example.com"
        assert data[0]["name"] == "Alice"
        assert data[0]["role"] == "admin"
        assert data[0]["avatar"] == "avatar1.png"
        assert data[1]["id"] == "user002"
        assert data[1]["name"] == "Bob"
        assert data[1]["role"] is None
        assert data[1]["avatar"] is None

    def test_list_users_empty(self, client):
        """GET /api/users should return empty list when no users exist."""
        with patch(
            "app.api.users.fetch_users_from_pocketbase",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/users")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_users_pocketbase_error_returns_502(self, client):
        """GET /api/users should return 502 when PocketBase is unreachable."""
        import httpx

        with patch(
            "app.api.users.fetch_users_from_pocketbase",
            new_callable=AsyncMock,
            side_effect=httpx.HTTPError("Connection refused"),
        ):
            response = client.get("/api/users")

        assert response.status_code == 502
        assert "Failed to fetch users" in response.json()["detail"]


class TestListTeams:
    """Tests for GET /api/teams."""

    def test_list_teams_returns_200(self, client):
        """GET /api/teams should return 200 with a list of teams."""
        mock_teams = [
            {
                "id": "team001",
                "name": "Engineering",
                "description": "Core engineering team",
            },
            {
                "id": "team002",
                "name": "Design",
                "description": None,
            },
        ]
        with patch(
            "app.api.users.fetch_teams_from_pocketbase",
            new_callable=AsyncMock,
            return_value=mock_teams,
        ):
            response = client.get("/api/teams")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "team001"
        assert data[0]["name"] == "Engineering"
        assert data[0]["description"] == "Core engineering team"
        assert data[1]["id"] == "team002"
        assert data[1]["description"] is None

    def test_list_teams_empty(self, client):
        """GET /api/teams should return empty list when no teams exist."""
        with patch(
            "app.api.users.fetch_teams_from_pocketbase",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/teams")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_teams_pocketbase_error_returns_502(self, client):
        """GET /api/teams should return 502 when PocketBase is unreachable."""
        import httpx

        with patch(
            "app.api.users.fetch_teams_from_pocketbase",
            new_callable=AsyncMock,
            side_effect=httpx.HTTPError("Connection refused"),
        ):
            response = client.get("/api/teams")

        assert response.status_code == 502
        assert "Failed to fetch teams" in response.json()["detail"]


class TestListTeamMembers:
    """Tests for GET /api/teams/{team_id}/members."""

    def test_list_team_members_returns_200(self, client):
        """GET /api/teams/:id/members should return 200 with members."""
        mock_members = [
            {
                "id": "tm001",
                "team": "team001",
                "user": "user001",
                "role": "lead",
            },
            {
                "id": "tm002",
                "team": "team001",
                "user": "user002",
                "role": None,
            },
        ]
        with patch(
            "app.api.users.fetch_team_members_from_pocketbase",
            new_callable=AsyncMock,
            return_value=mock_members,
        ) as mock_fetch:
            response = client.get("/api/teams/team001/members")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "tm001"
        assert data[0]["team"] == "team001"
        assert data[0]["user"] == "user001"
        assert data[0]["role"] == "lead"
        assert data[1]["role"] is None
        # Verify the function was called with the correct team_id
        mock_fetch.assert_awaited_once_with(team_id="team001")

    def test_list_team_members_empty(self, client):
        """GET /api/teams/:id/members should return empty list when no members."""
        with patch(
            "app.api.users.fetch_team_members_from_pocketbase",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/api/teams/team001/members")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_team_members_pocketbase_error_returns_502(self, client):
        """GET /api/teams/:id/members should return 502 when PocketBase fails."""
        import httpx

        with patch(
            "app.api.users.fetch_team_members_from_pocketbase",
            new_callable=AsyncMock,
            side_effect=httpx.HTTPError("Connection refused"),
        ):
            response = client.get("/api/teams/team001/members")

        assert response.status_code == 502
        assert "Failed to fetch team members" in response.json()["detail"]
