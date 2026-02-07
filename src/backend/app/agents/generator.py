"""
Generator Agent for creating frame content.
"""
import json
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.agents.config import AIConfig, parse_json_response


class GenerationResult(BaseModel):
    """Result of content generation."""
    content: str = Field(description="Generated content")
    suggestions: list[str] = Field(default_factory=list, description="Improvement suggestions")


class GeneratorAgent:
    """Agent for generating frame content from questionnaire answers."""

    def __init__(
        self,
        prompt_template: str,
        config: Optional[AIConfig] = None,
    ):
        """
        Initialize the generator agent.

        Args:
            prompt_template: Template for building generation prompts
            config: AI configuration (uses defaults if not provided)
        """
        self.prompt_template = prompt_template
        self.config = config or AIConfig()

    def build_prompt(self, **kwargs) -> str:
        """
        Build the generation prompt from template and variables.

        Args:
            **kwargs: Variables to substitute in the template

        Returns:
            Rendered prompt string
        """
        prompt = self.prompt_template
        for key, value in kwargs.items():
            prompt = prompt.replace(f"{{{key}}}", str(value))
        return prompt

    def format_answers(self, answers: list[dict]) -> str:
        """
        Format questionnaire answers as readable text.

        Args:
            answers: List of {question, answer} dicts

        Returns:
            Formatted string with Q&A pairs
        """
        lines = []
        for item in answers:
            lines.append(f"Q: {item['question']}")
            lines.append(f"A: {item['answer']}")
            lines.append("")
        return "\n".join(lines)

    async def _call_ai(self, prompt: str) -> dict[str, Any]:
        """
        Call the AI provider with the prompt.

        Args:
            prompt: The generation prompt

        Returns:
            Parsed response with content and suggestions
        """
        if self.config.provider == "openai":
            return await self._call_openai(prompt)
        elif self.config.provider == "anthropic":
            return await self._call_anthropic(prompt)
        else:
            raise ValueError(f"Unsupported provider: {self.config.provider}")

    async def _call_openai(self, prompt: str) -> dict[str, Any]:
        """Call OpenAI API."""
        try:
            client = self.config.create_openai_client()

            response = await client.chat.completions.create(
                model=self.config.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a content generator for development frames. Generate clear, well-structured content. Respond with JSON containing: content (string), suggestions (list of strings for improvements)."
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
                system="You are a content generator for development frames. Generate clear, well-structured content. Respond with JSON containing: content (string), suggestions (list of strings for improvements).",
            )

            content = response.content[0].text
            return parse_json_response(content)

        except ImportError:
            raise RuntimeError("anthropic package not installed")

    async def generate(self, **kwargs) -> dict[str, Any]:
        """
        Generate content using the prompt template.

        Args:
            **kwargs: Variables for the prompt template

        Returns:
            Dictionary with content and suggestions
        """
        prompt = self.build_prompt(**kwargs)
        result = await self._call_ai(prompt)

        validated = GenerationResult(
            content=result.get("content", ""),
            suggestions=result.get("suggestions", []),
        )

        return validated.model_dump()

    async def generate_from_questionnaire(
        self,
        section: str,
        answers: list[dict],
    ) -> dict[str, Any]:
        """
        Generate content from questionnaire answers.

        Args:
            section: The section to generate content for
            answers: List of {question, answer} dicts

        Returns:
            Dictionary with content and suggestions
        """
        formatted_answers = self.format_answers(answers)
        prompt = self.build_prompt(section=section, formatted_answers=formatted_answers)
        result = await self._call_ai(prompt)

        validated = GenerationResult(
            content=result.get("content", ""),
            suggestions=result.get("suggestions", []),
        )

        return validated.model_dump()
