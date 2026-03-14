## MODIFIED Requirements

### Requirement: Sandbox management API
The control panel API SHALL support renaming sandboxes via a PATCH endpoint and SHALL store a display name for each sandbox.

#### Scenario: Add name column to active_containers
- **WHEN** the application starts
- **THEN** the `active_containers` table has a `name` column (TEXT, nullable, default NULL), added via ALTER TABLE if it doesn't exist

#### Scenario: Rename sandbox
- **WHEN** a PATCH request is sent to `/api/sandboxes/{container_id}` with `{ "name": "My Sandbox" }`
- **THEN** the sandbox's name is updated in the database and the updated sandbox record is returned

#### Scenario: Clear sandbox name
- **WHEN** a PATCH request is sent to `/api/sandboxes/{container_id}` with `{ "name": "" }` or `{ "name": null }`
- **THEN** the sandbox's name is set to NULL and the UI falls back to `:port` display

#### Scenario: Rename nonexistent sandbox
- **WHEN** a PATCH request is sent to `/api/sandboxes/{invalid_id}`
- **THEN** a 404 response is returned

#### Scenario: List sandboxes includes name
- **WHEN** a GET request is sent to `/api/sandboxes`
- **THEN** each sandbox in the response includes the `name` field (null if not set)
