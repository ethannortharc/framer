"""
Knowledge API endpoints.
"""
import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.agents.config import get_ai_config, parse_json_response
from app.models.knowledge import KnowledgeCategory, KnowledgeSource
from app.services.knowledge_service import KnowledgeService, KnowledgeNotFoundError
from app.services.vector_service import VectorService
from app.auth.pocketbase import get_current_user, User


# Request/Response models
class CreateKnowledgeRequest(BaseModel):
    title: str
    content: str
    category: KnowledgeCategory
    source: KnowledgeSource = KnowledgeSource.MANUAL
    source_id: Optional[str] = None
    project_id: Optional[str] = None
    author: str
    tags: list[str] = Field(default_factory=list)


class UpdateKnowledgeRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[KnowledgeCategory] = None
    tags: Optional[list[str]] = None


class KnowledgeResponse(BaseModel):
    id: str
    title: str
    content: str
    category: str
    source: str
    source_id: Optional[str] = None
    project_id: Optional[str] = None
    author: str
    tags: list[str]
    created_at: str
    updated_at: str


class SearchKnowledgeRequest(BaseModel):
    query: str
    limit: int = 5
    category: Optional[KnowledgeCategory] = None


class SearchResult(BaseModel):
    id: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    distance: Optional[float] = None


class DistillRequest(BaseModel):
    frame_id: Optional[str] = None
    conversation_id: Optional[str] = None
    feedback: Optional[str] = None


def _to_response(entry) -> KnowledgeResponse:
    return KnowledgeResponse(
        id=entry.id,
        title=entry.title,
        content=entry.content,
        category=entry.category.value,
        source=entry.source.value,
        source_id=entry.source_id,
        project_id=entry.project_id,
        author=entry.author,
        tags=entry.tags,
        created_at=entry.created_at.isoformat(),
        updated_at=entry.updated_at.isoformat(),
    )


def get_knowledge_service(request: Request) -> KnowledgeService:
    return request.app.state.knowledge_service


def get_vector_service(request: Request) -> VectorService:
    return request.app.state.vector_service


