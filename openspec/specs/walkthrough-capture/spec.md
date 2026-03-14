## Purpose

Walkthrough capture handles saving the state of a sandbox container during interactive walkthroughs, extracting application data and creating new scenario records for replay.

## Requirements

### Requirement: Save walkthrough state to local storage
The `POST /api/sandboxes/{container_id}/save` endpoint SHALL extract the state directory from the container using the `data_path` configured on the app version associated with the sandbox, instead of a hardcoded `/app/data`. The endpoint SHALL look up the `app_version_id` from the active container record, then read the `data_path` from the `app_versions` table. If no `data_path` is found (legacy data), it SHALL fall back to `/app/data`. The endpoint SHALL save extracted files to the local filesystem at `data/scenario_files/walkthroughs/<uuid>` and create new scenario records. The endpoint SHALL also accept and persist an optional `walkthrough_steps` JSON array containing the captured interaction steps.

#### Scenario: Save walkthrough state with steps
- **WHEN** a client saves walkthrough state with a `walkthrough_steps` array in the request body
- **THEN** the .db file is extracted, saved to the local filesystem, a new scenario is created in local SQLite with `parent_scenario_id` and `walkthrough_steps`, and the container is destroyed

#### Scenario: Save walkthrough state without steps
- **WHEN** a client saves walkthrough state without providing `walkthrough_steps`
- **THEN** the behavior is unchanged — the scenario is created with `walkthrough_steps` set to NULL

#### Scenario: Save walkthrough state with custom data path
- **WHEN** a client saves walkthrough state for a sandbox whose app version has `data_path` set to `/app/state`
- **THEN** the system extracts the `/app/state` directory from the container, saves it to a local walkthrough directory, and creates a new scenario record

#### Scenario: Save walkthrough state with default data path
- **WHEN** a client saves walkthrough state for a sandbox whose app version has `data_path` set to `/app/data`
- **THEN** the system extracts the `/app/data` directory from the container (same as current behavior)

#### Scenario: Save walkthrough state for legacy version without data_path
- **WHEN** a client saves walkthrough state for a sandbox whose app version has no `data_path` value
- **THEN** the system falls back to extracting `/app/data` from the container

#### Scenario: Dynamic tar prefix stripping
- **WHEN** the system extracts a tar archive from container path `/app/state`
- **THEN** the tar entries are stripped of the leading `state/` prefix (the basename of the data path) so files land directly in the walkthrough directory

#### Scenario: Save failure recovery
- **WHEN** the file save or database write fails
- **THEN** the container is unpaused and an error is returned (behavior unchanged)
