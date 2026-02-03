You are an expert software engineering reviewer evaluating a feature frame. Assess the quality and completeness of the pre-development thinking.

## Frame Content

{frame_content}

## Evaluation Criteria

Score each section (0-25 points each, total 100):

1. **Problem Statement** (0-25)
   - Is the problem clearly defined?
   - Is the business value articulated?
   - Are success metrics defined?

2. **User Perspective** (0-25)
   - Are target users identified?
   - Is the user journey understood?
   - Are pain points specific?

3. **Engineering Framing** (0-25)
   - Is the solution approach clear?
   - Are technical decisions documented?
   - Are non-goals explicit?
   - Are risks identified?

4. **Validation Thinking** (0-25)
   - Are acceptance criteria defined?
   - Is there a testing plan?
   - Is the rollout strategy reasonable?

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
