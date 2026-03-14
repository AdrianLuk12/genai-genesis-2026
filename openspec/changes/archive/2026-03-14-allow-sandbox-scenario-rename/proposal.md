## Why

Sandboxes are identified only by port number (`:3001`) and scenarios only by their creation-time name. Users cannot rename either after creation, making it hard to organize and identify resources — especially when running multiple sandboxes or iterating on scenarios from walkthroughs.

## What Changes

- **Sandbox rename**: Add ability to give a sandbox a custom display name (stored in `active_containers` table, shown in UI instead of just `:port`)
- **Scenario rename**: Add ability to rename an existing scenario's name and description via inline editing
- **API endpoints**: Add `PATCH /api/sandboxes/{container_id}` and `PATCH /api/scenarios/{scenario_id}` for partial updates
- **Inline edit UI**: Click-to-edit pattern on sandbox and scenario names throughout the control panel, using a custom modal/popover matching the warm brutalism design system

## Capabilities

### New Capabilities
- `resource-rename`: Covers the rename/edit UX pattern — inline click-to-edit for names, custom edit modal, and the API integration for persisting renames

### Modified Capabilities
- `control-panel-ui`: Dashboard and sandbox view show editable sandbox names; scenario page shows editable scenario names
- `scenario-management`: Add PATCH endpoint for updating scenario name/description
- `control-panel-api`: Add PATCH endpoint for updating sandbox display name; add `name` column to `active_containers`

## Impact

- **Backend**: New `name` column on `active_containers` table, two new PATCH endpoints in `main.py`
- **Frontend**: Editable name components on dashboard cards, sandbox view header, and scenario cards
- **Database**: Schema migration (add column) — acceptable since local SQLite, no production data
- **No breaking changes**: Existing GET endpoints return additional `name` field (additive)
