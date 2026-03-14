## MODIFIED Requirements

### Requirement: Save walkthrough state to local storage
The `POST /api/sandboxes/{container_id}/save` endpoint SHALL save extracted .db files to the local filesystem at `data/scenario_files/walkthroughs/<uuid>.db` and create new scenario records in local SQLite, instead of uploading to Supabase Storage. The endpoint SHALL also accept and persist an optional `walkthrough_steps` JSON array containing the captured interaction steps.

#### Scenario: Save walkthrough state with steps
- **WHEN** a client saves walkthrough state with a `walkthrough_steps` array in the request body
- **THEN** the .db file is extracted, saved to the local filesystem, a new scenario is created in local SQLite with `parent_scenario_id` and `walkthrough_steps`, and the container is destroyed

#### Scenario: Save walkthrough state without steps
- **WHEN** a client saves walkthrough state without providing `walkthrough_steps`
- **THEN** the behavior is unchanged — the scenario is created with `walkthrough_steps` set to NULL

#### Scenario: Save failure recovery
- **WHEN** the file save or database write fails
- **THEN** the container is unpaused and an error is returned (behavior unchanged)
