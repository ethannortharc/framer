"""
Conversations API endpoints.
"""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.agents.config import get_ai_config
from app.agents.conversation import ConversationAgent
from app.models.conversation import ConversationState, ConversationStatus
from app.services.conversation_service import ConversationService, ConversationNotFoundError
from app.services.vector_service import VectorService
from app.auth.pocketbase import get_current_user, User


# Request/Response models
class StartConversationRequest(BaseModel):
    owner: str


class SendMessageRequest(BaseModel):
    content: str


class ConversationMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    metadata: Optional[dict[str, Any]] = None


class ConversationStateResponse(BaseModel):
    frame_type: Optional[str] = None
    sections_covered: dict[str, float]
    gaps: list[str]
    ready_to_synthesize: bool


class ConversationResponse(BaseModel):
    id: str
    owner: str
    status: str
    frame_id: Optional[str] = None
    messages: list[ConversationMessageResponse]
    state: ConversationStateResponse
    created_at: str
    updated_at: str


class ConversationListItem(BaseModel):
    id: str
    owner: str
    status: str
    frame_id: Optional[str] = None
    message_count: int
    updated_at: str


class SendMessageResponse(BaseModel):
    message: ConversationMessageResponse
    ai_response: ConversationMessageResponse
    state: ConversationStateResponse
    relevant_knowledge: list[dict[str, Any]] = Field(default_factory=list)


class SynthesizeResponse(BaseModel):
    frame_id: str
    content: dict[str, str]


def _to_conv_response(conv) -> ConversationResponse:
    return ConversationResponse(
        id=conv.id,
        owner=conv.owner,
        status=conv.status.value,
        frame_id=conv.meta.frame_id,
        messages=[
            ConversationMessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                timestamp=m.timestamp.isoformat(),
                metadata=m.metadata,
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
        conv = conv_service.create_conversation(owner=request.owner)
        return _to_conv_response(conv)

    @router.get("")
    def list_conversations(
        owner: Optional[str] = None,
        conv_status: Optional[str] = None,
        conv_service: ConversationService = Depends(get_conversation_service),
    ) -> list[ConversationListItem]:
        status_filter = ConversationStatus(conv_status) if conv_status else None
        conversations = conv_service.list_conversations(owner=owner, status=status_filter)
        return [
            ConversationListItem(
                id=c.id,
                owner=c.owner,
                status=c.status.value,
                frame_id=c.meta.frame_id,
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

        if conv.status != ConversationStatus.ACTIVE:
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
            turn = await agent.process_turn(
                messages=conv.messages,
                state=conv.state,
                user_message=request.content,
                knowledge_context=knowledge_context,
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {str(e)}",
            )

        # Save user message and AI response only after successful AI call
        user_msg = conv_service.add_message(conv_id, "user", request.content)
        ai_msg = conv_service.add_message(conv_id, "assistant", turn.response)

        # Update state
        conv_service.update_state(conv_id, turn.updated_state)

        return SendMessageResponse(
            message=ConversationMessageResponse(
                id=user_msg.id,
                role=user_msg.role,
                content=user_msg.content,
                timestamp=user_msg.timestamp.isoformat(),
                metadata=user_msg.metadata,
            ),
            ai_response=ConversationMessageResponse(
                id=ai_msg.id,
                role=ai_msg.role,
                content=ai_msg.content,
                timestamp=ai_msg.timestamp.isoformat(),
                metadata=ai_msg.metadata,
            ),
            state=ConversationStateResponse(
                frame_type=turn.updated_state.frame_type,
                sections_covered=turn.updated_state.sections_covered,
                gaps=turn.updated_state.gaps,
                ready_to_synthesize=turn.updated_state.ready_to_synthesize,
            ),
            relevant_knowledge=relevant_knowledge,
        )

    @router.post("/{conv_id}/synthesize", dependencies=get_auth_dependencies())
    async def synthesize_frame(
        conv_id: str,
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

        if conv.status != ConversationStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation is not active",
            )

        # Synthesize via AI
        config = get_ai_config()
        agent = ConversationAgent(config=config)
        content = await agent.synthesize_frame(conv.messages, conv.state)

        # Create frame via frame service
        from app.models.frame import FrameContent, FrameType

        frame_type_str = conv.state.frame_type or "feature"
        frame_type = FrameType(frame_type_str)

        frame_service = http_request.app.state.frame_service
        frame_content = FrameContent(
            problem_statement=content.get("problem_statement", ""),
            user_perspective=content.get("user_perspective", ""),
            engineering_framing=content.get("engineering_framing", ""),
            validation_thinking=content.get("validation_thinking", ""),
        )
        frame = frame_service.create_frame(
            frame_type=frame_type,
            owner=conv.owner,
            content=frame_content,
        )

        # Link conversation to frame and mark as synthesized
        conv_service.link_frame(conv_id, frame.id)
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

        return SynthesizeResponse(
            frame_id=frame.id,
            content=content,
        )

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
