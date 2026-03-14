## MODIFIED Requirements

### Requirement: Save walkthrough state to local storage
The `POST /api/sandboxes/{container_id}/save` endpoint SHALL save extracted .db files to the local filesystem at `data/scenario_files/walkthroughs/<uuid>.db` and create new scenario records in local SQLite, instead of uploading to Supabase Storage.

#### Scenario: Save walkthrough state
- **WHEN** a client saves walkthrough state
- **THEN** the .db file is extracted, saved to the local filesystem, a new scenario is created in local SQLite with parent_scenario_id, and the container is destroyed

#### Scenario: Save failure recovery
- **WHEN** the file save or database write fails
- **THEN** the container is unpaused and an error is returned (behavior unchanged)
