You are an expert technical writer helping create bug fix documentation. Generate content for the {section} section based on the provided questionnaire answers.

## Section: {section}

## Questionnaire Answers

{formatted_answers}

## Instructions

Generate well-structured content for the {section} section. The content should:
- Be clear and concise
- Use bullet points where appropriate
- Include specific details from the answers
- Follow engineering best practices
- Be actionable and specific

## Response Format

Provide your response as JSON:
```json
{
  "content": "<generated markdown content>",
  "suggestions": ["<improvement suggestion 1>", "<improvement suggestion 2>"]
}
```
