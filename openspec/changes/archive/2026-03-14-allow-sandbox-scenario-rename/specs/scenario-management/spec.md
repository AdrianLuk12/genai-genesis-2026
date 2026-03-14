## MODIFIED Requirements

### Requirement: Scenario CRUD operations
The scenario management system SHALL support updating a scenario's name and description via a PATCH endpoint.

#### Scenario: Rename scenario
- **WHEN** a PATCH request is sent to `/api/scenarios/{scenario_id}` with `{ "name": "New Name" }`
- **THEN** the scenario's name is updated in the database and the updated scenario is returned

#### Scenario: Update scenario description
- **WHEN** a PATCH request is sent to `/api/scenarios/{scenario_id}` with `{ "description": "New desc" }`
- **THEN** the scenario's description is updated and the updated scenario is returned

#### Scenario: Partial update
- **WHEN** a PATCH request is sent with only `name` (no `description`) or only `description` (no `name`)
- **THEN** only the provided field is updated; the other field remains unchanged

#### Scenario: Update nonexistent scenario
- **WHEN** a PATCH request is sent to `/api/scenarios/{invalid_id}`
- **THEN** a 404 response is returned
