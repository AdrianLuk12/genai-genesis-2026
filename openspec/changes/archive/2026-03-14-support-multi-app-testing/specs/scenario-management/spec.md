## MODIFIED Requirements

### Requirement: User can create a scenario
The system SHALL allow users to create a new scenario with a name, description, and config JSON. Each scenario SHALL be scoped to an app version via `app_version_id`. The app version ID is required when creating a scenario.

#### Scenario: Create scenario for an app version
- **WHEN** user creates a scenario with name "Empty Store" for app version "v1.0" of app "My App"
- **THEN** the system creates a scenario record with the given name, description, config, and the app_version_id linking it to that version

### Requirement: User can list scenarios
The system SHALL return scenarios filtered by app_version_id when provided, ordered by creation date descending.

#### Scenario: List scenarios for an app version
- **WHEN** user requests scenarios with app_version_id filter
- **THEN** the system returns only scenarios belonging to that app version

#### Scenario: List all scenarios without filter
- **WHEN** user requests all scenarios without a filter
- **THEN** the system returns all scenarios ordered by creation date descending

## ADDED Requirements

### Requirement: User can save sandbox state as a new scenario during testing
The system SHALL allow users to save the current sandbox state as a new scenario without destroying the sandbox. The system SHALL prompt the user for a name before saving. The saved scenario SHALL inherit the app_version_id from the parent scenario. The sandbox SHALL continue running after the save.

#### Scenario: Save state as scenario during sandbox testing
- **WHEN** user clicks "Save State" during a sandbox session, enters name "After Adding 3 Items to Cart", and confirms
- **THEN** the system extracts the current DB state from the container, creates a new scenario with the entered name, the parent scenario's app_version_id, and a parent_scenario_id reference, and the sandbox continues running

#### Scenario: Save state with auto-generated default name
- **WHEN** the save state modal appears
- **THEN** the name input is pre-filled with "Scenario - {current datetime}" which the user can override

### Requirement: User can delete a scenario
The system SHALL allow users to delete a scenario from the scenarios list with a confirmation prompt. Deleting a scenario SHALL also delete its associated DB file from disk.

#### Scenario: Delete scenario from list
- **WHEN** user clicks the delete button on a scenario and confirms
- **THEN** the system deletes the scenario record, removes the associated DB file, and updates the list

#### Scenario: Delete scenario that is a start state for workflows
- **WHEN** user attempts to delete a scenario that is referenced as a start state by one or more workflows
- **THEN** the system warns the user that associated workflows will also be deleted, and proceeds only on confirmation

### Requirement: Scenario save modal prompts for name
The system SHALL display a modal dialog when saving sandbox state that includes a text input for the scenario name, pre-filled with an auto-generated default, and a save/cancel button pair.

#### Scenario: User enters custom name
- **WHEN** the save modal appears and user changes the name to "Post-Checkout State" and clicks Save
- **THEN** the scenario is created with name "Post-Checkout State"

#### Scenario: User accepts default name
- **WHEN** the save modal appears and user clicks Save without modifying the name
- **THEN** the scenario is created with the auto-generated default name
