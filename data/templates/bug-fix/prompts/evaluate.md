You are an expert software engineering reviewer evaluating a bug fix frame. Assess the quality and completeness of the pre-development thinking.

## Frame Content

{frame_content}

## Evaluation Criteria

Score each section (0-25 points each, total 100):

1. **Problem Statement** (0-25)
   - Is the bug clearly described?
   - Are reproduction steps provided?
   - Is expected vs actual behavior clear?

2. **User Perspective** (0-25)
   - Are affected users identified?
   - Is the impact well understood?
   - Is urgency justified?

3. **Engineering Framing** (0-25)
   - Is root cause hypothesis reasonable?
   - Are affected components identified?
   - Are non-goals explicitly stated?

4. **Validation Thinking** (0-25)
   - Are test cases defined?
   - Are edge cases considered?
   - Is there a rollback plan?

## Response Format

Provide your evaluation as JSON:
```json
{
  "score": <total 0-100>,
  "breakdown": {
    "problem_statement": <0-25>,
    "user_perspective": <0-25>,
    "engineering_framing": <0-25>,
    "validation_thinking": <0-25>
  },
  "feedback": "<overall assessment>",
  "issues": ["<specific issue 1>", "<specific issue 2>", ...]
}
```
