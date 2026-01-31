# Findings: Framer UI Prototype

## Design Requirements Summary

### Frame Structure
- **Header**: Type (Bug/Feature/Exploration), Status, Problem Statement
- **User Perspective**: User, Context, User Journey (min 3 steps), Pain Points
- **Engineering Framing**: Principles/Invariants (max 5), Non-goals/Trade-offs
- **Validation Thinking**: Success Signals, Disconfirming Evidence
- **Confirmation**: 3 checkboxes, Owner, Date

### Kanban Columns
1. Draft - Being created/edited
2. In Review - Submitted, AI scored, owner reviewing
3. Ready - Score >= 80, confirmed
4. Escalated - Score < 80, needs manager attention
5. Closed - Completed or abandoned

### AI Scoring Dimensions
| Dimension | Max Points |
|-----------|-----------|
| Problem Clarity | 20 |
| User Perspective | 20 |
| Engineering Framing | 25 |
| Validation Thinking | 20 |
| Internal Consistency | 15 |
| **Total** | **100** |

Threshold: >= 80 passes, < 80 escalates

### Mockup Scenarios

#### Scenario 1: Bug Fix (Alex Chen - Tech Lead)
- Frame: Telemetry Mode Recovery Bug
- Status: Draft -> Ready
- Score: 88/100
- High quality example

#### Scenario 2: Feature (Casey Kim - Junior Engineer)
- Frame: Database Schema Migration Support
- Status: Escalated
- Score: 62/100
- Low quality example with missing sections

#### Scenario 3: Exploration (Sam Patel - Senior Engineer)
- Frame: FHE Weekly Report Optimization
- Status: Ready
- Score: 88/100
- High quality exploration example

### UI Components Needed
- AppShell (top bar)
- KanbanBoard with columns
- FrameCard
- FrameDetailView (two-column)
- SectionCard (collapsible, editable)
- AISidebar
- ScoreDisplay (circular + breakdown)
- IssuesList (clickable)
- RefineDialog (multi-turn chat)
- ConfigureAIDialog
- NewFrameModal
- ReviewPanel
- CommentThread
- ApproveAnywayModal

### BYOT Configuration
- Provider types: OpenAI-compatible, Anthropic-compatible
- Fields: API Endpoint, API Key, Model (optional)
- Storage: localStorage (client-side only)
