"""
Tests for Index Service.

TDD Phase 1.5: Index Service (SQLite Cache)
"""
import pytest
from pathlib import Path


class TestIndexServiceCreate:
    """Tests for index creation."""

    def test_create_index_creates_database(self, temp_data_dir):
        """Creating index should create SQLite database file."""
        from app.services.index_service import IndexService

        service = IndexService(data_path=temp_data_dir)
        service.create_index()

        db_file = temp_data_dir / "index.db"
        assert db_file.exists()

    def test_create_index_creates_tables(self, temp_data_dir):
        """Creating index should create required tables."""
        from app.services.index_service import IndexService
        import sqlite3

        service = IndexService(data_path=temp_data_dir)
        service.create_index()

        # Verify tables exist
        db_file = temp_data_dir / "index.db"
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cursor.fetchall()}

        conn.close()

        assert "frames" in tables

    def test_create_index_idempotent(self, temp_data_dir):
        """Creating index multiple times should not fail."""
        from app.services.index_service import IndexService

        service = IndexService(data_path=temp_data_dir)
        service.create_index()
        service.create_index()  # Should not raise

        db_file = temp_data_dir / "index.db"
        assert db_file.exists()


class TestIndexServiceFrameOperations:
    """Tests for indexing frame operations."""

    def test_index_frame(self, temp_data_dir):
        """Indexing a frame should add it to the database."""
        from app.services.index_service import IndexService
        from app.models.frame import FrameMeta, FrameStatus, FrameType
        from datetime import datetime, timezone

        service = IndexService(data_path=temp_data_dir)
        service.create_index()

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )

        service.index_frame(meta)

        # Verify frame is indexed
        frames = service.query_frames()
        assert len(frames) == 1
        assert frames[0]["id"] == "f-2026-01-30-abc123"

    def test_update_frame_index(self, temp_data_dir):
        """Updating indexed frame should update the database."""
        from app.services.index_service import IndexService
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        service = IndexService(data_path=temp_data_dir)
        service.create_index()

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )
        service.index_frame(meta)

        # Update status
        meta.status = FrameStatus.IN_REVIEW
        service.index_frame(meta)

        frames = service.query_frames()
        assert len(frames) == 1
        assert frames[0]["status"] == "in_review"

    def test_remove_frame_from_index(self, temp_data_dir):
        """Removing frame should delete it from the database."""
        from app.services.index_service import IndexService
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        service = IndexService(data_path=temp_data_dir)
        service.create_index()

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )
        service.index_frame(meta)
        service.remove_frame("f-2026-01-30-abc123")

        frames = service.query_frames()
        assert len(frames) == 0


