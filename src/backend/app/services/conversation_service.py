"""
Conversation Service for file-based conversation operations.

Follows the same pattern as FrameService: one directory per conversation.
Storage: /data/conversations/conv-{id}/ with meta.yaml + messages.json + state.json
"""
import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.models.conversation import (
    Conversation,
    ConversationMeta,
    ConversationMessage,
    ConversationPurpose,
    ConversationState,
    ConversationStatus,
)


class ConversationNotFoundError(Exception):
    pass


class ConversationService:
    """Service for managing conversations via file system."""

    def __init__(self, data_path: Path):
        self.data_path = Path(data_path)
        self.conversations_path = self.data_path / "conversations"

    def _generate_id(self) -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        unique_suffix = uuid.uuid4().hex[:6]
        return f"conv-{date_str}-{unique_suffix}"

    def _get_conv_dir(self, conv_id: str) -> Path:
        return self.conversations_path / conv_id

    def _read_messages(self, conv_dir: Path) -> list[ConversationMessage]:
        messages_file = conv_dir / "messages.json"
        if not messages_file.exists():
            return []
        data = json.loads(messages_file.read_text())
        return [
            ConversationMessage(
                id=m["id"],
                role=m["role"],
                content=m["content"],
                timestamp=datetime.fromisoformat(m["timestamp"]) if "timestamp" in m else datetime.now(timezone.utc),
                metadata=m.get("metadata"),
            )
            for m in data.get("messages", [])
        ]

    def _write_messages(self, conv_dir: Path, messages: list[ConversationMessage]) -> None:
        messages_file = conv_dir / "messages.json"
        data = {
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "timestamp": m.timestamp.isoformat(),
                    "metadata": m.metadata,
                }
                for m in messages
            ]
        }
        messages_file.write_text(json.dumps(data, indent=2))

    def _read_state(self, conv_dir: Path) -> ConversationState:
        state_file = conv_dir / "state.json"
        if not state_file.exists():
            return ConversationState()
        data = json.loads(state_file.read_text())
        return ConversationState(**data)

    def _write_state(self, conv_dir: Path, state: ConversationState) -> None:
        state_file = conv_dir / "state.json"
        state_file.write_text(json.dumps(state.model_dump(), indent=2))

    def create_conversation(
        self,
        owner: str,
        purpose: Optional[ConversationPurpose] = None,
        frame_id: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Conversation:
        conv_id = self._generate_id()
        conv_dir = self._get_conv_dir(conv_id)
        conv_dir.mkdir(parents=True, exist_ok=True)

        meta = ConversationMeta(
            id=conv_id,
            owner=owner,
            purpose=purpose or ConversationPurpose.AUTHORING,
            frame_id=frame_id,
            project_id=project_id,
        )
        state = ConversationState()

        (conv_dir / "meta.yaml").write_text(meta.to_yaml())
        self._write_messages(conv_dir, [])
        self._write_state(conv_dir, state)

        return Conversation(meta=meta, messages=[], state=state)

    def get_conversation(self, conv_id: str) -> Conversation:
        conv_dir = self._get_conv_dir(conv_id)
        if not conv_dir.exists():
            raise ConversationNotFoundError(f"Conversation not found: {conv_id}")

        meta = ConversationMeta.from_yaml((conv_dir / "meta.yaml").read_text())
        messages = self._read_messages(conv_dir)
        state = self._read_state(conv_dir)

        return Conversation(meta=meta, messages=messages, state=state)

    def list_conversations(
        self,
        owner: Optional[str] = None,
        status: Optional[ConversationStatus] = None,
        frame_id: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> list[Conversation]:
        conversations = []
        if not self.conversations_path.exists():
            return conversations

        for conv_dir in self.conversations_path.iterdir():
            if conv_dir.is_dir() and conv_dir.name.startswith("conv-"):
                try:
                    conv = self.get_conversation(conv_dir.name)
                    if owner and conv.owner != owner:
                        continue
                    if status and conv.status != status:
                        continue
                    if frame_id and conv.meta.frame_id != frame_id:
                        continue
                    if project_id is not None and conv.meta.project_id != project_id:
                        continue
                    conversations.append(conv)
                except Exception:
                    pass

        return conversations

    def add_message(
        self, conv_id: str, role: str, content: str, metadata: Optional[dict] = None
    ) -> ConversationMessage:
        conv_dir = self._get_conv_dir(conv_id)
        if not conv_dir.exists():
            raise ConversationNotFoundError(f"Conversation not found: {conv_id}")

        messages = self._read_messages(conv_dir)
        msg_id = f"msg-{len(messages) + 1:03d}"
        message = ConversationMessage(
            id=msg_id, role=role, content=content, metadata=metadata
        )
        messages.append(message)
        self._write_messages(conv_dir, messages)

        # Update timestamp
        meta = ConversationMeta.from_yaml((conv_dir / "meta.yaml").read_text())
        meta.updated_at = datetime.now(timezone.utc)
        (conv_dir / "meta.yaml").write_text(meta.to_yaml())

        return message

    def update_state(self, conv_id: str, state: ConversationState) -> Conversation:
        conv_dir = self._get_conv_dir(conv_id)
        if not conv_dir.exists():
            raise ConversationNotFoundError(f"Conversation not found: {conv_id}")

        self._write_state(conv_dir, state)

        meta = ConversationMeta.from_yaml((conv_dir / "meta.yaml").read_text())
        meta.updated_at = datetime.now(timezone.utc)
        (conv_dir / "meta.yaml").write_text(meta.to_yaml())

        messages = self._read_messages(conv_dir)
        return Conversation(meta=meta, messages=messages, state=state)

    def link_frame(self, conv_id: str, frame_id: str) -> Conversation:
        conv_dir = self._get_conv_dir(conv_id)
        if not conv_dir.exists():
            raise ConversationNotFoundError(f"Conversation not found: {conv_id}")

        meta = ConversationMeta.from_yaml((conv_dir / "meta.yaml").read_text())
        meta.frame_id = frame_id
        meta.updated_at = datetime.now(timezone.utc)
        (conv_dir / "meta.yaml").write_text(meta.to_yaml())

        messages = self._read_messages(conv_dir)
        state = self._read_state(conv_dir)
        return Conversation(meta=meta, messages=messages, state=state)

    def update_status(self, conv_id: str, status: ConversationStatus) -> Conversation:
        conv_dir = self._get_conv_dir(conv_id)
        if not conv_dir.exists():
            raise ConversationNotFoundError(f"Conversation not found: {conv_id}")

        meta = ConversationMeta.from_yaml((conv_dir / "meta.yaml").read_text())
        meta.status = status
        meta.updated_at = datetime.now(timezone.utc)
        (conv_dir / "meta.yaml").write_text(meta.to_yaml())

        messages = self._read_messages(conv_dir)
        state = self._read_state(conv_dir)
        return Conversation(meta=meta, messages=messages, state=state)

    def delete_conversation(self, conv_id: str) -> None:
        conv_dir = self._get_conv_dir(conv_id)
        if not conv_dir.exists():
            raise ConversationNotFoundError(f"Conversation not found: {conv_id}")
        shutil.rmtree(conv_dir)
