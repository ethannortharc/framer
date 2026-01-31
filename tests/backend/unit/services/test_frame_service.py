"""
Tests for Frame Service.

TDD Phase 1.2: Frame Service (File Operations)
"""
import pytest
from pathlib import Path
import json


class TestFrameServiceCreate:
    """Tests for frame creation."""

    def test_create_frame_creates_directory(self, temp_data_dir_with_structure):
        """Creating a frame should create its directory."""
        from app.services.frame_service import FrameService
        from app.models.frame import FrameType

        service = FrameService(data_path=temp_data_dir_with_structure)
        frame = service.create_frame(
            frame_type=FrameType.BUG,
            owner="user-001",
        )

        frame_dir = temp_data_dir_with_structure / "frames" / frame.id
        assert frame_dir.exists()
        assert frame_dir.is_dir()

    def test_create_frame_writes_meta_yaml(self, temp_data_dir_with_structure):
        """Creating a frame should write meta.yaml."""
        from app.services.frame_service import FrameService
        from app.models.frame import FrameType

        service = FrameService(data_path=temp_data_dir_with_structure)
        frame = service.create_frame(
            frame_type=FrameType.BUG,
            owner="user-001",
        )

        meta_file = temp_data_dir_with_structure / "frames" / frame.id / "meta.yaml"
        assert meta_file.exists()

        content = meta_file.read_text()
        assert "id:" in content
        assert "type: bug" in content
        assert "status: draft" in content
        assert "owner: user-001" in content

    def test_create_frame_writes_frame_md(self, temp_data_dir_with_structure):
        """Creating a frame should write frame.md."""
        from app.services.frame_service import FrameService
        from app.models.frame import FrameType

        service = FrameService(data_path=temp_data_dir_with_structure)
        frame = service.create_frame(
            frame_type=FrameType.BUG,
            owner="user-001",
        )

        frame_file = temp_data_dir_with_structure / "frames" / frame.id / "frame.md"
        assert frame_file.exists()

    def test_create_frame_generates_valid_id(self, temp_data_dir_with_structure):
        """Created frame should have valid ID format."""
        from app.services.frame_service import FrameService
        from app.models.frame import FrameType, FRAME_ID_PATTERN

        service = FrameService(data_path=temp_data_dir_with_structure)
        frame = service.create_frame(
            frame_type=FrameType.FEATURE,
            owner="user-002",
        )

        assert FRAME_ID_PATTERN.match(frame.id)

    def test_create_frame_sets_draft_status(self, temp_data_dir_with_structure):
        """New frames should have draft status."""
        from app.services.frame_service import FrameService
        from app.models.frame import FrameType, FrameStatus

        service = FrameService(data_path=temp_data_dir_with_structure)
        frame = service.create_frame(
            frame_type=FrameType.BUG,
            owner="user-001",
        )

        assert frame.status == FrameStatus.DRAFT

    def test_create_frame_with_initial_content(self, temp_data_dir_with_structure):
        """Creating frame with content should write it."""
        from app.services.frame_service import FrameService
        from app.models.frame import FrameType, FrameContent

        service = FrameService(data_path=temp_data_dir_with_structure)
        content = FrameContent(problem_statement="Test problem")
        frame = service.create_frame(
            frame_type=FrameType.BUG,
            owner="user-001",
            content=content,
        )

        frame_file = temp_data_dir_with_structure / "frames" / frame.id / "frame.md"
        assert "Test problem" in frame_file.read_text()


