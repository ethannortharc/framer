"""
Templates API endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.models.template import Template
from app.services.template_service import TemplateService, TemplateNotFoundError


# Response models
class TemplateSectionResponse(BaseModel):
    """Response model for a template section."""
    name: str
    description: str
    required: bool


class QuestionResponse(BaseModel):
    """Response model for a questionnaire question."""
    id: str
    section: str
    text: str
    hint: Optional[str]


class QuestionnaireResponse(BaseModel):
    """Response model for a questionnaire."""
    title: str
    questions: list[QuestionResponse]


class TemplateListItem(BaseModel):
    """Response model for template list item."""
    name: str
    type: str
    description: str


class TemplateResponse(BaseModel):
    """Response model for a template."""
    name: str
    type: str
    description: str
    sections: list[TemplateSectionResponse]
    questionnaire: Optional[QuestionnaireResponse]
    prompts: list[str]

    @classmethod
    def from_template(cls, template: Template) -> "TemplateResponse":
        questionnaire = None
        if template.questionnaire:
            questionnaire = QuestionnaireResponse(
                title=template.questionnaire.title,
                questions=[
                    QuestionResponse(
                        id=q.id,
                        section=q.section,
                        text=q.text,
                        hint=q.hint,
                    )
                    for q in template.questionnaire.questions
                ]
            )

        return cls(
            name=template.name,
            type=template.type.value,
            description=template.description,
            sections=[
                TemplateSectionResponse(
                    name=s.name,
                    description=s.description,
                    required=s.required,
                )
                for s in template.sections
            ],
            questionnaire=questionnaire,
            prompts=list(template.prompts.keys()),
        )


def get_template_service(request: Request) -> TemplateService:
    """Dependency to get the template service from app state."""
    return request.app.state.template_service


def create_templates_router() -> APIRouter:
    """Create the templates API router."""
    router = APIRouter()

    @router.get("")
    def list_templates(
        template_service: TemplateService = Depends(get_template_service),
    ) -> list[TemplateListItem]:
        """List all available templates."""
        templates = template_service.list_templates()

        return [
            TemplateListItem(
                name=t.name,
                type=t.type.value,
                description=t.description,
            )
            for t in templates
        ]

    @router.get("/{template_name}")
    def get_template(
        template_name: str,
        template_service: TemplateService = Depends(get_template_service),
    ) -> TemplateResponse:
        """Get a template by name."""
        try:
            template = template_service.load_template(template_name)
            return TemplateResponse.from_template(template)
        except TemplateNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template not found: {template_name}",
            )

    return router
