## 1. Backend: Database Schema

- [x] 1.1 Add `name` column to `active_containers` table — ALTER TABLE in `db.py` init, TEXT nullable default NULL, with IF NOT EXISTS guard
- [x] 1.2 Update `GET /api/sandboxes` response to include `name` field for each sandbox

## 2. Backend: PATCH Endpoints

- [x] 2.1 Add `PATCH /api/sandboxes/{container_id}` endpoint — accepts `{ name }`, updates `active_containers.name`, returns updated record, 404 if not found
- [x] 2.2 Add `PATCH /api/scenarios/{scenario_id}` endpoint — accepts `{ name, description }` (both optional), updates only provided fields, returns updated record, 404 if not found

## 3. Frontend: Edit Name Modal Component

- [x] 3.1 Create `EditNameModal` component (`components/ui/edit-name-modal.tsx`) — Promise-based pattern matching `useConfirm`, with text input(s), Save/Cancel buttons, Escape to close, warm brutalism styling (use frontend-design skill)
- [x] 3.2 Create `useEditName` hook — `editName({ currentName, title }) → Promise<string | null>`, returns new name or null if cancelled
- [x] 3.3 Create `useEditScenario` hook — `editScenario({ currentName, currentDescription, title }) → Promise<{ name, description } | null>`, variant with two fields for scenario editing

## 4. Frontend: Dashboard Page Integration

- [x] 4.1 Add pencil icon (from lucide-react) next to sandbox card names — visible on hover, clickable
- [x] 4.2 Wire pencil click to `useEditName` hook, send PATCH on confirm, update local sandbox state optimistically, revert on error
- [x] 4.3 Display custom sandbox name if set, fall back to `Sandbox :port` if name is null/empty

## 5. Frontend: Sandbox View Page Integration

- [x] 5.1 Add pencil icon next to sandbox name in the header — clickable, opens edit modal
- [x] 5.2 Wire to `useEditName` hook, send PATCH, update local state optimistically

## 6. Frontend: Scenarios Page Integration

- [x] 6.1 Add pencil icon next to scenario card names — visible on hover, clickable
- [x] 6.2 Wire pencil click to `useEditScenario` hook, send PATCH on confirm, update local scenario state optimistically, revert on error
