# Framer — AI-Assisted Thinking Framework for Development Activities

## 1. Product Idea

### One-liner

Framer is a structured thinking framework that helps engineering teams clarify problems, user perspective, engineering abstractions, and validation **before implementation**, with AI acting as a Thinking Copilot and Soft Gatekeeper.

### Core Goal

Improve the quality and clarity of **pre-development activities** (Bug fixing, Feature development, Exploration) by making implicit thinking explicit, structured, reviewable, and improvable.

Framer does **not** replace implementation tools (Jira, GitHub, Linear).
Framer exists **before execution**.

---

## 2. Problem Statement

In many engineering teams:

- Problems are poorly defined or mixed with solutions
- User perspective is assumed instead of articulated
- Engineering trade-offs and invariants remain implicit
- Validation criteria are unclear or missing
- Managers repeatedly act as cognitive “backstops”

This leads to:

- Inefficient discussions
- Incorrect fixes or over-engineered solutions
- High manager overhead
- Repeated mistakes with no learning loop

Framer addresses the **thinking quality gap**, not execution speed.

---

## 3. Target Users

### Primary Users

- Senior / Staff Engineers
- Tech Leads
- Engineering Managers

### Secondary Users

- Mid-level Engineers (as Frame owners)

### Team Size

- 5–30 engineers
- Engineering-driven teams
- Long-lived systems with complexity

---

## 4. Supported Development Activities

Framer supports **three development activity types**, each sharing a common framing structure:

1. Bug Fixing
2. Feature Development (with known goals)
3. Exploration / Open-ended Research

---

## 5. Core Concept: Frame

A **Frame** is a structured thinking unit created **before** development begins.

A Frame captures:

- What problem we are solving
- How users experience it
- How engineers abstract and constrain the solution
- How success or failure will be validated

A Frame is not:

- A ticket
- A design doc
- A PR

A Frame is:

> A shared cognitive contract before work starts

---

### 5.1 Conversation-First Framing

The traditional form-filling approach to frame creation is replaced by an **AI-guided conversation**. Instead of presenting users with four empty sections to fill, the system engages users in natural dialogue.

**How it works:**

1. User describes their intent in plain language ("I need to fix a login timeout bug" or "We want to add export functionality")
2. AI acts as a Framing Coach, asking probing questions to elicit the information needed for each Frame section
3. The 4-section structure (Problem Statement, User Perspective, Engineering Framing, Validation Thinking) becomes **internal scaffolding** — the AI tracks coverage of each section internally
4. When all sections have sufficient coverage (~60%+), the AI offers to synthesize the conversation into a structured Frame
5. User reviews and edits the synthesized Frame before submission

**Benefits:**

- Lower barrier to entry — users just talk, don't fill forms
- AI identifies gaps and inconsistencies during conversation, not after
- Relevant knowledge from past frames and team learnings surfaces automatically
- Frame type (bug/feature/exploration) is detected from context, not selected upfront

**The conversation persists** alongside the Frame, providing traceability for why specific framing decisions were made.

---

## 6. Frame Structure (MVP)

### 6.1 Frame Header

```
Frame Type:
- Bug | Feature | Exploration

One-line Problem Statement:
- Max 30 words
- Problem-focused, not solution-focused
```

AI may generate a draft.
Developer must explicitly confirm or edit.

---

### 6.2 User Perspective (User Journey / Story Map)

Purpose:
Ensure the team understands how the problem appears in the **user’s real workflow**.

```
User:
Context:

User Journey Steps:
1.
2.
3.

Pain Points:
- P1
- P2
```

Rules:

- Minimum 3 steps
- Must represent a sequence, not isolated actions
- AI can propose an initial journey
- Developer confirms or edits

---

### 6.3 Engineering Framing (Abstractions & Invariants)

Purpose:
Make engineering decisions and trade-offs explicit.

```
Engineering Principles / Invariants:
- Principle 1
- Principle 2
- Principle 3

Explicit Non-goals / Trade-offs:
- We intentionally do NOT optimize for X
- We accept Y risk / limitation
```

Rules:

- Max 5 principles
- Generic statements (e.g., “high performance”) should be challenged
- AI may suggest principles
- Developer must confirm or revise

---

### 6.4 Validation Thinking

Purpose:
Ensure the team knows how to evaluate correctness and success.

```
Success Signals:
- Observable signal or metric
- Behavioral or system-level evidence

Disconfirming Evidence:
- What would prove this framing wrong?
```

Rules:

- Must be falsifiable
- AI can highlight vague or non-verifiable signals

---

### 6.5 Developer Confirmation

```
I confirm that:
- I understand the problem from the user’s perspective
- I understand the key engineering trade-offs
- I know how this work will be validated

Owner:
Date:
```

This establishes responsibility and clarity.

---

## 7. AI Role in Framer

### 7.1 AI as Thinking Copilot

AI may:

- Generate drafts (problem statement, journey, principles)
- Ask clarifying questions
- Highlight ambiguity or inconsistency
- Improve wording and structure

AI must:

- Clearly label generated content as suggestions
- Never make final decisions

---

### 7.2 AI as Soft Gatekeeper

AI provides a **quality signal**, not approval.

#### Scoring Dimensions (Example)

