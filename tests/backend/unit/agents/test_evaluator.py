"""
Tests for Evaluator Agent.

TDD Phase 4.1: Evaluator Agent
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestEvaluatorAgent:
    """Tests for the frame evaluator agent."""

    def test_evaluator_creation(self):
        """Evaluator should be created with prompt template."""
        from app.agents.evaluator import EvaluatorAgent

        prompt_template = "Evaluate this frame: {frame_content}"
        evaluator = EvaluatorAgent(prompt_template=prompt_template)

        assert evaluator.prompt_template == prompt_template

    def test_evaluator_builds_prompt(self):
        """Evaluator should build prompt from template and frame content."""
        from app.agents.evaluator import EvaluatorAgent

        prompt_template = "Evaluate: {frame_content}\nCriteria: {criteria}"
        evaluator = EvaluatorAgent(prompt_template=prompt_template)

        prompt = evaluator.build_prompt(
            frame_content="Test frame content",
            criteria="clarity, completeness",
        )

        assert "Test frame content" in prompt
        assert "clarity, completeness" in prompt

    @pytest.mark.asyncio
    async def test_evaluate_returns_score(self):
        """Evaluator should return score and breakdown."""
        from app.agents.evaluator import EvaluatorAgent

        evaluator = EvaluatorAgent(prompt_template="Evaluate: {frame_content}")

        # Mock the AI client
        mock_response = {
            "score": 82,
            "breakdown": {
                "problem_clarity": 18,
                "user_perspective": 16,
                "engineering_framing": 22,
                "validation_thinking": 16,
                "completeness": 10,
            },
            "feedback": "Good frame overall.",
            "issues": ["Consider adding more detail to validation section."],
        }

        with patch.object(evaluator, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response

            result = await evaluator.evaluate(frame_content="Test content")

            assert result["score"] == 82
            assert "breakdown" in result
            assert result["breakdown"]["problem_clarity"] == 18

    @pytest.mark.asyncio
    async def test_evaluate_returns_feedback(self):
        """Evaluator should return feedback text."""
        from app.agents.evaluator import EvaluatorAgent

        evaluator = EvaluatorAgent(prompt_template="Evaluate: {frame_content}")

        mock_response = {
            "score": 75,
            "breakdown": {},
            "feedback": "The frame needs more detail.",
            "issues": [],
        }

        with patch.object(evaluator, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response

            result = await evaluator.evaluate(frame_content="Test content")

            assert result["feedback"] == "The frame needs more detail."

    @pytest.mark.asyncio
    async def test_evaluate_returns_issues(self):
        """Evaluator should return list of issues."""
        from app.agents.evaluator import EvaluatorAgent

        evaluator = EvaluatorAgent(prompt_template="Evaluate: {frame_content}")

        mock_response = {
            "score": 60,
            "breakdown": {},
            "feedback": "Several issues found.",
            "issues": [
                "Missing user perspective",
                "Validation criteria unclear",
            ],
        }

        with patch.object(evaluator, '_call_ai', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response

            result = await evaluator.evaluate(frame_content="Test content")

            assert len(result["issues"]) == 2
            assert "Missing user perspective" in result["issues"]

    def test_score_ranges_valid(self):
        """Score should be between 0 and 100."""
        from app.agents.evaluator import EvaluatorAgent, EvaluationResult

        # Valid scores
        result = EvaluationResult(score=0, breakdown={}, feedback="", issues=[])
        assert result.score == 0

        result = EvaluationResult(score=100, breakdown={}, feedback="", issues=[])
        assert result.score == 100

        result = EvaluationResult(score=50, breakdown={}, feedback="", issues=[])
        assert result.score == 50

    def test_score_out_of_range_raises(self):
        """Score outside 0-100 should raise error."""
        from app.agents.evaluator import EvaluationResult
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            EvaluationResult(score=-1, breakdown={}, feedback="", issues=[])

        with pytest.raises(ValidationError):
            EvaluationResult(score=101, breakdown={}, feedback="", issues=[])


class TestEvaluatorWithAIConfig:
    """Tests for evaluator with AI configuration."""

    def test_evaluator_with_config(self):
        """Evaluator should accept AI configuration."""
        from app.agents.evaluator import EvaluatorAgent
        from app.agents.config import AIConfig

        config = AIConfig(
            provider="openai",
            model="gpt-4o",
            api_key="test-key",
        )

        evaluator = EvaluatorAgent(
            prompt_template="Evaluate: {frame_content}",
            config=config,
        )

        assert evaluator.config.provider == "openai"
        assert evaluator.config.model == "gpt-4o"

    def test_evaluator_default_config(self):
        """Evaluator should have default config if none provided."""
        from app.agents.evaluator import EvaluatorAgent

        evaluator = EvaluatorAgent(prompt_template="Evaluate: {frame_content}")

        assert evaluator.config is not None
