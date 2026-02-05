# Users, Teams & Admin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user/team management via PocketBase, a Users menu in the left nav, reviewer/approver fields on frames with workflow enforcement, and an admin page for user/team CRUD.

**Architecture:** PocketBase stores users (existing) and teams (new collection). The Framer backend proxies user/team reads and enforces reviewer/approver assignment on frame status transitions. The frontend adds a Users space, assignment dropdowns in FrameDetail, and an `/admin` page that authenticates as PocketBase admin.

**Tech Stack:** PocketBase (auth + DB), FastAPI (backend proxy), Next.js + Zustand (frontend), Tailwind CSS + Lucide icons (UI)

---

### Task 1: PocketBase Migration - Teams Collection

**Files:**
- Create: `pocketbase/pb_migrations/1707062400_create_teams.js`

**Step 1: Create PocketBase migration for teams collection**

```js
// pocketbase/pb_migrations/1707062400_create_teams.js
migrate((app) => {
  const collection = new Collection({
    name: "teams",
    type: "base",
    schema: [
      {
        name: "name",
        type: "text",
        required: true,
        options: { min: 1, max: 100 },
      },
      {
        name: "description",
        type: "text",
        options: { max: 500 },
      },
    ],
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("teams");
  return app.delete(collection);
});
```

> **Note:** PocketBase migration syntax varies by version. The migration above follows the JS migration format. If the PocketBase version uses Go migrations or a different JS API, adapt accordingly. Alternatively, create the `teams` collection manually via the PocketBase Admin UI at `http://localhost:8090/_/`.

**Step 2: Create PocketBase migration for team_members collection**

Create: `pocketbase/pb_migrations/1707062401_create_team_members.js`

```js
migrate((app) => {
  const collection = new Collection({
    name: "team_members",
    type: "base",
    schema: [
      {
        name: "team",
        type: "relation",
        required: true,
        options: {
          collectionId: "teams",
          cascadeDelete: true,
        },
      },
      {
        name: "user",
        type: "relation",
        required: true,
        options: {
          collectionId: "users",
          cascadeDelete: true,
        },
      },
      {
        name: "role",
        type: "select",
        options: {
          values: ["tech_lead", "senior_engineer", "engineer", "manager"],
        },
      },
    ],
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("team_members");
  return app.delete(collection);
});
```

**Step 3: Commit**

```bash
git add pocketbase/pb_migrations/
git commit -m "feat: add PocketBase migrations for teams and team_members collections"
```

---

### Task 2: Backend - Add reviewer/approver to Frame model

**Files:**
- Modify: `src/backend/app/models/frame.py:35-104` (FrameMeta class)

**Step 1: Write test for reviewer/approver fields on FrameMeta**

Create: `tests/backend/unit/models/test_frame_reviewer.py`

```python
"""Tests for reviewer and approver fields on FrameMeta."""
import pytest
from app.models.frame import FrameMeta, FrameType, FrameStatus


def test_frame_meta_with_reviewer_and_approver():
    meta = FrameMeta(
        id="f-2026-02-04-abc123",
        type=FrameType.FEATURE,
        status=FrameStatus.DRAFT,
        owner="user1",
        reviewer="user2",
        approver="user3",
    )
    assert meta.reviewer == "user2"
    assert meta.approver == "user3"


def test_frame_meta_reviewer_optional():
    meta = FrameMeta(
        id="f-2026-02-04-abc123",
        type=FrameType.FEATURE,
        status=FrameStatus.DRAFT,
        owner="user1",
    )
    assert meta.reviewer is None
    assert meta.approver is None


def test_frame_meta_to_yaml_includes_reviewer():
    meta = FrameMeta(
        id="f-2026-02-04-abc123",
        type=FrameType.FEATURE,
        status=FrameStatus.DRAFT,
        owner="user1",
        reviewer="user2",
    )
    yaml_str = meta.to_yaml()
    assert "reviewer: user2" in yaml_str


def test_frame_meta_from_yaml_reads_reviewer():
    yaml_str = """
id: f-2026-02-04-abc123
type: feature
status: draft
owner: user1
reviewer: user2
approver: user3
created_at: '2026-02-04T00:00:00+00:00'
updated_at: '2026-02-04T00:00:00+00:00'
"""
    meta = FrameMeta.from_yaml(yaml_str)
    assert meta.reviewer == "user2"
    assert meta.approver == "user3"


def test_frame_meta_from_yaml_without_reviewer():
    yaml_str = """
id: f-2026-02-04-abc123
type: feature
status: draft
owner: user1
created_at: '2026-02-04T00:00:00+00:00'
updated_at: '2026-02-04T00:00:00+00:00'
"""
    meta = FrameMeta.from_yaml(yaml_str)
    assert meta.reviewer is None
    assert meta.approver is None
```

