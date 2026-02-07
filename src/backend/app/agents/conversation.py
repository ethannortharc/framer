"""
Conversation Agent for AI-guided frame creation.

The agent acts as a "Framing Coach" that guides users through natural dialogue
to produce structured Frames. It tracks coverage of 4 sections internally
and synthesizes the conversation into a Frame when ready.
"""
import json
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.agents.config import AIConfig, parse_json_response
from app.models.conversation import ConversationMessage, ConversationState


SYSTEM_PROMPT = """You are a Framing Coach for an engineering team. Your role is to help engineers clarify their thinking before they start implementation work.

You guide a natural conversation to elicit information for four dimensions:
1. **Problem Statement** — A clear, solution-free definition of the problem (max 30 words)
2. **User Perspective** — Who is affected, their journey, pain points, and context
3. **Engineering Framing** — Key principles, invariants, trade-offs, and explicit non-goals
4. **Validation Thinking** — Success signals, falsification criteria, how to know it worked

IMPORTANT RULES:
- Ask ONE focused question at a time
- Be conversational, not interrogative
- Acknowledge what the user says before asking the next question
- Start by understanding the broad problem, then drill into specifics
- If the user's description naturally covers multiple sections, acknowledge that and move on
- Don't ask about things already clearly stated
- When you detect the frame type (bug/feature/exploration), note it internally

You must respond with JSON in this exact format:
{
  "response": "Your conversational message to the user",
  "updated_state": {
    "frame_type": "bug" | "feature" | "exploration" | null,
    "sections_covered": {
      "problem_statement": 0.0-1.0,
      "user_perspective": 0.0-1.0,
      "engineering_framing": 0.0-1.0,
      "validation_thinking": 0.0-1.0
    },
    "extracted_content": {
      "problem_statement": "extracted content so far...",
      "user_perspective": "extracted content so far...",
      "engineering_framing": "extracted content so far...",
      "validation_thinking": "extracted content so far..."
    },
    "gaps": ["list of information still needed"],
    "ready_to_synthesize": true/false
  },
  "relevant_knowledge": []
}

Set ready_to_synthesize to true when all sections have >= 0.6 coverage.
"""

SYNTHESIZE_PROMPT = """Based on the conversation below, synthesize a structured Frame.

Conversation messages:
{messages}

Current extracted content:
{extracted_content}

Generate a complete Frame with these four sections. Use the information from the conversation.
Respond with JSON:
{{
  "problem_statement": "Clear, solution-free problem statement (max 30 words)",
  "user_perspective": "Who is affected, their context, journey steps, and pain points",
  "engineering_framing": "Key principles, invariants, trade-offs, and non-goals",
  "validation_thinking": "Success signals and disconfirming evidence"
}}
"""

DETECT_TYPE_PROMPT = """Based on the following conversation messages, determine the frame type.

Messages:
{messages}

Respond with JSON:
{{
  "frame_type": "bug" | "feature" | "exploration" | null,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}}
"""


class ConversationTurn(BaseModel):
    """Result of processing a conversation turn."""
    response: str = Field(description="AI response text")
    updated_state: ConversationState = Field(description="Updated conversation state")
    relevant_knowledge: list[dict[str, Any]] = Field(default_factory=list)


