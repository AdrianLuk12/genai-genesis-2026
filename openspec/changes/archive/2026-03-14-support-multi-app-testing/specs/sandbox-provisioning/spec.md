## MODIFIED Requirements

### Requirement: System provisions a sandbox container
The system SHALL create a Docker container for a sandbox using the Docker image associated with the scenario's app version. The system SHALL look up the scenario's `app_version_id`, retrieve the `docker_image_name` from the `app_versions` table, and use that image instead of a hardcoded image name. The container SHALL be labeled with `app_id` and `version_id` for tracking.

#### Scenario: Launch sandbox from app-versioned scenario
- **WHEN** user launches a sandbox from a scenario that belongs to app version "v1.0" with docker image "monkeylab-abc123-def456:latest"
- **THEN** the system creates a container using "monkeylab-abc123-def456:latest" as the image, with labels including the app_id and version_id

#### Scenario: Launch sandbox from scenario without app version (legacy)
- **WHEN** user launches a sandbox from a scenario that has no app_version_id (legacy data)
- **THEN** the system falls back to the TARGET_IMAGE environment variable as the Docker image name

### Requirement: Sandbox records track app version
The `active_containers` table SHALL include `app_version_id` to track which app version a running sandbox belongs to.

#### Scenario: Active container includes app version
- **WHEN** a sandbox is created from an app-versioned scenario
- **THEN** the active_containers record includes the app_version_id from the scenario
