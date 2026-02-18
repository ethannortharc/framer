"""
Frames API endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

import logging

from app.models.frame import Frame, FrameContent, FrameStatus, FrameType, Comment
from app.services.frame_service import FrameService, FrameNotFoundError
from app.services.git_service import GitService
from app.auth.pocketbase import get_current_user, User

logger = logging.getLogger(__name__)


# Request/Response models
class CreateFrameRequest(BaseModel):
    """Request body for creating a frame."""
    type: FrameType
    owner: str
    content: Optional[dict] = None
    project_id: Optional[str] = None


class UpdateFrameRequest(BaseModel):
    """Request body for updating a frame."""
    content: dict


class UpdateStatusRequest(BaseModel):
    """Request body for updating frame status."""
    status: FrameStatus


class UpdateMetaRequest(BaseModel):
    """Request body for updating frame metadata."""
    reviewer: Optional[str] = None
    approver: Optional[str] = None


class SubmitFeedbackRequest(BaseModel):
    """Request body for submitting implementation feedback."""
    outcome: str  # success | partial | failed
    summary: str
    lessons_learned: list[str] = Field(default_factory=list)


class CreateCommentRequest(BaseModel):
    """Request body for creating a comment."""
    section: str
    author: str
    content: str


class FrameResponse(BaseModel):
    """Response model for a frame."""
    id: str
    type: str
    status: str
    owner: str
    content: dict
    meta: dict

    @classmethod
    def from_frame(cls, frame: Frame) -> "FrameResponse":
        return cls(
            id=frame.id,
            type=frame.type.value,
            status=frame.status.value,
            owner=frame.owner,
            content={
                "problem_statement": frame.content.problem_statement,
                "user_perspective": frame.content.user_perspective,
                "engineering_framing": frame.content.engineering_framing,
                "validation_thinking": frame.content.validation_thinking,
            },
            meta={
                "created_at": frame.meta.created_at.isoformat(),
                "updated_at": frame.meta.updated_at.isoformat(),
                "project_id": frame.meta.project_id,
                "ai_score": frame.meta.ai_score,
                "ai_breakdown": frame.meta.ai_breakdown,
                "ai_feedback": frame.meta.ai_feedback,
                "ai_issues": frame.meta.ai_issues,
                "reviewer": frame.meta.reviewer,
                "approver": frame.meta.approver,
                "review_summary": frame.meta.review_summary,
                "review_comments": frame.meta.review_comments,
                "review_recommendation": frame.meta.review_recommendation,
            }
        )


class FrameListItem(BaseModel):
    """Response model for frame list item."""
    id: str
    type: str
    status: str
    owner: str
    project_id: Optional[str] = None
    reviewer: Optional[str] = None
    approver: Optional[str] = None
    updated_at: str


class CommentResponse(BaseModel):
    """Response model for a comment."""
    id: str
    section: str
    author: str
    content: str
    created_at: str


class FrameHistoryEntry(BaseModel):
    """Response model for a frame history entry."""
    hash: str
    message: str
    author_name: str
    timestamp: str
    diff: Optional[str] = None


def get_frame_service(request: Request) -> FrameService:
    """Dependency to get the frame service from app state."""
    return request.app.state.frame_service


def get_git_service(request: Request) -> GitService:
    """Dependency to get the git service from app state."""
    return request.app.state.git_service


def _git_commit(git_service: GitService, frame_id: str, message: str, author_name: str = "Framer", author_email: str = "framer@system") -> None:
    """Auto-commit frame changes. Non-blocking, errors are logged."""
    try:
        git_service.commit_frame_changes(
            frame_id=frame_id,
            message=message,
            author_name=author_name,
            author_email=author_email,
        )
    except Exception as e:
        logger.warning("Git commit failed for frame %s: %s", frame_id, e)


def create_frames_router(require_auth: bool = False) -> APIRouter:
    """Create the frames API router.

    Args:
        require_auth: If True, all mutating endpoints require authentication.
    """
    router = APIRouter()

    # Build dependencies list based on auth requirement
    def get_auth_dependencies():
        if require_auth:
            return [Depends(get_current_user)]
        return []

    @router.post("", status_code=status.HTTP_201_CREATED, dependencies=get_auth_dependencies())
    def create_frame(
        request: CreateFrameRequest,
        frame_service: FrameService = Depends(get_frame_service),
        git_service: GitService = Depends(get_git_service),
    ) -> FrameResponse:
        """Create a new frame."""
        content = None
        if request.content:
            content = FrameContent(**request.content)

        frame = frame_service.create_frame(
            frame_type=request.type,
            owner=request.owner,
            content=content,
            project_id=request.project_id,
        )

        _git_commit(git_service, frame.id, f"Create {request.type.value} frame")

        return FrameResponse.from_frame(frame)

    @router.get("/{frame_id}")
    def get_frame(
        frame_id: str,
        frame_service: FrameService = Depends(get_frame_service),
    ) -> FrameResponse:
        """Get a frame by ID."""
        try:
            frame = frame_service.get_frame(frame_id)
            return FrameResponse.from_frame(frame)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

    @router.get("")
    def list_frames(
        status: Optional[str] = None,
        owner: Optional[str] = None,
        project_id: Optional[str] = None,
        frame_service: FrameService = Depends(get_frame_service),
    ) -> list[FrameListItem]:
        """List all frames with optional filters."""
        frames = frame_service.list_frames(project_id=project_id)

        # Apply filters
        if status:
            frames = [f for f in frames if f.status.value == status]
        if owner:
            frames = [f for f in frames if f.owner == owner]

        return [
            FrameListItem(
                id=f.id,
                type=f.type.value,
                status=f.status.value,
                owner=f.owner,
                project_id=f.meta.project_id,
                reviewer=f.meta.reviewer,
                approver=f.meta.approver,
                updated_at=f.meta.updated_at.isoformat(),
            )
            for f in frames
        ]

    @router.put("/{frame_id}", dependencies=get_auth_dependencies())
    def update_frame(
        frame_id: str,
        request: UpdateFrameRequest,
        frame_service: FrameService = Depends(get_frame_service),
        git_service: GitService = Depends(get_git_service),
    ) -> FrameResponse:
        """Update a frame's content."""
        try:
            content = FrameContent(**request.content)
            frame = frame_service.update_frame_content(frame_id, content)
            _git_commit(git_service, frame_id, "Update frame content")
            return FrameResponse.from_frame(frame)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

    @router.patch("/{frame_id}/status", dependencies=get_auth_dependencies())
    def update_status(
        frame_id: str,
        request: UpdateStatusRequest,
        frame_service: FrameService = Depends(get_frame_service),
        git_service: GitService = Depends(get_git_service),
    ) -> FrameResponse:
        """Update a frame's status."""
        try:
            frame = frame_service.update_frame_status(frame_id, request.status)
            _git_commit(git_service, frame_id, f"Status → {request.status.value}")
            return FrameResponse.from_frame(frame)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    @router.patch("/{frame_id}/meta", dependencies=get_auth_dependencies())
    def update_meta(
        frame_id: str,
        request: UpdateMetaRequest,
        frame_service: FrameService = Depends(get_frame_service),
        git_service: GitService = Depends(get_git_service),
    ) -> FrameResponse:
        """Update frame metadata (reviewer, approver)."""
        try:
            frame = frame_service.update_frame_meta(
                frame_id,
                reviewer=request.reviewer,
                approver=request.approver,
            )
            _git_commit(git_service, frame_id, "Update frame metadata")
            return FrameResponse.from_frame(frame)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

    @router.post("/{frame_id}/feedback", dependencies=get_auth_dependencies())
    def submit_feedback(
        frame_id: str,
        request: SubmitFeedbackRequest,
        frame_service: FrameService = Depends(get_frame_service),
        git_service: GitService = Depends(get_git_service),
    ) -> FrameResponse:
        """Submit implementation feedback and archive the frame."""
        try:
            frame_service.add_feedback(
                frame_id=frame_id,
                went_well=request.summary if request.outcome == "success" else "",
                could_improve=request.summary if request.outcome != "success" else "",
                lessons_learned="\n".join(f"- {l}" for l in request.lessons_learned) if request.lessons_learned else "",
            )
            frame = frame_service.update_frame_status(frame_id, FrameStatus.ARCHIVED)
            _git_commit(git_service, frame_id, f"Feedback: {request.outcome}")
            return FrameResponse.from_frame(frame)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

    @router.delete("/{frame_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=get_auth_dependencies())
    def delete_frame(
        frame_id: str,
        frame_service: FrameService = Depends(get_frame_service),
    ):
        """Delete a frame."""
        try:
            frame_service.delete_frame(frame_id)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

    @router.post("/{frame_id}/comments", status_code=status.HTTP_201_CREATED, dependencies=get_auth_dependencies())
    def add_comment(
        frame_id: str,
        request: CreateCommentRequest,
        frame_service: FrameService = Depends(get_frame_service),
    ) -> CommentResponse:
        """Add a comment to a frame."""
        try:
            comment = frame_service.add_comment(
                frame_id=frame_id,
                section=request.section,
                author=request.author,
                content=request.content,
            )
            return CommentResponse(
                id=comment.id,
                section=comment.section,
                author=comment.author,
                content=comment.content,
                created_at=comment.created_at.isoformat(),
            )
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

    @router.get("/{frame_id}/comments")
    def get_comments(
        frame_id: str,
        frame_service: FrameService = Depends(get_frame_service),
    ) -> list[CommentResponse]:
        """Get all comments for a frame."""
        try:
            comments = frame_service.get_comments(frame_id)
            return [
                CommentResponse(
                    id=c.id,
                    section=c.section,
                    author=c.author,
                    content=c.content,
                    created_at=c.created_at.isoformat(),
                )
                for c in comments
            ]
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

    @router.get("/{frame_id}/history")
    def get_frame_history(
        frame_id: str,
        limit: int = 20,
        include_diff: bool = True,
        frame_service: FrameService = Depends(get_frame_service),
        git_service: GitService = Depends(get_git_service),
    ) -> list[FrameHistoryEntry]:
        """Get version history for a frame."""
        # Verify frame exists
        try:
            frame_service.get_frame(frame_id)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

        history = git_service.get_frame_history(frame_id, limit=limit)
        return [
            FrameHistoryEntry(
                hash=entry["hash"],
                message=entry["message"],
                author_name=entry["author_name"],
                timestamp=entry["timestamp"].isoformat(),
                diff=git_service.get_commit_diff(entry["hash"]) if include_diff else None,
            )
            for entry in history
        ]

    return router
