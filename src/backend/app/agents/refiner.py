"""
Refiner Agent for improving frame content.
"""
import json
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.agents.config import AIConfig


class RefinementResult(BaseModel):
    """Result of content refinement."""
    content: str = Field(description="Refined content")
    changes: list[str] = Field(default_factory=list, description="List of changes made")


class RefinerAgent:
    """Agent for refining and improving frame content."""

    def __init__(
        self,
        prompt_template: str,
        config: Optional[AIConfig] = None,
    ):
        """
        Initialize the refiner agent.

        Args:
            prompt_template: Template for building refinement prompts
            config: AI configuration (uses defaults if not provided)
        """
        self.prompt_template = prompt_template
        self.config = config or AIConfig()
        self.history: list[dict[str, str]] = []

    def build_prompt(self, **kwargs) -> str:
        """
        Build the refinement prompt from template and variables.

        Args:
            **kwargs: Variables to substitute in the template

        Returns:
            Rendered prompt string
        """
        prompt = self.prompt_template
        for key, value in kwargs.items():
            prompt = prompt.replace(f"{{{key}}}", str(value))
        return prompt

    def add_to_history(self, role: str, content: str) -> None:
        """
        Add a message to conversation history.

        Args:
            role: Message role (user or assistant)
            content: Message content
        """
        self.history.append({"role": role, "content": content})

    def clear_history(self) -> None:
        """Clear the conversation history."""
        self.history = []

    async def _call_ai(self, prompt: str) -> dict[str, Any]:
        """
        Call the AI provider with the prompt.

        Args:
            prompt: The refinement prompt

        Returns:
            Parsed response with content and changes
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
            import openai

            client = openai.AsyncOpenAI(api_key=self.config.api_key)

            response = await client.chat.completions.create(
                model=self.config.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a content refiner. Improve the given content based on instructions while preserving its structure. Respond with JSON containing: content (string with improved text), changes (list of strings describing changes made)."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            return json.loads(content)

        except ImportError:
            raise RuntimeError("openai package not installed")

    async def _call_anthropic(self, prompt: str) -> dict[str, Any]:
        """Call Anthropic API."""
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=self.config.api_key)

            response = await client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                system="You are a content refiner. Improve the given content based on instructions while preserving its structure. Respond with JSON containing: content (string with improved text), changes (list of strings describing changes made).",
            )

            content = response.content[0].text
            return json.loads(content)

        except ImportError:
            raise RuntimeError("anthropic package not installed")

    async def _call_ai_with_history(self, instruction: str) -> dict[str, Any]:
        """
        Call AI with conversation history for multi-turn refinement.

        Args:
            instruction: New instruction for refinement

        Returns:
            Parsed response with content and changes
        """
        if self.config.provider == "openai":
            try:
                import openai

                client = openai.AsyncOpenAI(api_key=self.config.api_key)

                messages = [
                    {
                        "role": "system",
                        "content": "You are a content refiner. Continue improving the content based on the conversation history. Respond with JSON containing: content (string), changes (list of strings)."
                    }
                ]

                # Add history
                for msg in self.history:
                    messages.append(msg)

                # Add new instruction
                messages.append({"role": "user", "content": instruction})

                response = await client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens,
                    response_format={"type": "json_object"},
                )

                content = response.choices[0].message.content
                return json.loads(content)

            except ImportError:
                raise RuntimeError("openai package not installed")
        else:
            raise ValueError(f"History not supported for provider: {self.config.provider}")

    async def refine(
        self,
        content: str,
        instruction: str,
    ) -> dict[str, Any]:
        """
        Refine content based on instruction.

        Args:
            content: The content to refine
            instruction: Refinement instruction

        Returns:
            Dictionary with refined content and list of changes
        """
        prompt = self.build_prompt(content=content, instruction=instruction)
        result = await self._call_ai(prompt)

        validated = RefinementResult(
            content=result.get("content", content),
            changes=result.get("changes", []),
        )

        return validated.model_dump()

    async def refine_with_history(self, instruction: str) -> dict[str, Any]:
        """
        Refine using conversation history context.

        Args:
            instruction: New refinement instruction

        Returns:
            Dictionary with refined content and list of changes
        """
        result = await self._call_ai_with_history(instruction)

        validated = RefinementResult(
            content=result.get("content", ""),
            changes=result.get("changes", []),
        )

        # Update history
        self.add_to_history("user", instruction)
        self.add_to_history("assistant", validated.content)

        return validated.model_dump()
