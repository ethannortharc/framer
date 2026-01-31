# Framer TDD Implementation Plan

**Date:** 2026-01-30
**Approach:** Test-Driven Development (Red-Green-Refactor)

## Overview

This document outlines the TDD approach for building the Framer production system. Tests are written first, watched to fail, then minimal code is written to pass.

## Directory Structure

```
/framer
├── /src                    # Production code
│   ├── /backend           # Python FastAPI backend
│   │   ├── /app
│   │   │   ├── main.py
│   │   │   ├── /api
│   │   │   ├── /services
│   │   │   ├── /agents
│   │   │   ├── /models
│   │   │   ├── /auth
│   │   │   └── /config
│   │   ├── requirements.txt
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   │
│   └── /frontend          # React frontend
│       ├── /src
│       ├── package.json
│       └── Dockerfile
│
├── /tests                  # All tests
│   ├── /backend           # Python tests (pytest)
│   │   ├── /unit
│   │   │   ├── /services
│   │   │   ├── /models
│   │   │   └── /agents
│   │   ├── /integration
│   │   │   ├── /api
│   │   │   └── /auth
│   │   └── conftest.py
│   │
│   └── /frontend          # Frontend tests (vitest)
│       ├── /unit
│       └── /integration
│
├── /prototype             # Keep unchanged for comparison
└── /docs
```

## Phase 1: Backend Core Services (File-Based Storage)

The foundation - file operations, data models, and indexing.

### 1.1 Data Models (Pydantic)

**Test file:** `tests/backend/unit/models/test_frame.py`

| Test | Purpose |
|------|---------|
| `test_frame_model_creation` | Frame model validates required fields |
| `test_frame_status_enum` | Status only accepts valid values |
| `test_frame_id_format` | ID matches expected pattern |
| `test_frame_meta_defaults` | Meta has correct defaults |
| `test_frame_from_files` | Model parses from file content |
| `test_frame_to_files` | Model serializes to file format |

**Test file:** `tests/backend/unit/models/test_template.py`

| Test | Purpose |
|------|---------|
| `test_template_model_creation` | Template model validates fields |
| `test_template_sections_parsing` | Sections extracted from markdown |
| `test_template_prompts_loading` | Prompts loaded correctly |

### 1.2 Frame Service (File Operations)

**Test file:** `tests/backend/unit/services/test_frame_service.py`

| Test | Purpose |
|------|---------|
| `test_create_frame_directory` | Creates frame directory structure |
| `test_create_frame_writes_files` | Writes frame.md, meta.yaml |
| `test_read_frame_from_files` | Reads and parses frame files |
| `test_update_frame_content` | Updates frame.md correctly |
| `test_update_frame_status` | Updates status in meta.yaml |
| `test_delete_frame` | Removes frame directory |
| `test_list_frames` | Lists all frame directories |
| `test_frame_not_found_error` | Raises error for missing frame |
| `test_add_comment` | Appends to comments.json |
| `test_add_feedback` | Creates feedback.md |

### 1.3 Template Service

**Test file:** `tests/backend/unit/services/test_template_service.py`

| Test | Purpose |
|------|---------|
| `test_load_template` | Loads template from directory |
| `test_list_templates` | Lists available templates |
| `test_template_not_found` | Raises error for missing template |
| `test_parse_template_sections` | Extracts sections from template.md |
| `test_parse_questionnaire` | Parses questionnaire.md |
| `test_load_prompts` | Loads prompt files from /prompts |

### 1.4 Git Service

**Test file:** `tests/backend/unit/services/test_git_service.py`

| Test | Purpose |
|------|---------|
| `test_init_repo` | Initializes git repo if missing |
| `test_commit_changes` | Creates commit with message |
| `test_commit_includes_author` | Commit includes user info |
| `test_get_file_history` | Returns commit history for file |

### 1.5 Index Service (SQLite Cache)

**Test file:** `tests/backend/unit/services/test_index_service.py`

