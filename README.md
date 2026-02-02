# Framer

**AI-Assisted Pre-Development Thinking Framework**

Framer is a structured thinking tool that helps engineering teams frame problems before writing code. It combines a guided workflow with AI assistance to ensure thorough problem understanding, user perspective consideration, and validation planning.

## Why Framer?

Before jumping into code, developers often miss crucial context:
- **Who** is affected by this problem?
- **What** are we explicitly *not* doing?
- **How** will we know if we succeeded?

Framer provides a structured framework to capture this thinking, with AI assistance to identify gaps and suggest improvements.

## Key Features

### Structured Frames
Each frame captures four dimensions of pre-development thinking:

| Section | Purpose |
|---------|---------|
| **Problem Statement** | Clear, focused description of what needs solving |
| **User Perspective** | Who experiences this, their journey, and pain points |
| **Engineering Framing** | Technical principles and explicit non-goals |
| **Validation Thinking** | Success signals and disconfirming evidence |

### AI-Powered Assistance
- **Frame Assessment**: AI scores frame quality and identifies gaps
- **Content Generation**: Questionnaire-driven content creation
- **Refinement Chat**: Conversational content improvement
- **Contextual Suggestions**: Section-specific guidance

### Workflow Management
- **Kanban Board**: Visual status tracking (Draft → In Review → Ready → Feedback → Archived)
- **Frame Types**: Bug Fix, Feature, Exploration templates
- **Comments & Feedback**: Collaborative review process
- **Version History**: Git-backed change tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  React + Zustand + Tailwind + Radix UI                      │
├─────────────────────────────────────────────────────────────┤
│                    Backend (FastAPI)                         │
│  REST API + AI Agents + File-based Storage                  │
├─────────────────────────────────────────────────────────────┤
│                   PocketBase (Auth)                          │
│  User Authentication + Session Management                    │
└─────────────────────────────────────────────────────────────┘
```

### Backend Services
- **FrameService**: CRUD operations with JSON file storage
- **TemplateService**: YAML-based frame templates with prompts
- **GitService**: Automatic version control for all changes
- **IndexService**: SQLite cache for fast queries

### AI Agents
- **EvaluatorAgent**: Scores frames and provides detailed feedback
- **GeneratorAgent**: Creates content from questionnaire answers
- **RefinerAgent**: Improves content through conversation

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ethannortharc/framer.git
cd framer

# Install dependencies
make install

# Start development servers
make dev
```

Or start each service individually:

```bash
# Terminal 1: Backend
cd src/backend
uvicorn app.main:get_app --reload --port 8000

# Terminal 2: Frontend
cd src/frontend
npm run dev
```

Open http://localhost:3000 in your browser.

### Docker Deployment

The project supports multi-environment deployment via configuration files.

```bash
# Using the helper script (recommended)
./scripts/docker.sh dev up      # Development
./scripts/docker.sh qa up       # QA/Staging
./scripts/docker.sh prod up     # Production

# Or manually with env file
docker compose --env-file config/.env.dev up -d

# Stop services
./scripts/docker.sh dev down
```

**Environment Configuration** (`config/` directory):
- `.env.common` - Shared settings across all environments
- `.env.dev` - Development (ports 3000, 8000, 8090)
- `.env.qa` - QA/Staging (ports 3001, 8001, 8091)
- `.env.prod` - Production (ports 80, 8000, 8090)

Services:
- Frontend: http://localhost:3000 (dev)
- Backend API: http://localhost:8000
- PocketBase Admin: http://localhost:8090/_/

## Project Structure

```
framer/
├── src/
│   ├── backend/              # FastAPI backend
│   │   └── app/
│   │       ├── api/          # REST endpoints
│   │       ├── agents/       # AI agents (evaluator, generator, refiner)
│   │       ├── auth/         # PocketBase authentication
│   │       ├── models/       # Pydantic data models
│   │       └── services/     # Business logic
│   │
│   └── frontend/             # Next.js production frontend
│       └── src/
│           ├── app/          # Next.js app router (login, dashboard, frame)
│           ├── components/   # React components (ui, layout, dashboard, frame)
│           ├── contexts/     # React contexts (AuthContext)
│           ├── lib/          # API client, auth, utilities
│           ├── store/        # Zustand state management
│           └── types/        # TypeScript types
│
├── tests/
│   └── backend/              # Python pytest tests (156 tests)
│       ├── unit/             # Unit tests
│       └── integration/      # API integration tests
│
├── config/                   # Environment configuration
│   ├── .env.common           # Shared settings
│   ├── .env.dev              # Development
│   ├── .env.qa               # QA/Staging
│   └── .env.prod             # Production
│
├── scripts/                  # Helper scripts
│   └── docker.sh             # Multi-environment Docker management
│
├── docker-compose.yml        # Docker Compose configuration
└── Makefile                  # Common commands
```

