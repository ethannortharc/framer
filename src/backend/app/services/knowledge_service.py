"""
Knowledge Service for file-based knowledge entry operations.

Storage: /data/knowledge/k-{id}/entry.yaml
"""
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.models.knowledge import (
    KnowledgeCategory,
    KnowledgeEntry,
    KnowledgeSource,
)


class KnowledgeNotFoundError(Exception):
    pass


class KnowledgeService:
    """Service for managing knowledge entries via file system."""

    def __init__(self, data_path: Path):
        self.data_path = Path(data_path)
        self.knowledge_path = self.data_path / "knowledge"

    def _generate_id(self) -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        unique_suffix = uuid.uuid4().hex[:6]
        return f"k-{date_str}-{unique_suffix}"

    def _get_entry_dir(self, entry_id: str) -> Path:
        return self.knowledge_path / entry_id

    def create_entry(
        self,
        title: str,
        content: str,
        category: KnowledgeCategory,
        source: KnowledgeSource,
        author: str,
        source_id: Optional[str] = None,
        project_id: Optional[str] = None,
        tags: Optional[list[str]] = None,
    ) -> KnowledgeEntry:
        entry_id = self._generate_id()
        entry_dir = self._get_entry_dir(entry_id)
        entry_dir.mkdir(parents=True, exist_ok=True)

        entry = KnowledgeEntry(
            id=entry_id,
            title=title,
            content=content,
            category=category,
            source=source,
            source_id=source_id,
            project_id=project_id,
            author=author,
            tags=tags or [],
        )

        (entry_dir / "entry.yaml").write_text(entry.to_yaml())
        return entry

    def get_entry(self, entry_id: str) -> KnowledgeEntry:
        entry_dir = self._get_entry_dir(entry_id)
        if not entry_dir.exists():
            raise KnowledgeNotFoundError(f"Knowledge entry not found: {entry_id}")
        return KnowledgeEntry.from_yaml((entry_dir / "entry.yaml").read_text())

    def list_entries(
        self,
        category: Optional[KnowledgeCategory] = None,
        project_id: Optional[str] = None,
        tags: Optional[list[str]] = None,
    ) -> list[KnowledgeEntry]:
        entries = []
        if not self.knowledge_path.exists():
            return entries

        for entry_dir in self.knowledge_path.iterdir():
            if entry_dir.is_dir() and entry_dir.name.startswith("k-"):
                try:
                    entry = self.get_entry(entry_dir.name)
                    if category and entry.category != category:
                        continue
                    if project_id is not None and entry.project_id != project_id:
                        continue
                    if tags and not any(t in entry.tags for t in tags):
                        continue
                    entries.append(entry)
                except Exception:
                    pass

        return entries

    def update_entry(
        self,
        entry_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        category: Optional[KnowledgeCategory] = None,
        tags: Optional[list[str]] = None,
    ) -> KnowledgeEntry:
        entry_dir = self._get_entry_dir(entry_id)
        if not entry_dir.exists():
            raise KnowledgeNotFoundError(f"Knowledge entry not found: {entry_id}")

        entry = KnowledgeEntry.from_yaml((entry_dir / "entry.yaml").read_text())

        if title is not None:
            entry.title = title
        if content is not None:
            entry.content = content
        if category is not None:
            entry.category = category
        if tags is not None:
            entry.tags = tags
        entry.updated_at = datetime.now(timezone.utc)

        (entry_dir / "entry.yaml").write_text(entry.to_yaml())
        return entry

    def delete_entry(self, entry_id: str) -> None:
        entry_dir = self._get_entry_dir(entry_id)
        if not entry_dir.exists():
            raise KnowledgeNotFoundError(f"Knowledge entry not found: {entry_id}")
        shutil.rmtree(entry_dir)
