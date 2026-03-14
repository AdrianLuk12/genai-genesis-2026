## MODIFIED Requirements

### Requirement: Sandbox provisioning uses local storage
The `POST /api/sandboxes` endpoint SHALL read scenario data from local SQLite and download state files from the local filesystem instead of Supabase. Container records SHALL be stored in local SQLite. When mounting saved state into a container, the system SHALL use the `data_path` from the app version record as the container mount target, instead of hardcoded `/app/data`. If no `data_path` is found (legacy data), it SHALL fall back to `/app/data`.

#### Scenario: Provision with saved state directory and custom data path
- **WHEN** a sandbox is provisioned for a scenario with a `db_file_path` pointing to a directory, and the app version has `data_path` set to `/app/state`
- **THEN** the directory is copied and mounted into the container at `/app/state` with read-write access

#### Scenario: Provision with saved state directory and default data path
- **WHEN** a sandbox is provisioned for a scenario with a `db_file_path` pointing to a directory, and the app version has `data_path` set to `/app/data`
- **THEN** the directory is mounted into the container at `/app/data` (same as current behavior)

#### Scenario: Provision with legacy single .db file and custom data path
- **WHEN** a sandbox is provisioned for a scenario with a `db_file_path` pointing to a single file, and the app version has `data_path` set to `/app/state`
- **THEN** the file is copied and mounted into the container at `/app/state/store.db`

#### Scenario: Provision for legacy version without data_path
- **WHEN** a sandbox is provisioned for an app version that has no `data_path` value
- **THEN** the system falls back to mounting at `/app/data` (backward compatible)
