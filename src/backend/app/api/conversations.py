"""
Conversations API endpoints.
"""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.agents.config import get_ai_config
from app.agents.conversation import ConversationAgent
from app.api.ai import EVALUATE_PROMPT
from app.models.conversation import ConversationPurpose, ConversationState, ConversationStatus
from app.services.conversation_service import ConversationService, ConversationNotFoundError
from app.services.vector_service import VectorService
from app.services.git_service import GitService
from app.auth.pocketbase import get_current_user, User


# Request/Response models
class StartConversationRequest(BaseModel):
    owner: str
    purpose: Optional[str] = None
    frame_id: Optional[str] = None
    project_id: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str
    sender_name: Optional[str] = None
    language: Optional[str] = None


class ConversationMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    metadata: Optional[dict[str, Any]] = None
    sender_name: Optional[str] = None
    content_en: Optional[str] = None
    content_zh: Optional[str] = None


class ConversationStateResponse(BaseModel):
    frame_type: Optional[str] = None
    sections_covered: dict[str, float]
    gaps: list[str]
    ready_to_synthesize: bool


class ConversationResponse(BaseModel):
    id: str
    owner: str
    status: str
    purpose: str = "authoring"
    frame_id: Optional[str] = None
    project_id: Optional[str] = None
    messages: list[ConversationMessageResponse]
    state: ConversationStateResponse
    created_at: str
    updated_at: str


class ConversationListItem(BaseModel):
    id: str
    owner: str
    status: str
    purpose: str = "authoring"
    frame_id: Optional[str] = None
    project_id: Optional[str] = None
    message_count: int
    updated_at: str


class SendMessageResponse(BaseModel):
    message: ConversationMessageResponse
    ai_response: ConversationMessageResponse
    state: ConversationStateResponse
    relevant_knowledge: list[dict[str, Any]] = Field(default_factory=list)


class PreviewResponse(BaseModel):
    content: dict[str, str]


class SynthesizeRequest(BaseModel):
    content: Optional[dict[str, str]] = None


class SynthesizeResponse(BaseModel):
    frame_id: str
    content: dict[str, str]


def _to_conv_response(conv) -> ConversationResponse:
    return ConversationResponse(
        id=conv.id,
        owner=conv.owner,
        status=conv.status.value,
        purpose=conv.meta.purpose.value,
        frame_id=conv.meta.frame_id,
        project_id=conv.meta.project_id,
        messages=[
            ConversationMessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                timestamp=m.timestamp.isoformat(),
                metadata=m.metadata,
                sender_name=m.sender_name,
                content_en=m.content_en,
                content_zh=m.content_zh,
            )
            for m in conv.messages
        ],
        state=ConversationStateResponse(
            frame_type=conv.state.frame_type,
            sections_covered=conv.state.sections_covered,
            gaps=conv.state.gaps,
            ready_to_synthesize=conv.state.ready_to_synthesize,
        ),
        created_at=conv.meta.created_at.isoformat(),
        updated_at=conv.meta.updated_at.isoformat(),
    )


def get_conversation_service(request: Request) -> ConversationService:
    return request.app.state.conversation_service


def get_vector_service(request: Request) -> VectorService:
    return request.app.state.vector_service