def create_knowledge_router(require_auth: bool = False) -> APIRouter:
    router = APIRouter()

    def get_auth_dependencies():
        if require_auth:
            return [Depends(get_current_user)]
        return []

    @router.post("", status_code=status.HTTP_201_CREATED, dependencies=get_auth_dependencies())
    def create_entry(
        request: CreateKnowledgeRequest,
        knowledge_service: KnowledgeService = Depends(get_knowledge_service),
        vector_service: VectorService = Depends(get_vector_service),
    ) -> KnowledgeResponse:
        entry = knowledge_service.create_entry(
            title=request.title,
            content=request.content,
            category=request.category,
            source=request.source,
            source_id=request.source_id,
            project_id=request.project_id,
            author=request.author,
            tags=request.tags,
        )

        # Store embedding for semantic search
        try:
            vector_service.store_embedding(
                id=entry.id,
                collection="knowledge",
                content=f"{entry.title}\n{entry.content}",
                metadata={
                    "category": entry.category.value,
                    "author": entry.author,
                    "project_id": entry.project_id or "",
                },
            )
        except Exception:
            pass

        return _to_response(entry)

    @router.get("")
    def list_entries(
        category: Optional[str] = None,
        project_id: Optional[str] = None,
        tags: Optional[str] = None,
        knowledge_service: KnowledgeService = Depends(get_knowledge_service),
    ) -> list[KnowledgeResponse]:
        cat_filter = KnowledgeCategory(category) if category else None
        tags_filter = tags.split(",") if tags else None
        entries = knowledge_service.list_entries(
            category=cat_filter,
            project_id=project_id,
            tags=tags_filter,
        )
        return [_to_response(e) for e in entries]

    @router.get("/{entry_id}")
    def get_entry(
        entry_id: str,
        knowledge_service: KnowledgeService = Depends(get_knowledge_service),
    ) -> KnowledgeResponse:
        try:
            entry = knowledge_service.get_entry(entry_id)
            return _to_response(entry)
        except KnowledgeNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Knowledge entry not found: {entry_id}",
            )

    @router.put("/{entry_id}", dependencies=get_auth_dependencies())
    def update_entry(
        entry_id: str,
        request: UpdateKnowledgeRequest,
        knowledge_service: KnowledgeService = Depends(get_knowledge_service),
        vector_service: VectorService = Depends(get_vector_service),
    ) -> KnowledgeResponse:
        try:
            entry = knowledge_service.update_entry(
                entry_id,
                title=request.title,
                content=request.content,
                category=request.category,
                tags=request.tags,
            )

            # Update embedding
            try:
                vector_service.store_embedding(
                    id=entry.id,
                    collection="knowledge",
                    content=f"{entry.title}\n{entry.content}",
                    metadata={
                        "category": entry.category.value,
                        "author": entry.author,
                        "project_id": entry.project_id or "",
                    },
                )
            except Exception:
                pass

            return _to_response(entry)
        except KnowledgeNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Knowledge entry not found: {entry_id}",
            )

    @router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=get_auth_dependencies())
    def delete_entry(
        entry_id: str,
        knowledge_service: KnowledgeService = Depends(get_knowledge_service),
        vector_service: VectorService = Depends(get_vector_service),
    ):
        try:
            knowledge_service.delete_entry(entry_id)
            try:
                vector_service.delete_embedding(entry_id, "knowledge")
            except Exception:
                pass
        except KnowledgeNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Knowledge entry not found: {entry_id}",
            )

    @router.post("/search")
    def search_knowledge(
        request: SearchKnowledgeRequest,
        vector_service: VectorService = Depends(get_vector_service),
    ) -> list[SearchResult]:
        where = None
        if request.category:
            where = {"category": request.category.value}

        try:
            results = vector_service.search(
                query=request.query,
                collection="knowledge",
                limit=request.limit,
                where=where,
            )
        except Exception:
            return []

        return [
            SearchResult(
                id=r.get("id", ""),
                content=r.get("content", ""),
                metadata=r.get("metadata", {}),
                distance=r.get("distance"),
            )
            for r in results
        ]

    @router.post("/distill", dependencies=get_auth_dependencies())
    async def distill_knowledge(
        request: DistillRequest,
        http_request: Request,
        knowledge_service: KnowledgeService = Depends(get_knowledge_service),
        vector_service: VectorService = Depends(get_vector_service),
    ) -> list[KnowledgeResponse]:
        """Distill knowledge from frame feedback or conversation."""
        config = get_ai_config()

        context = ""
        source = KnowledgeSource.FEEDBACK
        source_id = request.frame_id

        if request.frame_id and request.feedback:
            # Distill from frame feedback
            try:
                frame_service = http_request.app.state.frame_service
                frame = frame_service.get_frame(request.frame_id)
                context = (
                    f"Frame: {frame.content.problem_statement}\n"
                    f"Feedback: {request.feedback}"
                )
            except Exception:
                context = f"Feedback: {request.feedback}"
        elif request.conversation_id:
            # Distill from conversation
            source = KnowledgeSource.CONVERSATION
            source_id = request.conversation_id
            try:
                conv_service = http_request.app.state.conversation_service
                conv = conv_service.get_conversation(request.conversation_id)
                context = "\n".join(
                    f"{m.role}: {m.content}" for m in conv.messages
                )
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not load conversation",
                )

        if not context:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No content to distill from",
            )

        # Use AI to extract knowledge entries
        distill_prompt = f"""Extract reusable knowledge from this content. For each learning, provide:
- title: short descriptive title
- content: the full learning or pattern
- category: one of (pattern, decision, prediction, context, lesson)
- tags: relevant tags

Content:
{context}

Respond with JSON:
{{"entries": [{{"title": "...", "content": "...", "category": "...", "tags": ["..."]}}]}}"""

        entries = []
        try:
            if config.provider == "openai":
                client = config.create_openai_client()
                response = await client.chat.completions.create(
                    model=config.model,
                    messages=[
                        {"role": "system", "content": "Extract knowledge entries from content. Respond with JSON."},
                        {"role": "user", "content": distill_prompt},
                    ],
                    temperature=config.temperature,
                    max_tokens=config.max_tokens,
                    response_format={"type": "json_object"},
                )
                result = parse_json_response(response.choices[0].message.content)
            elif config.provider == "anthropic":
                client = config.create_anthropic_client()
                response = await client.messages.create(
                    model=config.model,
                    max_tokens=config.max_tokens,
                    messages=[{"role": "user", "content": distill_prompt}],
                    system="Extract knowledge entries from content. Respond with JSON.",
                )
                result = parse_json_response(response.content[0].text)
            else:
                result = {"entries": []}

            for item in result.get("entries", []):
                cat = item.get("category", "lesson")
                if cat not in ("pattern", "decision", "prediction", "context", "lesson"):
                    cat = "lesson"

                entry = knowledge_service.create_entry(
                    title=item.get("title", "Untitled"),
                    content=item.get("content", ""),
                    category=KnowledgeCategory(cat),
                    source=source,
                    source_id=source_id,
                    author="ai",
                    tags=item.get("tags", []),
                )

                try:
                    vector_service.store_embedding(
                        id=entry.id,
                        collection="knowledge",
                        content=f"{entry.title}\n{entry.content}",
                        metadata={
                            "category": entry.category.value,
                            "author": entry.author,
                        },
                    )
                except Exception:
                    pass

                entries.append(entry)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to distill knowledge: {str(e)}",
            )

        return [_to_response(e) for e in entries]

    return router
