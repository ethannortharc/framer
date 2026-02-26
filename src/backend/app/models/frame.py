"""
Frame data models for Framer.

These models define the structure of frames, their metadata, and content.
"""
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

import yaml
from pydantic import BaseModel, Field, field_validator


class FrameStatus(str, Enum):
    """Status of a frame in its lifecycle."""
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    READY = "ready"
    FEEDBACK = "feedback"
    ARCHIVED = "archived"


class FrameType(str, Enum):
    """Type of frame (determines template used)."""
    BUG = "bug"
    FEATURE = "feature"
    EXPLORATION = "exploration"


# Regex pattern for valid frame IDs: f-YYYY-MM-DD-xxxxxx
FRAME_ID_PATTERN = re.compile(r"^f-\d{4}-\d{2}-\d{2}-[a-zA-Z0-9]+$")


class FrameMeta(BaseModel):
    """Metadata for a frame (stored in meta.yaml)."""
    id: str
    type: FrameType
    status: FrameStatus
    owner: str
    project_id: Optional[str] = None
    reviewer: Optional[str] = None
    approver: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # AI evaluation fields (optional)
    ai_score: Optional[int] = None
    ai_evaluated_at: Optional[datetime] = None
    ai_breakdown: Optional[dict[str, int]] = None
    ai_feedback: Optional[str] = None
    ai_issues: Optional[list[str]] = None

    # Review summary fields (optional)
    review_summary: Optional[str] = None
    review_comments: Optional[list[dict]] = None
    review_recommendation: Optional[str] = None

    @field_validator("id")
    @classmethod
    def validate_frame_id(cls, v: str) -> str:
        """Validate frame ID matches expected pattern."""
        if not FRAME_ID_PATTERN.match(v):
            raise ValueError(
                f"Frame ID must match pattern 'f-YYYY-MM-DD-xxxxxx', got: {v}"
            )
        return v

    def to_yaml(self) -> str:
        """Serialize to YAML format for meta.yaml file."""
        data = {
            "id": self.id,
            "type": self.type.value,
            "status": self.status.value,
            "owner": self.owner,
        }
        if self.project_id:
            data["project_id"] = self.project_id
        if self.reviewer:
            data["reviewer"] = self.reviewer
        if self.approver:
            data["approver"] = self.approver
        data["created_at"] = self.created_at.isoformat()
        data["updated_at"] = self.updated_at.isoformat()
        if self.ai_score is not None:
            data["ai"] = {
                "score": self.ai_score,
                "evaluated_at": self.ai_evaluated_at.isoformat() if self.ai_evaluated_at else None,
                "breakdown": self.ai_breakdown,
                "feedback": self.ai_feedback,
                "issues": self.ai_issues,
            }
        if self.review_summary or self.review_comments or self.review_recommendation:
            data["review"] = {
                "summary": self.review_summary,
                "comments": self.review_comments,
                "recommendation": self.review_recommendation,
            }
        return yaml.dump(data, default_flow_style=False, sort_keys=False)

    @classmethod
    def from_yaml(cls, yaml_str: str) -> "FrameMeta":
        """Deserialize from YAML format."""
        data = yaml.safe_load(yaml_str)

        # Handle AI fields if present
        ai_score = None
        ai_evaluated_at = None
        ai_breakdown = None
        ai_feedback = None
        ai_issues = None
        if "ai" in data:
            ai_data = data["ai"]
            ai_score = ai_data.get("score")
            ai_evaluated_at = ai_data.get("evaluated_at")
            ai_breakdown = ai_data.get("breakdown")
            ai_feedback = ai_data.get("feedback")
            ai_issues = ai_data.get("issues")

        # Handle review fields if present
        review_summary = None
        review_comments = None
        review_recommendation = None
        if "review" in data:
            review_data = data["review"]
            review_summary = review_data.get("summary")
            review_comments = review_data.get("comments")
            review_recommendation = review_data.get("recommendation")

        return cls(
            id=data["id"],
            type=FrameType(data["type"]),
            status=FrameStatus(data["status"]),
            owner=data["owner"],
            project_id=data.get("project_id"),
            reviewer=data.get("reviewer"),
            approver=data.get("approver"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
                if isinstance(data["created_at"], str) else data["created_at"],
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
                if isinstance(data["updated_at"], str) else data["updated_at"],
            ai_score=ai_score,
            ai_evaluated_at=ai_evaluated_at,
            ai_breakdown=ai_breakdown,
            ai_feedback=ai_feedback,
            ai_issues=ai_issues,
            review_summary=review_summary,
            review_comments=review_comments,
            review_recommendation=review_recommendation,
        )


class FrameContent(BaseModel):
    """Content of a frame (parsed from frame.md)."""
    problem_statement: Optional[str] = None
    root_cause: Optional[str] = None
    user_perspective: Optional[str] = None
    engineering_framing: Optional[str] = None
    validation_thinking: Optional[str] = None

    def to_markdown(self, frame_id: str, frame_type: FrameType) -> str:
        """Serialize to Markdown format for frame.md file."""
        lines = [
            "---",
            f"id: {frame_id}",
            f"type: {frame_type.value}",
            "---",
            "",
            "# Problem Statement",
            "",
            self.problem_statement or "",
            "",
        ]

        # Root Cause section (bug frames)
        if self.root_cause:
            lines.extend([
                "## Root Cause",
                "",
                self.root_cause,
                "",
            ])

        lines.extend([
            "## User Perspective",
            "",
            self.user_perspective or "",
            "",
            "## Engineering Framing",
            "",
            self.engineering_framing or "",
            "",
            "## Validation Thinking",
            "",
            self.validation_thinking or "",
        ])
        return "\n".join(lines)

    @classmethod
    def from_markdown(cls, md_str: str) -> "FrameContent":
        """Deserialize from Markdown format."""
        # Remove YAML frontmatter
        content = md_str
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                content = parts[2]

        # Parse sections
        sections = {}
        current_section = None
        current_content = []

        section_map = {
            "# problem statement": "problem_statement",
            "## root cause": "root_cause",
            "## user perspective": "user_perspective",
            "## engineering framing": "engineering_framing",
            "## validation thinking": "validation_thinking",
        }

        for line in content.split("\n"):
            line_lower = line.lower().strip()

            # Check if this is a section header
            matched_section = None
            for header, field in section_map.items():
                if line_lower == header:
                    matched_section = field
                    break

            if matched_section:
                # Save previous section
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = matched_section
                current_content = []
            elif current_section:
                current_content.append(line)

        # Save last section
        if current_section:
            sections[current_section] = "\n".join(current_content).strip()

        return cls(**sections)


class Frame(BaseModel):
    """Complete frame combining metadata and content."""
    meta: FrameMeta
    content: FrameContent

    @property
    def id(self) -> str:
        """Convenience property for frame ID."""
        return self.meta.id

    @property
    def status(self) -> FrameStatus:
        """Convenience property for frame status."""
        return self.meta.status

    @property
    def type(self) -> FrameType:
        """Convenience property for frame type."""
        return self.meta.type

    @property
    def owner(self) -> str:
        """Convenience property for frame owner."""
        return self.meta.owner


class Comment(BaseModel):
    """Comment on a frame section."""
    id: str
    section: str
    author: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
