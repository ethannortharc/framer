"""
Conversation Agent for AI-guided frame creation.

The agent acts as a "Framing Coach" that guides users through natural dialogue
to produce structured Frames. It tracks coverage of 4 sections internally
and synthesizes the conversation into a Frame when ready.
"""
import json
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.agents.config import AIConfig, parse_json_response, call_ai_with_retry
from app.models.conversation import ConversationMessage, ConversationState


SYSTEM_PROMPT = """You are a Framing Coach for an engineering team. Your role is to help engineers clarify their thinking before they start implementation work.

You guide a natural conversation to elicit information for these dimensions:
1. **Problem Statement** — A clear, solution-free definition of the problem (max 30 words)
1b. **Root Cause** (bug frames only) — Technical root cause analysis: what went wrong and why
2. **User Perspective** — Who is affected, their journey, pain points, and context
3. **Engineering Framing** — Key principles, invariants, trade-offs, and explicit non-goals
4. **Validation Thinking** — Structured test cases (scenario, steps, expected result, priority), success criteria checklist, rollback plan

IMPORTANT RULES:
- Ask ONE focused question at a time
- Be conversational, not interrogative
- Acknowledge what the user says before asking the next question
- Start by understanding the broad problem, then drill into specifics
- If the user's description naturally covers multiple sections, acknowledge that and move on
- Don't ask about things already clearly stated
- When you detect the frame type (bug/feature/exploration), note it internally
- For bug frames, always explore root cause after the problem statement

You must respond with JSON in this exact format:
{
  "response": "Your conversational message to the user",
  "updated_state": {
    "frame_type": "bug" | "feature" | "exploration" | null,
    "sections_covered": {
      "problem_statement": 0.0-1.0,
      "root_cause": 0.0-1.0,
      "user_perspective": 0.0-1.0,
      "engineering_framing": 0.0-1.0,
      "validation_thinking": 0.0-1.0
    },
    "extracted_content": {
      "problem_statement": "extracted content so far...",
      "root_cause": "extracted content so far (bug frames only, empty string for others)...",
      "user_perspective": "extracted content so far...",
      "engineering_framing": "extracted content so far...",
      "validation_thinking": "extracted content so far..."
    },
    "gaps": ["list of information still needed"],
    "ready_to_synthesize": true/false
  },
  "relevant_knowledge": []
}

Set ready_to_synthesize to true when all sections have >= 0.6 coverage (root_cause only required for bug frames).
"""

SYNTHESIZE_PROMPT = """Based on the conversation below, synthesize a structured Frame.

Conversation messages:
{messages}

Current extracted content:
{extracted_content}

Generate a complete Frame with the sections below. Use the information from the conversation.
Each section value should be **rich markdown** — use headings (###), bullet lists, bold emphasis, and numbered lists to make the content scannable and well-organized. Do NOT return plain prose; structure it for readability.

For "validation_thinking", use this structured format:
### Test Cases
| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|----------------|----------|
| 1 | ... | ... | ... | P0 |

### Success Criteria
- [ ] ...

### Rollback Plan
- ...

Respond with JSON:
{{
  "problem_statement": "Clear, solution-free problem statement (max 30 words, plain text)",
  "root_cause": "For bug frames: technical root cause analysis. For non-bug frames: empty string",
  "user_perspective": "Rich markdown: ### Who is affected\\n- bullet points\\n### User Journey\\n1. step one\\n### Pain Points\\n- ...",
  "engineering_framing": "Rich markdown: ### Key Principles\\n1. ...\\n### Non-Goals & Trade-offs\\n- ...",
  "validation_thinking": "Structured markdown with ### Test Cases table, ### Success Criteria checklist, ### Rollback Plan"
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


REVIEW_SYSTEM_PROMPT = """You are a Review Coach helping an engineering reviewer evaluate a Frame (a structured problem description). The frame has four sections:
1. **Problem Statement** — Clear, solution-free definition
2. **User Perspective** — Who is affected, journey, pain points
3. **Engineering Framing** — Principles, trade-offs, non-goals
4. **Validation Thinking** — Success signals, falsification criteria

The frame content is provided below. Help the reviewer:
- Identify gaps, assumptions, or unclear areas in each section
- Suggest questions the reviewer should ask the author
- Evaluate whether the frame is ready for implementation
- Be specific — reference actual content from the frame

