## ADDED Requirements

### Requirement: Save walkthrough state from active sandbox
The system SHALL allow users to capture the current state of a running sandbox by pausing the Docker container, extracting the SQLite .db file, uploading it to Supabase Storage, and creating a new scenario template linked to the saved state.

#### Scenario: Successful walkthrough state save
- **WHEN** a user triggers "Save Walkthrough State" for an active sandbox running scenario A
- **THEN** the system pauses the Docker container, extracts the .db file from `/app/data/store.db` via `docker cp`, uploads the file to Supabase Storage, creates a new scenario record with `parent_scenario_id` set to scenario A's id and `db_file_path` pointing to the uploaded file, and returns the new scenario's metadata

#### Scenario: Save state with custom name
- **WHEN** a user provides a custom name and description when saving walkthrough state
- **THEN** the new scenario template uses the provided name and description

#### Scenario: Save state with auto-generated name
- **WHEN** a user saves walkthrough state without providing a name
- **THEN** the system generates a name in the format `<parent_scenario_name> - Walkthrough <timestamp>`

### Requirement: Destroy container after state save
The system SHALL stop and remove the Docker container after successfully extracting and uploading its state. The port SHALL be freed and the `active_containers` record removed.

#### Scenario: Container cleanup after save
- **WHEN** walkthrough state is successfully saved
- **THEN** the Docker container is stopped and removed, the port is freed, and the `active_containers` record is deleted

### Requirement: Handle save failure gracefully
The system SHALL resume the Docker container if the state extraction or upload fails, leaving the sandbox in a usable state.

#### Scenario: Upload failure recovery
- **WHEN** the Supabase Storage upload fails during a walkthrough save
- **THEN** the Docker container is unpaused and resumed, the sandbox remains accessible, and an error response is returned to the user

### Requirement: Preserve exact agent state
The system SHALL ensure the extracted .db file reflects the exact state of the application at the moment of pause, including all writes made by user or agent interactions. The target app MUST write state changes synchronously to SQLite.

#### Scenario: State accuracy after agent interaction
- **WHEN** an agent adds 3 items to cart, completes checkout, and the user saves walkthrough state
- **THEN** the extracted .db file contains the 3 cart additions and the completed order record