class TestFrameServiceRead:
    """Tests for reading frames."""

    def test_get_frame_reads_from_files(self, temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
        """Getting a frame should read from files."""
        from app.services.frame_service import FrameService

        # Set up test frame directory
        frame_id = "f-2026-01-30-test123"
        frame_dir = temp_data_dir_with_structure / "frames" / frame_id
        frame_dir.mkdir()
        (frame_dir / "frame.md").write_text(sample_frame_content)
        (frame_dir / "meta.yaml").write_text(sample_meta_yaml)

        service = FrameService(data_path=temp_data_dir_with_structure)
        frame = service.get_frame(frame_id)

        assert frame.id == frame_id
        assert frame.type.value == "bug"
        assert frame.status.value == "draft"
        assert "Test problem" in frame.content.problem_statement

    def test_get_frame_not_found_raises(self, temp_data_dir_with_structure):
        """Getting nonexistent frame should raise error."""
        from app.services.frame_service import FrameService, FrameNotFoundError

        service = FrameService(data_path=temp_data_dir_with_structure)

        with pytest.raises(FrameNotFoundError):
            service.get_frame("f-2026-01-30-nonexistent")

    def test_list_frames_returns_all(self, temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
        """Listing frames should return all frames."""
        from app.services.frame_service import FrameService

        # Set up multiple test frames
        for i in range(3):
            frame_id = f"f-2026-01-30-test{i:03d}"
            frame_dir = temp_data_dir_with_structure / "frames" / frame_id
            frame_dir.mkdir()
            (frame_dir / "frame.md").write_text(sample_frame_content.replace("test123", f"test{i:03d}"))
            meta = sample_meta_yaml.replace("f-2026-01-30-test123", frame_id)
            (frame_dir / "meta.yaml").write_text(meta)

        service = FrameService(data_path=temp_data_dir_with_structure)
        frames = service.list_frames()

        assert len(frames) == 3

    def test_list_frames_empty_directory(self, temp_data_dir_with_structure):
        """Listing frames with no frames should return empty list."""
        from app.services.frame_service import FrameService

        service = FrameService(data_path=temp_data_dir_with_structure)
        frames = service.list_frames()

        assert frames == []


class TestFrameServiceUpdate:
    """Tests for updating frames."""

    def test_update_frame_content(self, temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
        """Updating frame should modify frame.md."""
        from app.services.frame_service import FrameService
        from app.models.frame import FrameContent

        # Set up test frame
        frame_id = "f-2026-01-30-test123"
        frame_dir = temp_data_dir_with_structure / "frames" / frame_id
        frame_dir.mkdir()
        (frame_dir / "frame.md").write_text(sample_frame_content)
        (frame_dir / "meta.yaml").write_text(sample_meta_yaml)

        service = FrameService(data_path=temp_data_dir_with_structure)
        new_content = FrameContent(
            problem_statement="Updated problem statement",
            user_perspective="Updated user perspective",
        )
        frame = service.update_frame_content(frame_id, new_content)

        # Read back from file
        frame_file = frame_dir / "frame.md"
        file_content = frame_file.read_text()
        assert "Updated problem statement" in file_content

    def test_update_frame_status(self, temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
        """Updating status should modify meta.yaml."""
        from app.services.frame_service import FrameService
        from app.models.frame import FrameStatus

        # Set up test frame
        frame_id = "f-2026-01-30-test123"
        frame_dir = temp_data_dir_with_structure / "frames" / frame_id
        frame_dir.mkdir()
        (frame_dir / "frame.md").write_text(sample_frame_content)
        (frame_dir / "meta.yaml").write_text(sample_meta_yaml)

        service = FrameService(data_path=temp_data_dir_with_structure)
        frame = service.update_frame_status(frame_id, FrameStatus.IN_REVIEW)

        assert frame.status == FrameStatus.IN_REVIEW

        # Verify file was updated
        meta_content = (frame_dir / "meta.yaml").read_text()
        assert "status: in_review" in meta_content


class TestFrameServiceDelete:
    """Tests for deleting frames."""

    def test_delete_frame_removes_directory(self, temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
        """Deleting frame should remove its directory."""
        from app.services.frame_service import FrameService

        # Set up test frame
        frame_id = "f-2026-01-30-test123"
        frame_dir = temp_data_dir_with_structure / "frames" / frame_id
        frame_dir.mkdir()
        (frame_dir / "frame.md").write_text(sample_frame_content)
        (frame_dir / "meta.yaml").write_text(sample_meta_yaml)

        service = FrameService(data_path=temp_data_dir_with_structure)
        service.delete_frame(frame_id)

        assert not frame_dir.exists()

    def test_delete_frame_not_found_raises(self, temp_data_dir_with_structure):
        """Deleting nonexistent frame should raise error."""
        from app.services.frame_service import FrameService, FrameNotFoundError

        service = FrameService(data_path=temp_data_dir_with_structure)

        with pytest.raises(FrameNotFoundError):
            service.delete_frame("f-2026-01-30-nonexistent")


class TestFrameServiceComments:
    """Tests for frame comments."""

    def test_add_comment_creates_file(self, temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
        """Adding first comment should create comments.json."""
        from app.services.frame_service import FrameService

        # Set up test frame
        frame_id = "f-2026-01-30-test123"
        frame_dir = temp_data_dir_with_structure / "frames" / frame_id
        frame_dir.mkdir()
        (frame_dir / "frame.md").write_text(sample_frame_content)
        (frame_dir / "meta.yaml").write_text(sample_meta_yaml)

        service = FrameService(data_path=temp_data_dir_with_structure)
        comment = service.add_comment(
            frame_id=frame_id,
            section="engineering",
            author="user-789",
            content="Consider rate limiting.",
        )

        comments_file = frame_dir / "comments.json"
        assert comments_file.exists()

        data = json.loads(comments_file.read_text())
        assert len(data["comments"]) == 1
        assert data["comments"][0]["content"] == "Consider rate limiting."

    def test_add_comment_appends_to_existing(self, temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
        """Adding comment should append to existing comments."""
        from app.services.frame_service import FrameService

        # Set up test frame with existing comments
        frame_id = "f-2026-01-30-test123"
        frame_dir = temp_data_dir_with_structure / "frames" / frame_id
        frame_dir.mkdir()
        (frame_dir / "frame.md").write_text(sample_frame_content)
        (frame_dir / "meta.yaml").write_text(sample_meta_yaml)
        (frame_dir / "comments.json").write_text(json.dumps({
            "comments": [{"id": "c-001", "section": "problem", "author": "user-001", "content": "First comment"}]
        }))

        service = FrameService(data_path=temp_data_dir_with_structure)
        service.add_comment(
            frame_id=frame_id,
            section="engineering",
            author="user-789",
            content="Second comment.",
        )

        data = json.loads((frame_dir / "comments.json").read_text())
        assert len(data["comments"]) == 2

    def test_get_comments(self, temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
        """Getting comments should return list."""
        from app.services.frame_service import FrameService

        # Set up test frame with comments
        frame_id = "f-2026-01-30-test123"
        frame_dir = temp_data_dir_with_structure / "frames" / frame_id
        frame_dir.mkdir()
        (frame_dir / "frame.md").write_text(sample_frame_content)
        (frame_dir / "meta.yaml").write_text(sample_meta_yaml)
        (frame_dir / "comments.json").write_text(json.dumps({
            "comments": [
                {"id": "c-001", "section": "problem", "author": "user-001", "content": "First"},
                {"id": "c-002", "section": "engineering", "author": "user-002", "content": "Second"},
            ]
        }))

        service = FrameService(data_path=temp_data_dir_with_structure)
        comments = service.get_comments(frame_id)

        assert len(comments) == 2


class TestFrameServiceFeedback:
    """Tests for frame feedback."""

    def test_add_feedback_creates_file(self, temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
        """Adding feedback should create feedback.md."""
        from app.services.frame_service import FrameService

        # Set up test frame
        frame_id = "f-2026-01-30-test123"
        frame_dir = temp_data_dir_with_structure / "frames" / frame_id
        frame_dir.mkdir()
        (frame_dir / "frame.md").write_text(sample_frame_content)
        (frame_dir / "meta.yaml").write_text(sample_meta_yaml)

        service = FrameService(data_path=temp_data_dir_with_structure)
        service.add_feedback(
            frame_id=frame_id,
            went_well="Implementation was smooth.",
            could_improve="Better testing next time.",
            lessons_learned="Always check edge cases.",
        )

        feedback_file = frame_dir / "feedback.md"
        assert feedback_file.exists()

        content = feedback_file.read_text()
        assert "Implementation was smooth" in content
        assert "Better testing" in content
        assert "edge cases" in content
