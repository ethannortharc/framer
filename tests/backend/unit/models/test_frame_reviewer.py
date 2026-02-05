"""
Tests for reviewer and approver fields on FrameMeta.

Task 2: Add reviewer and approver fields to FrameMeta model.
"""
import pytest
from datetime import datetime, timezone


class TestFrameMetaReviewerApprover:
    """Tests for reviewer and approver fields on FrameMeta."""

    def test_frame_meta_with_reviewer_and_approver(self):
        """FrameMeta can be created with reviewer and approver fields."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.IN_REVIEW,
            owner="user-001",
            reviewer="user-002",
            approver="user-003",
        )

        assert meta.reviewer == "user-002"
        assert meta.approver == "user-003"

    def test_reviewer_and_approver_are_optional(self):
        """reviewer and approver should default to None when not provided."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )

        assert meta.reviewer is None
        assert meta.approver is None

    def test_to_yaml_includes_reviewer_and_approver_when_set(self):
        """to_yaml() should include reviewer and approver when they are set."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.IN_REVIEW,
            owner="user-001",
            reviewer="user-002",
            approver="user-003",
        )

        yaml_str = meta.to_yaml()

        assert "reviewer: user-002" in yaml_str
        assert "approver: user-003" in yaml_str

    def test_to_yaml_excludes_reviewer_and_approver_when_none(self):
        """to_yaml() should not include reviewer/approver when they are None."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )

        yaml_str = meta.to_yaml()

        assert "reviewer" not in yaml_str
        assert "approver" not in yaml_str

    def test_from_yaml_reads_reviewer_and_approver(self):
        """from_yaml() should read reviewer and approver when present."""
        from app.models.frame import FrameMeta

        yaml_str = """id: f-2026-01-30-abc123
type: bug
status: in_review
owner: user-001
reviewer: user-002
approver: user-003
created_at: 2026-01-30T10:00:00Z
updated_at: 2026-01-30T14:30:00Z
"""
        meta = FrameMeta.from_yaml(yaml_str)

        assert meta.reviewer == "user-002"
        assert meta.approver == "user-003"

    def test_from_yaml_handles_missing_reviewer_and_approver(self):
        """from_yaml() should handle missing reviewer/approver gracefully (default None)."""
        from app.models.frame import FrameMeta

        yaml_str = """id: f-2026-01-30-abc123
type: bug
status: draft
owner: user-001
created_at: 2026-01-30T10:00:00Z
updated_at: 2026-01-30T14:30:00Z
"""
        meta = FrameMeta.from_yaml(yaml_str)

        assert meta.reviewer is None
        assert meta.approver is None

    def test_roundtrip_yaml_with_reviewer_and_approver(self):
        """Serializing to YAML and back should preserve reviewer and approver."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        original = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.FEATURE,
            status=FrameStatus.IN_REVIEW,
            owner="user-001",
            reviewer="user-002",
            approver="user-003",
        )

        yaml_str = original.to_yaml()
        restored = FrameMeta.from_yaml(yaml_str)

        assert restored.reviewer == original.reviewer
        assert restored.approver == original.approver

    def test_roundtrip_yaml_without_reviewer_and_approver(self):
        """Serializing to YAML and back should preserve None for reviewer/approver."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        original = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )

        yaml_str = original.to_yaml()
        restored = FrameMeta.from_yaml(yaml_str)

        assert restored.reviewer is None
        assert restored.approver is None
