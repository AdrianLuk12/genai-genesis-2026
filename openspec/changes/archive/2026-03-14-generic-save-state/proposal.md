## Why

The save/extract state system hardcodes `/app/data` as the container path for state extraction and restoration. This assumes all target apps store their data in the same location, which isn't true for every app. Users need a way to specify where each app stores its persistent data so the platform can correctly save and restore state for any app. Additionally, the recruitment-management-app Dockerfile is missing `mkdir -p /app/data`, causing state save to fail.

## What Changes

- Add a `data_path` field to app versions so users can specify the container directory that holds persistent state (defaults to `/app/data`)
- Update the version upload API endpoint to accept and store `data_path`
- Update the version upload UI form with a data path input field
- Update save state (`POST /api/sandboxes/{container_id}/save`) to extract from the app version's configured `data_path` instead of hardcoded `/app/data`
- Update sandbox provisioning to mount saved state to the app version's configured `data_path` instead of hardcoded `/app/data`
- Fix recruitment-management-app Dockerfile to include `RUN mkdir -p /app/data`

## Capabilities

### New Capabilities

_(none — this change modifies existing capabilities)_

### Modified Capabilities

- `app-management`: Add `data_path` field to app versions (DB schema, API, and UI)
- `walkthrough-capture`: Extract state from the app version's configured `data_path` instead of hardcoded `/app/data`
- `sandbox-provisioning`: Mount saved state to the app version's configured `data_path` instead of hardcoded `/app/data`

## Impact

- **Database**: `app_versions` table gains a `data_path` column (with migration for existing rows defaulting to `/app/data`)
- **API**: `POST /api/apps/{app_id}/versions` accepts optional `data_path` form field; save and provision endpoints read `data_path` from version record
- **UI**: Version upload form adds a "Data Path" input field
- **Recruitment app**: Dockerfile gets `RUN mkdir -p /app/data` to match target-app-template convention
