## ADDED Requirements

### Requirement: REST API for sandbox provisioning
The API SHALL expose `POST /api/sandboxes` to provision a new sandbox container. The request body SHALL accept `scenario_id` (required). The response SHALL include `sandbox_url`, `container_id`, `port`, and `scenario_id`.

#### Scenario: Provision sandbox endpoint
- **WHEN** a client sends `POST /api/sandboxes` with `{"scenario_id": "abc123"}`
- **THEN** the API provisions a Docker container and returns `{"sandbox_url": "http://localhost:8024/", "container_id": "...", "port": 8024, "scenario_id": "abc123"}`

### Requirement: REST API for sandbox destruction
The API SHALL expose `DELETE /api/sandboxes/{container_id}` to destroy a specific sandbox container.

#### Scenario: Destroy sandbox endpoint
- **WHEN** a client sends `DELETE /api/sandboxes/abc123`
- **THEN** the API stops and removes the container and returns 200 with a success message

### Requirement: REST API for listing active sandboxes
The API SHALL expose `GET /api/sandboxes` to list all active sandbox containers.

#### Scenario: List sandboxes endpoint
- **WHEN** a client sends `GET /api/sandboxes`
- **THEN** the API returns an array of active sandbox records with container_id, scenario_id, port, sandbox_url, status, and created_at

### Requirement: REST API for walkthrough state capture
The API SHALL expose `POST /api/sandboxes/{container_id}/save` to save the walkthrough state of an active sandbox. The request body MAY include `name` and `description` for the new scenario.

#### Scenario: Save walkthrough state endpoint
- **WHEN** a client sends `POST /api/sandboxes/abc123/save` with `{"name": "My Walkthrough", "description": "After checkout flow"}`
- **THEN** the API pauses the container, extracts the .db file, uploads to Supabase, creates a new scenario, destroys the container, and returns the new scenario metadata

### Requirement: REST API for scenario management
The API SHALL expose CRUD endpoints for scenario templates:
- `GET /api/scenarios` — list all scenarios
- `GET /api/scenarios/{id}` — get a single scenario
- `POST /api/scenarios` — create a new scenario
- `DELETE /api/scenarios/{id}` — delete a scenario

#### Scenario: List scenarios endpoint
- **WHEN** a client sends `GET /api/scenarios`
- **THEN** the API returns an array of all scenario records

#### Scenario: Create scenario endpoint
- **WHEN** a client sends `POST /api/scenarios` with `{"name": "Test", "description": "A test", "config_json": {"product_count": 10}}`
- **THEN** the API creates the scenario in Supabase and returns the created record

#### Scenario: Get scenario endpoint
- **WHEN** a client sends `GET /api/scenarios/abc123`
- **THEN** the API returns the full scenario record

#### Scenario: Delete scenario endpoint
- **WHEN** a client sends `DELETE /api/scenarios/abc123`
- **THEN** the API deletes the scenario and associated .db file and returns 200

### Requirement: REST API for container cleanup
The API SHALL expose `POST /api/cleanup` to stop and remove all managed sandbox containers.

#### Scenario: Cleanup endpoint
- **WHEN** a client sends `POST /api/cleanup`
- **THEN** the API stops and removes all containers with the `sandbox-platform=true` label and clears the `active_containers` table

### Requirement: OpenAPI documentation
The API SHALL auto-generate OpenAPI/Swagger documentation accessible at `/docs` for all endpoints. This is critical for agent-programmatic access.

#### Scenario: API docs accessible
- **WHEN** a client navigates to `http://localhost:8000/docs`
- **THEN** the Swagger UI displays all API endpoints with request/response schemas

### Requirement: CORS configuration
The API SHALL allow CORS requests from `http://localhost:3000` (the control panel UI origin).

#### Scenario: CORS headers
- **WHEN** the control panel UI at `http://localhost:3000` makes an API request
- **THEN** the API responds with appropriate CORS headers allowing the request

### Requirement: Health check endpoint
The API SHALL expose `GET /api/health` that returns the API status and Docker connectivity status.

#### Scenario: Health check with Docker available
- **WHEN** a client sends `GET /api/health`
- **THEN** the API returns `{"status": "healthy", "docker": "connected"}`

#### Scenario: Health check without Docker
- **WHEN** a client sends `GET /api/health` and Docker is not running
- **THEN** the API returns `{"status": "degraded", "docker": "disconnected"}`
