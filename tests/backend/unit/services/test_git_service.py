"""
Tests for Git Service.

TDD Phase 1.4: Git Service
"""
import pytest
from pathlib import Path


class TestGitServiceInit:
    """Tests for git repository initialization."""

    def test_init_repo_creates_git_directory(self, temp_data_dir):
        """Initializing repo should create .git directory."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()

        git_dir = temp_data_dir / ".git"
        assert git_dir.exists()

    def test_init_repo_idempotent(self, temp_data_dir):
        """Initializing existing repo should not fail."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()
        service.init_repo()  # Should not raise

        git_dir = temp_data_dir / ".git"
        assert git_dir.exists()

    def test_is_repo_returns_false_for_non_repo(self, temp_data_dir):
        """is_repo should return False for non-git directory."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        assert service.is_repo() is False

    def test_is_repo_returns_true_for_repo(self, temp_data_dir):
        """is_repo should return True for git directory."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()
        assert service.is_repo() is True


class TestGitServiceCommit:
    """Tests for git commit operations."""

    def test_commit_changes_creates_commit(self, temp_data_dir):
        """Committing changes should create a commit."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()

        # Create a file
        test_file = temp_data_dir / "test.txt"
        test_file.write_text("Hello, World!")

        commit_hash = service.commit_changes(
            message="Add test file",
            author_name="Test User",
            author_email="test@example.com",
        )

        assert commit_hash is not None
        assert len(commit_hash) == 40  # SHA-1 hash length

    def test_commit_includes_message(self, temp_data_dir):
        """Commit should include the provided message."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()

        test_file = temp_data_dir / "test.txt"
        test_file.write_text("Hello!")

        service.commit_changes(
            message="Test commit message",
            author_name="Test User",
            author_email="test@example.com",
        )

        # Verify commit message
        history = service.get_commit_history(limit=1)
        assert len(history) == 1
        assert history[0]["message"] == "Test commit message"

    def test_commit_includes_author(self, temp_data_dir):
        """Commit should include author information."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()

        test_file = temp_data_dir / "test.txt"
        test_file.write_text("Hello!")

        service.commit_changes(
            message="Test commit",
            author_name="John Doe",
            author_email="john@example.com",
        )

        history = service.get_commit_history(limit=1)
        assert history[0]["author_name"] == "John Doe"
        assert history[0]["author_email"] == "john@example.com"

    def test_commit_no_changes_returns_none(self, temp_data_dir):
        """Committing with no changes should return None."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()

        # Create initial commit
        test_file = temp_data_dir / "test.txt"
        test_file.write_text("Hello!")
        service.commit_changes(
            message="Initial",
            author_name="Test",
            author_email="test@example.com",
        )

        # Try to commit without changes
        result = service.commit_changes(
            message="No changes",
            author_name="Test",
            author_email="test@example.com",
        )

        assert result is None


class TestGitServiceHistory:
    """Tests for git history operations."""

    def test_get_commit_history(self, temp_data_dir):
        """Should return commit history."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()

        # Create multiple commits
        for i in range(3):
            test_file = temp_data_dir / f"file{i}.txt"
            test_file.write_text(f"Content {i}")
            service.commit_changes(
                message=f"Commit {i}",
                author_name="Test",
                author_email="test@example.com",
            )

        history = service.get_commit_history(limit=10)

        assert len(history) == 3
        assert history[0]["message"] == "Commit 2"  # Most recent first
        assert history[2]["message"] == "Commit 0"

    def test_get_file_history(self, temp_data_dir):
        """Should return history for specific file."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()

        # Create and modify a file multiple times
        test_file = temp_data_dir / "tracked.txt"

        test_file.write_text("Version 1")
        service.commit_changes(message="v1", author_name="Test", author_email="t@e.com")

        test_file.write_text("Version 2")
        service.commit_changes(message="v2", author_name="Test", author_email="t@e.com")

        # Create another file (should not appear in tracked.txt history)
        other_file = temp_data_dir / "other.txt"
        other_file.write_text("Other")
        service.commit_changes(message="other", author_name="Test", author_email="t@e.com")

        history = service.get_file_history("tracked.txt")

        assert len(history) == 2
        assert history[0]["message"] == "v2"
        assert history[1]["message"] == "v1"


class TestGitServiceFrameOperations:
    """Tests for frame-specific git operations."""

    def test_commit_frame_changes(self, temp_data_dir):
        """Should commit changes to a specific frame directory."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()

        # Create frame directory structure
        frame_dir = temp_data_dir / "frames" / "f-2026-01-30-abc123"
        frame_dir.mkdir(parents=True)
        (frame_dir / "frame.md").write_text("# Problem\nTest problem")
        (frame_dir / "meta.yaml").write_text("id: f-2026-01-30-abc123\nstatus: draft")

        commit_hash = service.commit_frame_changes(
            frame_id="f-2026-01-30-abc123",
            message="Create frame",
            author_name="User",
            author_email="user@example.com",
        )

        assert commit_hash is not None

    def test_get_frame_history(self, temp_data_dir):
        """Should return history for a specific frame."""
        from app.services.git_service import GitService

        service = GitService(data_path=temp_data_dir)
        service.init_repo()

        # Create and modify frame
        frame_dir = temp_data_dir / "frames" / "f-2026-01-30-abc123"
        frame_dir.mkdir(parents=True)

        (frame_dir / "frame.md").write_text("Version 1")
        (frame_dir / "meta.yaml").write_text("status: draft")
        service.commit_frame_changes(
            frame_id="f-2026-01-30-abc123",
            message="Create",
            author_name="User",
            author_email="u@e.com",
        )

        (frame_dir / "frame.md").write_text("Version 2")
        service.commit_frame_changes(
            frame_id="f-2026-01-30-abc123",
            message="Update",
            author_name="User",
            author_email="u@e.com",
        )

        history = service.get_frame_history("f-2026-01-30-abc123")

        assert len(history) == 2
        assert history[0]["message"] == "Update"