FRAME CONTENT:
{frame_content}

Respond conversationally. Ask ONE focused question at a time to guide the reviewer's thinking.
"""

SUMMARIZE_REVIEW_PROMPT = """Based on the review conversation below, produce a structured review summary.

Review conversation:
{messages}

Respond with JSON:
{{
  "summary": "Overall review summary (2-3 sentences)",
  "comments": [
    {{
      "section": "problem_statement" | "user_perspective" | "engineering_framing" | "validation_thinking",
      "content": "Specific feedback for this section",
      "severity": "info" | "suggestion" | "concern" | "blocker"
    }}
  ],
  "recommendation": "approve" | "revise" | "rethink"
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
        async def _do_call():
            if self.config.is_openai_compatible:
                return await self._call_openai(system, messages)
            elif self.config.provider == "anthropic":
                return await self._call_anthropic(system, messages)
            else:
                raise ValueError(f"Unsupported provider: {self.config.provider}")

        return await call_ai_with_retry(_do_call)

    async def _call_ai_text(
        self, system: str, messages: list[dict[str, str]]
    ) -> str:
        """Call AI and return raw text response (no JSON parsing)."""
        import logging
        logger = logging.getLogger("conversation_agent")

        async def _do_call():
            if self.config.is_openai_compatible:
                client = self.config.create_openai_client()
                all_messages = [{"role": "system", "content": system}] + messages
                response = await client.chat.completions.create(
                    model=self.config.model,
                    messages=all_messages,
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens,
                )
                return response.choices[0].message.content or ""
            elif self.config.provider == "anthropic":
                client = self.config.create_anthropic_client()
                response = await client.messages.create(
                    model=self.config.model,
                    max_tokens=self.config.max_tokens,
                    messages=messages,
                    system=system,
                )
                if not response.content:
                    raise ValueError("Empty content in AI response")
                text = response.content[0].text
                logger.warning(
                    f"Anthropic text response: stop_reason={response.stop_reason}, "
                    f"usage=in:{response.usage.input_tokens}/out:{response.usage.output_tokens}, "
                    f"preview={repr(text[:150])}"
                )
                return text
            else:
                raise ValueError(f"Unsupported provider: {self.config.provider}")

        return await call_ai_with_retry(_do_call)

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
        import logging
        logger = logging.getLogger("conversation_agent")
        try:
            import anthropic as anthropic_lib

            client = self.config.create_anthropic_client()

            response = await client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                messages=messages,
                system=system,
            )

            logger.warning(
                f"Anthropic raw response: stop_reason={response.stop_reason}, "
                f"content_blocks={len(response.content)}, "
                f"usage=in:{response.usage.input_tokens}/out:{response.usage.output_tokens}, "
                f"content_preview={repr(response.content[0].text[:200]) if response.content else 'EMPTY'}"
            )

            if not response.content:
                raise ValueError("Empty content in AI response")
            content = response.content[0].text
            return parse_json_response(content)
        except ImportError:
            raise RuntimeError("anthropic package not installed")

    @staticmethod
    def _language_instruction(language: Optional[str]) -> str:
        """Build a language instruction prefix for AI prompts."""
        if not language or language == "en":
            return ""
        lang_names = {"zh": "Chinese (中文)", "ja": "Japanese", "ko": "Korean"}
        lang_name = lang_names.get(language, language)
        return (
            f"IMPORTANT: You MUST respond entirely in {lang_name}. "
            f"All content, analysis, questions, and frame sections must be in {lang_name}, "
            f"regardless of what language the user writes in.\n\n"
        )

    async def process_turn(
        self,
        messages: list[ConversationMessage],
        state: ConversationState,
        user_message: str,
        knowledge_context: str = "",
        language: Optional[str] = None,
    ) -> ConversationTurn:
        """Process a single conversation turn."""
        import logging
        logger = logging.getLogger("conversation_agent")

        system = self._language_instruction(language) + SYSTEM_PROMPT
        if knowledge_context:
            system += f"\n\nRelevant team knowledge to consider:\n{knowledge_context}"

        system += f"\n\nCurrent state:\n{json.dumps(state.model_dump(), indent=2)}"

        chat_messages = []
        for msg in messages:
            chat_messages.append({"role": msg.role, "content": msg.content})
        chat_messages.append({"role": "user", "content": user_message})

        # Log payload size for debugging
        system_chars = len(system)
        msgs_chars = sum(len(m["content"]) for m in chat_messages)
        total_chars = system_chars + msgs_chars
        logger.warning(
            f"AI payload: system={system_chars} chars, "
            f"{len(chat_messages)} messages={msgs_chars} chars, "
            f"total={total_chars} chars (~{total_chars // 4} tokens)"
        )

        # Try structured JSON call first; fall back to plain text if model
        # doesn't return valid JSON (common with custom/self-hosted models)
        try:
            result = await self._call_ai(system, chat_messages)
        except (ValueError, json.JSONDecodeError) as e:
            logger.warning(f"JSON parse failed, falling back to text mode: {e}")
            # Re-call as plain text — the model response is good, just not JSON
            text_response = await self._call_ai_text(system, chat_messages)
            return ConversationTurn(
                response=text_response,
                updated_state=state,  # keep state unchanged
                relevant_knowledge=[],
            )

        updated_state_data = result.get("updated_state", {})
        updated_state = ConversationState(
            frame_type=updated_state_data.get("frame_type", state.frame_type),
            sections_covered=updated_state_data.get("sections_covered", state.sections_covered),
            extracted_content=updated_state_data.get("extracted_content", state.extracted_content),
            gaps=updated_state_data.get("gaps", state.gaps),
            ready_to_synthesize=updated_state_data.get("ready_to_synthesize", state.ready_to_synthesize),
        )

        # Normalize relevant_knowledge: LLM may return strings instead of dicts
        raw_knowledge = result.get("relevant_knowledge", [])
        knowledge = []
        for item in raw_knowledge:
            if isinstance(item, dict):
                knowledge.append(item)
            elif isinstance(item, str):
                knowledge.append({"content": item})

        return ConversationTurn(
            response=result.get("response", "I need a moment to think about that."),
            updated_state=updated_state,
            relevant_knowledge=knowledge,
        )

    async def synthesize_frame(
        self, messages: list[ConversationMessage], state: ConversationState,
        language: Optional[str] = None,
    ) -> dict[str, str]:
        """Synthesize conversation into structured Frame content."""
        messages_text = self._format_messages_for_prompt(messages)
        extracted = json.dumps(state.extracted_content, indent=2)

        prompt = SYNTHESIZE_PROMPT.format(
            messages=messages_text,
            extracted_content=extracted,
        )

        system = self._language_instruction(language) + "You are a technical writer. Synthesize conversation content into structured Frame sections. Respond with JSON."

        result = await self._call_ai(
            system,
            [{"role": "user", "content": prompt}],
        )

        return {
            "problem_statement": result.get("problem_statement", ""),
            "root_cause": result.get("root_cause", ""),
            "user_perspective": result.get("user_perspective", ""),
            "engineering_framing": result.get("engineering_framing", ""),
            "validation_thinking": result.get("validation_thinking", ""),
        }

    async def process_review_turn(
        self,
        messages: list[ConversationMessage],
        state: ConversationState,
        user_message: str,
        frame_content: str,
        language: Optional[str] = None,
    ) -> ConversationTurn:
        """Process a review conversation turn with frame context."""
        system = self._language_instruction(language) + REVIEW_SYSTEM_PROMPT.format(frame_content=frame_content)

        chat_messages = []
        for msg in messages:
            chat_messages.append({"role": msg.role, "content": msg.content})
        chat_messages.append({"role": "user", "content": user_message})

        # Review conversations are conversational (plain text), not JSON
        response_text = await self._call_ai_text(system, chat_messages)

        return ConversationTurn(
            response=response_text,
            updated_state=state,  # Review conversations don't track section coverage
            relevant_knowledge=[],
        )

    async def summarize_review(
        self, messages: list[ConversationMessage]
    ) -> dict[str, Any]:
        """Summarize a review conversation into structured feedback."""
        messages_text = self._format_messages_for_prompt(messages)

        prompt = SUMMARIZE_REVIEW_PROMPT.format(messages=messages_text)

        result = await self._call_ai(
            "You are a technical reviewer. Summarize the review conversation into structured feedback. Respond with JSON.",
            [{"role": "user", "content": prompt}],
        )

        return {
            "summary": result.get("summary", ""),
            "comments": result.get("comments", []),
            "recommendation": result.get("recommendation", "revise"),
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
