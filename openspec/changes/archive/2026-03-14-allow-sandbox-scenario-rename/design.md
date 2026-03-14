## Context

The control panel is a Next.js 16 frontend + FastAPI backend with local SQLite. Sandboxes are tracked in `active_containers` (no `name` column currently). Scenarios have a `name` column. The UI uses a "warm brutalism" design system (Syne display font, boxy zero-radius, warm earthy palette, backdrop blurs, staggered animations). A custom `useConfirm` modal already exists as a pattern for Promise-based UI interactions.

## Goals / Non-Goals

**Goals:**
- Let users rename sandbox instances with a custom display name
- Let users rename scenario name and description inline
- Provide a smooth, on-brand edit UX (click-to-edit pattern with a small modal/popover)
- Add backend PATCH endpoints for both resources

**Non-Goals:**
- Bulk rename operations
- Rename history/audit trail
- Renaming while a sandbox is being provisioned
- Editing scenario config_json inline (out of scope)

## Decisions

### 1. Inline edit via modal (not contentEditable)

**Decision**: Use a small edit modal triggered by clicking the name, rather than inline contentEditable or input swapping.

**Why?** ContentEditable is fragile across browsers and hard to style consistently. Input swapping causes layout shifts. A small focused modal (similar to the existing confirm modal pattern) provides a clean, predictable UX that matches the boxy design language. It also keeps the interaction explicit — click to edit, type, confirm.

**Implementation**: Create an `EditNameModal` component with a text input, pre-filled with the current name. Trigger it via a pencil icon or by clicking the name. Use the same Promise-based pattern as `useConfirm`.

### 2. Sandbox name stored in `active_containers.name`

**Decision**: Add a nullable `name` column to `active_containers`. If null/empty, the UI falls back to displaying `:port`.

**Why?** Storing the name in the database means it persists across page reloads. A nullable column avoids a migration for existing rows — they just show the port fallback. The `name` column is purely a display label with no functional impact.

### 3. PATCH endpoints for partial updates

**Decision**: Add `PATCH /api/sandboxes/{container_id}` accepting `{ name }` and `PATCH /api/scenarios/{scenario_id}` accepting `{ name, description }`.

**Why?** PATCH communicates partial update semantics. PUT would imply replacing the entire resource which is overkill for a rename. Keeping the body simple (`name` and optionally `description`) minimizes risk.

### 4. Edit trigger: pencil icon on hover

**Decision**: Show a small pencil icon next to names on hover. Clicking it (or clicking the name directly) opens the edit modal. The icon uses the `muted-foreground` color and transitions to `foreground` on hover.

**Why?** A hover-revealed icon signals editability without cluttering the default view. This is a well-understood UX pattern. The icon is always keyboard-accessible via tab.

### 5. Optimistic UI updates

**Decision**: Update the name in local state immediately on confirm, then send the PATCH request. Revert on error.

**Why?** The rename is a low-risk operation. Optimistic updates make the UI feel instant. If the API fails, revert and show an error via the status message pattern already in use.

## Risks / Trade-offs

- **SQLite column addition**: Adding `name` to `active_containers` requires an `ALTER TABLE`. SQLite supports this natively. Since this is a local dev database, no migration tooling needed — just run ALTER on startup if column doesn't exist.
- **Name collisions**: Multiple sandboxes could have the same name. This is acceptable — names are display labels, not identifiers. The container ID remains the unique key.
- **Empty name handling**: If user clears the name field and confirms, treat it as "remove custom name" and fall back to `:port` display.
