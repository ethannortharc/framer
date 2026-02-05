"""
Frame Service for file-based frame operations.

This service handles CRUD operations for frames using the file system.
"""
import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.models.frame import (
    Frame,
    FrameContent,
    FrameMeta,
    FrameStatus,
    FrameType,
    Comment,
)


class FrameNotFoundError(Exception):
    """Raised when a frame is not found."""
    pass


class FrameService:
    """Service for managing frames via file system."""

    def __init__(self, data_path: Path):
        """Initialize the service with the data directory path."""
        self.data_path = Path(data_path)
        self.frames_path = self.data_path / "frames"

    def _generate_frame_id(self) -> str:
        """Generate a unique frame ID."""
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        unique_suffix = uuid.uuid4().hex[:6]
        return f"f-{date_str}-{unique_suffix}"

    def _get_frame_dir(self, frame_id: str) -> Path:
        """Get the directory path for a frame."""
        return self.frames_path / frame_id

    def create_frame(
        self,
        frame_type: FrameType,
        owner: str,
        content: Optional[FrameContent] = None,
    ) -> Frame:
        """Create a new frame."""
        frame_id = self._generate_frame_id()
        frame_dir = self._get_frame_dir(frame_id)
        frame_dir.mkdir(parents=True, exist_ok=True)

        # Create metadata
        meta = FrameMeta(
            id=frame_id,
            type=frame_type,
            status=FrameStatus.DRAFT,
            owner=owner,
        )

        # Create content (empty if not provided)
        if content is None:
            content = FrameContent()

        # Write meta.yaml
        meta_file = frame_dir / "meta.yaml"
        meta_file.write_text(meta.to_yaml())

        # Write frame.md
        frame_file = frame_dir / "frame.md"
        frame_file.write_text(content.to_markdown(frame_id, frame_type))

        return Frame(meta=meta, content=content)

    def get_frame(self, frame_id: str) -> Frame:
        """Get a frame by ID."""
        frame_dir = self._get_frame_dir(frame_id)

        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        # Read meta.yaml
        meta_file = frame_dir / "meta.yaml"
        meta = FrameMeta.from_yaml(meta_file.read_text())

        # Read frame.md
        frame_file = frame_dir / "frame.md"
        content = FrameContent.from_markdown(frame_file.read_text())

        return Frame(meta=meta, content=content)

    def list_frames(self) -> list[Frame]:
        """List all frames."""
        frames = []

        if not self.frames_path.exists():
            return frames

        for frame_dir in self.frames_path.iterdir():
            if frame_dir.is_dir() and frame_dir.name.startswith("f-"):
                try:
                    frame = self.get_frame(frame_dir.name)
                    frames.append(frame)
                except Exception:
                    # Skip invalid frames
                    pass

        return frames

    def update_frame_content(self, frame_id: str, content: FrameContent) -> Frame:
        """Update frame content."""
        frame_dir = self._get_frame_dir(frame_id)

        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        # Read current meta
        meta_file = frame_dir / "meta.yaml"
        meta = FrameMeta.from_yaml(meta_file.read_text())

        # Update timestamp
        meta.updated_at = datetime.now(timezone.utc)

        # Write updated meta
        meta_file.write_text(meta.to_yaml())

        # Write updated content
        frame_file = frame_dir / "frame.md"
        frame_file.write_text(content.to_markdown(frame_id, meta.type))

        return Frame(meta=meta, content=content)

    def update_frame_meta(
        self,
        frame_id: str,
        reviewer: Optional[str] = None,
        approver: Optional[str] = None,
    ) -> Frame:
        """Update frame metadata (reviewer, approver)."""
        frame_dir = self._get_frame_dir(frame_id)
        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        meta_file = frame_dir / "meta.yaml"
        meta = FrameMeta.from_yaml(meta_file.read_text())

        if reviewer is not None:
            meta.reviewer = reviewer
        if approver is not None:
            meta.approver = approver

        meta.updated_at = datetime.now(timezone.utc)
        meta_file.write_text(meta.to_yaml())

        frame_file = frame_dir / "frame.md"
        content = FrameContent.from_markdown(frame_file.read_text())
        return Frame(meta=meta, content=content)

    def update_frame_status(self, frame_id: str, status: FrameStatus) -> Frame:
        """Update frame status."""
        frame_dir = self._get_frame_dir(frame_id)

        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        # Read current meta
        meta_file = frame_dir / "meta.yaml"
        meta = FrameMeta.from_yaml(meta_file.read_text())

        # Enforce reviewer/approver requirements
        if status == FrameStatus.IN_REVIEW and not meta.reviewer:
            raise ValueError("A reviewer must be assigned before submitting for review")
        if status == FrameStatus.READY and not meta.approver:
            raise ValueError("An approver must be assigned before marking as ready")

        # Update status and timestamp
        meta.status = status
        meta.updated_at = datetime.now(timezone.utc)

        # Write updated meta
        meta_file.write_text(meta.to_yaml())

        # Read content
        frame_file = frame_dir / "frame.md"
        content = FrameContent.from_markdown(frame_file.read_text())

        return Frame(meta=meta, content=content)

    def delete_frame(self, frame_id: str) -> None:
        """Delete a frame."""
        frame_dir = self._get_frame_dir(frame_id)

        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        shutil.rmtree(frame_dir)

    def add_comment(
        self,
        frame_id: str,
        section: str,
        author: str,
        content: str,
    ) -> Comment:
        """Add a comment to a frame."""
        frame_dir = self._get_frame_dir(frame_id)

        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        comments_file = frame_dir / "comments.json"

        # Load existing comments or create new structure
        if comments_file.exists():
            data = json.loads(comments_file.read_text())
        else:
            data = {"comments": []}

        # Create new comment
        comment_id = f"c-{len(data['comments']) + 1:03d}"
        comment = Comment(
            id=comment_id,
            section=section,
            author=author,
            content=content,
        )

        # Add to list
        data["comments"].append({
            "id": comment.id,
            "section": comment.section,
            "author": comment.author,
            "content": comment.content,
            "created_at": comment.created_at.isoformat(),
        })

        # Write back
        comments_file.write_text(json.dumps(data, indent=2))

        return comment

    def get_comments(self, frame_id: str) -> list[Comment]:
        """Get all comments for a frame."""
        frame_dir = self._get_frame_dir(frame_id)

        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        comments_file = frame_dir / "comments.json"

        if not comments_file.exists():
            return []

        data = json.loads(comments_file.read_text())
        comments = []

        for c in data.get("comments", []):
            comments.append(Comment(
                id=c["id"],
                section=c["section"],
                author=c["author"],
                content=c["content"],
                created_at=datetime.fromisoformat(c["created_at"]) if "created_at" in c else datetime.now(timezone.utc),
            ))

        return comments

    def add_feedback(
        self,
        frame_id: str,
        went_well: str,
        could_improve: str,
        lessons_learned: str,
    ) -> None:
        """Add feedback/retrospective to a frame."""
        frame_dir = self._get_frame_dir(frame_id)

        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        feedback_file = frame_dir / "feedback.md"

        feedback_content = f"""# Feedback & Retrospective

## What Went Well

{went_well}

## What Could Be Improved

{could_improve}

## Lessons Learned

{lessons_learned}
"""

        feedback_file.write_text(feedback_content)
