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


# Inline prompt templates (previously loaded from data/templates/*/prompts/)
EVALUATE_PROMPT = """You are an expert software engineering reviewer evaluating a frame. Assess the quality and completeness of the pre-development thinking.

## Frame Content

{frame_content}

## Evaluation Criteria

Score each section (0-25 points each, total 100):

1. **Problem Statement** (0-25)
   - Is the problem clearly defined?
   - Is the business value articulated?
   - Are success metrics defined?
   - For bug frames: is there a root cause analysis?

2. **User Perspective** (0-25)
   - Are target users identified?
   - Is the user journey understood?
   - Are pain points specific?

3. **Engineering Framing** (0-25)
   - Is the solution approach clear?
   - Are technical decisions documented?
   - Are non-goals explicit?
   - Are risks identified?

4. **Validation Thinking** (0-25)
   - Are structured test cases provided (scenario, steps, expected result, priority)?
   - Is there a success criteria checklist?
   - Is there a rollback plan?
   - Deduct points if validation is only freeform prose without structured test cases

## Response Format

Provide your evaluation as JSON:
```json
{
  "score": <total 0-100>,
  "breakdown": {
    "problem_statement": <0-25>,
    "user_perspective": <0-25>,
    "engineering_framing": <0-25>,
    "validation_thinking": <0-25>
  },
  "feedback": "<overall assessment>",
  "issues": ["<specific issue 1>", "<specific issue 2>", ...]
}
```
"""

GENERATE_PROMPT = """You are an expert technical writer helping create documentation. Generate content for the {section} section based on the provided questionnaire answers.

## Section: {section}

## Questionnaire Answers

{formatted_answers}

## Instructions

Generate well-structured content for the {section} section. The content should:
- Be clear and concise
- Use bullet points where appropriate
- Include specific details from the answers
- Follow product development best practices
- Balance user needs with technical feasibility

## Response Format

Provide your response as JSON:
```json
{
  "content": "<generated markdown content>",
  "suggestions": ["<improvement suggestion 1>", "<improvement suggestion 2>"]
}
```
"""


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

        # Create evaluator and run
        evaluator = EvaluatorAgent(prompt_template=EVALUATE_PROMPT, config=config)

        # Build frame content string
        root_cause_section = ""
        if frame.content.root_cause:
            root_cause_section = f"\n## Root Cause\n{frame.content.root_cause}\n"
        frame_content = f"""# Problem Statement
{frame.content.problem_statement or ''}
{root_cause_section}
## User Perspective
{frame.content.user_perspective or ''}

## Engineering Framing
{frame.content.engineering_framing or ''}

## Validation Thinking
{frame.content.validation_thinking or ''}
"""

        result = await evaluator.evaluate(frame_content=frame_content)

        # Persist evaluation results to the frame
        frame_service.save_evaluation(
            frame_id=frame_id,
            score=result["score"],
            breakdown=result["breakdown"],
            feedback=result["feedback"],
            issues=result["issues"],
        )

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

        # Create generator and run
        generator = GeneratorAgent(prompt_template=GENERATE_PROMPT, config=config)

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
