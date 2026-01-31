"""
Index Service for SQLite-based frame indexing.

This service provides fast queries over frames using a SQLite cache.
Files remain the source of truth - the index can be rebuilt from files.
"""
import sqlite3
from pathlib import Path
from typing import Optional

from app.models.frame import FrameMeta, FrameStatus, FrameType


class IndexService:
    """Service for managing the SQLite frame index."""

    def __init__(self, data_path: Path):
        """Initialize the service with the data directory path."""
        self.data_path = Path(data_path)
        self.db_path = self.data_path / "index.db"
        self.frames_path = self.data_path / "frames"

    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def create_index(self) -> None:
        """Create the index database and tables."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS frames (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                owner TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                ai_score INTEGER,
                ai_evaluated_at TEXT
            )
        """)

        # Create indexes for common queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_frames_status ON frames(status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_frames_owner ON frames(owner)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_frames_type ON frames(type)
        """)

        conn.commit()
        conn.close()

    def index_frame(self, meta: FrameMeta) -> None:
        """Add or update a frame in the index."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO frames (
                id, type, status, owner, created_at, updated_at, ai_score, ai_evaluated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            meta.id,
            meta.type.value,
            meta.status.value,
            meta.owner,
            meta.created_at.isoformat(),
            meta.updated_at.isoformat(),
            meta.ai_score,
            meta.ai_evaluated_at.isoformat() if meta.ai_evaluated_at else None,
        ))

        conn.commit()
        conn.close()

    def remove_frame(self, frame_id: str) -> None:
        """Remove a frame from the index."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM frames WHERE id = ?", (frame_id,))

        conn.commit()
        conn.close()

    def query_frames(
        self,
        status: Optional[FrameStatus] = None,
        owner: Optional[str] = None,
        frame_type: Optional[FrameType] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        """
        Query frames from the index.

        Args:
            status: Filter by status
            owner: Filter by owner
            frame_type: Filter by frame type
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of frame metadata dictionaries
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM frames WHERE 1=1"
        params = []

        if status is not None:
            query += " AND status = ?"
            params.append(status.value)

        if owner is not None:
            query += " AND owner = ?"
            params.append(owner)

        if frame_type is not None:
            query += " AND type = ?"
            params.append(frame_type.value)

        query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()

        conn.close()

        return [dict(row) for row in rows]

    def rebuild_index(self) -> int:
        """
        Rebuild the index from frame files.

        Returns:
            Number of frames indexed
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Clear existing entries
        cursor.execute("DELETE FROM frames")

        count = 0

        if self.frames_path.exists():
            for frame_dir in self.frames_path.iterdir():
                if frame_dir.is_dir() and frame_dir.name.startswith("f-"):
                    meta_file = frame_dir / "meta.yaml"
                    if meta_file.exists():
                        try:
                            meta = FrameMeta.from_yaml(meta_file.read_text())
                            cursor.execute("""
                                INSERT INTO frames (
                                    id, type, status, owner, created_at, updated_at,
                                    ai_score, ai_evaluated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                meta.id,
                                meta.type.value,
                                meta.status.value,
                                meta.owner,
                                meta.created_at.isoformat(),
                                meta.updated_at.isoformat(),
                                meta.ai_score,
                                meta.ai_evaluated_at.isoformat() if meta.ai_evaluated_at else None,
                            ))
                            count += 1
                        except Exception:
                            # Skip invalid frames
                            pass

        conn.commit()
        conn.close()

        return count

    def get_frame_count(
        self,
        status: Optional[FrameStatus] = None,
        owner: Optional[str] = None,
    ) -> int:
        """Get count of frames matching criteria."""
        conn = self._get_connection()
        cursor = conn.cursor()

        query = "SELECT COUNT(*) FROM frames WHERE 1=1"
        params = []

        if status is not None:
            query += " AND status = ?"
            params.append(status.value)

        if owner is not None:
            query += " AND owner = ?"
            params.append(owner)

        cursor.execute(query, params)
        count = cursor.fetchone()[0]

        conn.close()

        return count
