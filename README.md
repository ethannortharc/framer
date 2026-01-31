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
cd prototype
npm run dev
```

Open http://localhost:3000 in your browser.

### Docker Deployment

```bash
# Production
docker-compose up -d

# Development (with hot reload)
docker-compose -f docker-compose.dev.yml up
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PocketBase Admin: http://localhost:8090/_/

## Project Structure

```
framer/
├── src/backend/              # FastAPI backend
│   └── app/
│       ├── api/              # REST endpoints
│       ├── agents/           # AI agents (evaluator, generator, refiner)
│       ├── auth/             # PocketBase authentication
│       ├── models/           # Pydantic data models
│       └── services/         # Business logic
│
├── prototype/                # Next.js frontend
│   └── src/
│       ├── app/              # Next.js app router
│       ├── components/       # React components
│       ├── contexts/         # React contexts (auth)
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # API client, utilities
│       ├── store/            # Zustand state management
│       └── types/            # TypeScript types
│
├── tests/
│   └── backend/              # Python pytest tests (156 tests)
│       ├── unit/             # Unit tests
│       └── integration/      # API integration tests
│
├── docker-compose.yml        # Production deployment
├── docker-compose.dev.yml    # Development environment
└── Makefile                  # Common commands
```

## Testing

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
make test-e2e

# Run with UI
cd prototype && npm run test:e2e:ui

# Run headed (visible browser)
cd prototype && npm run test:e2e:headed
```

**Test Suites**:
- `navigation.spec.ts` - Page navigation and settings
- `frames.spec.ts` - Frame CRUD operations
- `ai-features.spec.ts` - AI sidebar and assessment
- `auth.spec.ts` - Login/register flows

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

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
NEXT_PUBLIC_USE_API=false  # Set to 'true' for API mode
```

**Backend**:
```env
POCKETBASE_URL=http://localhost:8090
DATA_PATH=/data
```

### Mock vs API Mode

The frontend supports two modes:
- **Mock Mode** (default): Uses local mock data, no backend required
- **API Mode**: Connects to FastAPI backend

Toggle in Settings → Data Source.

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
