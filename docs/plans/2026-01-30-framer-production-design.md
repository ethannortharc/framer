# Framer Production Design

**Date:** 2026-01-30
**Status:** Draft
**Author:** Design session with Claude

## Overview

Framer is an AI-assisted pre-development thinking framework for engineering teams. It helps developers structure their thinking before coding through guided frames (bug fix, feature, exploration) with AI evaluation and team collaboration.

This document describes the production system architecture, moving from the prototype to a deployable, self-hosted application.

## Goals & Constraints

### Target Users
- Engineering teams (collaborative, multi-user)
- Self-hosted deployment (teams control their data)

### Key Requirements
- Simple deployment (Docker Compose, single command)
- File-based storage for portability and transparency
- Git version control for frame history
- AI assistance via server-side proxy (team configures API key)
- Extensible for future integrations and knowledge base features

### Non-Goals (v1)
- SaaS/cloud hosting
- External tool integrations (Jira, GitHub)
- Advanced analytics/dashboards

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        Docker Compose                               │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │    Python Backend    │    │  PocketBase  │  │
│  │   (Nginx)    │    │   (FastAPI + Agno)   │    │  (Auth only) │  │
│  │              │    │                      │    │              │  │
│  │  Static      │───►│  /api/frames         │───►│  /api/auth   │  │
│  │  React app   │    │  /api/templates      │    │  /api/users  │  │
│  │              │    │  /api/ai/*           │    │  /api/teams  │  │
│  └──────────────┘    └──────────────────────┘    └──────────────┘  │
│                              │    │                     │          │
│                              ▼    ▼                     ▼          │
│                      ┌─────────────────┐        ┌───────────┐      │
│                      │   /data volume  │        │  pb_data  │      │
│                      │                 │        │  (users,  │      │
│                      │  - frames/      │        │   teams)  │      │
│                      │  - templates/   │        └───────────┘      │
│                      │  - .git/        │                           │
│                      │  - index.db     │                           │
│                      └─────────────────┘                           │
│                              │                                     │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
                               ▼
                       ┌───────────────┐
                       │  AI Provider  │
                       │  (External)   │
                       └───────────────┘
```

### Service Responsibilities

| Service | Responsibility | Technology |
|---------|---------------|------------|
| **Frontend** | UI, served as static files | React + Vite, served by Nginx |
| **Python Backend** | Business logic, files, git, AI | FastAPI + Agno + GitPython |
| **PocketBase** | Authentication, users, teams | PocketBase |

### API Routing

| Route | Service | Purpose |
|-------|---------|---------|
| `/auth/*` | PocketBase | Login, register, OAuth |
| `/api/users/*` | PocketBase | User management |
| `/api/teams/*` | PocketBase | Team management |
| `/api/frames/*` | Python Backend | Frame CRUD |
| `/api/templates/*` | Python Backend | Template management |
| `/api/ai/*` | Python Backend | AI operations |

### Auth Flow

1. User logs in via Frontend → PocketBase
2. PocketBase returns JWT token
3. Frontend includes token in all API requests
4. Python Backend validates token with PocketBase
5. If valid, process request

---

## File Structure & Data Model

### Storage Philosophy

- **Files are source of truth** (not database)
- **Single Git repo** for all data (unified history, simple backup)
- **SQLite index** for fast queries (auto-rebuilt from files)
- **Markdown + YAML** format (human-readable, AI-friendly)

### Directory Structure

```
/data                              # Single git repo
├── .git/                          # Version history for everything
│
├── /templates                     # Admin-managed, loaded at startup
│   ├── /bug-fix
│   │   ├── template.md           # Frame structure + field guidance
│   │   ├── questionnaire.md      # Questions for guided creation
│   │   └── /prompts              # AI prompts for this type
│   │       ├── evaluate.md       # Scoring criteria & prompt
│   │       ├── generate-section.md
│   │       ├── refine.md
│   │       └── chat-system.md
│   ├── /feature
│   │   └── ...
│   └── /exploration
│       └── ...
│
├── /frames                        # User-created frames
│   ├── /f-2024-01-30-abc123
│   │   ├── frame.md              # Core content (AI-ready)
│   │   ├── meta.yaml             # Status, owner, timestamps, scores
│   │   ├── questionnaire.md      # Filled responses (if used)
│   │   ├── comments.json         # Review comments
│   │   └── feedback.md           # Retrospective (when completed)
│   └── /f-2024-01-30-def456
│       └── ...
│
├── /config
│   ├── team.yaml                 # Team settings
│   └── ai.yaml                   # AI provider config
│
└── index.db                       # SQLite cache (rebuilt from files)
```

### Frame File Format

**frame.md** (Markdown with YAML frontmatter):

```markdown
---
id: f-2024-01-30-abc123
type: bug
---

# Problem Statement

Users cannot log in after password reset. The reset email is sent
successfully, but clicking the link shows "Invalid token" error.

## User Perspective

**User:** End user who forgot their password

**Context:** User requested password reset from login page

**Journey:**
1. User clicks "Forgot password" on login page
2. User receives reset email
3. User clicks reset link within 5 minutes
4. Error: "Invalid or expired token"

**Pain Points:**
- Completely blocked from accessing account
- No workaround except contacting support

## Engineering Framing

**Principles:**
1. Reset tokens must be single-use and time-limited
2. Token validation must handle clock skew

**Non-goals:**
- Changing the overall auth architecture
- Adding SMS-based reset

## Validation Thinking

**Success Signals:**
- Password reset flow completes without error
- Token expires correctly after use or timeout

**Disconfirming Evidence:**
- Other token-based features also failing
- Database connection issues in logs
```

**meta.yaml**:

```yaml
id: f-2024-01-30-abc123
type: bug
status: in_review
owner: user-456
created_at: 2024-01-30T10:00:00Z
updated_at: 2024-01-30T14:30:00Z
ai:
  score: 82
  evaluated_at: 2024-01-30T12:00:00Z
  breakdown:
    problem_clarity: 18
    user_perspective: 16
    engineering_framing: 22
    validation_thinking: 16
    completeness: 10
```

**comments.json**:

```json
{
  "comments": [
    {
      "id": "c-001",
      "section": "engineering",
      "author": "user-789",
      "content": "Should we also consider rate limiting?",
      "created_at": "2024-01-30T13:00:00Z"
    }
  ]
}
```

---

## Python Backend Design

### Project Structure

```
/backend
├── /app
│   ├── main.py                  # FastAPI app entry point
│   │
│   ├── /api                     # API routes
│   │   ├── frames.py           # Frame CRUD endpoints
│   │   ├── templates.py        # Template endpoints
│   │   ├── ai.py               # AI endpoints
│   │   └── deps.py             # Dependencies (auth, db)
│   │
│   ├── /services               # Business logic
│   │   ├── frame_service.py    # Frame file operations
│   │   ├── template_service.py # Template loading
│   │   ├── git_service.py      # Git operations
│   │   └── index_service.py    # SQLite index management
│   │
│   ├── /agents                 # Agno AI agents
│   │   ├── evaluator.py        # Frame evaluation agent
│   │   ├── generator.py        # Content generation agent
│   │   ├── refiner.py          # Content refinement agent
│   │   └── chat.py             # Chat assistant agent
│   │
│   ├── /models                 # Pydantic models
│   │   ├── frame.py
│   │   ├── template.py
│   │   └── ai.py
│   │
│   ├── /auth
│   │   └── pocketbase.py       # PocketBase token validation
│   │
│   └── /config
│       └── settings.py
│
├── requirements.txt
├── Dockerfile
└── pyproject.toml
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/frames` | GET | List frames (queries index.db) |
| `/api/frames` | POST | Create frame |
| `/api/frames/:id` | GET | Get frame (reads files) |
| `/api/frames/:id` | PUT | Update frame (writes files + git commit) |
| `/api/frames/:id/status` | PATCH | Change status |
| `/api/frames/:id/comments` | POST | Add comment |
| `/api/frames/:id/ai/evaluate` | POST | Trigger AI evaluation |
| `/api/frames/:id/ai/generate` | POST | AI content generation |
| `/api/templates` | GET | List available templates |
| `/api/ai/chat` | POST | AI chat for refinement |

### Key Dependencies

```
fastapi
uvicorn
agno
pydantic
gitpython
aiosqlite
pyyaml
markdown-it-py
httpx
```

---

## AI Integration

### Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Agno Agent Layer                         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Evaluator  │  │  Generator  │  │       Refiner       │  │
│  │   Agent     │  │   Agent     │  │       Agent         │  │
│  │             │  │             │  │                     │  │
│  │ - Score     │  │ - Generate  │  │ - Improve content   │  │
│  │ - Feedback  │  │   sections  │  │ - Multi-turn chat   │  │
│  │ - Issues    │  │ - From Q&A  │  │ - Apply suggestions │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          │                                   │
│                   ┌──────┴──────┐                            │
│                   │   Prompts   │  (loaded from templates)   │
│                   │   from /data│                            │
│                   └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### AI Operations

| Operation | Input | Output | Stored in |
|-----------|-------|--------|-----------|
| **Evaluate frame** | frame.md + prompt template | Score, breakdown, issues | meta.yaml |
| **Generate section** | Questionnaire + template | Section content | frame.md |
| **Refine content** | Current content + instruction | Improved content | frame.md |
| **Chat** | Conversation + frame context | Assistant response | Not stored |

### AI Configuration

File: `/data/config/ai.yaml`

```yaml
provider: openai              # or "anthropic"
endpoint: https://api.openai.com/v1
api_key: sk-...               # Admin-configured
model: gpt-4o
rate_limit:
  requests_per_minute: 20
  tokens_per_day: 100000
```

### Prompt Templates

Each frame type includes its own prompts in `/templates/{type}/prompts/`:

- `evaluate.md` - Scoring criteria and evaluation prompt
- `generate-section.md` - Section generation from questionnaire
- `refine.md` - Content improvement prompt
- `chat-system.md` - Chat assistant persona

This allows full customization of AI behavior per frame type without code changes.

---

## Frontend Architecture

### Tech Stack

- **React + Vite** - Fast builds, static output
- **TailwindCSS** - Styling (consistent with prototype)
- **React Query** - API state management
- **Zustand** - Local UI state
- **React Router** - Client-side routing

### Project Structure

```
/frontend
├── /src
│   ├── /api                    # API client layer
│   │   ├── client.ts
│   │   ├── frames.ts
│   │   ├── templates.ts
│   │   ├── ai.ts
│   │   └── auth.ts
│   │
│   ├── /components
│   │   ├── /ui
│   │   ├── /layout
│   │   ├── /frames
│   │   ├── /templates
│   │   ├── /archive
│   │   └── /modals
│   │
│   ├── /hooks
│   │   ├── useFrames.ts
│   │   ├── useAuth.ts
│   │   └── useAI.ts
│   │
│   ├── /pages
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── FrameDetail.tsx
│   │   ├── Templates.tsx
│   │   └── Archive.tsx
│   │
│   ├── /store
│   │   └── uiStore.ts
│   │
│   └── /types
│       └── index.ts
│
├── index.html
├── vite.config.ts
└── package.json
```

---

## Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
      - pocketbase

  backend:
    build: ./backend
    environment:
      - DATA_PATH=/data
      - POCKETBASE_URL=http://pocketbase:8090
      - AI_CONFIG_PATH=/data/config/ai.yaml
    volumes:
      - app_data:/data
    depends_on:
      - pocketbase

  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    volumes:
      - pb_data:/pb_data
    environment:
      - POCKETBASE_ADMIN_EMAIL=admin@example.com
      - POCKETBASE_ADMIN_PASSWORD=changeme

volumes:
  app_data:
  pb_data:
```

### Nginx Configuration

```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000/api/;
    }

    location /auth/ {
        proxy_pass http://pocketbase:8090/api/;
    }

    location /pb/ {
        proxy_pass http://pocketbase:8090/;
    }
}
```

### Deployment Commands

```bash
# Clone and configure
git clone https://github.com/yourorg/framer.git
cd framer
cp .env.example .env
# Edit .env with your settings

# Start
docker-compose up -d

# Access
# - App: http://localhost
# - PocketBase Admin: http://localhost/pb/_/
```

### Backup

```bash
# Backup data volume (includes git history)
docker-compose exec backend tar -czf /backup/framer-backup.tar.gz /data
docker cp framer_backend_1:/backup/framer-backup.tar.gz ./

# Restore
docker cp framer-backup.tar.gz framer_backend_1:/backup/
docker-compose exec backend tar -xzf /backup/framer-backup.tar.gz -C /
```

---

## Future Extensibility

### Integrations (Future)

- Add webhook endpoints in Python backend
- External tools can subscribe to frame events
- API can receive external data to populate frames

### Knowledge Base (Future)

- Full-text search index on frame content
- Vector embeddings for semantic search
- "Similar frames" suggestions when creating new ones
- Aggregate lessons learned across team

### Analytics (Future)

- Query index.db for team metrics
- Success rates by frame type
- Time-to-ready metrics
- Most common lessons learned

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target users | Engineering teams | Collaborative workflows, shared learning |
| Deployment | Self-hosted | Data control, privacy |
| Auth | PocketBase | Battle-tested, OAuth support, simple |
| Backend runtime | Python (FastAPI) | Agno support, flexibility |
| AI framework | Agno | Clean structure, good for agents |
| Storage | Files (Markdown + YAML) | Portable, AI-friendly, git-able |
| Version control | Single git repo | Simple backup, unified history |
| Database | SQLite index (cache only) | Fast queries, files are truth |
| Prompts | In template files | Customizable without code changes |
