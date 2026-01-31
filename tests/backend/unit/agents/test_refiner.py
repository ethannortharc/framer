"""
Tests for Refiner Agent.

TDD Phase 4.3: Refiner Agent
"""
import pytest
from unittest.mock import AsyncMock, patch


class TestRefinerAgent:
    """Tests for the content refiner agent."""

    def test_refiner_creation(self):
        """Refiner should be created with prompt template."""
        from app.agents.refiner import RefinerAgent

        prompt_template = "Refine this content: {content}\nInstruction: {instruction}"
        refiner = RefinerAgent(prompt_template=prompt_template)

        assert refiner.prompt_template == prompt_template

    def test_refiner_builds_prompt(self):
        """Refiner should build prompt from template."""
        from app.agents.refiner import RefinerAgent

        prompt_template = "Content: {content}\nImprove: {instruction}"
        refiner = RefinerAgent(prompt_template=prompt_template)

        prompt = refiner.build_prompt(
            content="Original content here",
            instruction="Make it more concise",
        )

        assert "Original content here" in prompt
        assert "Make it more concise" in prompt

    @pytest.mark.asyncio
    async def test_refine_returns_improved_content(self):
        """Refiner should return improved content."""
        from app.agents.refiner import RefinerAgent

        refiner = RefinerAgent(prompt_template="Refine: {content}")

        mock_response = {
            "content": "Improved and more concise content.",
            "changes": ["Removed redundant words", "Clarified the main point"],
        }

        with patch.object(refiner, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response

            result = await refiner.refine(
                content="Original wordy content here",
                instruction="Make it concise",
            )

            assert result["content"] == "Improved and more concise content."

    @pytest.mark.asyncio
    async def test_refine_returns_changes_list(self):
        """Refiner should return list of changes made."""
        from app.agents.refiner import RefinerAgent

        refiner = RefinerAgent(prompt_template="Refine: {content}")

        mock_response = {
            "content": "Refined content",
            "changes": [
                "Shortened introduction",
                "Added specific examples",
                "Fixed grammar issues",
            ],
        }

        with patch.object(refiner, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response

            result = await refiner.refine(content="Original", instruction="Improve")

            assert len(result["changes"]) == 3
            assert "Shortened introduction" in result["changes"]

    @pytest.mark.asyncio
    async def test_refine_preserves_structure(self):
        """Refiner should preserve original structure when requested."""
        from app.agents.refiner import RefinerAgent

        refiner = RefinerAgent(
            prompt_template="Refine while preserving structure:\n{content}\nInstruction: {instruction}"
        )

        original_content = """# Problem Statement

This is the problem.

## User Perspective

User info here."""

        mock_response = {
            "content": """# Problem Statement

This is the improved problem description.

## User Perspective

Better user info here.""",
            "changes": ["Improved descriptions"],
        }

        with patch.object(refiner, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response

            result = await refiner.refine(
                content=original_content,
                instruction="Improve while keeping structure",
            )

            # Check structure is preserved
            assert "# Problem Statement" in result["content"]
            assert "## User Perspective" in result["content"]


class TestRefinerWithHistory:
    """Tests for refiner with conversation history."""

    def test_refiner_supports_history(self):
        """Refiner should support conversation history for multi-turn refinement."""
        from app.agents.refiner import RefinerAgent

        refiner = RefinerAgent(prompt_template="Refine: {content}")

        # Add to history
        refiner.add_to_history("user", "Make it shorter")
        refiner.add_to_history("assistant", "Here's a shorter version...")

        assert len(refiner.history) == 2
        assert refiner.history[0]["role"] == "user"

    def test_refiner_clear_history(self):
        """Refiner should be able to clear history."""
        from app.agents.refiner import RefinerAgent

        refiner = RefinerAgent(prompt_template="Refine: {content}")

        refiner.add_to_history("user", "Test")
        refiner.clear_history()

        assert len(refiner.history) == 0

    @pytest.mark.asyncio
    async def test_refine_with_history(self):
        """Refiner should use history in subsequent refinements."""
        from app.agents.refiner import RefinerAgent

        refiner = RefinerAgent(prompt_template="Refine: {content}")

        # Add previous context
        refiner.add_to_history("user", "Make it more technical")
        refiner.add_to_history("assistant", "Added technical terms.")

        mock_response = {
            "content": "Further refined with examples",
            "changes": ["Added examples"],
        }

        with patch.object(refiner, '_call_ai_with_history', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response

            result = await refiner.refine_with_history(
                instruction="Now add examples",
            )

            assert result["content"] == "Further refined with examples"
            # Verify history was passed
            mock_call.assert_called_once()