| Test | Purpose |
|------|---------|
| `test_create_index` | Creates SQLite database |
| `test_index_frame` | Adds frame to index |
| `test_query_by_status` | Filters frames by status |
| `test_query_by_owner` | Filters frames by owner |
| `test_rebuild_index` | Rebuilds index from files |
| `test_index_updates_on_change` | Updates when frame changes |

---

## Phase 2: API Layer

REST endpoints using FastAPI.

### 2.1 Frame Endpoints

**Test file:** `tests/backend/integration/api/test_frames_api.py`

| Test | Purpose |
|------|---------|
| `test_create_frame` | POST /api/frames creates frame |
| `test_get_frame` | GET /api/frames/:id returns frame |
| `test_list_frames` | GET /api/frames returns list |
| `test_update_frame` | PUT /api/frames/:id updates |
| `test_change_status` | PATCH /api/frames/:id/status |
| `test_add_comment` | POST /api/frames/:id/comments |
| `test_unauthorized_access` | Returns 401 without token |
| `test_frame_not_found` | Returns 404 for missing |

### 2.2 Template Endpoints

**Test file:** `tests/backend/integration/api/test_templates_api.py`

| Test | Purpose |
|------|---------|
| `test_list_templates` | GET /api/templates returns list |
| `test_get_template` | GET /api/templates/:type returns template |

---

## Phase 3: Authentication

PocketBase integration for auth.

### 3.1 Auth Service

**Test file:** `tests/backend/integration/auth/test_pocketbase_auth.py`

| Test | Purpose |
|------|---------|
| `test_validate_valid_token` | Returns user for valid JWT |
| `test_reject_invalid_token` | Raises error for invalid JWT |
| `test_reject_expired_token` | Raises error for expired JWT |
| `test_get_current_user` | Dependency returns user info |

---

## Phase 4: AI Integration

Agno agents for AI features.

### 4.1 Evaluator Agent

**Test file:** `tests/backend/unit/agents/test_evaluator.py`

| Test | Purpose |
|------|---------|
| `test_evaluate_returns_score` | Returns score and breakdown |
| `test_evaluate_uses_template_prompt` | Uses correct prompt template |
| `test_score_ranges_valid` | Scores within expected ranges |
| `test_stores_evaluation_in_meta` | Updates meta.yaml |

### 4.2 Generator Agent

**Test file:** `tests/backend/unit/agents/test_generator.py`

| Test | Purpose |
|------|---------|
| `test_generate_section` | Generates content from Q&A |
| `test_uses_section_prompt` | Uses correct prompt |

### 4.3 Refiner Agent

**Test file:** `tests/backend/unit/agents/test_refiner.py`

| Test | Purpose |
|------|---------|
| `test_refine_content` | Improves content per instruction |
| `test_maintains_structure` | Keeps section structure |

### 4.4 AI Endpoints

**Test file:** `tests/backend/integration/api/test_ai_api.py`

| Test | Purpose |
|------|---------|
| `test_evaluate_frame` | POST /api/frames/:id/ai/evaluate |
| `test_generate_content` | POST /api/frames/:id/ai/generate |
| `test_chat_endpoint` | POST /api/ai/chat |

---

## Phase 5: Frontend (Future)

Frontend tests with Vitest and React Testing Library.

---

## Implementation Order

Following dependencies and TDD principles:

1. **Models** - No dependencies, pure data validation
2. **Frame Service** - Depends on models
3. **Template Service** - Depends on models
4. **Index Service** - Depends on models
5. **Git Service** - Standalone
6. **Auth Service** - Integration with PocketBase
7. **API Endpoints** - Depends on all services
8. **AI Agents** - Depends on services + external API
9. **Frontend** - Depends on API being stable

## Test Commands

```bash
# Run all backend tests
cd /home/hongbozhou/projects/poc/framer
pytest tests/backend -v

# Run specific test file
pytest tests/backend/unit/models/test_frame.py -v

# Run with coverage
pytest tests/backend --cov=src/backend --cov-report=html
```

## TDD Checklist Per Test

For each test:
- [ ] Write the test
- [ ] Run test, watch it FAIL
- [ ] Write minimal code to pass
- [ ] Run test, watch it PASS
- [ ] Refactor if needed
- [ ] Verify all tests still pass
