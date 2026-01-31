"""
Tests for Frames API endpoints.

TDD Phase 2.1: Frame API Endpoints
"""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient


@pytest.fixture
def app_with_data_dir(temp_data_dir_with_structure):
    """Create FastAPI app with test data directory."""
    from app.main import create_app

    app = create_app(data_path=temp_data_dir_with_structure)
    return app, temp_data_dir_with_structure


@pytest.fixture
def client(app_with_data_dir):
    """Create test client."""
    app, _ = app_with_data_dir
    return TestClient(app)


@pytest.fixture
def client_with_frame(app_with_data_dir, sample_frame_content, sample_meta_yaml):
    """Create test client with a pre-existing frame."""
    app, data_dir = app_with_data_dir

    # Create a frame
    frame_id = "f-2026-01-30-test123"
    frame_dir = data_dir / "frames" / frame_id
    frame_dir.mkdir(parents=True)
    (frame_dir / "frame.md").write_text(sample_frame_content)
    (frame_dir / "meta.yaml").write_text(sample_meta_yaml)

    return TestClient(app), frame_id


class TestFramesAPICreate:
    """Tests for frame creation endpoint."""

    def test_create_frame(self, client):
        """POST /api/frames should create a new frame."""
        response = client.post("/api/frames", json={
            "type": "bug",
            "owner": "user-001",
        })

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["type"] == "bug"
        assert data["status"] == "draft"
        assert data["owner"] == "user-001"

    def test_create_frame_with_content(self, client):
        """POST /api/frames with content should create frame with content."""
        response = client.post("/api/frames", json={
            "type": "feature",
            "owner": "user-002",
            "content": {
                "problem_statement": "Need a new feature",
            }
        })

        assert response.status_code == 201
        data = response.json()
        assert data["content"]["problem_statement"] == "Need a new feature"

    def test_create_frame_invalid_type(self, client):
        """POST /api/frames with invalid type should return 422."""
        response = client.post("/api/frames", json={
            "type": "invalid",
            "owner": "user-001",
        })

        assert response.status_code == 422


class TestFramesAPIRead:
    """Tests for frame read endpoints."""

    def test_get_frame(self, client_with_frame):
        """GET /api/frames/:id should return frame."""
        client, frame_id = client_with_frame

        response = client.get(f"/api/frames/{frame_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == frame_id
        assert "content" in data
        assert "meta" in data

    def test_get_frame_not_found(self, client):
        """GET /api/frames/:id for nonexistent frame should return 404."""
        response = client.get("/api/frames/f-2026-01-30-nonexistent")

        assert response.status_code == 404

    def test_list_frames(self, client_with_frame):
        """GET /api/frames should return list of frames."""
        client, frame_id = client_with_frame

        response = client.get("/api/frames")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_list_frames_filter_by_status(self, client_with_frame):
        """GET /api/frames?status=draft should filter by status."""
        client, _ = client_with_frame

        response = client.get("/api/frames?status=draft")

        assert response.status_code == 200
        data = response.json()
        assert all(f["status"] == "draft" for f in data)

    def test_list_frames_filter_by_owner(self, client_with_frame):
        """GET /api/frames?owner=user-001 should filter by owner."""
        client, _ = client_with_frame

        response = client.get("/api/frames?owner=user-001")

        assert response.status_code == 200


class TestFramesAPIUpdate:
    """Tests for frame update endpoints."""

    def test_update_frame_content(self, client_with_frame):
        """PUT /api/frames/:id should update frame content."""
        client, frame_id = client_with_frame

        response = client.put(f"/api/frames/{frame_id}", json={
            "content": {
                "problem_statement": "Updated problem statement",
                "user_perspective": "Updated user perspective",
            }
        })

        assert response.status_code == 200
        data = response.json()
        assert data["content"]["problem_statement"] == "Updated problem statement"

    def test_update_frame_not_found(self, client):
        """PUT /api/frames/:id for nonexistent frame should return 404."""
        response = client.put("/api/frames/f-2026-01-30-nonexistent", json={
            "content": {"problem_statement": "Test"}
        })

        assert response.status_code == 404

    def test_change_frame_status(self, client_with_frame):
        """PATCH /api/frames/:id/status should change status."""
        client, frame_id = client_with_frame

        response = client.patch(f"/api/frames/{frame_id}/status", json={
            "status": "in_review"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_review"

    def test_change_frame_status_invalid(self, client_with_frame):
        """PATCH /api/frames/:id/status with invalid status should return 422."""
        client, frame_id = client_with_frame

        response = client.patch(f"/api/frames/{frame_id}/status", json={
            "status": "invalid_status"
        })

        assert response.status_code == 422


class TestFramesAPIDelete:
    """Tests for frame deletion endpoint."""

    def test_delete_frame(self, client_with_frame):
        """DELETE /api/frames/:id should delete frame."""
        client, frame_id = client_with_frame

        response = client.delete(f"/api/frames/{frame_id}")

        assert response.status_code == 204

        # Verify frame is gone
        response = client.get(f"/api/frames/{frame_id}")
        assert response.status_code == 404

    def test_delete_frame_not_found(self, client):
        """DELETE /api/frames/:id for nonexistent frame should return 404."""
        response = client.delete("/api/frames/f-2026-01-30-nonexistent")

        assert response.status_code == 404


class TestFramesAPIComments:
    """Tests for frame comments endpoint."""

    def test_add_comment(self, client_with_frame):
        """POST /api/frames/:id/comments should add comment."""
        client, frame_id = client_with_frame

        response = client.post(f"/api/frames/{frame_id}/comments", json={
            "section": "engineering",
            "author": "user-789",
            "content": "Consider rate limiting.",
        })

        assert response.status_code == 201
        data = response.json()
        assert data["section"] == "engineering"
        assert data["content"] == "Consider rate limiting."

    def test_get_comments(self, client_with_frame):
        """GET /api/frames/:id/comments should return comments."""
        client, frame_id = client_with_frame

        # Add a comment first
        client.post(f"/api/frames/{frame_id}/comments", json={
            "section": "problem",
            "author": "user-001",
            "content": "Test comment",
        })

        response = client.get(f"/api/frames/{frame_id}/comments")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