## Testing

**Total: 202 tests (156 backend + 46 E2E)**

### Backend Tests (pytest)

```bash
# Run all backend tests
make test-backend

# Or directly
python -m pytest tests/backend/ -v
```

**Coverage**: 156 tests across models, services, API endpoints, and AI agents.

### E2E Tests (Playwright)

```bash
# Run E2E tests
cd src/frontend && npm run test:e2e

# Run with UI
cd src/frontend && npm run test:e2e:ui

# Run headed (visible browser)
cd src/frontend && npm run test:e2e:headed

# Debug mode
cd src/frontend && npm run test:e2e:debug
```

**Test Suites** (46 tests):
| Suite | Tests | Coverage |
|-------|-------|----------|
| `auth.spec.ts` | 9 | Login/register flows, validation, sign out |
| `navigation.spec.ts` | 7 | Sidebar navigation, active states, modals |
| `frames.spec.ts` | 19 | CRUD operations, kanban board, checklist |
| `ai-features.spec.ts` | 11 | AI sidebar, guidance system, templates |

## API Reference

### Frames API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/frames` | List all frames |
| POST | `/api/frames` | Create a frame |
| GET | `/api/frames/{id}` | Get frame by ID |
| PUT | `/api/frames/{id}` | Update frame content |
| PATCH | `/api/frames/{id}/status` | Update frame status |
| DELETE | `/api/frames/{id}` | Delete a frame |

### AI API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/evaluate` | Evaluate frame quality |
| POST | `/api/ai/generate` | Generate content from answers |
| POST | `/api/ai/chat` | Chat for content refinement |

### Templates API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List all templates |
| GET | `/api/templates/{id}` | Get template by ID |

## Configuration

### Environment Variables

Configuration files are stored in `config/` directory. Each environment has its own `.env` file.

**Frontend**:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```

**Backend**:
```env
POCKETBASE_URL=http://localhost:8090
CORS_ORIGINS=http://localhost:3000
DATA_PATH=/data
```

**Docker Compose** (via `config/.env.*`):
```env
# Ports
POCKETBASE_PORT=8090
BACKEND_PORT=8000
FRONTEND_PORT=3000

# CORS
BACKEND_CORS_ORIGINS=http://localhost:3000

# API URLs (used at build time)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```

## Frame Templates

Templates define the structure and AI prompts for each frame type:

```yaml
# templates/bug-fix/meta.yaml
id: bug-fix
name: Bug Fix
description: Template for fixing bugs
type: bug

sections:
  - id: problem
    name: Problem Statement
    required: true
  - id: user
    name: User Perspective
    required: true
  # ...

prompt_templates:
  evaluation: |
    Evaluate this bug fix frame for completeness...
  generation: |
    Generate content based on these answers...
```

## Development

### Makefile Commands

```bash
make help           # Show all commands
make install        # Install dependencies
make dev            # Start dev servers
make test           # Run all tests
make test-backend   # Backend tests only
make test-e2e       # E2E tests only
make build          # Build frontend
make docker-up      # Start Docker services
make docker-down    # Stop Docker services
make clean          # Remove build artifacts
```

### Adding a New Frame Type

1. Create template directory: `src/backend/data/templates/{type}/`
2. Add `meta.yaml` with sections and prompts
3. Add `questionnaire.md` for guided input
4. The template will be automatically available

## Tech Stack

**Frontend**:
- Next.js 16 (App Router)
- React 19
- TypeScript
- Zustand (state management)
- Tailwind CSS v4
- Radix UI (accessible components)
- Playwright (E2E testing)

**Backend**:
- Python 3.12
- FastAPI
- Pydantic v2
- GitPython
- SQLite (indexing)
- pytest

**Infrastructure**:
- Docker & Docker Compose
- PocketBase (authentication)

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `make test` to verify
5. Submit a pull request

---

Built with the belief that better thinking leads to better code.
