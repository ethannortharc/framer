"""
Tests for Templates API endpoints.

TDD Phase 2.2: Template API Endpoints
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def app_with_templates(temp_data_dir_with_structure):
    """Create FastAPI app with test templates."""
    from app.main import create_app

    # Create a bug template
    template_dir = temp_data_dir_with_structure / "templates" / "bug-fix"
    template_dir.mkdir(parents=True)
    prompts_dir = template_dir / "prompts"
    prompts_dir.mkdir()

    (template_dir / "template.md").write_text("""---
name: Bug Fix
type: bug
description: Template for bug fix frames
---

# Problem Statement

Describe the bug clearly.

## User Perspective

Who is affected?
""")

    (template_dir / "questionnaire.md").write_text("""# Bug Fix Questionnaire

## Problem Statement

### What is the bug?
<!-- Describe what's happening -->
""")

    (prompts_dir / "evaluate.md").write_text("Evaluate this frame: {frame_content}")

    # Create a feature template
    feature_dir = temp_data_dir_with_structure / "templates" / "feature"
    feature_dir.mkdir(parents=True)

    (feature_dir / "template.md").write_text("""---
name: Feature
type: feature
description: Template for feature frames
---

# Problem Statement

What problem does this feature solve?
""")

    app = create_app(data_path=temp_data_dir_with_structure)
    return app


@pytest.fixture
def client(app_with_templates):
    """Create test client."""
    return TestClient(app_with_templates)


class TestTemplatesAPIList:
    """Tests for listing templates."""

    def test_list_templates(self, client):
        """GET /api/templates should return list of templates."""
        response = client.get("/api/templates")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

        names = [t["name"] for t in data]
        assert "Bug Fix" in names
        assert "Feature" in names

    def test_list_templates_includes_type(self, client):
        """Templates should include type field."""
        response = client.get("/api/templates")

        data = response.json()
        types = [t["type"] for t in data]
        assert "bug" in types
        assert "feature" in types


class TestTemplatesAPIGet:
    """Tests for getting a template."""

    def test_get_template(self, client):
        """GET /api/templates/:type should return template."""
        response = client.get("/api/templates/bug-fix")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Bug Fix"
        assert data["type"] == "bug"
        assert "sections" in data
        assert "questionnaire" in data

    def test_get_template_includes_sections(self, client):
        """Template should include sections."""
        response = client.get("/api/templates/bug-fix")

        data = response.json()
        section_names = [s["name"] for s in data["sections"]]
        assert "Problem Statement" in section_names

    def test_get_template_includes_questionnaire(self, client):
        """Template should include questionnaire."""
        response = client.get("/api/templates/bug-fix")

        data = response.json()
        assert data["questionnaire"] is not None
        assert data["questionnaire"]["title"] == "Bug Fix Questionnaire"
        assert len(data["questionnaire"]["questions"]) >= 1

    def test_get_template_not_found(self, client):
        """GET /api/templates/:type for nonexistent should return 404."""
        response = client.get("/api/templates/nonexistent")

        assert response.status_code == 404

    def test_get_template_includes_prompts(self, client):
        """Template should include prompt names."""
        response = client.get("/api/templates/bug-fix")

        data = response.json()
        assert "prompts" in data
        assert "evaluate" in data["prompts"]
