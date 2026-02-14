"""
FastAPI application entry point for Framer backend.
"""
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.frames import create_frames_router
from app.api.ai import create_ai_router
from app.api.users import create_users_router
from app.api.conversations import create_conversations_router
from app.api.knowledge import create_knowledge_router
from app.api.admin import create_admin_router
from app.services.frame_service import FrameService
from app.services.git_service import GitService
from app.services.index_service import IndexService
from app.services.conversation_service import ConversationService
from app.services.knowledge_service import KnowledgeService
from app.services.vector_service import VectorService


def create_app(
    data_path: Optional[Path] = None,
    require_auth: bool = False,
) -> FastAPI:
    """
    Create and configure the FastAPI application.

    Args:
        data_path: Path to the data directory. If None, uses /data.
        require_auth: If True, enables authentication for protected endpoints.

    Returns:
        Configured FastAPI application
    """
    if data_path is None:
        data_path = Path("/data")

    app = FastAPI(
        title="Framer API",
        description="AI-assisted pre-development thinking framework",
        version="0.1.0",
    )

    # Configure CORS from environment
    cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize services
    frame_service = FrameService(data_path=data_path)
    git_service = GitService(data_path=data_path)
    git_service.init_repo()  # Ensure git repo exists for version tracking
    index_service = IndexService(data_path=data_path)
    conversation_service = ConversationService(data_path=data_path)
    knowledge_service = KnowledgeService(data_path=data_path)
    vector_service = VectorService(data_path=data_path)

    # Ensure index exists
    index_service.create_index()

    # Store services in app state for dependency injection
    app.state.frame_service = frame_service
    app.state.git_service = git_service
    app.state.index_service = index_service
    app.state.conversation_service = conversation_service
    app.state.knowledge_service = knowledge_service
    app.state.vector_service = vector_service

    # Include routers
    app.include_router(
        create_frames_router(require_auth=require_auth),
        prefix="/api/frames",
        tags=["frames"],
    )
    app.include_router(
        create_ai_router(),
        prefix="/api",
        tags=["ai"],
    )
    app.include_router(
        create_users_router(),
        prefix="/api",
        tags=["users"],
    )
    app.include_router(
        create_conversations_router(require_auth=require_auth),
        prefix="/api/conversations",
        tags=["conversations"],
    )
    app.include_router(
        create_knowledge_router(require_auth=require_auth),
        prefix="/api/knowledge",
        tags=["knowledge"],
    )

    app.include_router(
        create_admin_router(),
        prefix="/api/admin",
        tags=["admin"],
    )

    return app


# Default app instance for uvicorn (only created when run directly)
def get_app() -> FastAPI:
    """Get or create the default app instance."""
    require_auth = os.getenv("REQUIRE_AUTH", "false").lower() in ("true", "1", "yes")
    return create_app(require_auth=require_auth)
