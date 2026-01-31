"""
Tests for Generator Agent.

TDD Phase 4.2: Generator Agent
"""
import pytest
from unittest.mock import AsyncMock, patch


class TestGeneratorAgent:
    """Tests for the content generator agent."""

    def test_generator_creation(self):
        """Generator should be created with prompt template."""
        from app.agents.generator import GeneratorAgent

        prompt_template = "Generate {section} from: {answers}"
        generator = GeneratorAgent(prompt_template=prompt_template)

        assert generator.prompt_template == prompt_template

    def test_generator_builds_prompt(self):
        """Generator should build prompt from template."""
        from app.agents.generator import GeneratorAgent

        prompt_template = "Generate content for {section} based on:\n{answers}"
        generator = GeneratorAgent(prompt_template=prompt_template)

        prompt = generator.build_prompt(
            section="Problem Statement",
            answers="Q: What's the bug? A: Login fails",
        )

        assert "Problem Statement" in prompt
        assert "Login fails" in prompt

    @pytest.mark.asyncio
    async def test_generate_returns_content(self):
        """Generator should return generated content."""
        from app.agents.generator import GeneratorAgent

        generator = GeneratorAgent(prompt_template="Generate {section}: {answers}")

        mock_response = {
            "content": "Users are experiencing login failures after password reset.",
            "suggestions": ["Consider adding error codes"],
        }

        with patch.object(generator, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response

            result = await generator.generate(
                section="Problem Statement",
                answers="Login fails after reset",
            )

            assert "login failures" in result["content"]

    @pytest.mark.asyncio
    async def test_generate_returns_suggestions(self):
        """Generator should return improvement suggestions."""
        from app.agents.generator import GeneratorAgent

        generator = GeneratorAgent(prompt_template="Generate {section}: {answers}")

        mock_response = {
            "content": "Generated content here.",
            "suggestions": [
                "Add specific error messages",
                "Include affected user count",
            ],
        }

        with patch.object(generator, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response

            result = await generator.generate(section="Problem", answers="test")

            assert len(result["suggestions"]) == 2

    @pytest.mark.asyncio
    async def test_generate_multiple_sections(self):
        """Generator should handle generating multiple sections."""
        from app.agents.generator import GeneratorAgent

        generator = GeneratorAgent(prompt_template="Generate {section}: {answers}")

        with patch.object(generator, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = {"content": "Section content", "suggestions": []}

            # Generate multiple sections
            sections = ["Problem Statement", "User Perspective", "Engineering Framing"]
            results = []

            for section in sections:
                result = await generator.generate(section=section, answers="test")
                results.append(result)

            assert len(results) == 3
            assert mock_call.call_count == 3


class TestGeneratorWithQuestionnaire:
    """Tests for generator with questionnaire answers."""

    @pytest.mark.asyncio
    async def test_generate_from_questionnaire(self):
        """Generator should format questionnaire answers properly."""
        from app.agents.generator import GeneratorAgent

        generator = GeneratorAgent(
            prompt_template="Section: {section}\nAnswers:\n{formatted_answers}"
        )

        questionnaire_answers = [
            {"question": "What is the bug?", "answer": "Login fails"},
            {"question": "Who is affected?", "answer": "All users"},
        ]

        with patch.object(generator, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = {"content": "Generated", "suggestions": []}

            result = await generator.generate_from_questionnaire(
                section="Problem Statement",
                answers=questionnaire_answers,
            )

            # Verify the call included formatted answers
            call_args = mock_call.call_args[0][0]
            assert "What is the bug?" in call_args
            assert "Login fails" in call_args

    def test_format_questionnaire_answers(self):
        """Should format questionnaire answers as readable text."""
        from app.agents.generator import GeneratorAgent

        generator = GeneratorAgent(prompt_template="test")

        answers = [
            {"question": "What is the bug?", "answer": "Login fails"},
            {"question": "Expected behavior?", "answer": "Login succeeds"},
        ]

        formatted = generator.format_answers(answers)

        assert "Q: What is the bug?" in formatted
        assert "A: Login fails" in formatted
        assert "Q: Expected behavior?" in formatted