**Step 2: Run test to verify it fails**

```bash
cd /home/hongbozhou/projects/poc/framer && python -m pytest tests/backend/unit/models/test_frame_reviewer.py -v
```
Expected: FAIL - `reviewer` field not recognized

**Step 3: Add reviewer/approver fields to FrameMeta**

In `src/backend/app/models/frame.py`, add to FrameMeta class (after `owner` field, line 40):

```python
    reviewer: Optional[str] = None
    approver: Optional[str] = None
```

Update `to_yaml()` method (after line 67 `"owner": self.owner,`):

```python
        if self.reviewer:
            data["reviewer"] = self.reviewer
        if self.approver:
            data["approver"] = self.approver
```

Update `from_yaml()` method (in the return statement, after `owner=data["owner"]`):

```python
            reviewer=data.get("reviewer"),
            approver=data.get("approver"),
```

**Step 4: Run test to verify it passes**

```bash
cd /home/hongbozhou/projects/poc/framer && python -m pytest tests/backend/unit/models/test_frame_reviewer.py -v
```
Expected: PASS

**Step 5: Run all existing tests to verify no regressions**

```bash
cd /home/hongbozhou/projects/poc/framer && python -m pytest tests/backend/ -v
```
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/backend/app/models/frame.py tests/backend/unit/models/test_frame_reviewer.py
git commit -m "feat: add reviewer and approver fields to FrameMeta model"
```

---

### Task 3: Backend - Enforce reviewer/approver on status transitions

**Files:**
- Modify: `src/backend/app/services/frame_service.py:137-159` (update_frame_status)
- Modify: `src/backend/app/api/frames.py:27-30,182-196` (UpdateStatusRequest, update_status)

**Step 1: Write test for status transition enforcement**

Create: `tests/backend/unit/services/test_frame_status_enforcement.py`

```python
"""Tests for reviewer/approver enforcement on status transitions."""
import pytest
from pathlib import Path
import tempfile

from app.models.frame import FrameType, FrameStatus
from app.services.frame_service import FrameService


@pytest.fixture
def frame_service(tmp_path):
    service = FrameService(data_path=tmp_path)
    (tmp_path / "frames").mkdir(parents=True, exist_ok=True)
    return service


def test_transition_to_in_review_requires_reviewer(frame_service):
    frame = frame_service.create_frame(FrameType.FEATURE, "owner1")
    with pytest.raises(ValueError, match="reviewer"):
        frame_service.update_frame_status(frame.id, FrameStatus.IN_REVIEW)


def test_transition_to_in_review_with_reviewer_succeeds(frame_service):
    frame = frame_service.create_frame(FrameType.FEATURE, "owner1")
    frame_service.update_frame_meta(frame.id, reviewer="reviewer1")
    result = frame_service.update_frame_status(frame.id, FrameStatus.IN_REVIEW)
    assert result.status == FrameStatus.IN_REVIEW


def test_transition_to_ready_requires_approver(frame_service):
    frame = frame_service.create_frame(FrameType.FEATURE, "owner1")
    frame_service.update_frame_meta(frame.id, reviewer="reviewer1")
    frame_service.update_frame_status(frame.id, FrameStatus.IN_REVIEW)
    with pytest.raises(ValueError, match="approver"):
        frame_service.update_frame_status(frame.id, FrameStatus.READY)


def test_transition_to_ready_with_approver_succeeds(frame_service):
    frame = frame_service.create_frame(FrameType.FEATURE, "owner1")
    frame_service.update_frame_meta(frame.id, reviewer="reviewer1", approver="approver1")
    frame_service.update_frame_status(frame.id, FrameStatus.IN_REVIEW)
    result = frame_service.update_frame_status(frame.id, FrameStatus.READY)
    assert result.status == FrameStatus.READY
```

**Step 2: Run test to verify it fails**

```bash
cd /home/hongbozhou/projects/poc/framer && python -m pytest tests/backend/unit/services/test_frame_status_enforcement.py -v
```
Expected: FAIL - `update_frame_meta` method not found

**Step 3: Add update_frame_meta method and enforcement to FrameService**

In `src/backend/app/services/frame_service.py`, add a new method after `update_frame_content`:

```python
    def update_frame_meta(
        self,
        frame_id: str,
        reviewer: Optional[str] = None,
        approver: Optional[str] = None,
    ) -> Frame:
        """Update frame metadata (reviewer, approver)."""
        frame_dir = self._get_frame_dir(frame_id)

        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        meta_file = frame_dir / "meta.yaml"
        meta = FrameMeta.from_yaml(meta_file.read_text())

        if reviewer is not None:
            meta.reviewer = reviewer
        if approver is not None:
            meta.approver = approver

        meta.updated_at = datetime.now(timezone.utc)
        meta_file.write_text(meta.to_yaml())

        frame_file = frame_dir / "frame.md"
        content = FrameContent.from_markdown(frame_file.read_text())

        return Frame(meta=meta, content=content)
