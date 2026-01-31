# Framer UI Prototype Design

## Overview

This document defines the UI prototype design for Framer - an AI-assisted thinking framework for pre-development activities. The prototype validates the complete user experience through mockup data before implementation investment.

**Primary Persona:** Tech Lead (creates Frames + reviews team Frames)

**Scenarios Covered:**
1. Bug Fix - Tech Lead creates: Telemetry mode recovery issue
2. Feature Development - Junior engineer created, escalated (<80 score), Tech Lead reviews
3. Exploration - Senior engineer created, high score (>=80), Tech Lead has visibility

---

## 1. Overall Structure & Navigation

### App Shell

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo: Framer]    Team: Platform Engineering    [Settings] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Main Content Area                        │
│                    (Dashboard or Frame Detail)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Model

- No sidebar navigation - the product is focused on one thing (Frames)
- Top bar shows: Logo, Team name, Settings gear icon
- Dashboard is the home view
- Clicking a Frame card opens the detail view
- Breadcrumb appears in detail view: "Dashboard > Frame Title"

### Settings Page

Accessed via gear icon:
- AI Configuration: Provider type, API URI, API Key
- User profile (name, email - for Frame ownership)
- Team settings (if admin)

### Key Interactions

- "+ New Frame" button on dashboard creates a new Frame (opens detail view in Draft status)
- Frame cards on dashboard show: Title, Type badge, Owner avatar, Score (if assessed), Status
- Clicking anywhere on a card opens that Frame

---

## 2. Dashboard View (Kanban)

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo: Framer]       Team: Platform Engineering              [Settings]    │
├─────────────────────────────────────────────────────────────────────────────┤
│  [+ New Frame]     Filter: [All Types v] [All Owners v]    Search...        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Draft (2)    │  In Review (1)  │   Ready (3)   │ Escalated (1) │ Closed   │
│  ───────────   │  ─────────────  │  ───────────  │ ────────────  │ ──────   │
│  ┌─────────┐   │  ┌───────────┐  │  ┌─────────┐  │ ┌──────────┐  │          │
│  │ Bug     │   │  │ Feature   │  │  │ Explor  │  │ │ Feature  │  │          │
│  │ Teleme- │   │  │ API Rate  │  │  │ FHE     │  │ │ DB Schema│  │          │
│  │ try...  │   │  │ Limiting  │  │  │ Report  │  │ │ Migrat.. │  │          │
│  │         │   │  │           │  │  │         │  │ │          │  │          │
│  │ Alex    │   │  │ Jordan    │  │  │ Sam     │  │ │ Casey    │  │          │
│  │ --      │   │  │ 85        │  │  │ 88      │  │ │ 62       │  │          │
│  └─────────┘   │  └───────────┘  │  └─────────┘  │ └──────────┘  │          │
│                │                 │               │               │          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Kanban Columns

1. **Draft** - Frame being created/edited, not yet submitted for AI assessment
2. **In Review** - Frame submitted, AI has scored it, owner reviewing feedback
3. **Ready** - Score >= 80, confirmed by owner, ready to proceed to implementation
4. **Escalated** - Score < 80, needs manager/lead attention before proceeding
5. **Closed** - Work completed or Frame abandoned

### Frame Card Elements

- **Type badge**: Bug (red), Feature (green), Exploration (blue) - colored pill
- **Title**: One-line problem statement (truncated)
- **Owner**: Avatar + name
- **Score**: Circle indicator (gray = not assessed, green = >=80, yellow = <80) + number

### Filters

- Type: All / Bug / Feature / Exploration
- Owner: All / specific team members
- Search: Searches title and problem statement

**Escalated Column** has subtle red/orange background to draw attention.

---