class TestIndexServiceQuery:
    """Tests for querying the index."""

    def test_query_by_status(self, temp_data_dir):
        """Should filter frames by status."""
        from app.services.index_service import IndexService
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        service = IndexService(data_path=temp_data_dir)
        service.create_index()

        # Add frames with different statuses
        for i, status in enumerate([FrameStatus.DRAFT, FrameStatus.IN_REVIEW, FrameStatus.DRAFT]):
            meta = FrameMeta(
                id=f"f-2026-01-30-test{i:03d}",
                type=FrameType.BUG,
                status=status,
                owner="user-001",
            )
            service.index_frame(meta)

        # Query drafts
        drafts = service.query_frames(status=FrameStatus.DRAFT)
        assert len(drafts) == 2

        # Query in_review
        in_review = service.query_frames(status=FrameStatus.IN_REVIEW)
        assert len(in_review) == 1

    def test_query_by_owner(self, temp_data_dir):
        """Should filter frames by owner."""
        from app.services.index_service import IndexService
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        service = IndexService(data_path=temp_data_dir)
        service.create_index()

        # Add frames with different owners
        for i, owner in enumerate(["user-001", "user-002", "user-001"]):
            meta = FrameMeta(
                id=f"f-2026-01-30-test{i:03d}",
                type=FrameType.BUG,
                status=FrameStatus.DRAFT,
                owner=owner,
            )
            service.index_frame(meta)

        user1_frames = service.query_frames(owner="user-001")
        assert len(user1_frames) == 2

        user2_frames = service.query_frames(owner="user-002")
        assert len(user2_frames) == 1

    def test_query_by_type(self, temp_data_dir):
        """Should filter frames by type."""
        from app.services.index_service import IndexService
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        service = IndexService(data_path=temp_data_dir)
        service.create_index()

        # Add frames with different types
        for i, frame_type in enumerate([FrameType.BUG, FrameType.FEATURE, FrameType.BUG]):
            meta = FrameMeta(
                id=f"f-2026-01-30-test{i:03d}",
                type=frame_type,
                status=FrameStatus.DRAFT,
                owner="user-001",
            )
            service.index_frame(meta)

        bugs = service.query_frames(frame_type=FrameType.BUG)
        assert len(bugs) == 2

        features = service.query_frames(frame_type=FrameType.FEATURE)
        assert len(features) == 1

    def test_query_combined_filters(self, temp_data_dir):
        """Should support multiple filters."""
        from app.services.index_service import IndexService
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        service = IndexService(data_path=temp_data_dir)
        service.create_index()

        # Add diverse frames
        frames_data = [
            ("f-2026-01-30-test001", FrameType.BUG, FrameStatus.DRAFT, "user-001"),
            ("f-2026-01-30-test002", FrameType.BUG, FrameStatus.IN_REVIEW, "user-001"),
            ("f-2026-01-30-test003", FrameType.FEATURE, FrameStatus.DRAFT, "user-001"),
            ("f-2026-01-30-test004", FrameType.BUG, FrameStatus.DRAFT, "user-002"),
        ]

        for frame_id, frame_type, status, owner in frames_data:
            meta = FrameMeta(id=frame_id, type=frame_type, status=status, owner=owner)
            service.index_frame(meta)

        # Query: draft bugs owned by user-001
        results = service.query_frames(
            status=FrameStatus.DRAFT,
            frame_type=FrameType.BUG,
            owner="user-001",
        )
        assert len(results) == 1
        assert results[0]["id"] == "f-2026-01-30-test001"


class TestIndexServiceRebuild:
    """Tests for rebuilding the index from files."""

    def test_rebuild_index_from_files(self, temp_data_dir_with_structure, sample_meta_yaml):
        """Should rebuild index by scanning frame directories."""
        from app.services.index_service import IndexService

        service = IndexService(data_path=temp_data_dir_with_structure)
        service.create_index()

        # Create frame directories with meta files
        for i in range(3):
            frame_id = f"f-2026-01-30-test{i:03d}"
            frame_dir = temp_data_dir_with_structure / "frames" / frame_id
            frame_dir.mkdir(parents=True)
            meta_content = sample_meta_yaml.replace("f-2026-01-30-test123", frame_id)
            (frame_dir / "meta.yaml").write_text(meta_content)

        # Rebuild index
        count = service.rebuild_index()

        assert count == 3
        frames = service.query_frames()
        assert len(frames) == 3

    def test_rebuild_index_clears_old_entries(self, temp_data_dir_with_structure, sample_meta_yaml):
        """Rebuilding should remove entries for deleted frames."""
        from app.services.index_service import IndexService
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        service = IndexService(data_path=temp_data_dir_with_structure)
        service.create_index()

        # Add a frame to index
        meta = FrameMeta(
            id="f-2026-01-30-deleted",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )
        service.index_frame(meta)

        # Create only one frame directory
        frame_dir = temp_data_dir_with_structure / "frames" / "f-2026-01-30-existing"
        frame_dir.mkdir(parents=True)
        meta_content = sample_meta_yaml.replace("f-2026-01-30-test123", "f-2026-01-30-existing")
        (frame_dir / "meta.yaml").write_text(meta_content)

        # Rebuild - should only have the existing frame
        service.rebuild_index()

        frames = service.query_frames()
        assert len(frames) == 1
        assert frames[0]["id"] == "f-2026-01-30-existing"
