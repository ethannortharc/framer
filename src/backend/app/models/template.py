"""
Template data models for Framer.

Templates define the structure and prompts for different frame types.
"""
import re
from enum import Enum
from pathlib import Path
from typing import Optional

import yaml
from pydantic import BaseModel, Field


class TemplateType(str, Enum):
    """Type of template (matches FrameType)."""
    BUG = "bug"
    FEATURE = "feature"
    EXPLORATION = "exploration"


class TemplateSection(BaseModel):
    """Definition of a section in a frame template."""
    name: str
    description: str
    required: bool = False


class QuestionnaireQuestion(BaseModel):
    """A question in the questionnaire."""
    id: str
    section: str
    text: str
    hint: Optional[str] = None


class Questionnaire(BaseModel):
    """Questionnaire for guided frame creation."""
    title: str
    questions: list[QuestionnaireQuestion] = Field(default_factory=list)

    @classmethod
    def from_markdown(cls, md_str: str) -> "Questionnaire":
        """Parse questionnaire from markdown format."""
        lines = md_str.strip().split("\n")
        title = ""
        questions = []
        current_section = ""
        question_id = 0

        for i, line in enumerate(lines):
            stripped = line.strip()

            # Get title from first H1
            if stripped.startswith("# ") and not title:
                title = stripped[2:].strip()
                continue

            # Get section from H2
            if stripped.startswith("## "):
                current_section = stripped[3:].strip().lower().replace(" ", "_")
                continue

            # Get question from H3
            if stripped.startswith("### "):
                question_text = stripped[4:].strip()
                question_id += 1

                # Look for hint in next line (HTML comment)
                hint = None
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line.startswith("<!--") and next_line.endswith("-->"):
                        hint = next_line[4:-3].strip()

                questions.append(QuestionnaireQuestion(
                    id=f"q{question_id}",
                    section=current_section,
                    text=question_text,
                    hint=hint,
                ))

        return cls(title=title, questions=questions)


class PromptTemplate(BaseModel):
    """Template for AI prompts."""
    name: str
    content: str
    variables: list[str] = Field(default_factory=list)

    def render(self, **kwargs) -> str:
        """Render the prompt with provided variables."""
        result = self.content
        for key, value in kwargs.items():
            result = result.replace(f"{{{key}}}", str(value))
        return result


class Template(BaseModel):
    """Complete template for a frame type."""
    name: str
    type: TemplateType
    description: str
    sections: list[TemplateSection] = Field(default_factory=list)
    questionnaire: Optional[Questionnaire] = None
    prompts: dict[str, PromptTemplate] = Field(default_factory=dict)

    def get_prompt(self, name: str) -> Optional[PromptTemplate]:
        """Get a prompt template by name."""
        return self.prompts.get(name)

    @classmethod
    def from_directory(cls, path: Path) -> "Template":
        """Load template from directory structure."""
        # Read template.md
        template_md = (path / "template.md").read_text()

        # Parse YAML frontmatter
        frontmatter = {}
        content = template_md
        if template_md.startswith("---"):
            parts = template_md.split("---", 2)
            if len(parts) >= 3:
                frontmatter = yaml.safe_load(parts[1])
                content = parts[2]

        # Parse sections from content
        sections = []
        current_section = None
        current_description = []

        for line in content.split("\n"):
            stripped = line.strip()

            # H1 or H2 indicates section
            if stripped.startswith("# ") or stripped.startswith("## "):
                # Save previous section
                if current_section:
                    sections.append(TemplateSection(
                        name=current_section,
                        description="\n".join(current_description).strip(),
                        required=True if current_section == "Problem Statement" else False,
                    ))
                # Start new section
                current_section = stripped.lstrip("#").strip()
                current_description = []
            elif current_section:
                current_description.append(line)

        # Save last section
        if current_section:
            sections.append(TemplateSection(
                name=current_section,
                description="\n".join(current_description).strip(),
                required=True if current_section == "Problem Statement" else False,
            ))

        # Load questionnaire if exists
        questionnaire = None
        questionnaire_path = path / "questionnaire.md"
        if questionnaire_path.exists():
            questionnaire = Questionnaire.from_markdown(questionnaire_path.read_text())

        # Load prompts
        prompts = {}
        prompts_dir = path / "prompts"
        if prompts_dir.exists():
            for prompt_file in prompts_dir.glob("*.md"):
                prompt_name = prompt_file.stem
                prompt_content = prompt_file.read_text()

                # Extract variables (text in curly braces)
                variables = re.findall(r"\{(\w+)\}", prompt_content)

                prompts[prompt_name] = PromptTemplate(
                    name=prompt_name,
                    content=prompt_content,
                    variables=list(set(variables)),
                )

        return cls(
            name=frontmatter.get("name", path.name),
            type=TemplateType(frontmatter.get("type", "bug")),
            description=frontmatter.get("description", ""),
            sections=sections,
            questionnaire=questionnaire,
            prompts=prompts,
        )