## 3. Frame Detail View (Left Side - Frame Content)

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo: Framer]    Dashboard > Telemetry Mode Recovery Bug       [Settings] │
├───────────────────────────────────────────────────────┬─────────────────────┤
│                                                       │                     │
│  ┌─────────────────────────────────────────────────┐  │                     │
│  │ HEADER (pinned)                                 │  │    AI SIDEBAR       │
│  │ Type: [Bug v]     Status: Draft                 │  │                     │
│  │                                                 │  │                     │
│  │ Problem Statement:                              │  │                     │
│  │ ┌─────────────────────────────────────────────┐ │  │                     │
│  │ │ When switching telemetry mode from 'fqdn'   │ │  │                     │
│  │ │ back to 'region', server domain doesn't...  │ │  │                     │
│  │ └─────────────────────────────────────────────┘ │  │                     │
│  └─────────────────────────────────────────────────┘  │                     │
│                                                       │                     │
│  ┌─────────────────────────────────────────────────┐  │                     │
│  │ USER PERSPECTIVE                          [Edit]│  │                     │
│  │ ...                                             │  │                     │
│  │ [Generate] [Improve] [Refine with AI...]        │  │                     │
│  └─────────────────────────────────────────────────┘  │                     │
│                                                       │                     │
│  ┌─────────────────────────────────────────────────┐  │                     │
│  │ ENGINEERING FRAMING                       [Edit]│  │                     │
│  │ ...                                             │  │                     │
│  │ [Generate] [Improve] [Refine with AI...]        │  │                     │
│  └─────────────────────────────────────────────────┘  │                     │
│                                                       │                     │
│  ┌─────────────────────────────────────────────────┐  │                     │
│  │ VALIDATION THINKING                       [Edit]│  │                     │
│  │ ...                                             │  │                     │
│  │ [Generate] [Improve] [Refine with AI...]        │  │                     │
│  └─────────────────────────────────────────────────┘  │                     │
│                                                       │                     │
│  ┌─────────────────────────────────────────────────┐  │                     │
│  │ CONFIRMATION (pinned bottom)                    │  │                     │
│  │ [ ] I understand the problem from user's view   │  │                     │
│  │ [ ] I understand the key engineering trade-offs │  │                     │
│  │ [ ] I know how this work will be validated      │  │                     │
│  │                                                 │  │                     │
│  │ Owner: Alex Chen          Date: 2026-01-29      │  │                     │
│  │                                                 │  │                     │
│  │ [Save Draft]  [Submit for Review]               │  │                     │
│  └─────────────────────────────────────────────────┘  │                     │
└───────────────────────────────────────────────────────┴─────────────────────┘
```

### Section Behavior

- Each section has an [Edit] button to enter edit mode
- Clicking a section (or Edit) focuses it - sidebar responds to this focus
- Sections are scrollable, Header and Confirmation stay pinned
- Empty sections show placeholder text: "Click to add user perspective..."

### Section-Level AI Actions

Each section has three AI action buttons:

| Action | When to Use | Behavior |
|--------|-------------|----------|
| **Generate** | Section is empty or minimal | AI drafts content based on problem statement and other sections |
| **Improve** | Content exists but needs polish | AI rewrites for clarity, completeness, structure |
| **Refine with AI...** | Need back-and-forth | Opens dialog for multi-turn conversation |

---

## 4. Frame Detail View (Right Side - AI Sidebar)

### Layout

```
┌─────────────────────────────────────┐
│  AI ASSISTANT                       │
├─────────────────────────────────────┤
│                                     │
│  Focusing on: User Perspective      │
│  ─────────────────────────────────  │
│                                     │
│  SUGGESTIONS                        │
│  ┌─────────────────────────────────┐│
│  │ Consider adding a step showing  ││
│  │ the admin's expectation vs      ││
│  │ actual result...                ││
│  │                                 ││
│  │ [Apply] [Dismiss]               ││
│  └─────────────────────────────────┘│
│                                     │
│  QUALITY SCORE                      │
│  ┌─────────────────────────────────┐│
│  │  Not yet assessed               ││
│  │                                 ││
│  │  [Assess Frame]                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ISSUES (0)                         │
│  ┌─────────────────────────────────┐│
│  │  No issues detected yet.        ││
│  │  Click "Assess Frame" for       ││
│  │  full analysis.                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ─────────────────────────────────  │
│  ASK AI                             │
│  ┌─────────────────────────────────┐│
│  │ Type your question...           ││
│  └─────────────────────────────────┘│
│  [Send]                             │
│                                     │
└─────────────────────────────────────┘
```

### After Clicking "Assess Frame"

```
┌─────────────────────────────────────┐
│  QUALITY SCORE                      │
│  ┌─────────────────────────────────┐│
│  │        ┌─────┐                  ││
│  │        │ 74  │  Needs work      ││
│  │        └─────┘                  ││
│  │                                 ││
│  │  Problem Clarity      18/20     ││
│  │  User Perspective     14/20     ││
│  │  Engineering Framing  20/25     ││
│  │  Validation Thinking  12/20     ││
│  │  Internal Consistency 10/15     ││
│  │                                 ││
│  │  [Re-assess]                    ││
│  └─────────────────────────────────┘│
│                                     │
│  ISSUES (3)                         │
│  ┌─────────────────────────────────┐│
│  │ [!] Validation: No disconfirm-  ││
│  │     ing evidence specified      ││
│  │                                 ││
│  │ [!] User: Journey step 4 is     ││
│  │     outcome, not user action    ││
│  │                                 ││
│  │ [!] Engineering: "Fix the bug"  ││
│  │     is not a principle          ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Sidebar Behaviors

