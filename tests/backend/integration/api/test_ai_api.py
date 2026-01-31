"""
Tests for AI API endpoints.

TDD Phase 4.4: AI API Endpoints
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def app_with_templates_and_frame(temp_data_dir_with_structure, sample_frame_content, sample_meta_yaml):
    """Create FastAPI app with templates and a frame."""
    from app.main import create_app

    # Create bug template with prompts
    template_dir = temp_data_dir_with_structure / "templates" / "bug-fix"
    template_dir.mkdir(parents=True)
    prompts_dir = template_dir / "prompts"
    prompts_dir.mkdir()

    (template_dir / "template.md").write_text("""---
name: Bug Fix
type: bug
description: Bug fix template
---

# Problem Statement

Describe the bug.
""")

    (prompts_dir / "evaluate.md").write_text("""Evaluate this frame:

{frame_content}

Score on: clarity, completeness, actionability
""")

    (prompts_dir / "generate-section.md").write_text("""Generate {section} content from:

{answers}
""")

    (prompts_dir / "refine.md").write_text("""Improve this content:

{content}

Instruction: {instruction}
""")

    # Create a frame
    frame_id = "f-2026-01-30-test123"
    frame_dir = temp_data_dir_with_structure / "frames" / frame_id
    frame_dir.mkdir(parents=True)
    (frame_dir / "frame.md").write_text(sample_frame_content)
    (frame_dir / "meta.yaml").write_text(sample_meta_yaml)

    app = create_app(data_path=temp_data_dir_with_structure)
    return app, frame_id


@pytest.fixture
def client(app_with_templates_and_frame):
    """Create test client."""
    app, _ = app_with_templates_and_frame
    return TestClient(app)


@pytest.fixture
def client_with_frame_id(app_with_templates_and_frame):
    """Create test client with frame ID."""
    app, frame_id = app_with_templates_and_frame
    return TestClient(app), frame_id


class TestAIEvaluateEndpoint:
    """Tests for frame evaluation endpoint."""

    def test_evaluate_frame_endpoint_exists(self, client_with_frame_id):
        """POST /api/frames/:id/ai/evaluate should exist."""
        client, frame_id = client_with_frame_id

        # Mock the AI call
        with patch('app.api.ai.EvaluatorAgent') as MockEvaluator:
            mock_instance = MockEvaluator.return_value
            mock_instance.evaluate = AsyncMock(return_value={
                "score": 75,
                "breakdown": {"clarity": 20},
                "feedback": "Good",
                "issues": [],
            })

            response = client.post(f"/api/frames/{frame_id}/ai/evaluate")

            # Should not return 404 (endpoint exists)
            assert response.status_code != 404

    def test_evaluate_frame_returns_score(self, client_with_frame_id):
        """Evaluation should return score."""
        client, frame_id = client_with_frame_id

        with patch('app.api.ai.EvaluatorAgent') as MockEvaluator:
            mock_instance = MockEvaluator.return_value
            mock_instance.evaluate = AsyncMock(return_value={
                "score": 82,
                "breakdown": {"problem_clarity": 18},
                "feedback": "Well structured",
                "issues": [],
            })

            response = client.post(f"/api/frames/{frame_id}/ai/evaluate")

            assert response.status_code == 200
            data = response.json()
            assert data["score"] == 82
            assert "breakdown" in data

    def test_evaluate_nonexistent_frame(self, client):
        """Evaluating nonexistent frame should return 404."""
        response = client.post("/api/frames/f-2026-01-30-nonexistent/ai/evaluate")

        assert response.status_code == 404


class TestAIGenerateEndpoint:
    """Tests for content generation endpoint."""

    def test_generate_content_endpoint_exists(self, client_with_frame_id):
        """POST /api/frames/:id/ai/generate should exist."""
        client, frame_id = client_with_frame_id

        with patch('app.api.ai.GeneratorAgent') as MockGenerator:
            mock_instance = MockGenerator.return_value
            mock_instance.generate_from_questionnaire = AsyncMock(return_value={
                "content": "Generated content",
                "suggestions": [],
            })

            response = client.post(
                f"/api/frames/{frame_id}/ai/generate",
                json={
                    "section": "problem_statement",
                    "answers": [
                        {"question": "What is the bug?", "answer": "Login fails"}
                    ]
                }
            )

            assert response.status_code != 404

    def test_generate_returns_content(self, client_with_frame_id):
        """Generation should return content."""
        client, frame_id = client_with_frame_id

        with patch('app.api.ai.GeneratorAgent') as MockGenerator:
            mock_instance = MockGenerator.return_value
            mock_instance.generate_from_questionnaire = AsyncMock(return_value={
                "content": "Users experience login failures.",
                "suggestions": ["Add error codes"],
            })

            response = client.post(
                f"/api/frames/{frame_id}/ai/generate",
                json={
                    "section": "problem_statement",
                    "answers": [
                        {"question": "What is the bug?", "answer": "Login fails"}
                    ]
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "login failures" in data["content"].lower()


class TestAIChatEndpoint:
    """Tests for AI chat endpoint."""

    def test_chat_endpoint_exists(self, client):
        """POST /api/ai/chat should exist."""
        with patch('app.api.ai.RefinerAgent') as MockRefiner:
            mock_instance = MockRefiner.return_value
            mock_instance.refine = AsyncMock(return_value={
                "content": "Refined response",
                "changes": [],
            })

            response = client.post(
                "/api/ai/chat",
                json={
                    "message": "How can I improve this frame?",
                    "context": "Frame content here",
                }
            )

            assert response.status_code != 404

    def test_chat_returns_response(self, client):
        """Chat should return AI response."""
        with patch('app.api.ai.RefinerAgent') as MockRefiner:
            mock_instance = MockRefiner.return_value
            mock_instance.refine = AsyncMock(return_value={
                "content": "Here are my suggestions for improvement...",
                "changes": [],
            })

            response = client.post(
                "/api/ai/chat",
                json={
                    "message": "Improve the problem statement",
                    "context": "Current problem: login fails",
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "response" in data
