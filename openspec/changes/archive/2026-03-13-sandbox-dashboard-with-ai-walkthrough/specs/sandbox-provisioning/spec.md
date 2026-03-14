## ADDED Requirements

### Requirement: Provision a sandbox container from a scenario
The system SHALL create an isolated Docker container running the target app image when a user requests a sandbox for a given scenario. The system SHALL fetch the scenario's JSON config and base SQLite .db file from Supabase, mount the .db file into the container, pass the config as an environment variable, and expose the container on an available port in the range 8001–8050.

#### Scenario: Successful sandbox provisioning
- **WHEN** a user requests a sandbox for a valid scenario_id
- **THEN** the system creates a Docker container with the target app image, mounts the scenario's .db file at `/app/data/store.db`, sets `SCENARIO_CONFIG` environment variable with the scenario JSON, exposes the container on an available port, and returns a JSON response containing `sandbox_url` (e.g., `http://localhost:8024/`), `container_id`, and `port`

#### Scenario: No available ports
- **WHEN** a user requests a sandbox but all ports in range 8001–8050 are in use
- **THEN** the system returns an error response indicating no ports are available

#### Scenario: Invalid scenario ID
- **WHEN** a user requests a sandbox with a scenario_id that does not exist in Supabase
- **THEN** the system returns a 404 error with a descriptive message

### Requirement: Return fully-qualified sandbox URL
The system SHALL return the absolute, fully-qualified URL to the root of the new sandbox in the provisioning response. The URL format MUST be `http://localhost:<port>/` where `<port>` is the dynamically assigned port.

#### Scenario: URL format in response
- **WHEN** a sandbox is successfully provisioned on port 8024
- **THEN** the response JSON contains `{"sandbox_url": "http://localhost:8024/"}`

### Requirement: Track active containers
The system SHALL record active container metadata (container_id, scenario_id, port, sandbox_url, status, created_at) in the Supabase `active_containers` table upon successful provisioning.

#### Scenario: Container metadata persisted
- **WHEN** a sandbox container is successfully started
- **THEN** a row is inserted into `active_containers` with status `running` and the assigned port

### Requirement: Destroy a sandbox container
The system SHALL stop and remove a Docker container when a user requests sandbox destruction. The system SHALL free the port and remove the container's record from `active_containers`.

#### Scenario: Successful sandbox destruction
- **WHEN** a user requests destruction of an active sandbox by container_id
- **THEN** the system stops the Docker container, removes it, deletes the `active_containers` record, and returns a success response

#### Scenario: Destroy non-existent container
- **WHEN** a user requests destruction of a container_id that is not tracked
- **THEN** the system returns a 404 error

### Requirement: List active sandboxes
The system SHALL provide an endpoint to list all currently active sandbox containers with their metadata.

#### Scenario: List with active sandboxes
- **WHEN** a user requests the list of active sandboxes and 3 containers are running
- **THEN** the system returns an array of 3 container records with container_id, scenario_id, port, sandbox_url, status, and created_at

#### Scenario: List with no active sandboxes
- **WHEN** a user requests the list and no containers are running
- **THEN** the system returns an empty array

### Requirement: Label managed containers
The system SHALL apply the Docker label `sandbox-platform=true` to all containers it creates, enabling identification and bulk cleanup of managed containers.

#### Scenario: Container labeling
- **WHEN** a sandbox container is provisioned
- **THEN** the Docker container has the label `sandbox-platform=true`

### Requirement: Cleanup orphaned containers
The system SHALL provide an endpoint to stop and remove all Docker containers with the `sandbox-platform=true` label, clearing all `active_containers` records.

#### Scenario: Cleanup with orphaned containers
- **WHEN** a user triggers cleanup and 5 containers have the `sandbox-platform=true` label
- **THEN** all 5 containers are stopped and removed, and all `active_containers` records are deleted