- "Focusing on" updates when user clicks a section
- Suggestions are contextual to focused section
- Issues are clickable - clicking scrolls to and highlights relevant section
- Chat input allows freeform AI questions
- Score is on-demand (user clicks "Assess Frame")

---

## 5. Refine with AI Dialog

Multi-turn conversation for refining a specific section:

```
┌─────────────────────────────────────────────────────────────────┐
│  Refine: User Perspective                              [Close] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Content:                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ User: Network Administrator                                 ││
│  │ Context: Managing FortiGate device telemetry settings       ││
│  │ ...                                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  AI: The user journey focuses on what the admin does, but      │
│      doesn't capture the moment of frustration. What happens   │
│      when they discover the problem?                           │
│                                                                 │
│  You: They check cloud-status command and see the old domain   │
│       is still there. They try to set it manually but get      │
│       "command parse error".                                    │
│                                                                 │
│  AI: Here's an improved journey:                               │
│      ┌─────────────────────────────────────────────────────┐   │
│      │ 1. Admin sets mode to 'fqdn'...                     │   │
│      │ 2. Testing complete, admin switches to 'region'...  │   │
│      │ ...                                                 │   │
│      │ [Apply This] [Keep Editing]                         │   │
│      └─────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Type your response...                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│  [Send]                                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dialog Behaviors

- Shows current section content at top (editable)
- Scrollable conversation history
- AI asks clarifying questions, proposes improvements
- User can chat naturally, provide context
- When AI proposes new content, [Apply This] replaces section content
- [Keep Editing] continues the conversation
- Closing dialog preserves conversation for later

---

## 6. Review Flow (Escalated Frame View)

When Tech Lead or Manager opens an escalated Frame:

### Visual Differences from Owner View

- **Status badge** shows "Escalated" prominently with yellow/orange styling
- **Sections are read-only** - no Edit buttons, just content
- **Comment indicators** on each section (e.g., "2 comments")
- **[+ Add Comment]** button in each section
- **Review Panel** in sidebar replaces AI suggestions

### Review Panel in Sidebar

```
┌─────────────────────────────────────┐
│  REVIEW PANEL                       │
│  ─────────────────────────────────  │
│                                     │
│  AI Summary:                        │
│  "Frame lacks user perspective -    │
│  who needs migrations and why?      │
│  Engineering trade-offs are vague." │
│                                     │
│  Key Concerns:                      │
│  * No user defined                  │
│  * Missing rollback strategy        │
│  * Success criteria not measurable  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Your Decision:                     │
│                                     │
│  [Request Changes]                  │
│  [Approve Anyway]                   │
│  [Approve]                          │
│                                     │
└─────────────────────────────────────┘
```

### "Approve Anyway" Flow

Opens a modal requiring justification:

```
┌─────────────────────────────────────┐
│  Approve with Justification         │
│                                     │
│  Score is below threshold (62/100). │
│  Please explain why proceeding is   │
│  acceptable:                        │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Discussed with Casey - scope is ││
│  │ intentionally limited to v1...  ││
│  └─────────────────────────────────┘│
│                                     │
│  [Cancel]  [Approve with Note]      │
└─────────────────────────────────────┘
```

---

## 7. API Configuration (BYOT Flow)

### Contextual Prompt

When user clicks any AI action without configured API:

```
┌─────────────────────────────────────────────────────────────────┐
│  Configure AI Provider                                  [Close] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Framer uses AI to help you think through problems.             │
│  Connect your own AI provider to enable these features.         │
│                                                                 │
│  Provider Type:                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ( ) OpenAI-compatible                                       ││
│  │ (*) Anthropic-compatible                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  API Endpoint:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ https://api.anthropic.com/v1                                ││
│  └─────────────────────────────────────────────────────────────┘│
│  Pre-filled with official endpoint. Change for local/self-     │
│  hosted providers (e.g., http://localhost:11434/v1)            │
│                                                                 │
│  API Key:                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ sk-ant-************************                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Model (optional):                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ claude-sonnet-4-20250514                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│  Leave empty for provider default                               │
│                                                                 │
│  [Test Connection]                                              │
│                                                                 │
│  [Cancel]                            [Save & Continue]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Storage

- API key stored locally in browser (localStorage or IndexedDB)
- Never sent to Framer backend - all AI calls happen client-side

---

## 8. New Frame Creation Flow

### Type Selection

Clicking "+ New Frame" on Dashboard:

```
┌─────────────────────────────────────────────────────────────────┐
│  Create New Frame                                       [Close] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What type of work are you framing?                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Bug Fix                                                    ││
│  │  Something isn't working as expected                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Feature Development                                        ││
│  │  Adding new functionality with known goals                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Exploration                                                ││
│  │  Open-ended research or investigation                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Type-Specific Placeholder Prompts

| Type | Problem Statement Placeholder |
|------|-------------------------------|
| Bug | "Describe what's broken - what should happen vs. what actually happens?" |
| Feature | "What capability is missing? What should users be able to do that they can't today?" |
| Exploration | "What question are you trying to answer? What uncertainty needs to be resolved?" |

---

## Mockup Data

### Scenario 1: Bug Fix Frame (Tech Lead Creates)

**Frame: Telemetry Mode Recovery Bug**

**HEADER**
- Type: Bug
- Status: Draft -> In Review -> Ready
- Problem Statement: "When switching telemetry mode from 'fqdn' back to 'region', the server domain is not restored to the default value, leaving the device unable to connect to the telemetry cloud."

**USER PERSPECTIVE**
- User: Network Administrator / Security Operations Engineer
- Context: Managing FortiGate firewall devices in an enterprise environment. Telemetry cloud connection is required for threat intelligence updates, device health monitoring, and compliance reporting.
- User Journey:
  1. Admin sets telemetry mode to 'fqdn' to test connection to a staging server (test.com) during maintenance window
  2. Admin verifies staging connection works via 'get cloud-status'
  3. Testing complete, admin switches mode back to 'region' to restore production telemetry connection
  4. Admin runs 'get cloud-status' expecting to see default domain (apigw.fortitelemetry.com)
  5. Admin discovers domain is still 'test.com' - device not connecting to production telemetry cloud
  6. Admin attempts 'set server apigw.fortitelemetry.com' but receives "command parse error" - field not editable in region mode
  7. Admin has no workaround - device is stuck without telemetry
- Pain Points:
  - No error or warning when switching modes - silent failure
  - Cannot manually correct the domain - field is read-only
  - Only workaround is factory reset or config restore, both disruptive to production
  - Loss of telemetry means blind spot in security monitoring

**ENGINEERING FRAMING**
- Engineering Principles / Invariants:
  1. Mode transitions must leave the system in a valid, functional state - no "orphaned" configurations
  2. Default values for mode-specific fields must be restored when returning to that mode
  3. User should never be stuck in an unrecoverable state without explicit warning
- Explicit Non-goals / Trade-offs:
  - We do NOT preserve custom server when switching back to region (intentional data loss is acceptable here)
  - We do NOT add a "remember custom server" feature - out of scope
  - We accept that fix requires firmware update - no hot-patch mechanism available

**VALIDATION THINKING**
- Success Signals:
  - After fix: switching from fqdn->region results in 'get cloud-status' showing 'apigw.fortitelemetry.com'
  - Automated test: mode transition test in QA regression suite passes
  - No manual intervention required to restore connectivity
- Disconfirming Evidence:
  - If domain persists after mode switch, fix is incomplete
  - If 'get cloud-status' shows any domain other than default after region mode, regression exists
  - If other mode transitions also fail to reset defaults, problem is broader than initially scoped

**CONFIRMATION**
- Owner: Alex Chen (Tech Lead)
- Date: 2026-01-29
- AI Score: 88/100

---

### Scenario 2: Feature Frame (Junior Engineer, Escalated)

**Frame: Database Schema Migration Support**

**HEADER**
- Type: Feature
- Status: Escalated
- Problem Statement: "Need to support database schema migrations for version upgrades"

**USER PERSPECTIVE**
- User: (empty)
- Context: Database needs to evolve as we add features. Currently manual.
- User Journey:
  1. Developer adds new table or column to code
  2. Deployment runs migration script
- Pain Points:
  - Manual migrations are error-prone
  - Hard to track which migrations ran

**ENGINEERING FRAMING**
- Engineering Principles / Invariants:
  1. Migrations should be automatic
  2. Should support rollback
  3. Fix the migration problem
- Explicit Non-goals / Trade-offs: (empty)

**VALIDATION THINKING**
- Success Signals:
  - Migrations work correctly
  - Developers are happy
- Disconfirming Evidence: (empty)

**CONFIRMATION**
- Owner: Casey Kim (Software Engineer)
- Date: 2026-01-28
- AI Score: 62/100 (Below threshold - Escalated)

**AI Score Breakdown:**
| Dimension | Score | Issues |
|-----------|-------|--------|
| Problem Clarity | 12/20 | Problem statement is vague |
| User Perspective | 8/20 | No user defined, only 2 journey steps |
| Engineering Framing | 16/25 | "Fix the migration problem" is not a principle |
| Validation Thinking | 10/20 | Success criteria not measurable |
| Internal Consistency | 16/15 | Sections don't contradict |

**AI Summary for Reviewer:**
> This Frame lacks clarity on who benefits from schema migrations and why it matters now. The user perspective is missing - is this for developers during local dev? For ops during deployment?
>
> Key Concerns:
> - No user defined
> - Problem statement focuses on solution not problem
> - No trade-offs considered
> - Success criteria not testable

**Reviewer Comments (from Tech Lead Alex):**
- On USER PERSPECTIVE: "Casey - who specifically is affected? Is this about our deployment pipeline failing, or developers struggling locally?"
- On ENGINEERING FRAMING: "What's our rollback strategy if migration fails halfway? This is critical for production."

---

### Scenario 3: Exploration Frame (Senior Engineer, High Score)

**Frame: FHE Weekly Report Optimization**

**HEADER**
- Type: Exploration
- Status: Ready
- Problem Statement: "FHE weekly report generation takes 4+ hours and frequently times out, blocking Monday morning operations reviews and consuming excessive database resources during peak hours."

**USER PERSPECTIVE**
- User: Operations Manager / Security Analyst
- Context: Every Monday at 6 AM, the FHE (FortiHome Enterprise) system generates weekly summary reports for ~200 managed customer sites. These reports are reviewed in the 9 AM operations meeting.
- User Journey:
  1. Scheduled job triggers at 6 AM Monday to generate weekly reports for all customer sites
  2. Report aggregates 7 days of telemetry: alerts, device health, bandwidth usage, policy violations
  3. Operations Manager opens dashboard at 8:30 AM to prepare for 9 AM meeting
  4. Dashboard shows "Report generation in progress" or "Report generation failed - timeout"
  5. Manager must either wait (missing meeting prep) or proceed to meeting without current data
  6. If failed, manager submits ticket to engineering; re-run during business hours impacts production database performance
  7. Team makes decisions based on stale data or gut feeling
- Pain Points:
  - 4+ hour generation time - too slow for Monday morning workflow
  - Timeout failures (~30% of weeks) require manual re-run
  - Re-running during business hours degrades dashboard performance
  - No partial results - either full report or nothing
  - Manager loses confidence in data-driven decisions

**ENGINEERING FRAMING**
- Engineering Principles / Invariants:
  1. Report generation must complete within 2-hour window (6-8 AM)
  2. Report generation must not degrade production system performance
  3. Prefer incremental improvement over full rewrite
  4. Exploration should identify top 2-3 optimization opportunities with effort/impact estimates
- Explicit Non-goals / Trade-offs:
  - We are NOT redesigning the report format or content
  - We are NOT evaluating new reporting tools/vendors
  - We accept that some optimizations may require schema changes
  - We prioritize reducing timeout failures over reducing average time (reliability > speed)

**VALIDATION THINKING**
- Success Signals:
  - Exploration complete: documented analysis of current bottlenecks with profiling data
  - Identified 2-3 concrete optimization paths with rough effort/impact matrix
  - Recommendation memo ready for architecture review within 2 weeks
  - Enough clarity to make build/buy/defer decision
- Disconfirming Evidence:
  - If profiling shows bottleneck is external dependency, optimization options are limited
  - If report logic is fundamentally O(n^2) on customer count, incremental fixes won't help
  - If quick wins would only reduce time by <20%, may not be worth investment

**CONFIRMATION**
- Owner: Sam Patel (Senior Engineer)
- Date: 2026-01-27
- AI Score: 88/100

**AI Feedback:**
> Strong exploration framing. The problem is well-quantified (4+ hours, 30% failure rate) and user impact is clear.
>
> Minor suggestions:
> - Consider adding secondary stakeholder: customers who receive these reports
> - "2 weeks" timeline in success signals - clarify if hard deadline exists

---

## Design Summary

| Component | Decision |
|-----------|----------|
| Structure | Top bar (Logo, Team, Settings) + Main content area |
| Dashboard | 5-column Kanban (Draft, In Review, Ready, Escalated, Closed) with type/owner filters |
| Frame Detail | Two-column: Content (left) + AI Sidebar (right) |
| Frame Sections | Header (pinned), User Perspective, Engineering Framing, Validation Thinking, Confirmation (pinned) |
| AI Features | Context-aware sidebar, section-level Generate/Improve/Refine, on-demand scoring, issues list, chat input |
| Review Flow | Read-only sections, comment capability, AI summary, Request Changes / Approve Anyway / Approve |
| BYOT | Contextual prompt on first AI action, OpenAI-compatible or Anthropic-compatible with custom API URI |
| Storage | API key in browser localStorage, AI calls client-side |
