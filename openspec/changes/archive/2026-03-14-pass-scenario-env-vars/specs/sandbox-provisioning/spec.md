## ADDED Requirements

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

## MODIFIED Requirements

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
