"""
Knowledge data models for Framer.

Knowledge entries represent team learnings, patterns, and decisions
that feed into future framing conversations.
"""
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

import yaml
from pydantic import BaseModel, Field, field_validator


class KnowledgeCategory(str, Enum):
    """Category of knowledge entry."""
    PATTERN = "pattern"
    DECISION = "decision"
    PREDICTION = "prediction"
    CONTEXT = "context"
    LESSON = "lesson"


class KnowledgeSource(str, Enum):
    """How the knowledge entry was created."""
    MANUAL = "manual"
    FEEDBACK = "feedback"
    CONVERSATION = "conversation"
    IMPORT = "import"


# Regex pattern for valid knowledge IDs: k-YYYY-MM-DD-xxxxxx
KNOWLEDGE_ID_PATTERN = re.compile(r"^k-\d{4}-\d{2}-\d{2}-[a-zA-Z0-9]+$")


class KnowledgeEntry(BaseModel):
    """A single knowledge entry."""
    id: str
    title: str
    content: str
    category: KnowledgeCategory
    source: KnowledgeSource
    source_id: Optional[str] = None
    team_id: Optional[str] = None
    author: str
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("id")
    @classmethod
    def validate_knowledge_id(cls, v: str) -> str:
        if not KNOWLEDGE_ID_PATTERN.match(v):
            raise ValueError(
                f"Knowledge ID must match pattern 'k-YYYY-MM-DD-xxxxxx', got: {v}"
            )
        return v

    def to_yaml(self) -> str:
        data = {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "category": self.category.value,
            "source": self.source.value,
            "author": self.author,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if self.source_id:
            data["source_id"] = self.source_id
        if self.team_id:
            data["team_id"] = self.team_id
        return yaml.dump(data, default_flow_style=False, sort_keys=False)

    @classmethod
    def from_yaml(cls, yaml_str: str) -> "KnowledgeEntry":
        data = yaml.safe_load(yaml_str)
        return cls(
            id=data["id"],
            title=data["title"],
            content=data["content"],
            category=KnowledgeCategory(data["category"]),
            source=KnowledgeSource(data["source"]),
            source_id=data.get("source_id"),
            team_id=data.get("team_id"),
            author=data["author"],
            tags=data.get("tags", []),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
                if isinstance(data["created_at"], str) else data["created_at"],
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
                if isinstance(data["updated_at"], str) else data["updated_at"],
        )
