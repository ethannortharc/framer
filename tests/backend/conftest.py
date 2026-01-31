"""
Pytest configuration and fixtures for Framer backend tests.
"""
import os
import sys
import tempfile
import shutil
from pathlib import Path
from typing import Generator

import pytest

# Add the backend source to Python path
backend_path = Path(__file__).parent.parent.parent / "src" / "backend"
sys.path.insert(0, str(backend_path))


@pytest.fixture
def temp_data_dir() -> Generator[Path, None, None]:
    """Create a temporary data directory for tests."""
    temp_dir = tempfile.mkdtemp(prefix="framer_test_")
    yield Path(temp_dir)
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def temp_data_dir_with_structure(temp_data_dir: Path) -> Path:
    """Create temp directory with standard Framer structure."""
    # Create standard directories
    (temp_data_dir / "frames").mkdir()
    (temp_data_dir / "templates").mkdir()
    (temp_data_dir / "config").mkdir()
    return temp_data_dir


@pytest.fixture
def sample_frame_content() -> str:
    """Sample frame.md content for testing."""
    return """---
id: f-2026-01-30-test123
type: bug
---

# Problem Statement

Test problem description.

## User Perspective

**User:** Test user

**Context:** Test context

**Journey:**
1. Step one
2. Step two

**Pain Points:**
- Pain point one

## Engineering Framing

**Principles:**
1. Principle one

**Non-goals:**
- Non-goal one

## Validation Thinking

**Success Signals:**
- Signal one

**Disconfirming Evidence:**
- Evidence one
"""


@pytest.fixture
def sample_meta_yaml() -> str:
    """Sample meta.yaml content for testing."""
    return """id: f-2026-01-30-test123
type: bug
status: draft
owner: user-001
created_at: 2026-01-30T10:00:00Z
updated_at: 2026-01-30T10:00:00Z
"""


@pytest.fixture
def sample_template_content() -> str:
    """Sample template.md content for testing."""
    return """---
name: Bug Fix
type: bug
description: Template for bug fix frames
---

# Problem Statement

Describe the bug clearly.

## User Perspective

Who is affected and how?

## Engineering Framing

Technical approach and constraints.

## Validation Thinking

How will we know it's fixed?
"""


@pytest.fixture
def sample_questionnaire_content() -> str:
    """Sample questionnaire.md content for testing."""
    return """# Bug Fix Questionnaire

## Problem Statement

### What is the bug?
<!-- Describe what's happening -->

### What should happen instead?
<!-- Describe expected behavior -->

## User Perspective

### Who is affected?
<!-- Describe the user -->

### How are they affected?
<!-- Describe the impact -->
"""
