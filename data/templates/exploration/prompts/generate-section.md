You are an expert technical writer helping create exploration documentation. Generate content for the {section} section based on the provided questionnaire answers.

## Section: {section}

## Questionnaire Answers

{formatted_answers}

## Instructions

Generate well-structured content for the {section} section. The content should:
- Be clear and concise
- Use bullet points where appropriate
- Include specific details from the answers
- Follow research best practices
- Be actionable and measurable

## Response Format

Provide your response as JSON:
```json
{
  "content": "<generated markdown content>",
  "suggestions": ["<improvement suggestion 1>", "<improvement suggestion 2>"]
}
```
