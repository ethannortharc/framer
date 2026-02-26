"""
Conversation data models for Framer.

Conversations represent AI-guided dialogue sessions that produce structured Frames.
"""
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

import yaml
from pydantic import BaseModel, Field, field_validator


class ConversationStatus(str, Enum):
    """Status of a conversation."""
    ACTIVE = "active"
    SYNTHESIZED = "synthesized"
    ABANDONED = "abandoned"


class ConversationPurpose(str, Enum):
    """Purpose of a conversation."""
    AUTHORING = "authoring"
    REVIEW = "review"


# Regex pattern for valid conversation IDs: conv-YYYY-MM-DD-xxxxxx
CONVERSATION_ID_PATTERN = re.compile(r"^conv-\d{4}-\d{2}-\d{2}-[a-zA-Z0-9]+$")


class ConversationMessage(BaseModel):
    """A single message in a conversation."""
    id: str
    role: str = Field(description="user or assistant")
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[dict[str, Any]] = None
    sender_name: Optional[str] = None


class ConversationState(BaseModel):
    """Tracks what the AI has learned from the conversation so far."""
    frame_type: Optional[str] = None
    sections_covered: dict[str, float] = Field(
        default_factory=lambda: {
            "problem_statement": 0.0,
            "root_cause": 0.0,
            "user_perspective": 0.0,
            "engineering_framing": 0.0,
            "validation_thinking": 0.0,
        }
    )
    extracted_content: dict[str, str] = Field(default_factory=dict)
    gaps: list[str] = Field(default_factory=list)
    ready_to_synthesize: bool = False


class ConversationMeta(BaseModel):
    """Metadata for a conversation (stored in meta.yaml)."""
    id: str
    frame_id: Optional[str] = None
    project_id: Optional[str] = None
    owner: str
    purpose: ConversationPurpose = ConversationPurpose.AUTHORING
    status: ConversationStatus = ConversationStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("id")
    @classmethod
    def validate_conversation_id(cls, v: str) -> str:
        if not CONVERSATION_ID_PATTERN.match(v):
            raise ValueError(
                f"Conversation ID must match pattern 'conv-YYYY-MM-DD-xxxxxx', got: {v}"
            )
        return v

    def to_yaml(self) -> str:
        data = {
            "id": self.id,
            "owner": self.owner,
            "purpose": self.purpose.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if self.frame_id:
            data["frame_id"] = self.frame_id
        if self.project_id:
            data["project_id"] = self.project_id
        return yaml.dump(data, default_flow_style=False, sort_keys=False)

    @classmethod
    def from_yaml(cls, yaml_str: str) -> "ConversationMeta":
        data = yaml.safe_load(yaml_str)
        purpose_str = data.get("purpose", "authoring")
        return cls(
            id=data["id"],
            owner=data["owner"],
            purpose=ConversationPurpose(purpose_str),
            status=ConversationStatus(data["status"]),
            frame_id=data.get("frame_id"),
            project_id=data.get("project_id"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
                if isinstance(data["created_at"], str) else data["created_at"],
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
                if isinstance(data["updated_at"], str) else data["updated_at"],
        )


class Conversation(BaseModel):
    """Complete conversation combining metadata, messages, and state."""
    meta: ConversationMeta
    messages: list[ConversationMessage] = Field(default_factory=list)
    state: ConversationState = Field(default_factory=ConversationState)

    @property
    def id(self) -> str:
        return self.meta.id

    @property
    def status(self) -> ConversationStatus:
        return self.meta.status

    @property
    def owner(self) -> str:
        return self.meta.owner