| Dimension | Description | Weight |
| --- | --- | --- |
| Problem Clarity | Clear, solution-free definition | 20  |
| User Perspective | Coherent user journey | 20  |
| Engineering Framing | Explicit principles & trade-offs | 25  |
| Validation Thinking | Clear success & falsification | 20  |
| Internal Consistency | Sections align logically | 15  |

Total: 100

#### Threshold Model

- **≥ 80**: Definition quality is sufficient to proceed safely
- **< 80**: Cognitive risk is higher; escalate to manager review

AI score is advisory only.

---

### 7.3 AI as Central Orchestrator

AI is elevated from a passive copilot to the **conversation conductor**. Rather than waiting for users to fill sections and then scoring them, the AI actively drives the framing process.

**Orchestrator responsibilities:**

- **Decides what to ask next** — Based on section coverage gaps, the AI determines the most productive line of questioning
- **Identifies gaps** — Detects missing information, vague statements, and unstated assumptions in real-time
- **Surfaces relevant knowledge** — Searches team knowledge base for patterns, past decisions, and lessons learned that apply to the current frame
- **Synthesizes when ready** — Determines when sufficient information has been gathered and offers to generate the structured Frame

**Coverage tracking:**

The AI internally tracks four coverage dimensions (0.0 to 1.0):

| Dimension | Tracks |
| --- | --- |
| Problem Statement | Clear, solution-free problem definition |
| User Perspective | Who is affected, journey, pain points |
| Engineering Framing | Principles, trade-offs, non-goals |
| Validation Thinking | Success signals, falsification criteria |

When all dimensions reach ~0.6 coverage, the conversation is considered ready for synthesis.

---

### 7.4 Escalation Path (< 80 Score)

If score < threshold:

AI generates:

- Score breakdown
- Key concerns
- Missing or weak areas

Developer may:

- Improve the Frame
- Add justification for proceeding despite score

Ticket is escalated to manager **with context**, not blocked.

---

## 8. Product User Story Map

### Primary User: Engineer / Tech Lead

#### Goal 1: Clarify what we are about to work on

- Create a new Frame
- Select activity type
- Draft problem statement

#### Goal 2: Understand the problem from user perspective

- Generate or write user journey
- Identify pain points

#### Goal 3: Make engineering assumptions explicit

- Define invariants
- Declare non-goals

#### Goal 4: Define validation logic

- Specify success signals
- Identify disconfirming evidence

#### Goal 5: Assess readiness

- Review AI feedback
- Confirm or revise Frame
- Decide whether to proceed or escalate

---

## 9. User Journey (Using Framer)

1. Engineer identifies a bug / feature / exploration
2. Engineer creates a Frame in Framer
3. AI proposes drafts for unclear sections
4. Engineer reviews, edits, and confirms content
5. AI provides clarity score and feedback
6. If score ≥ threshold:
  - Frame is considered ready
7. If score < threshold:
  - Engineer may revise or escalate to manager
8. Manager reviews Frame + AI summary
9. Decision is made with reduced ambiguity

---

## 10. Non-goals (Important)

Framer explicitly does NOT:

- Manage implementation tasks
- Replace PM or design tools
- Enforce rigid process gates
- Judge correctness of solutions
- Optimize execution speed

---

## 11. Product Philosophy

Framer is not designed to:

- Make people smarter
- Replace human judgment

Framer is designed to:

- Make thinking visible
- Reduce ambiguity before execution
- Lower cognitive load on senior engineers and managers
- Improve decision quality over time

---

## 12. Design Principles

- Structure over freedom
- Guidance over enforcement
- AI-assisted, human-confirmed
- Minimal surface area
- Clarity over completeness

---

## 12.1 Knowledge & Memory System

Framer implements a **closed learning loop**: lessons from past implementations feed into future framing, creating compounding team knowledge.

### Memory Types

| Type | Description | Example |
| --- | --- | --- |
| Pattern | Recurring technical or process patterns | "Database migrations in service X require a 2-phase deploy" |
| Decision | Architectural or design decisions and their rationale | "Chose WebSockets over polling for real-time updates because..." |
| Prediction Accuracy | How well frame assumptions matched reality | "Frame F-001 predicted 2-week effort, actual was 4 weeks" |
| Context | Team-specific domain knowledge | "The billing service has a 5-second SLA for webhook responses" |
| Lesson | Explicit lessons from retrospectives | "Always validate OAuth tokens server-side, not in middleware" |

### Knowledge Sources

1. **Post-implementation feedback** (automatic) — When frames are archived with feedback, AI distills lessons learned, assumption accuracy, and patterns into knowledge entries
2. **Manual entries** — Team members add knowledge explicitly (domain context, architectural decisions, process notes)
3. **Conversation distillation** — AI extracts reusable knowledge from framing conversations (e.g., recurring concerns, discovered constraints)

### Knowledge Retrieval

Knowledge is retrieved via **semantic search** (vector embeddings) during conversations. When a user describes a problem, the system automatically surfaces:

- Similar past frames and their outcomes
- Relevant patterns and decisions
- Lessons learned from related work

This creates a **flywheel effect**: the more frames a team creates, the better the AI becomes at guiding future framing.