class ConversationAgent:
    """Agent for guiding frame creation through conversation."""

    def __init__(self, config: Optional[AIConfig] = None):
        self.config = config or AIConfig()

    def _format_messages_for_prompt(self, messages: list[ConversationMessage]) -> str:
        lines = []
        for msg in messages:
            role = "User" if msg.role == "user" else "Assistant"
            lines.append(f"{role}: {msg.content}")
        return "\n".join(lines)

    async def _call_ai(
        self, system: str, messages: list[dict[str, str]]
    ) -> dict[str, Any]:
        if self.config.provider == "openai":
            return await self._call_openai(system, messages)
        elif self.config.provider == "anthropic":
            return await self._call_anthropic(system, messages)
        else:
            raise ValueError(f"Unsupported provider: {self.config.provider}")

    async def _call_openai(
        self, system: str, messages: list[dict[str, str]]
    ) -> dict[str, Any]:
        try:
            client = self.config.create_openai_client()

            all_messages = [{"role": "system", "content": system}] + messages

            response = await client.chat.completions.create(
                model=self.config.model,
                messages=all_messages,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            return parse_json_response(content)
        except ImportError:
            raise RuntimeError("openai package not installed")

    async def _call_anthropic(
        self, system: str, messages: list[dict[str, str]]
    ) -> dict[str, Any]:
        try:
            import anthropic as anthropic_lib

            client = self.config.create_anthropic_client()

            response = await client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                messages=messages,
                system=system,
            )

            if not response.content:
                raise ValueError("Empty content in AI response")
            content = response.content[0].text
            return parse_json_response(content)
        except ImportError:
            raise RuntimeError("anthropic package not installed")
        except (anthropic_lib.APITimeoutError, anthropic_lib.APIConnectionError) as e:
            raise RuntimeError(f"AI service connection error: {e}")

    async def process_turn(
        self,
        messages: list[ConversationMessage],
        state: ConversationState,
        user_message: str,
        knowledge_context: str = "",
    ) -> ConversationTurn:
        """Process a single conversation turn."""
        system = SYSTEM_PROMPT
        if knowledge_context:
            system += f"\n\nRelevant team knowledge to consider:\n{knowledge_context}"

        system += f"\n\nCurrent state:\n{json.dumps(state.model_dump(), indent=2)}"

        chat_messages = []
        for msg in messages:
            chat_messages.append({"role": msg.role, "content": msg.content})
        chat_messages.append({"role": "user", "content": user_message})

        result = await self._call_ai(system, chat_messages)

        updated_state_data = result.get("updated_state", {})
        updated_state = ConversationState(
            frame_type=updated_state_data.get("frame_type", state.frame_type),
            sections_covered=updated_state_data.get("sections_covered", state.sections_covered),
            extracted_content=updated_state_data.get("extracted_content", state.extracted_content),
            gaps=updated_state_data.get("gaps", state.gaps),
            ready_to_synthesize=updated_state_data.get("ready_to_synthesize", state.ready_to_synthesize),
        )

        return ConversationTurn(
            response=result.get("response", "I need a moment to think about that."),
            updated_state=updated_state,
            relevant_knowledge=result.get("relevant_knowledge", []),
        )

    async def synthesize_frame(
        self, messages: list[ConversationMessage], state: ConversationState
    ) -> dict[str, str]:
        """Synthesize conversation into structured Frame content."""
        messages_text = self._format_messages_for_prompt(messages)
        extracted = json.dumps(state.extracted_content, indent=2)

        prompt = SYNTHESIZE_PROMPT.format(
            messages=messages_text,
            extracted_content=extracted,
        )

        result = await self._call_ai(
            "You are a technical writer. Synthesize conversation content into structured Frame sections. Respond with JSON.",
            [{"role": "user", "content": prompt}],
        )

        return {
            "problem_statement": result.get("problem_statement", ""),
            "user_perspective": result.get("user_perspective", ""),
            "engineering_framing": result.get("engineering_framing", ""),
            "validation_thinking": result.get("validation_thinking", ""),
        }

    async def detect_frame_type(
        self, messages: list[ConversationMessage]
    ) -> Optional[str]:
        """Detect frame type from conversation messages."""
        messages_text = self._format_messages_for_prompt(messages)

        prompt = DETECT_TYPE_PROMPT.format(messages=messages_text)

        result = await self._call_ai(
            "Analyze the conversation and determine the frame type. Respond with JSON.",
            [{"role": "user", "content": prompt}],
        )

        frame_type = result.get("frame_type")
        if frame_type in ("bug", "feature", "exploration"):
            return frame_type
        return None
