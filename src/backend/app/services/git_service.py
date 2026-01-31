"""
Git Service for version control operations.

This service handles git operations for frame versioning.
"""
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from git import Repo, InvalidGitRepositoryError, Actor


class GitService:
    """Service for managing git operations on the data directory."""

    def __init__(self, data_path: Path):
        """Initialize the service with the data directory path."""
        self.data_path = Path(data_path)
        self._repo: Optional[Repo] = None

    @property
    def repo(self) -> Optional[Repo]:
        """Get the git repository instance."""
        if self._repo is None and self.is_repo():
            self._repo = Repo(self.data_path)
        return self._repo

    def is_repo(self) -> bool:
        """Check if the data directory is a git repository."""
        try:
            Repo(self.data_path)
            return True
        except InvalidGitRepositoryError:
            return False

    def init_repo(self) -> Repo:
        """Initialize a git repository if not already initialized."""
        if self.is_repo():
            return Repo(self.data_path)

        repo = Repo.init(self.data_path)
        self._repo = repo
        return repo

    def commit_changes(
        self,
        message: str,
        author_name: str,
        author_email: str,
        paths: Optional[list[str]] = None,
    ) -> Optional[str]:
        """
        Commit changes to the repository.

        Args:
            message: Commit message
            author_name: Author name for the commit
            author_email: Author email for the commit
            paths: Optional list of paths to add (defaults to all changes)

        Returns:
            Commit hash if changes were committed, None if no changes
        """
        if not self.is_repo():
            raise ValueError("Not a git repository")

        repo = self.repo

        # Add files
        if paths:
            for path in paths:
                repo.index.add([path])
        else:
            # Add all changes
            repo.git.add(A=True)

        # Check if this is the initial commit
        try:
            repo.head.commit
            has_commits = True
        except ValueError:
            has_commits = False

        # Check if there are changes to commit
        if has_commits:
            # Check for staged changes against HEAD
            if not repo.index.diff("HEAD") and not repo.untracked_files:
                return None
        else:
            # Initial commit - check if there are any staged files
            if len(repo.index.entries) == 0:
                return None

        # Create author
        author = Actor(author_name, author_email)

        # Commit
        try:
            commit = repo.index.commit(message, author=author, committer=author)
            return commit.hexsha
        except Exception:
            return None

    def get_commit_history(self, limit: int = 10) -> list[dict]:
        """
        Get commit history.

        Args:
            limit: Maximum number of commits to return

        Returns:
            List of commit info dictionaries
        """
        if not self.is_repo():
            return []

        repo = self.repo
        history = []

        try:
            for commit in repo.iter_commits(max_count=limit):
                history.append({
                    "hash": commit.hexsha,
                    "message": commit.message.strip(),
                    "author_name": commit.author.name,
                    "author_email": commit.author.email,
                    "timestamp": datetime.fromtimestamp(
                        commit.committed_date, tz=timezone.utc
                    ),
                })
        except ValueError:
            # No commits yet
            pass

        return history

    def get_file_history(self, file_path: str, limit: int = 10) -> list[dict]:
        """
        Get commit history for a specific file.

        Args:
            file_path: Path to the file (relative to data directory)
            limit: Maximum number of commits to return

        Returns:
            List of commit info dictionaries
        """
        if not self.is_repo():
            return []

        repo = self.repo
        history = []

        try:
            for commit in repo.iter_commits(paths=file_path, max_count=limit):
                history.append({
                    "hash": commit.hexsha,
                    "message": commit.message.strip(),
                    "author_name": commit.author.name,
                    "author_email": commit.author.email,
                    "timestamp": datetime.fromtimestamp(
                        commit.committed_date, tz=timezone.utc
                    ),
                })
        except ValueError:
            # No commits yet
            pass

        return history

    def commit_frame_changes(
        self,
        frame_id: str,
        message: str,
        author_name: str,
        author_email: str,
    ) -> Optional[str]:
        """
        Commit changes to a specific frame.

        Args:
            frame_id: The frame ID
            message: Commit message
            author_name: Author name
            author_email: Author email

        Returns:
            Commit hash if changes were committed, None if no changes
        """
        frame_path = f"frames/{frame_id}"
        return self.commit_changes(
            message=message,
            author_name=author_name,
            author_email=author_email,
            paths=[frame_path],
        )

    def get_frame_history(self, frame_id: str, limit: int = 10) -> list[dict]:
        """
        Get commit history for a specific frame.

        Args:
            frame_id: The frame ID
            limit: Maximum number of commits to return

        Returns:
            List of commit info dictionaries
        """
        frame_path = f"frames/{frame_id}"
        return self.get_file_history(frame_path, limit=limit)
