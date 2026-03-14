## ADDED Requirements

### Requirement: Create a scenario template
The system SHALL allow users to create a new scenario template by providing a name, description, and JSON configuration parameters. The system SHALL store the scenario in the Supabase `scenarios` table.

#### Scenario: Successful scenario creation
- **WHEN** a user submits a new scenario with name "Low Inventory Test", description, and config `{"buyer_count": 50, "inventory_status": "low"}`
- **THEN** the system creates a record in the `scenarios` table with the provided data and returns the created scenario with its generated id

### Requirement: Upload a base database file for a scenario
The system SHALL allow users to upload a SQLite .db file to associate with a scenario. The file SHALL be stored in Supabase Storage under the `scenario_files` bucket, and the scenario record SHALL be updated with the storage path.

#### Scenario: Successful database file upload
- **WHEN** a user uploads a .db file for an existing scenario
- **THEN** the file is stored in Supabase Storage and the scenario's `db_file_path` field is updated with the storage reference

### Requirement: List all scenario templates
The system SHALL provide an endpoint to list all scenario templates with their metadata (id, name, description, config summary, created_at, parent_scenario_id).

#### Scenario: List scenarios
- **WHEN** a user requests all scenarios
- **THEN** the system returns an array of all scenario records ordered by created_at descending

### Requirement: Get a single scenario template
The system SHALL provide an endpoint to retrieve a single scenario template by id, including its full JSON configuration.

#### Scenario: Get existing scenario
- **WHEN** a user requests scenario with a valid id
- **THEN** the system returns the full scenario record including config_json

#### Scenario: Get non-existent scenario
- **WHEN** a user requests a scenario with an id that does not exist
- **THEN** the system returns a 404 error

### Requirement: Delete a scenario template
The system SHALL allow users to delete a scenario template. The system SHALL also delete the associated .db file from Supabase Storage if one exists.

#### Scenario: Successful scenario deletion
- **WHEN** a user deletes a scenario that has an associated .db file
- **THEN** the system deletes the .db file from Supabase Storage and removes the scenario record from the database

#### Scenario: Delete scenario without db file
- **WHEN** a user deletes a scenario that has no associated .db file
- **THEN** the system removes the scenario record from the database

### Requirement: Track scenario lineage
The system SHALL support a `parent_scenario_id` field on scenarios to track which scenario a saved walkthrough state was derived from.

#### Scenario: Scenario created from walkthrough save
- **WHEN** a walkthrough state is saved from a sandbox running scenario A
- **THEN** the newly created scenario has `parent_scenario_id` set to scenario A's id
