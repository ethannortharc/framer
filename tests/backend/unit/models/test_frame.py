"""
Tests for Frame data models.

TDD Phase 1.1: Data Models
These tests define the expected behavior of Frame models.
"""
import pytest
from datetime import datetime, timezone


class TestFrameStatus:
    """Tests for FrameStatus enum."""

    def test_frame_status_has_required_values(self):
        """FrameStatus enum should have all required status values."""
        from app.models.frame import FrameStatus

        assert hasattr(FrameStatus, 'DRAFT')
        assert hasattr(FrameStatus, 'IN_REVIEW')
        assert hasattr(FrameStatus, 'READY')
        assert hasattr(FrameStatus, 'FEEDBACK')
        assert hasattr(FrameStatus, 'ARCHIVED')

    def test_frame_status_values(self):
        """FrameStatus values should be lowercase strings."""
        from app.models.frame import FrameStatus

        assert FrameStatus.DRAFT.value == "draft"
        assert FrameStatus.IN_REVIEW.value == "in_review"
        assert FrameStatus.READY.value == "ready"
        assert FrameStatus.FEEDBACK.value == "feedback"
        assert FrameStatus.ARCHIVED.value == "archived"


class TestFrameType:
    """Tests for FrameType enum."""

    def test_frame_type_has_required_values(self):
        """FrameType enum should have all required type values."""
        from app.models.frame import FrameType

        assert hasattr(FrameType, 'BUG')
        assert hasattr(FrameType, 'FEATURE')
        assert hasattr(FrameType, 'EXPLORATION')

    def test_frame_type_values(self):
        """FrameType values should be lowercase strings."""
        from app.models.frame import FrameType

        assert FrameType.BUG.value == "bug"
        assert FrameType.FEATURE.value == "feature"
        assert FrameType.EXPLORATION.value == "exploration"


class TestFrameMeta:
    """Tests for FrameMeta model."""

    def test_frame_meta_creation_with_required_fields(self):
        """FrameMeta should be created with required fields."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )

        assert meta.id == "f-2026-01-30-abc123"
        assert meta.type == FrameType.BUG
        assert meta.status == FrameStatus.DRAFT
        assert meta.owner == "user-001"

    def test_frame_meta_has_timestamp_defaults(self):
        """FrameMeta should have created_at and updated_at with defaults."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        before = datetime.now(timezone.utc)
        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )
        after = datetime.now(timezone.utc)

        assert meta.created_at is not None
        assert meta.updated_at is not None
        assert before <= meta.created_at <= after
        assert before <= meta.updated_at <= after

    def test_frame_meta_ai_fields_optional(self):
        """FrameMeta AI fields should be optional."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )

        assert meta.ai_score is None
        assert meta.ai_evaluated_at is None
        assert meta.ai_breakdown is None

    def test_frame_meta_with_ai_fields(self):
        """FrameMeta should accept AI evaluation fields."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        now = datetime.now(timezone.utc)
        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
            ai_score=82,
            ai_evaluated_at=now,
            ai_breakdown={
                "problem_clarity": 18,
                "user_perspective": 16,
                "engineering_framing": 22,
                "validation_thinking": 16,
                "completeness": 10,
            },
        )

        assert meta.ai_score == 82
        assert meta.ai_evaluated_at == now
        assert meta.ai_breakdown["problem_clarity"] == 18


class TestFrameId:
    """Tests for frame ID format validation."""

    def test_valid_frame_id_format(self):
        """Frame ID should match pattern: f-YYYY-MM-DD-xxxxxx"""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        # Valid IDs should not raise
        FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )
        FrameMeta(
            id="f-2024-12-31-xyz789",
            type=FrameType.FEATURE,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )

    def test_invalid_frame_id_format_raises(self):
        """Invalid frame ID format should raise ValidationError."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            FrameMeta(
                id="invalid-id",
                type=FrameType.BUG,
                status=FrameStatus.DRAFT,
                owner="user-001",
            )

    def test_frame_id_without_prefix_raises(self):
        """Frame ID without 'f-' prefix should raise ValidationError."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            FrameMeta(
                id="2026-01-30-abc123",
                type=FrameType.BUG,
                status=FrameStatus.DRAFT,
                owner="user-001",
            )


class TestFrameContent:
    """Tests for FrameContent model (parsed frame.md)."""

    def test_frame_content_creation(self):
        """FrameContent should hold parsed sections."""
        from app.models.frame import FrameContent

        content = FrameContent(
            problem_statement="Test problem",
            user_perspective="Test user perspective",
            engineering_framing="Test engineering",
            validation_thinking="Test validation",
        )

        assert content.problem_statement == "Test problem"
        assert content.user_perspective == "Test user perspective"
        assert content.engineering_framing == "Test engineering"
        assert content.validation_thinking == "Test validation"

    def test_frame_content_sections_optional(self):
        """FrameContent sections should be optional (for partial frames)."""
        from app.models.frame import FrameContent

        content = FrameContent(
            problem_statement="Test problem",
        )

        assert content.problem_statement == "Test problem"
        assert content.user_perspective is None
        assert content.engineering_framing is None
        assert content.validation_thinking is None