```

Modify `update_frame_status` to add enforcement before updating status:

```python
    def update_frame_status(self, frame_id: str, status: FrameStatus) -> Frame:
        """Update frame status with reviewer/approver enforcement."""
        frame_dir = self._get_frame_dir(frame_id)

        if not frame_dir.exists():
            raise FrameNotFoundError(f"Frame not found: {frame_id}")

        meta_file = frame_dir / "meta.yaml"
        meta = FrameMeta.from_yaml(meta_file.read_text())

        # Enforce reviewer/approver requirements
        if status == FrameStatus.IN_REVIEW and not meta.reviewer:
            raise ValueError("A reviewer must be assigned before submitting for review")
        if status == FrameStatus.READY and not meta.approver:
            raise ValueError("An approver must be assigned before marking as ready")

        meta.status = status
        meta.updated_at = datetime.now(timezone.utc)
        meta_file.write_text(meta.to_yaml())

        frame_file = frame_dir / "frame.md"
        content = FrameContent.from_markdown(frame_file.read_text())

        return Frame(meta=meta, content=content)
```

**Step 4: Update API layer to handle reviewer/approver**

In `src/backend/app/api/frames.py`:

Add to `CreateFrameRequest`:
```python
    reviewer: Optional[str] = None
    approver: Optional[str] = None
```

Add new request model:
```python
class UpdateMetaRequest(BaseModel):
    """Request body for updating frame metadata."""
    reviewer: Optional[str] = None
    approver: Optional[str] = None
```

Add `reviewer` and `approver` to `FrameResponse.from_frame()`:
```python
            meta={
                "created_at": frame.meta.created_at.isoformat(),
                "updated_at": frame.meta.updated_at.isoformat(),
                "ai_score": frame.meta.ai_score,
                "reviewer": frame.meta.reviewer,
                "approver": frame.meta.approver,
            }
```

Add `reviewer` and `approver` to `FrameListItem`:
```python
class FrameListItem(BaseModel):
    id: str
    type: str
    status: str
    owner: str
    reviewer: Optional[str] = None
    approver: Optional[str] = None
    updated_at: str
```

Add new endpoint in the router:
```python
    @router.patch("/{frame_id}/meta", dependencies=get_auth_dependencies())
    def update_meta(
        frame_id: str,
        request: UpdateMetaRequest,
        frame_service: FrameService = Depends(get_frame_service),
    ) -> FrameResponse:
        """Update frame metadata (reviewer, approver)."""
        try:
            frame = frame_service.update_frame_meta(
                frame_id,
                reviewer=request.reviewer,
                approver=request.approver,
            )
            return FrameResponse.from_frame(frame)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )
```

Update `update_status` to handle ValueError from enforcement:
```python
    @router.patch("/{frame_id}/status", dependencies=get_auth_dependencies())
    def update_status(
        frame_id: str,
        request: UpdateStatusRequest,
        frame_service: FrameService = Depends(get_frame_service),
    ) -> FrameResponse:
        try:
            frame = frame_service.update_frame_status(frame_id, request.status)
            return FrameResponse.from_frame(frame)
        except FrameNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Frame not found: {frame_id}",
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
```

Update `list_frames` to include reviewer/approver:
```python
        return [
            FrameListItem(
                id=f.id,
                type=f.type.value,
                status=f.status.value,
                owner=f.owner,
                reviewer=f.meta.reviewer,
                approver=f.meta.approver,
                updated_at=f.meta.updated_at.isoformat(),
            )
            for f in frames
        ]
```

**Step 5: Run tests**

```bash
cd /home/hongbozhou/projects/poc/framer && python -m pytest tests/backend/ -v
```
Expected: All PASS

**Step 6: Commit**

```bash
git add src/backend/app/services/frame_service.py src/backend/app/api/frames.py tests/backend/unit/services/test_frame_status_enforcement.py
git commit -m "feat: enforce reviewer/approver requirements on frame status transitions"
```

---

### Task 4: Backend - User/Team proxy API endpoints

**Files:**
- Create: `src/backend/app/api/users.py`
- Modify: `src/backend/app/main.py:70-86` (add users router)

**Step 1: Write test for user listing endpoint**

Create: `tests/backend/unit/api/test_users_api.py`

```python
"""Tests for user and team proxy API endpoints."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)


def test_list_users_endpoint_exists(client):
    """Users endpoint returns 200 (may be empty if PocketBase not running)."""
    with patch("app.api.users.fetch_users_from_pocketbase", new_callable=AsyncMock) as mock:
        mock.return_value = [
            {"id": "u1", "email": "alex@example.com", "name": "Alex", "role": "engineer", "avatar": "AC"},
        ]
        response = client.get("/api/users")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Alex"


def test_list_teams_endpoint_exists(client):
    """Teams endpoint returns 200."""
    with patch("app.api.users.fetch_teams_from_pocketbase", new_callable=AsyncMock) as mock:
        mock.return_value = [
            {"id": "t1", "name": "Engineering", "description": "Core team"},
        ]
        response = client.get("/api/teams")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Engineering"
```

**Step 2: Run test to verify it fails**

```bash
cd /home/hongbozhou/projects/poc/framer && python -m pytest tests/backend/unit/api/test_users_api.py -v
```
Expected: FAIL - module not found

**Step 3: Create users API router**

Create `src/backend/app/api/users.py`:

```python
"""
Users and Teams API endpoints.

