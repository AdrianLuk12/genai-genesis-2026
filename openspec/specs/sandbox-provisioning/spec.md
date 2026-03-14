## Purpose

Sandbox provisioning manages the lifecycle of Docker containers used for testing, including creating containers from app version images, tracking active containers, and cleanup.

## Requirements

### Requirement: Sandbox provisioning uses local storage
The `POST /api/sandboxes` endpoint SHALL read scenario data from local SQLite and download state files from the local filesystem instead of Supabase. Container records SHALL be stored in local SQLite. When mounting saved state into a container, the system SHALL use the `data_path` from the app version record as the container mount target, instead of hardcoded `/app/data`. If no `data_path` is found (legacy data), it SHALL fall back to `/app/data`.

#### Scenario: Provision with local .db file
- **WHEN** a sandbox is provisioned for a scenario with a db_file_path
- **THEN** the .db file is read from `data/scenario_files/<db_file_path>` and mounted into the container

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

### Requirement: System provisions a sandbox container
The system SHALL create a Docker container for a sandbox using the Docker image associated with the scenario's app version. The system SHALL look up the scenario's `app_version_id`, retrieve the `docker_image_name` from the `app_versions` table, and use that image instead of a hardcoded image name. The container SHALL be labeled with `app_id` and `version_id` for tracking. The container SHALL receive individual environment variables from the scenario's `config_json.env` in addition to `SCENARIO_CONFIG`.

#### Scenario: Launch sandbox from app-versioned scenario
- **WHEN** user launches a sandbox from a scenario that belongs to app version "v1.0" with docker image "monkeylab-abc123-def456:latest"
- **THEN** the system creates a container using "monkeylab-abc123-def456:latest" as the image, with labels including the app_id and version_id

#### Scenario: Launch sandbox from scenario without app version (legacy)
- **WHEN** user launches a sandbox from a scenario that has no app_version_id (legacy data)
- **THEN** the system falls back to the TARGET_IMAGE environment variable as the Docker image name

#### Scenario: Launch sandbox with env vars and start_url
- **WHEN** user launches a sandbox from a scenario with `config_json` containing `{ "start_url": "/admin", "env": { "ROLE": "admin" } }`
- **THEN** the container receives `ROLE=admin` and `SCENARIO_CONFIG` as environment variables, and the API response includes `"start_url": "/admin"`

### Requirement: Sandbox container receives individual environment variables from scenario config
When launching a sandbox, the system SHALL extract each key-value pair from the scenario's `config_json.env` object and pass them as individual Docker environment variables to the container. The system SHALL continue to set `SCENARIO_CONFIG` with the full `config_json` blob for backward compatibility. If a key in `config_json.env` conflicts with `SCENARIO_CONFIG`, the system-set `SCENARIO_CONFIG` SHALL take precedence.

#### Scenario: Container receives individual env vars
- **WHEN** a sandbox is provisioned from a scenario with `config_json` containing `{ "env": { "API_KEY": "abc123", "DEBUG": "true" } }`
- **THEN** the Docker container is started with environment variables `API_KEY=abc123`, `DEBUG=true`, and `SCENARIO_CONFIG` containing the full config JSON

#### Scenario: Container with no env vars in config
- **WHEN** a sandbox is provisioned from a scenario with `config_json` containing `{}` or no `env` key
- **THEN** the Docker container is started with only `SCENARIO_CONFIG` set (no additional individual env vars)

#### Scenario: Legacy flat config format still works
- **WHEN** a sandbox is provisioned from a scenario with legacy `config_json` containing `{ "product_count": 25 }` (no `env` key)
- **THEN** the Docker container is started with `SCENARIO_CONFIG` containing the full config JSON and no individual env vars are injected

### Requirement: Sandbox creation API returns start_url
The `POST /api/sandboxes` response SHALL include a `start_url` field extracted from the scenario's `config_json.start_url`. If `start_url` is not present in the config, it SHALL default to `/`.

#### Scenario: Response includes configured start_url
- **WHEN** a sandbox is created from a scenario with `config_json` containing `{ "start_url": "/dashboard" }`
- **THEN** the API response includes `"start_url": "/dashboard"`

#### Scenario: Response defaults start_url to root
- **WHEN** a sandbox is created from a scenario with `config_json` containing `{}` (no start_url)
- **THEN** the API response includes `"start_url": "/"`

### Requirement: Sandbox records track app version
The `active_containers` table SHALL include `app_version_id` to track which app version a running sandbox belongs to.

#### Scenario: Active container includes app version
- **WHEN** a sandbox is created from an app-versioned scenario
- **THEN** the active_containers record includes the app_version_id from the scenario

### Requirement: Active containers tracked in local SQLite
The `GET /api/sandboxes`, `DELETE /api/sandboxes/{id}`, and `POST /api/cleanup` endpoints SHALL read from and write to the local SQLite active_containers table instead of Supabase.

#### Scenario: Cleanup clears local records
- **WHEN** a client sends `POST /api/cleanup`
- **THEN** all containers are stopped/removed and all records are deleted from the local SQLite active_containers table
