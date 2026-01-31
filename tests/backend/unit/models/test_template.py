"""
Tests for Template data models.

TDD Phase 1.1: Data Models - Template
"""
import pytest


class TestTemplateType:
    """Tests for ensuring template types align with frame types."""

    def test_template_types_match_frame_types(self):
        """Template types should match FrameType values."""
        from app.models.frame import FrameType
        from app.models.template import TemplateType

        assert TemplateType.BUG.value == FrameType.BUG.value
        assert TemplateType.FEATURE.value == FrameType.FEATURE.value
        assert TemplateType.EXPLORATION.value == FrameType.EXPLORATION.value


class TestTemplateSection:
    """Tests for TemplateSection model."""

    def test_template_section_creation(self):
        """TemplateSection should hold section definition."""
        from app.models.template import TemplateSection

        section = TemplateSection(
            name="Problem Statement",
            description="Describe the problem clearly.",
            required=True,
        )

        assert section.name == "Problem Statement"
        assert section.description == "Describe the problem clearly."
        assert section.required is True

    def test_template_section_optional_by_default(self):
        """TemplateSection required should default to False."""
        from app.models.template import TemplateSection

        section = TemplateSection(
            name="Additional Notes",
            description="Any extra information.",
        )

        assert section.required is False


class TestQuestionnaireQuestion:
    """Tests for QuestionnaireQuestion model."""

    def test_question_creation(self):
        """QuestionnaireQuestion should hold question details."""
        from app.models.template import QuestionnaireQuestion

        question = QuestionnaireQuestion(
            id="q1",
            section="problem",
            text="What is the bug?",
            hint="Describe what's happening",
        )

        assert question.id == "q1"
        assert question.section == "problem"
        assert question.text == "What is the bug?"
        assert question.hint == "Describe what's happening"

    def test_question_hint_optional(self):
        """QuestionnaireQuestion hint should be optional."""
        from app.models.template import QuestionnaireQuestion

        question = QuestionnaireQuestion(
            id="q1",
            section="problem",
            text="What is the bug?",
        )

        assert question.hint is None


class TestQuestionnaire:
    """Tests for Questionnaire model."""

    def test_questionnaire_creation(self):
        """Questionnaire should hold list of questions."""
        from app.models.template import Questionnaire, QuestionnaireQuestion

        q1 = QuestionnaireQuestion(id="q1", section="problem", text="What is the bug?")
        q2 = QuestionnaireQuestion(id="q2", section="user", text="Who is affected?")

        questionnaire = Questionnaire(
            title="Bug Fix Questionnaire",
            questions=[q1, q2],
        )

        assert questionnaire.title == "Bug Fix Questionnaire"
        assert len(questionnaire.questions) == 2
        assert questionnaire.questions[0].text == "What is the bug?"

    def test_questionnaire_from_markdown(self):
        """Questionnaire should parse from markdown format."""
        from app.models.template import Questionnaire

        md = """# Bug Fix Questionnaire

## Problem Statement

### What is the bug?
<!-- Describe what's happening -->

### What should happen instead?
<!-- Describe expected behavior -->

## User Perspective

### Who is affected?
<!-- Describe the user -->
"""
        questionnaire = Questionnaire.from_markdown(md)

        assert questionnaire.title == "Bug Fix Questionnaire"
        assert len(questionnaire.questions) >= 3


class TestPromptTemplate:
    """Tests for PromptTemplate model."""

    def test_prompt_template_creation(self):
        """PromptTemplate should hold prompt content."""
        from app.models.template import PromptTemplate

        prompt = PromptTemplate(
            name="evaluate",
            content="Score this frame on the following criteria...",
        )

        assert prompt.name == "evaluate"
        assert "Score this frame" in prompt.content

    def test_prompt_template_with_variables(self):
        """PromptTemplate should support variable placeholders."""
        from app.models.template import PromptTemplate

        prompt = PromptTemplate(
            name="generate",
            content="Generate content for the {section} section based on: {input}",
            variables=["section", "input"],
        )

        assert prompt.variables == ["section", "input"]

    def test_prompt_template_render(self):
        """PromptTemplate should render with variables."""
        from app.models.template import PromptTemplate

        prompt = PromptTemplate(
            name="generate",
            content="Generate content for the {section} section based on: {input}",
            variables=["section", "input"],
        )

        rendered = prompt.render(section="Problem Statement", input="user answers")

        assert "Problem Statement" in rendered
        assert "user answers" in rendered


class TestTemplate:
    """Tests for complete Template model."""

    def test_template_creation(self):
        """Template should combine all components."""
        from app.models.template import (
            Template,
            TemplateType,
            TemplateSection,
            Questionnaire,
            PromptTemplate,
        )

        template = Template(
            name="Bug Fix",
            type=TemplateType.BUG,
            description="Template for bug fix frames",
            sections=[
                TemplateSection(name="Problem Statement", description="Describe the bug", required=True),
            ],
            questionnaire=Questionnaire(title="Bug Questions", questions=[]),
            prompts={
                "evaluate": PromptTemplate(name="evaluate", content="Score this frame..."),
            },
        )

        assert template.name == "Bug Fix"
        assert template.type == TemplateType.BUG
        assert len(template.sections) == 1
        assert template.questionnaire is not None
        assert "evaluate" in template.prompts

    def test_template_get_prompt(self):
        """Template should retrieve prompts by name."""
        from app.models.template import Template, TemplateType, PromptTemplate

        template = Template(
            name="Bug Fix",
            type=TemplateType.BUG,
            description="Bug template",
            sections=[],
            prompts={
                "evaluate": PromptTemplate(name="evaluate", content="Evaluate..."),
                "generate": PromptTemplate(name="generate", content="Generate..."),
            },
        )

        assert template.get_prompt("evaluate").content == "Evaluate..."
        assert template.get_prompt("generate").content == "Generate..."
        assert template.get_prompt("nonexistent") is None


class TestTemplateSerialization:
    """Tests for Template serialization."""

    def test_template_from_directory(self):
        """Template should load from directory structure."""
        from app.models.template import Template
        from pathlib import Path
        import tempfile
        import os

        # Create temp directory with template files
        with tempfile.TemporaryDirectory() as tmpdir:
            template_dir = Path(tmpdir) / "bug-fix"
            template_dir.mkdir()
            prompts_dir = template_dir / "prompts"
            prompts_dir.mkdir()

            # Write template.md
            (template_dir / "template.md").write_text("""---
name: Bug Fix
type: bug
description: Template for bug fixes
---

# Problem Statement

Describe the bug clearly.

## User Perspective

Who is affected?
""")

            # Write questionnaire.md
            (template_dir / "questionnaire.md").write_text("""# Bug Fix Questionnaire

## Problem Statement

### What is the bug?
<!-- Describe what's happening -->
""")

            # Write evaluate.md prompt
            (prompts_dir / "evaluate.md").write_text("Score this frame on clarity and completeness.")

            template = Template.from_directory(template_dir)

            assert template.name == "Bug Fix"
            assert template.type.value == "bug"
            assert len(template.sections) >= 1
            assert template.questionnaire is not None
            assert "evaluate" in template.prompts
