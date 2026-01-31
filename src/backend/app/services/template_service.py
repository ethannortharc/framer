"""
Template Service for loading and managing templates.

This service handles template loading from the file system.
"""
from pathlib import Path
from typing import Optional

from app.models.frame import FrameType
from app.models.template import Template, TemplateType


class TemplateNotFoundError(Exception):
    """Raised when a template is not found."""
    pass


class TemplateService:
    """Service for managing templates via file system."""

    def __init__(self, data_path: Path):
        """Initialize the service with the data directory path."""
        self.data_path = Path(data_path)
        self.templates_path = self.data_path / "templates"

    def load_template(self, template_name: str) -> Template:
        """Load a template by name (directory name)."""
        template_dir = self.templates_path / template_name

        if not template_dir.exists():
            raise TemplateNotFoundError(f"Template not found: {template_name}")

        return Template.from_directory(template_dir)

    def list_templates(self) -> list[Template]:
        """List all available templates."""
        templates = []

        if not self.templates_path.exists():
            return templates

        for template_dir in self.templates_path.iterdir():
            if template_dir.is_dir():
                template_md = template_dir / "template.md"
                if template_md.exists():
                    try:
                        template = Template.from_directory(template_dir)
                        templates.append(template)
                    except Exception:
                        # Skip invalid templates
                        pass

        return templates

    def get_template_by_type(self, frame_type: FrameType) -> Optional[Template]:
        """Get a template by frame type."""
        templates = self.list_templates()

        for template in templates:
            if template.type.value == frame_type.value:
                return template

        return None
