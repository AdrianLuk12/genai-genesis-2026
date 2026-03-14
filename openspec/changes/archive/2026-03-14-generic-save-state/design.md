## Context

The platform currently hardcodes `/app/data` as the container path for both extracting state (save walkthrough) and restoring state (sandbox provisioning). This works for the target-app-template which stores its SQLite database at `/app/data/store.db`, but breaks for apps that use different data directories. The `app_versions` table has no way to record where an app stores its persistent data.

Additionally, the recruitment-management-app Dockerfile doesn't create `/app/data`, so even the default path fails.

## Goals / Non-Goals

**Goals:**
- Allow each app version to declare its data directory path
- Use that path for state save/restore instead of hardcoded `/app/data`
- Default to `/app/data` for backward compatibility with existing versions
- Fix recruitment-management-app Dockerfile

**Non-Goals:**
- Supporting multiple data directories per app version
- Changing how state files are stored on the host side (scenario_files layout stays the same)
- Validating the data path exists inside the container at upload time

## Decisions

### 1. Add `data_path` column to `app_versions` table
**Choice**: Add a nullable `data_path TEXT` column defaulting to `/app/data`.
**Rationale**: Keeps it simple — one column, one migration. Existing rows get the default, preserving current behavior. The path is per-version since different versions of the same app could restructure their data directory.

### 2. Accept `data_path` as a form field during version upload
**Choice**: Add `data_path` as an optional form field to `POST /api/apps/{app_id}/versions` (alongside `file` and `version_tag`).
**Rationale**: The data path is a property of the app image, so it makes sense to specify at upload time. Form field (not JSON body) because this endpoint already uses multipart form for file upload.

### 3. Look up `data_path` via `app_version_id` in save/provision flows
**Choice**: In both the save endpoint and sandbox provisioning, look up the app version's `data_path` from the `app_versions` table using the `app_version_id` already tracked on the scenario/container.
**Rationale**: The `app_version_id` is already threaded through scenarios and active containers. No new joins needed — just read one more column from the existing version lookup.

### 4. Tar stripping uses the directory basename
**Choice**: When extracting the tar from `container.get_archive(data_path)`, strip the leading directory name dynamically (the basename of the data path) instead of hardcoded `"data/"`.
**Rationale**: Docker's `get_archive` returns a tar with the target directory as the root entry. If the path is `/app/data`, the tar root is `data/`. If it's `/app/state`, the tar root is `state/`. Must strip dynamically.

## Risks / Trade-offs

- **Invalid data path** → The save will fail at `container.get_archive()` with a Docker API error. This is acceptable — the error message is clear enough, and validating path existence at upload time would require running a container just to check.
- **Migration on existing DB** → Adding a column with a default is safe for both SQLite and Db2. No data migration needed.
- **Trailing slash ambiguity** → Normalize by stripping trailing slashes before storing. The path `/app/data/` and `/app/data` should be treated identically.
