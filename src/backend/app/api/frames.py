"""
Frames API endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.models.frame import Frame, FrameContent, FrameStatus, FrameType, Comment
from app.services.frame_service import FrameService, FrameNotFoundError
from app.auth.pocketbase import get_current_user, User


# Request/Response models
class CreateFrameRequest(BaseModel):
    """Request body for creating a frame."""
    type: FrameType
    owner: str
    content: Optional[dict] = None


class UpdateFrameRequest(BaseModel):
    """Request body for updating a frame."""
    content: dict


class UpdateStatusRequest(BaseModel):
    """Request body for updating frame status."""
    status: FrameStatus


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
                "ai_score": frame.meta.ai_score,
            }
        )


class FrameListItem(BaseModel):
    """Response model for frame list item."""
    id: str
    type: str
    status: str
    owner: str
    updated_at: str


class CommentResponse(BaseModel):
    """Response model for a comment."""
    id: str
    section: str
    author: str
    content: str
    created_at: str


def get_frame_service(request: Request) -> FrameService:
    """Dependency to get the frame service from app state."""
    return request.app.state.frame_service


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
    ) -> FrameResponse:
        """Create a new frame."""
        content = None
        if request.content:
            content = FrameContent(**request.content)

        frame = frame_service.create_frame(
            frame_type=request.type,
            owner=request.owner,
            content=content,
        )

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
        frame_service: FrameService = Depends(get_frame_service),
    ) -> list[FrameListItem]:
        """List all frames with optional filters."""
        frames = frame_service.list_frames()

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
                updated_at=f.meta.updated_at.isoformat(),
            )
            for f in frames
        ]

    @router.put("/{frame_id}", dependencies=get_auth_dependencies())
    def update_frame(
        frame_id: str,
        request: UpdateFrameRequest,
        frame_service: FrameService = Depends(get_frame_service),
    ) -> FrameResponse:
        """Update a frame's content."""
        try:
            content = FrameContent(**request.content)
            frame = frame_service.update_frame_content(frame_id, content)
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
    ) -> FrameResponse:
        """Update a frame's status."""
        try:
            frame = frame_service.update_frame_status(frame_id, request.status)
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

    return router