Proxies requests to PocketBase for user and team management.
"""
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel


POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://localhost:8090")


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None


class TeamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None


class TeamMemberResponse(BaseModel):
    id: str
    team: str
    user: str
    role: Optional[str] = None


async def fetch_users_from_pocketbase() -> list[dict]:
    """Fetch all users from PocketBase."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{POCKETBASE_URL}/api/collections/users/records",
            params={"perPage": 200},
        )
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        return [
            {
                "id": item["id"],
                "email": item.get("email", ""),
                "name": item.get("name"),
                "role": item.get("role"),
                "avatar": item.get("avatar"),
            }
            for item in items
        ]


async def fetch_teams_from_pocketbase() -> list[dict]:
    """Fetch all teams from PocketBase."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{POCKETBASE_URL}/api/collections/teams/records",
            params={"perPage": 200},
        )
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        return [
            {
                "id": item["id"],
                "name": item.get("name", ""),
                "description": item.get("description"),
            }
            for item in items
        ]


async def fetch_team_members_from_pocketbase(team_id: Optional[str] = None) -> list[dict]:
    """Fetch team members from PocketBase."""
    async with httpx.AsyncClient() as client:
        params = {"perPage": 200}
        if team_id:
            params["filter"] = f'team="{team_id}"'
        response = await client.get(
            f"{POCKETBASE_URL}/api/collections/team_members/records",
            params=params,
        )
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        return [
            {
                "id": item["id"],
                "team": item.get("team", ""),
                "user": item.get("user", ""),
                "role": item.get("role"),
            }
            for item in items
        ]


def create_users_router() -> APIRouter:
    """Create the users/teams API router."""
    router = APIRouter()

    @router.get("/users", response_model=list[UserResponse])
    async def list_users():
        """List all users from PocketBase."""
        try:
            users = await fetch_users_from_pocketbase()
            return users
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch users from PocketBase: {e}",
            )

    @router.get("/teams", response_model=list[TeamResponse])
    async def list_teams():
        """List all teams from PocketBase."""
        try:
            teams = await fetch_teams_from_pocketbase()
            return teams
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch teams from PocketBase: {e}",
            )

    @router.get("/teams/{team_id}/members", response_model=list[TeamMemberResponse])
    async def list_team_members(team_id: str):
        """List members of a team."""
        try:
            members = await fetch_team_members_from_pocketbase(team_id)
            return members
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch team members from PocketBase: {e}",
            )

    return router
```

**Step 4: Register router in main.py**

In `src/backend/app/main.py`, add import:

```python
from app.api.users import create_users_router
```

Add after the ai router registration (line 85):

```python
    app.include_router(
        create_users_router(),
        prefix="/api",
        tags=["users"],
    )
```

**Step 5: Run tests**

```bash
cd /home/hongbozhou/projects/poc/framer && python -m pytest tests/backend/ -v
```
Expected: All PASS

**Step 6: Commit**

```bash
git add src/backend/app/api/users.py src/backend/app/main.py tests/backend/unit/api/test_users_api.py
git commit -m "feat: add user and team proxy API endpoints"
```

---

### Task 5: Frontend - Update types and API client

**Files:**
- Modify: `prototype/src/types/index.ts:79-98,122` (Frame interface, AppSpace type)
- Modify: `prototype/src/lib/api/client.ts:34-50,206-220` (FrameResponse, new methods)
- Modify: `prototype/src/lib/api/transforms.ts:28-80` (transformFrameResponse)

**Step 1: Update TypeScript types**

In `prototype/src/types/index.ts`:

Add to Frame interface (after `ownerId`, line 88):
```typescript
  reviewerId?: string;
  approverId?: string;
```

Add new types after Frame interface:
```typescript
export interface Team {
  id: string;
  name: string;
  description?: string;
}

export interface TeamMember {
  id: string;
  team: string;
  user: string;
  role?: string;
}
```

Update AppSpace type (line 122):
```typescript
export type AppSpace = 'working' | 'templates' | 'archive' | 'users';
```

**Step 2: Update API client**

In `prototype/src/lib/api/client.ts`:

Add to `FrameResponse.meta` (after `ai_score`):
```typescript
    reviewer: string | null;
    approver: string | null;
```

Add to `FrameListItem` (after `owner`):
```typescript
  reviewer: string | null;
  approver: string | null;
```

Add new method to `FramerAPIClient`:
```typescript
  // ==================== User/Team Endpoints ====================

  /**
   * List all users
   */
  async listUsers(): Promise<Array<{
    id: string;
    email: string;
    name: string | null;
    role: string | null;
    avatar: string | null;
  }>> {
    return this.request('/api/users');
  }

  /**
   * List all teams
   */
  async listTeams(): Promise<Array<{
    id: string;
    name: string;
    description: string | null;
  }>> {
    return this.request('/api/teams');
  }

  /**
   * List team members
   */
  async listTeamMembers(teamId: string): Promise<Array<{
    id: string;
    team: string;
    user: string;
    role: string | null;
  }>> {
    return this.request(`/api/teams/${teamId}/members`);
  }

  /**
   * Update frame metadata (reviewer, approver)
   */
  async updateFrameMeta(id: string, data: {
    reviewer?: string;
    approver?: string;
  }): Promise<FrameResponse> {
    return this.request<FrameResponse>(`/api/frames/${id}/meta`, {
      method: 'PATCH',
      body: data,
    });
  }
```

**Step 3: Update transforms**

In `prototype/src/lib/api/transforms.ts`, update `transformFrameResponse` to include reviewer/approver:

After `ownerId: response.owner,` add:
```typescript
    reviewerId: response.meta.reviewer ?? undefined,
    approverId: response.meta.approver ?? undefined,
```

**Step 4: Commit**

```bash
git add prototype/src/types/index.ts prototype/src/lib/api/client.ts prototype/src/lib/api/transforms.ts
git commit -m "feat: add reviewer/approver types and API client methods for users/teams"
```

---

### Task 6: Frontend - Update Zustand store with users loading

**Files:**
- Modify: `prototype/src/store/index.ts:10-69,71-591`

**Step 1: Add users loading and users space to store**

In `prototype/src/store/index.ts`:

Add to the `FrameStore` interface:
```typescript
  // Users
  loadUsers: () => Promise<void>;
  teamUsers: User[];
```

Add initial state in the store:
```typescript
      teamUsers: [],
```

Add `loadUsers` action:
```typescript
      loadUsers: async () => {
        if (!get().useAPI) return;

        try {
          const api = getAPIClient();
          const users = await api.listUsers();
          set({
            teamUsers: users.map((u) => ({
              id: u.id,
              name: u.name || u.email.split('@')[0],
              email: u.email,
              role: (u.role as User['role']) || 'engineer',
              avatar: u.avatar || undefined,
            })),
          });
        } catch (err) {
          console.warn('Failed to load users:', err);
        }
      },
```

Update `setCurrentSpace` to load users when switching to users space:
```typescript
      setCurrentSpace: (space) => {
        set({ currentSpace: space, selectedFrameId: null });
        if (space === 'users') {
          get().loadUsers();
        }
      },
```

**Step 2: Commit**

```bash
git add prototype/src/store/index.ts
git commit -m "feat: add user loading and users space to Zustand store"
```

---

### Task 7: Frontend - Add Users menu to LeftNav

**Files:**
- Modify: `prototype/src/components/layout/LeftNav.tsx:4,15-34`

**Step 1: Add Users nav item**

In `prototype/src/components/layout/LeftNav.tsx`:

Update import to add `Users` icon:
```typescript
import { Briefcase, FileText, Archive, Settings, LogIn, LogOut, User, Users } from 'lucide-react';
```

Add to `navItems` array (after the Archive item):
```typescript
  {
    id: 'users' as AppSpace,
    label: 'Users',
    icon: Users,
    description: 'Team members',
  },
```

**Step 2: Commit**

```bash
git add prototype/src/components/layout/LeftNav.tsx
git commit -m "feat: add Users menu item to left navigation"
```

---

### Task 8: Frontend - Create UsersListView component

**Files:**
- Create: `prototype/src/components/users/UsersListView.tsx`

**Step 1: Create the users list view component**

```tsx
'use client';

import React, { useEffect } from 'react';
import { useFrameStore } from '@/store';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export function UsersListView() {
  const { teamUsers, loadUsers, useAPI, isLoading } = useFrameStore();

  useEffect(() => {
    if (useAPI) {
      loadUsers();
    }
  }, [useAPI, loadUsers]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'tech_lead': return 'default';
      case 'senior_engineer': return 'default';
      case 'manager': return 'default';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'tech_lead': return 'Tech Lead';
      case 'senior_engineer': return 'Senior Engineer';
      case 'engineer': return 'Engineer';
      case 'manager': return 'Manager';
      default: return role;
    }
  };

  if (!useAPI) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium text-slate-700">Users</p>
          <p className="text-sm mt-1">Enable API mode to view team members</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <span className="text-sm text-slate-500">Loading users...</span>
      </div>
    );
  }

  if (teamUsers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium text-slate-700">No Users Found</p>
          <p className="text-sm mt-1">Add users through the admin page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
          <span className="text-sm text-slate-400">({teamUsers.length})</span>
        </div>

        <div className="space-y-2">
          {teamUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <Avatar
                initials={user.avatar || user.name.slice(0, 2).toUpperCase()}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add prototype/src/components/users/UsersListView.tsx
git commit -m "feat: add UsersListView component for team members display"
```

---

### Task 9: Frontend - Wire up Users space in page.tsx

**Files:**
- Modify: `prototype/src/app/page.tsx:9,231-262`

**Step 1: Add UsersListView to page routing**

In `prototype/src/app/page.tsx`:

Add import:
```typescript
import { UsersListView } from '@/components/users/UsersListView';
```

Update `renderSpaceContent()` to handle 'users' space:
```typescript
      case 'users':
        return <UsersListView />;
```

**Step 2: Commit**

```bash
git add prototype/src/app/page.tsx
git commit -m "feat: wire up Users space in main page routing"
```

---

### Task 10: Frontend - Add reviewer/approver dropdowns to FrameDetail

**Files:**
- Modify: `prototype/src/components/frame/FrameDetail.tsx:65-86,650-660`

**Step 1: Add assignment dropdowns in FrameDetail**

In `prototype/src/components/frame/FrameDetail.tsx`:

Add to store destructuring (line 74):
```typescript
    teamUsers,
    loadUsers,
    useAPI,
```

Add useEffect to load users:
```typescript
  useEffect(() => {
    if (useAPI) {
      loadUsers();
    }
  }, [useAPI, loadUsers]);
```

Add import for useEffect:
```typescript
import React, { useState, useEffect } from 'react';
```

Replace the "Owner & Date Info" section (around line 650-656) with:

```tsx
          {/* Assignment & Date Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Assignments
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Owner */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Owner
                </label>
                <p className="text-sm text-slate-700 font-medium">
                  {owner?.name || 'Unknown'}
                </p>
              </div>

              {/* Reviewer */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Reviewer
                </label>
                {isReadOnly ? (
                  <p className="text-sm text-slate-700">
                    {teamUsers.find(u => u.id === frame.reviewerId)?.name || 'Not assigned'}
                  </p>
                ) : (
                  <Select
                    value={frame.reviewerId || ''}
                    onValueChange={(v) => {
                      handleUpdateFrame({ reviewerId: v || undefined });
                      if (useAPI) {
                        const api = getAPIClient();
                        api.updateFrameMeta(frame.id, { reviewer: v });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select reviewer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamUsers
                        .filter(u => u.id !== frame.ownerId)
                        .map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Approver */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Approver
                </label>
                {isReadOnly ? (
                  <p className="text-sm text-slate-700">
                    {teamUsers.find(u => u.id === frame.approverId)?.name || 'Not assigned'}
                  </p>
                ) : (
                  <Select
                    value={frame.approverId || ''}
                    onValueChange={(v) => {
                      handleUpdateFrame({ approverId: v || undefined });
                      if (useAPI) {
                        const api = getAPIClient();
                        api.updateFrameMeta(frame.id, { approver: v });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select approver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamUsers
                        .filter(u => u.id !== frame.ownerId)
                        .map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              Last updated: {formatDate(frame.updatedAt)}
            </div>
          </div>
```

Add import for getAPIClient:
```typescript
import { getAPIClient } from '@/lib/api';
```

**Step 2: Commit**

```bash
git add prototype/src/components/frame/FrameDetail.tsx
git commit -m "feat: add reviewer/approver assignment dropdowns to FrameDetail"
```

---

### Task 11: Frontend - Show reviewer/approver on FrameCard

**Files:**
- Modify: `prototype/src/components/dashboard/FrameCard.tsx:10-13,36-46`

**Step 1: Update FrameCard to show assignments**

In `prototype/src/components/dashboard/FrameCard.tsx`:

Update props:
```typescript
interface FrameCardProps {
  frame: Frame;
  owner: User | undefined;
  reviewer: User | undefined;
  approver: User | undefined;
  onClick: () => void;
}
```

Update component signature:
```typescript
export function FrameCard({ frame, owner, reviewer, approver, onClick }: FrameCardProps) {
```

Update the footer section to show reviewer/approver avatars:
```tsx
        {/* Footer: Owner, Assignments & Score */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5" title={`Owner: ${owner?.name || 'Unknown'}`}>
              <Avatar
                initials={owner?.avatar || owner?.name.slice(0, 2).toUpperCase() || '??'}
                size="sm"
              />
            </div>
            {reviewer && (
              <div className="flex items-center gap-1" title={`Reviewer: ${reviewer.name}`}>
                <span className="text-[10px] text-slate-400">R:</span>
                <Avatar
                  initials={reviewer.avatar || reviewer.name.slice(0, 2).toUpperCase()}
                  size="sm"
                />
              </div>
            )}
            {approver && (
              <div className="flex items-center gap-1" title={`Approver: ${approver.name}`}>
                <span className="text-[10px] text-slate-400">A:</span>
                <Avatar
                  initials={approver.avatar || approver.name.slice(0, 2).toUpperCase()}
                  size="sm"
                />
              </div>
            )}
          </div>
          <ScoreIndicator score={frame.aiScore} />
        </div>
```

**Step 2: Update FrameCard usage in Dashboard and KanbanBoard**

Find all places where `<FrameCard>` is used and pass `reviewer` and `approver` props from the store's `getUser` or `teamUsers`.

In the parent component (Dashboard or KanbanBoard), update usage:
```tsx
<FrameCard
  frame={frame}
  owner={getUser(frame.ownerId)}
  reviewer={frame.reviewerId ? getUser(frame.reviewerId) : undefined}
  approver={frame.approverId ? getUser(frame.approverId) : undefined}
  onClick={() => onFrameClick(frame.id)}
/>
```

**Step 3: Commit**

```bash
git add prototype/src/components/dashboard/FrameCard.tsx prototype/src/components/dashboard/Dashboard.tsx prototype/src/components/dashboard/KanbanBoard.tsx
git commit -m "feat: display reviewer/approver avatars on FrameCard"
```

---

### Task 12: Frontend - Create Admin page

**Files:**
- Create: `prototype/src/components/admin/AdminPage.tsx`
- Modify: `prototype/src/app/page.tsx`

**Step 1: Create AdminPage component**

Create `prototype/src/components/admin/AdminPage.tsx`:

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Plus, Trash2, LogIn, UserPlus } from 'lucide-react';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';

interface PBUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  verified: boolean;
  created: string;
}

interface PBTeam {
  id: string;
  name: string;
  description?: string;
  created: string;
}

export function AdminPage() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [users, setUsers] = useState<PBUser[]>([]);
  const [teams, setTeams] = useState<PBTeam[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New user form
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('engineer');

  // New team form
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  const adminLogin = async () => {
    setLoginError(null);
    try {
      const response = await fetch(
        `${POCKETBASE_URL}/api/admins/auth-with-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: email, password }),
        }
      );

      if (!response.ok) {
        throw new Error('Invalid admin credentials');
      }

      const data = await response.json();
      setAdminToken(data.token);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const fetchUsers = async () => {
    if (!adminToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records?perPage=200`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const data = await response.json();
      setUsers(data.items || []);
    } catch {
      console.warn('Failed to fetch users');
    }
    setIsLoading(false);
  };

  const fetchTeams = async () => {
    if (!adminToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/teams/records?perPage=200`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const data = await response.json();
      setTeams(data.items || []);
    } catch {
      console.warn('Failed to fetch teams');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (adminToken) {
      fetchUsers();
      fetchTeams();
    }
  }, [adminToken]);

  const createUser = async () => {
    if (!adminToken) return;
    try {
      await fetch(
        `${POCKETBASE_URL}/api/collections/users/records`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            email: newUserEmail,
            password: newUserPassword,
            passwordConfirm: newUserPassword,
            name: newUserName,
            role: newUserRole,
          }),
        }
      );
      setShowNewUser(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('engineer');
      fetchUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!adminToken || !confirm('Delete this user?')) return;
    try {
      await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const createTeam = async () => {
    if (!adminToken) return;
    try {
      await fetch(
        `${POCKETBASE_URL}/api/collections/teams/records`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name: newTeamName,
            description: newTeamDescription,
          }),
        }
      );
      setShowNewTeam(false);
      setNewTeamName('');
      setNewTeamDescription('');
      fetchTeams();
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!adminToken || !confirm('Delete this team?')) return;
    try {
      await fetch(
        `${POCKETBASE_URL}/api/collections/teams/records/${teamId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      fetchTeams();
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };

  // Admin login form
  if (!adminToken) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-3 text-violet-500" />
            <h2 className="text-xl font-bold text-slate-900">Admin Login</h2>
            <p className="text-sm text-slate-500 mt-1">
              Sign in with PocketBase admin credentials
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adminLogin()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Enter admin password"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}
            <Button onClick={adminLogin} className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In as Admin
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-violet-500" />
            <h2 className="text-lg font-semibold text-slate-900">Administration</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAdminToken(null)}>
            Sign Out
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'teams'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Teams
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Users ({users.length})
              </h3>
              <Button size="sm" onClick={() => setShowNewUser(!showNewUser)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Add User
              </Button>
            </div>

            {/* New User Form */}
            {showNewUser && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="Min 8 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                    >
                      <option value="engineer">Engineer</option>
                      <option value="senior_engineer">Senior Engineer</option>
                      <option value="tech_lead">Tech Lead</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewUser(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={createUser} disabled={!newUserEmail || !newUserPassword}>
                    Create User
                  </Button>
                </div>
              </div>
            )}

            {/* User List */}
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
                  >
                    <Avatar
                      initials={user.name?.slice(0, 2).toUpperCase() || user.email[0].toUpperCase()}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {user.name || user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Badge variant={user.verified ? 'success' : 'outline'}>
                      {user.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                    {user.role && (
                      <Badge variant="default">
                        {user.role.replace('_', ' ')}
                      </Badge>
                    )}
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Teams ({teams.length})
              </h3>
              <Button size="sm" onClick={() => setShowNewTeam(!showNewTeam)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Team
              </Button>
            </div>

            {/* New Team Form */}
            {showNewTeam && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="Team name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={newTeamDescription}
                      onChange={(e) => setNewTeamDescription(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                      placeholder="Team description"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewTeam(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={createTeam} disabled={!newTeamName}>
                    Create Team
                  </Button>
                </div>
              </div>
            )}

            {/* Team List */}
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
                  >
                    <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{team.name}</p>
                      <p className="text-xs text-slate-500">{team.description || 'No description'}</p>
                    </div>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete team"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Add Admin nav item and route to page.tsx**

In `prototype/src/types/index.ts`, update AppSpace:
```typescript
export type AppSpace = 'working' | 'templates' | 'archive' | 'users' | 'admin';
```

In `prototype/src/components/layout/LeftNav.tsx`, add Admin nav item (in the bottom section, before Settings):
```tsx
        <div className="p-3">
          <button
            onClick={() => setCurrentSpace('admin')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              currentSpace === 'admin'
                ? 'bg-slate-800 text-white'
                : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
            )}
          >
            <Shield className="h-4.5 w-4.5 text-slate-500" />
            <span className="text-sm font-medium">Admin</span>
          </button>
        </div>
```

Add `Shield` to LeftNav imports:
```typescript
import { Briefcase, FileText, Archive, Settings, LogIn, LogOut, User, Users, Shield } from 'lucide-react';
```

In `prototype/src/app/page.tsx`, add to imports and routing:
```typescript
import { AdminPage } from '@/components/admin/AdminPage';
```

In `renderSpaceContent()`:
```typescript
      case 'admin':
        return <AdminPage />;
```

**Step 3: Commit**

```bash
git add prototype/src/components/admin/AdminPage.tsx prototype/src/components/layout/LeftNav.tsx prototype/src/app/page.tsx prototype/src/types/index.ts
git commit -m "feat: add Admin page with user/team management via PocketBase"
```

---

### Task 13: Backend - Update SQLite index for reviewer/approver

**Files:**
- Modify: `src/backend/app/services/index_service.py:34-45,61-82,143-183`

**Step 1: Add reviewer/approver columns to SQLite index**

In `src/backend/app/services/index_service.py`:

Update `create_index` table creation to add columns:
```sql
CREATE TABLE IF NOT EXISTS frames (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    owner TEXT NOT NULL,
    reviewer TEXT,
    approver TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    ai_score INTEGER,
    ai_evaluated_at TEXT
)
```

Add indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_frames_reviewer ON frames(reviewer)
CREATE INDEX IF NOT EXISTS idx_frames_approver ON frames(approver)
```

Update `index_frame` and `rebuild_index` INSERT statements to include `reviewer` and `approver` from `meta.reviewer` and `meta.approver`.

**Step 2: Run existing tests**

```bash
cd /home/hongbozhou/projects/poc/framer && python -m pytest tests/backend/ -v
```
Expected: All PASS

**Step 3: Commit**

```bash
git add src/backend/app/services/index_service.py
git commit -m "feat: add reviewer/approver columns to SQLite frame index"
```

---

### Task 14: Integration testing and final verification

**Step 1: Run all backend tests**

```bash
cd /home/hongbozhou/projects/poc/framer && python -m pytest tests/backend/ -v
```
Expected: All PASS

**Step 2: Verify no mock data references leaked into API-only paths**

```bash
cd /home/hongbozhou/projects/poc/framer && grep -r "mockUsers\|mockFrames" prototype/src/components/admin/ prototype/src/components/users/
```
Expected: No matches

**Step 3: Verify frontend builds successfully**

```bash
cd /home/hongbozhou/projects/poc/framer/prototype && npm run build
```
Expected: Build succeeds

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete users, teams & admin implementation"
```