def create_conversations_router(require_auth: bool = False) -> APIRouter:
    router = APIRouter()

    def get_auth_dependencies():
        if require_auth:
            return [Depends(get_current_user)]
        return []

    @router.post("", status_code=status.HTTP_201_CREATED, dependencies=get_auth_dependencies())
    def start_conversation(
        request: StartConversationRequest,
        conv_service: ConversationService = Depends(get_conversation_service),
    ) -> ConversationResponse:
        purpose = ConversationPurpose(request.purpose) if request.purpose else None
        conv = conv_service.create_conversation(
            owner=request.owner,
            purpose=purpose,
            frame_id=request.frame_id,
            project_id=request.project_id,
        )
        return _to_conv_response(conv)

    @router.get("")
    def list_conversations(
        owner: Optional[str] = None,
        conv_status: Optional[str] = None,
        frame_id: Optional[str] = None,
        project_id: Optional[str] = None,
        conv_service: ConversationService = Depends(get_conversation_service),
    ) -> list[ConversationListItem]:
        status_filter = ConversationStatus(conv_status) if conv_status else None
        conversations = conv_service.list_conversations(
            owner=owner, status=status_filter, frame_id=frame_id, project_id=project_id,
        )
        return [
            ConversationListItem(
                id=c.id,
                owner=c.owner,
                status=c.status.value,
                purpose=c.meta.purpose.value,
                frame_id=c.meta.frame_id,
                project_id=c.meta.project_id,
                message_count=len(c.messages),
                updated_at=c.meta.updated_at.isoformat(),
            )
            for c in conversations
        ]

    @router.get("/{conv_id}")
    def get_conversation(
        conv_id: str,
        conv_service: ConversationService = Depends(get_conversation_service),
    ) -> ConversationResponse:
        try:
            conv = conv_service.get_conversation(conv_id)
            return _to_conv_response(conv)
        except ConversationNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found: {conv_id}",
            )

    @router.post("/{conv_id}/message", dependencies=get_auth_dependencies())
    async def send_message(
        conv_id: str,
        request: SendMessageRequest,
        http_request: Request = None,
        conv_service: ConversationService = Depends(get_conversation_service),
        vector_service: VectorService = Depends(get_vector_service),
    ) -> SendMessageResponse:
        try:
            conv = conv_service.get_conversation(conv_id)
        except ConversationNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found: {conv_id}",
            )

        # Auto-reactivate synthesized conversations when user sends a new message
        if conv.status == ConversationStatus.SYNTHESIZED:
            conv_service.update_status(conv_id, ConversationStatus.ACTIVE)
            conv.meta.status = ConversationStatus.ACTIVE
        elif conv.status != ConversationStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation is not active",
            )

        # Search for relevant knowledge
        knowledge_context = ""
        relevant_knowledge: list[dict] = []
        try:
            results = vector_service.search(request.content, "knowledge", limit=3)
            if results:
                relevant_knowledge = results
                knowledge_context = "\n".join(
                    f"- {r.get('content', '')}" for r in results
                )
        except Exception:
            pass

        # Call AI agent BEFORE saving messages (so failed AI calls don't corrupt conversation)
        config = get_ai_config()
        agent = ConversationAgent(config=config)

        try:
            if conv.meta.purpose == ConversationPurpose.REVIEW and conv.meta.frame_id:
                # Load frame content for review context
                frame_service = http_request.app.state.frame_service
                try:
                    frame = frame_service.get_frame(conv.meta.frame_id)
                    root_cause_part = ""
                    if frame.content.root_cause:
                        root_cause_part = f"## Root Cause\n{frame.content.root_cause}\n\n"
                    frame_content = (
                        f"## Problem Statement\n{frame.content.problem_statement or ''}\n\n"
                        f"{root_cause_part}"
                        f"## User Perspective\n{frame.content.user_perspective or ''}\n\n"
                        f"## Engineering Framing\n{frame.content.engineering_framing or ''}\n\n"
                        f"## Validation Thinking\n{frame.content.validation_thinking or ''}"
                    )
                except Exception:
                    frame_content = "(Frame content unavailable)"

                turn = await agent.process_review_turn(
                    messages=conv.messages,
                    state=conv.state,
                    user_message=request.content,
                    frame_content=frame_content,
                    language=request.language,
                )
            else:
                turn = await agent.process_turn(
                    messages=conv.messages,
                    state=conv.state,
                    user_message=request.content,
                    knowledge_context=knowledge_context,
                    language=request.language,
                )
        except Exception as e:
            import logging
            logging.getLogger("conversations_api").exception(f"AI call failed: {type(e).__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {str(e)}",
            )

        # Save user message and AI response only after successful AI call
        user_msg = conv_service.add_message(
            conv_id, "user", request.content, sender_name=request.sender_name,
            content_en=turn.user_content_en, content_zh=turn.user_content_zh,
        )
        ai_msg = conv_service.add_message(
            conv_id, "assistant", turn.response,
            content_en=turn.response_en, content_zh=turn.response_zh,
        )

        # Update state
        conv_service.update_state(conv_id, turn.updated_state)

        return SendMessageResponse(
            message=ConversationMessageResponse(
                id=user_msg.id,
                role=user_msg.role,
                content=user_msg.content,
                timestamp=user_msg.timestamp.isoformat(),
                metadata=user_msg.metadata,
                sender_name=user_msg.sender_name,
                content_en=user_msg.content_en,
                content_zh=user_msg.content_zh,
            ),
            ai_response=ConversationMessageResponse(
                id=ai_msg.id,
                role=ai_msg.role,
                content=ai_msg.content,
                timestamp=ai_msg.timestamp.isoformat(),
                metadata=ai_msg.metadata,
                content_en=ai_msg.content_en,
                content_zh=ai_msg.content_zh,
            ),
            state=ConversationStateResponse(
                frame_type=turn.updated_state.frame_type,
                sections_covered=turn.updated_state.sections_covered,
                gaps=turn.updated_state.gaps,
                ready_to_synthesize=turn.updated_state.ready_to_synthesize,
            ),
            relevant_knowledge=relevant_knowledge,
        )

    @router.post("/{conv_id}/preview", dependencies=get_auth_dependencies())
    async def preview_frame(
        conv_id: str,
        conv_service: ConversationService = Depends(get_conversation_service),
    ) -> PreviewResponse:
        try:
            conv = conv_service.get_conversation(conv_id)
        except ConversationNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found: {conv_id}",
            )

        if conv.status not in (ConversationStatus.ACTIVE, ConversationStatus.SYNTHESIZED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation is not active",
            )

        config = get_ai_config()
        agent = ConversationAgent(config=config)
        try:
            content = await agent.synthesize_frame(conv.messages, conv.state)
        except Exception as e:
            import logging
            logging.getLogger("conversations_api").exception(f"Preview AI call failed: {type(e).__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {str(e)}",
            )

        return PreviewResponse(content=content)

    @router.post("/{conv_id}/synthesize", dependencies=get_auth_dependencies())
    async def synthesize_frame(
        conv_id: str,
        request: SynthesizeRequest = SynthesizeRequest(),
        conv_service: ConversationService = Depends(get_conversation_service),
        http_request: Request = None,
    ) -> SynthesizeResponse:
        try:
            conv = conv_service.get_conversation(conv_id)
        except ConversationNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found: {conv_id}",
            )

        if conv.status not in (ConversationStatus.ACTIVE, ConversationStatus.SYNTHESIZED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation is not active",
            )

        config = get_ai_config()

        # Use pre-computed content from preview if provided, otherwise call AI
        if request.content:
            content = request.content
        else:
            agent = ConversationAgent(config=config)
            content = await agent.synthesize_frame(conv.messages, conv.state)

        from app.models.frame import FrameContent, FrameType

        frame_type_str = conv.state.frame_type or "feature"
        frame_type = FrameType(frame_type_str)

        frame_service = http_request.app.state.frame_service

        # Build translations dict from bilingual synthesis keys
        translations = None
        section_keys = ["problem_statement", "root_cause", "user_perspective", "engineering_framing", "validation_thinking"]
        has_en = any(content.get(f"{k}_en") for k in section_keys)
        has_zh = any(content.get(f"{k}_zh") for k in section_keys)
        if has_en or has_zh:
            translations = {}
            if has_en:
                translations["en"] = {k: content.get(f"{k}_en", "") for k in section_keys}
            if has_zh:
                translations["zh"] = {k: content.get(f"{k}_zh", "") for k in section_keys}

        frame_content = FrameContent(
            problem_statement=content.get("problem_statement", ""),
            root_cause=content.get("root_cause", ""),
            user_perspective=content.get("user_perspective", ""),
            engineering_framing=content.get("engineering_framing", ""),
            validation_thinking=content.get("validation_thinking", ""),
            translations=translations,
        )

        # If already synthesized with a linked frame, update existing frame
        existing_frame_id = conv.meta.frame_id
        if existing_frame_id:
            try:
                frame = frame_service.update_frame_content(existing_frame_id, frame_content)
            except Exception:
                # Frame may have been deleted; create a new one
                frame = frame_service.create_frame(
                    frame_type=frame_type,
                    owner=conv.owner,
                    content=frame_content,
                    project_id=conv.meta.project_id,
                )
                conv_service.link_frame(conv_id, frame.id)
        else:
            frame = frame_service.create_frame(
                frame_type=frame_type,
                owner=conv.owner,
                content=frame_content,
                project_id=conv.meta.project_id,
            )
            conv_service.link_frame(conv_id, frame.id)

        # Git commit the frame changes for version history
        try:
            git_service: GitService = http_request.app.state.git_service
            is_update = existing_frame_id is not None
            git_service.commit_frame_changes(
                frame_id=frame.id,
                message=f"{'Re-synthesize' if is_update else 'Synthesize'} frame from conversation",
                author_name=conv.owner or "system",
                author_email=f"{conv.owner or 'system'}@framer",
            )
        except Exception:
            pass

        # Mark as synthesized
        conv_service.update_status(conv_id, ConversationStatus.SYNTHESIZED)

        # Store frame embedding for future searches
        try:
            vector_service = http_request.app.state.vector_service
            frame_text = f"{content.get('problem_statement', '')} {content.get('user_perspective', '')} {content.get('engineering_framing', '')} {content.get('validation_thinking', '')}"
            vector_service.store_embedding(
                id=frame.id,
                collection="frames",
                content=frame_text,
                metadata={"type": frame_type_str, "owner": conv.owner},
            )
        except Exception:
            pass

        # Auto-evaluate the synthesized frame using the EvaluatorAgent
        # so the frame page shows a quality score immediately
        try:
            from app.agents.evaluator import EvaluatorAgent
            evaluator = EvaluatorAgent(prompt_template=EVALUATE_PROMPT, config=config)
            root_cause_part = ""
            if content.get("root_cause"):
                root_cause_part = f"## Root Cause\n{content['root_cause']}\n\n"
            eval_content = (
                f"# Problem Statement\n{content.get('problem_statement', '')}\n\n"
                f"{root_cause_part}"
                f"## User Perspective\n{content.get('user_perspective', '')}\n\n"
                f"## Engineering Framing\n{content.get('engineering_framing', '')}\n\n"
                f"## Validation Thinking\n{content.get('validation_thinking', '')}\n"
            )
            eval_result = await evaluator.evaluate(frame_content=eval_content)
            frame_service.save_evaluation(
                frame_id=frame.id,
                score=eval_result["score"],
                breakdown=eval_result["breakdown"],
                feedback=eval_result["feedback"],
                issues=eval_result["issues"],
            )
        except Exception:
            import logging
            logging.getLogger("conversations_api").warning(
                "Auto-evaluation after synthesis failed for frame %s", frame.id, exc_info=True
            )

        return SynthesizeResponse(
            frame_id=frame.id,
            content=content,
        )

    @router.post("/{conv_id}/summarize-review", dependencies=get_auth_dependencies())
    async def summarize_review(
        conv_id: str,
        http_request: Request = None,
        conv_service: ConversationService = Depends(get_conversation_service),
    ):
        try:
            conv = conv_service.get_conversation(conv_id)
        except ConversationNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found: {conv_id}",
            )

        if conv.meta.purpose != ConversationPurpose.REVIEW:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only review conversations can be summarized",
            )

        config = get_ai_config()
        agent = ConversationAgent(config=config)

        try:
            result = await agent.summarize_review(conv.messages)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {str(e)}",
            )

        # Save review summary to frame
        if conv.meta.frame_id and http_request:
            try:
                frame_service = http_request.app.state.frame_service
                frame_service.save_review_summary(
                    frame_id=conv.meta.frame_id,
                    summary=result.get("summary", ""),
                    comments=result.get("comments", []),
                    recommendation=result.get("recommendation", "revise"),
                )
            except Exception:
                pass

        return result

    @router.delete("/{conv_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=get_auth_dependencies())
    def delete_conversation(
        conv_id: str,
        conv_service: ConversationService = Depends(get_conversation_service),
    ):
        try:
            conv_service.delete_conversation(conv_id)
        except ConversationNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found: {conv_id}",
            )

    return router
