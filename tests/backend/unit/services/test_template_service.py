"""
Tests for Template Service.

TDD Phase 1.3: Template Service
"""
import pytest
from pathlib import Path


@pytest.fixture
def sample_template_dir(temp_data_dir_with_structure):
    """Create a sample template directory structure."""
    template_dir = temp_data_dir_with_structure / "templates" / "bug-fix"
    template_dir.mkdir(parents=True)
    prompts_dir = template_dir / "prompts"
    prompts_dir.mkdir()

    # Write template.md
    (template_dir / "template.md").write_text("""---
name: Bug Fix
type: bug
description: Template for bug fix frames
---

# Problem Statement

Describe the bug clearly and concisely.

## User Perspective

Who is affected and how?

## Engineering Framing

Technical approach and constraints.

## Validation Thinking

How will we know it's fixed?
""")

    # Write questionnaire.md
    (template_dir / "questionnaire.md").write_text("""# Bug Fix Questionnaire

## Problem Statement

### What is the bug?
<!-- Describe what's happening -->

### What should happen instead?
<!-- Describe expected behavior -->

## User Perspective

### Who is affected?
<!-- Describe the user -->
""")

    # Write prompts
    (prompts_dir / "evaluate.md").write_text("""Score this frame on the following criteria:

1. Problem Clarity (0-20 points)
2. User Perspective (0-20 points)
3. Engineering Framing (0-25 points)
4. Validation Thinking (0-20 points)
5. Completeness (0-15 points)

Frame content:
{frame_content}
""")

    (prompts_dir / "generate-section.md").write_text("""Generate content for the {section} section based on:

{questionnaire_answers}
""")

    return temp_data_dir_with_structure


class TestTemplateServiceLoad:
    """Tests for loading templates."""

    def test_load_template(self, sample_template_dir):
        """Loading a template should parse all files."""
        from app.services.template_service import TemplateService

        service = TemplateService(data_path=sample_template_dir)
        template = service.load_template("bug-fix")

        assert template.name == "Bug Fix"
        assert template.type.value == "bug"
        assert "bug fix" in template.description.lower()

    def test_load_template_sections(self, sample_template_dir):
        """Loading template should extract sections."""
        from app.services.template_service import TemplateService

        service = TemplateService(data_path=sample_template_dir)
        template = service.load_template("bug-fix")

        section_names = [s.name for s in template.sections]
        assert "Problem Statement" in section_names
        assert "User Perspective" in section_names

    def test_load_template_questionnaire(self, sample_template_dir):
        """Loading template should parse questionnaire."""
        from app.services.template_service import TemplateService

        service = TemplateService(data_path=sample_template_dir)
        template = service.load_template("bug-fix")

        assert template.questionnaire is not None
        assert template.questionnaire.title == "Bug Fix Questionnaire"
        assert len(template.questionnaire.questions) >= 3

    def test_load_template_prompts(self, sample_template_dir):
        """Loading template should load prompt files."""
        from app.services.template_service import TemplateService

        service = TemplateService(data_path=sample_template_dir)
        template = service.load_template("bug-fix")

        assert "evaluate" in template.prompts
        assert "generate-section" in template.prompts
        assert "frame_content" in template.prompts["evaluate"].variables

    def test_load_template_not_found_raises(self, sample_template_dir):
        """Loading nonexistent template should raise error."""
        from app.services.template_service import TemplateService, TemplateNotFoundError

        service = TemplateService(data_path=sample_template_dir)

        with pytest.raises(TemplateNotFoundError):
            service.load_template("nonexistent")


class TestTemplateServiceList:
    """Tests for listing templates."""

    def test_list_templates(self, sample_template_dir):
        """Listing templates should return all available templates."""
        from app.services.template_service import TemplateService

        # Add another template
        feature_dir = sample_template_dir / "templates" / "feature"
        feature_dir.mkdir()
        (feature_dir / "template.md").write_text("""---
name: Feature
type: feature
description: Feature template
---

# Problem Statement

What problem does this feature solve?
""")

        service = TemplateService(data_path=sample_template_dir)
        templates = service.list_templates()

        assert len(templates) == 2
        names = [t.name for t in templates]
        assert "Bug Fix" in names
        assert "Feature" in names

    def test_list_templates_empty(self, temp_data_dir_with_structure):
        """Listing with no templates should return empty list."""
        from app.services.template_service import TemplateService

        service = TemplateService(data_path=temp_data_dir_with_structure)
        templates = service.list_templates()

        assert templates == []


class TestTemplateServiceQueries:
    """Tests for template queries."""

    def test_get_template_by_type(self, sample_template_dir):
        """Should find template by type."""
        from app.services.template_service import TemplateService
        from app.models.frame import FrameType

        service = TemplateService(data_path=sample_template_dir)
        template = service.get_template_by_type(FrameType.BUG)

        assert template is not None
        assert template.type.value == "bug"

    def test_get_template_by_type_not_found(self, sample_template_dir):
        """Should return None if type not found."""
        from app.services.template_service import TemplateService
        from app.models.frame import FrameType

        service = TemplateService(data_path=sample_template_dir)
        template = service.get_template_by_type(FrameType.EXPLORATION)

        assert template is None


class TestTemplateServicePrompts:
    """Tests for prompt retrieval."""

    def test_get_evaluation_prompt(self, sample_template_dir):
        """Should retrieve and render evaluation prompt."""
        from app.services.template_service import TemplateService

        service = TemplateService(data_path=sample_template_dir)
        template = service.load_template("bug-fix")
        prompt = template.get_prompt("evaluate")

        rendered = prompt.render(frame_content="Test frame content here")

        assert "Test frame content here" in rendered
        assert "Problem Clarity" in rendered

    def test_get_generation_prompt(self, sample_template_dir):
        """Should retrieve and render generation prompt."""
        from app.services.template_service import TemplateService

        service = TemplateService(data_path=sample_template_dir)
        template = service.load_template("bug-fix")
        prompt = template.get_prompt("generate-section")

        rendered = prompt.render(
            section="Problem Statement",
            questionnaire_answers="Q: What is the bug? A: Login fails"
        )

        assert "Problem Statement" in rendered
        assert "Login fails" in rendered