class TestFrame:
    """Tests for the complete Frame model."""

    def test_frame_creation(self):
        """Frame should combine meta and content."""
        from app.models.frame import Frame, FrameMeta, FrameContent, FrameStatus, FrameType

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )
        content = FrameContent(
            problem_statement="Test problem",
        )

        frame = Frame(meta=meta, content=content)

        assert frame.meta.id == "f-2026-01-30-abc123"
        assert frame.content.problem_statement == "Test problem"

    def test_frame_convenience_properties(self):
        """Frame should have convenience properties for common fields."""
        from app.models.frame import Frame, FrameMeta, FrameContent, FrameStatus, FrameType

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.IN_REVIEW,
            owner="user-001",
        )
        content = FrameContent(problem_statement="Test")
        frame = Frame(meta=meta, content=content)

        assert frame.id == "f-2026-01-30-abc123"
        assert frame.status == FrameStatus.IN_REVIEW
        assert frame.type == FrameType.BUG
        assert frame.owner == "user-001"


class TestComment:
    """Tests for Comment model."""

    def test_comment_creation(self):
        """Comment should be created with required fields."""
        from app.models.frame import Comment

        comment = Comment(
            id="c-001",
            section="engineering",
            author="user-789",
            content="Should we also consider rate limiting?",
        )

        assert comment.id == "c-001"
        assert comment.section == "engineering"
        assert comment.author == "user-789"
        assert comment.content == "Should we also consider rate limiting?"

    def test_comment_has_timestamp_default(self):
        """Comment should have created_at with default."""
        from app.models.frame import Comment

        comment = Comment(
            id="c-001",
            section="engineering",
            author="user-789",
            content="Test comment",
        )

        assert comment.created_at is not None


class TestFrameSerialization:
    """Tests for Frame serialization to/from file formats."""

    def test_frame_meta_to_yaml(self):
        """FrameMeta should serialize to YAML format."""
        from app.models.frame import FrameMeta, FrameStatus, FrameType

        meta = FrameMeta(
            id="f-2026-01-30-abc123",
            type=FrameType.BUG,
            status=FrameStatus.DRAFT,
            owner="user-001",
        )

        yaml_str = meta.to_yaml()

        assert "id: f-2026-01-30-abc123" in yaml_str
        assert "type: bug" in yaml_str
        assert "status: draft" in yaml_str
        assert "owner: user-001" in yaml_str

    def test_frame_meta_from_yaml(self):
        """FrameMeta should deserialize from YAML format."""
        from app.models.frame import FrameMeta

        yaml_str = """id: f-2026-01-30-abc123
type: bug
status: in_review
owner: user-001
created_at: 2026-01-30T10:00:00Z
updated_at: 2026-01-30T14:30:00Z
"""
        meta = FrameMeta.from_yaml(yaml_str)

        assert meta.id == "f-2026-01-30-abc123"
        assert meta.type.value == "bug"
        assert meta.status.value == "in_review"
        assert meta.owner == "user-001"

    def test_frame_content_to_markdown(self):
        """FrameContent should serialize to Markdown format."""
        from app.models.frame import FrameContent, FrameType

        content = FrameContent(
            problem_statement="Users cannot log in.",
            user_perspective="End users are blocked.",
            engineering_framing="Check token validation.",
            validation_thinking="Reset flow completes.",
        )

        md_str = content.to_markdown(frame_id="f-2026-01-30-abc123", frame_type=FrameType.BUG)

        assert "# Problem Statement" in md_str
        assert "Users cannot log in." in md_str
        assert "## User Perspective" in md_str
        assert "## Engineering Framing" in md_str
        assert "## Validation Thinking" in md_str

    def test_frame_content_from_markdown(self):
        """FrameContent should deserialize from Markdown format."""
        from app.models.frame import FrameContent

        md_str = """---
id: f-2026-01-30-abc123
type: bug
---

# Problem Statement

Users cannot log in after password reset.

## User Perspective

End users are completely blocked.

## Engineering Framing

Check token validation logic.

## Validation Thinking

Reset flow should complete.
"""
        content = FrameContent.from_markdown(md_str)

        assert "Users cannot log in" in content.problem_statement
        assert "End users" in content.user_perspective
        assert "token validation" in content.engineering_framing
        assert "Reset flow" in content.validation_thinking
