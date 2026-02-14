"""
Evaluator Agent for scoring and analyzing frames.
"""
import json
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

from app.agents.config import AIConfig, parse_json_response, call_ai_with_retry


class EvaluationResult(BaseModel):
    """Result of frame evaluation."""
    score: int = Field(ge=0, le=100, description="Overall score 0-100")
    breakdown: dict[str, int] = Field(default_factory=dict, description="Score breakdown by category")
    feedback: str = Field(default="", description="Overall feedback text")
    issues: list[str] = Field(default_factory=list, description="List of specific issues found")

    @field_validator("score")
    @classmethod
    def validate_score(cls, v: int) -> int:
        """Ensure score is within valid range."""
        if v < 0 or v > 100:
            raise ValueError(f"Score must be between 0 and 100, got {v}")
        return v


class EvaluatorAgent:
    """Agent for evaluating frame quality and providing feedback."""

    def __init__(
        self,
        prompt_template: str,
        config: Optional[AIConfig] = None,
    ):
        """
        Initialize the evaluator agent.

        Args:
            prompt_template: Template for building evaluation prompts
            config: AI configuration (uses defaults if not provided)
        """
        self.prompt_template = prompt_template
        self.config = config or AIConfig()

    def build_prompt(self, **kwargs) -> str:
        """
        Build the evaluation prompt from template and variables.

        Args:
            **kwargs: Variables to substitute in the template

        Returns:
            Rendered prompt string
        """
        prompt = self.prompt_template
        for key, value in kwargs.items():
            prompt = prompt.replace(f"{{{key}}}", str(value))
        return prompt

    async def _call_ai(self, prompt: str) -> dict[str, Any]:
        """
        Call the AI provider with the prompt, with retry on transient failures.

        Args:
            prompt: The evaluation prompt

        Returns:
            Parsed response with score, breakdown, feedback, and issues
        """
        async def _do_call():
            if self.config.is_openai_compatible:
                return await self._call_openai(prompt)
            elif self.config.provider == "anthropic":
                return await self._call_anthropic(prompt)
            else:
                raise ValueError(f"Unsupported provider: {self.config.provider}")

        return await call_ai_with_retry(_do_call)

    async def _call_openai(self, prompt: str) -> dict[str, Any]:
        """Call OpenAI API."""
        try:
            client = self.config.create_openai_client()

            response = await client.chat.completions.create(
                model=self.config.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a frame evaluator. Respond with JSON containing: score (0-100), breakdown (dict of category scores), feedback (string), issues (list of strings)."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            return parse_json_response(content)

        except ImportError:
            raise RuntimeError("openai package not installed")

    async def _call_anthropic(self, prompt: str) -> dict[str, Any]:
        """Call Anthropic API."""
        try:
            client = self.config.create_anthropic_client()

            response = await client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                system="You are a frame evaluator. Respond with JSON containing: score (0-100), breakdown (dict of category scores), feedback (string), issues (list of strings).",
            )

            content = response.content[0].text
            return parse_json_response(content)

        except ImportError:
            raise RuntimeError("anthropic package not installed")

    async def evaluate(self, frame_content: str, **kwargs) -> dict[str, Any]:
        """
        Evaluate a frame and return scores and feedback.

        Args:
            frame_content: The frame content to evaluate
            **kwargs: Additional variables for the prompt template

        Returns:
            Dictionary with score, breakdown, feedback, and issues
        """
        prompt = self.build_prompt(frame_content=frame_content, **kwargs)
        result = await self._call_ai(prompt)

        # Validate the result
        validated = EvaluationResult(
            score=result.get("score", 0),
            breakdown=result.get("breakdown", {}),
            feedback=result.get("feedback", ""),
            issues=result.get("issues", []),
        )

        return validated.model_dump()
