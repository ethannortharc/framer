"""
AI API endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.agents.evaluator import EvaluatorAgent
from app.agents.generator import GeneratorAgent
from app.agents.refiner import RefinerAgent
from app.agents.config import AIConfig, get_ai_config as get_global_ai_config
from app.services.frame_service import FrameService, FrameNotFoundError
from app.services.template_service import TemplateService


# Request models
class EvaluateRequest(BaseModel):
    """Request for frame evaluation."""
    pass  # No additional params needed, uses frame content


class GenerateRequest(BaseModel):
    """Request for content generation."""
    section: str
    answers: list[dict]


class ChatRequest(BaseModel):
    """Request for AI chat."""
    message: str
    context: Optional[str] = None


# Response models
class EvaluationResponse(BaseModel):
    """Response from frame evaluation."""
    score: int
    breakdown: dict
    feedback: str
    issues: list[str]


class GenerationResponse(BaseModel):
    """Response from content generation."""
    content: str
    suggestions: list[str]


class ChatResponse(BaseModel):
    """Response from AI chat."""
    response: str


def get_frame_service(request: Request) -> FrameService:
    """Dependency to get the frame service."""
    return request.app.state.frame_service


def get_template_service(request: Request) -> TemplateService:
    """Dependency to get the template service."""
    return request.app.state.template_service


def get_ai_config(request: Request) -> AIConfig:
    """Dependency to get AI configuration."""
    return get_global_ai_config()


def create_ai_router() -> APIRouter:
    """Create the AI API router."""
    router = APIRouter()

    @router.post("/frames/{frame_id}/ai/evaluate", response_model=EvaluationResponse)
    async def evaluate_frame(
        frame_id: str,
        frame_service: FrameService = Depends(get_frame_service),
        template_service: TemplateService = Depends(get_template_service),
        config: AIConfig = Depends(get_ai_config),
    ) -> EvaluationResponse:
        """Evaluate a frame using AI."""
        try:
            frame = frame_service.get_frame(frame_id)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

        # Get evaluation prompt from template
        template = template_service.get_template_by_type(frame.type)
        prompt_template = "Evaluate this frame:\n\n{frame_content}"

        if template and template.get_prompt("evaluate"):
            prompt_template = template.get_prompt("evaluate").content

        # Create evaluator and run
        evaluator = EvaluatorAgent(prompt_template=prompt_template, config=config)

        # Build frame content string
        frame_content = f"""# Problem Statement
{frame.content.problem_statement or ''}

## User Perspective
{frame.content.user_perspective or ''}

## Engineering Framing
{frame.content.engineering_framing or ''}

## Validation Thinking
{frame.content.validation_thinking or ''}
"""

        result = await evaluator.evaluate(frame_content=frame_content)

        return EvaluationResponse(
            score=result["score"],
            breakdown=result["breakdown"],
            feedback=result["feedback"],
            issues=result["issues"],
        )

    @router.post("/frames/{frame_id}/ai/generate", response_model=GenerationResponse)
    async def generate_content(
        frame_id: str,
        request: GenerateRequest,
        frame_service: FrameService = Depends(get_frame_service),
        template_service: TemplateService = Depends(get_template_service),
        config: AIConfig = Depends(get_ai_config),
    ) -> GenerationResponse:
        """Generate content for a frame section."""
        try:
            frame = frame_service.get_frame(frame_id)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )

        # Get generation prompt from template
        template = template_service.get_template_by_type(frame.type)
        prompt_template = "Generate {section} content from:\n{formatted_answers}"

        if template and template.get_prompt("generate-section"):
            prompt_template = template.get_prompt("generate-section").content

        # Create generator and run
        generator = GeneratorAgent(prompt_template=prompt_template, config=config)

        result = await generator.generate_from_questionnaire(
            section=request.section,
            answers=request.answers,
        )

        return GenerationResponse(
            content=result["content"],
            suggestions=result["suggestions"],
        )

    @router.post("/ai/chat", response_model=ChatResponse)
    async def chat(
        request: ChatRequest,
        config: AIConfig = Depends(get_ai_config),
    ) -> ChatResponse:
        """Chat with AI for frame assistance."""
        prompt_template = "Context: {context}\n\nUser message: {message}"

        refiner = RefinerAgent(prompt_template=prompt_template, config=config)

        result = await refiner.refine(
            content=request.context or "",
            instruction=request.message,
        )

        return ChatResponse(response=result["content"])

    return router
