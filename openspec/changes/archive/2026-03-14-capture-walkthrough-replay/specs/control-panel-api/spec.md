## MODIFIED Requirements

### Requirement: Sandbox management API
The control panel API SHALL support renaming sandboxes via a PATCH endpoint and SHALL store a display name for each sandbox. The API SHALL also expose walkthrough steps data when listing and retrieving scenarios.

#### Scenario: Add walkthrough_steps column to scenarios
- **WHEN** the application starts
- **THEN** the `scenarios` table has a `walkthrough_steps` column (TEXT, nullable, default NULL), added via ALTER TABLE if it doesn't exist

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

#### Scenario: List scenarios includes walkthrough_steps
- **WHEN** a GET request is sent to `/api/scenarios`
- **THEN** each scenario in the response includes the `walkthrough_steps` field (null if none, or a JSON array of step objects)

#### Scenario: Get single scenario includes walkthrough_steps
- **WHEN** a GET request is sent to `/api/scenarios/{scenario_id}`
- **THEN** the response includes the `walkthrough_steps` field

#### Scenario: Save endpoint accepts walkthrough_steps
- **WHEN** a POST request to `/api/sandboxes/{container_id}/save` includes `{ "walkthrough_steps": [...] }`
- **THEN** the new scenario record is created with the provided `walkthrough_steps` JSON stored in the column
