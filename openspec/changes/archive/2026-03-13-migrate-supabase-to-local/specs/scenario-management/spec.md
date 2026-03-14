## MODIFIED Requirements

### Requirement: Scenario CRUD uses local SQLite
All scenario CRUD operations SHALL read from and write to the local SQLite database instead of Supabase. The API response shapes SHALL remain identical.

#### Scenario: Create scenario
- **WHEN** a client sends `POST /api/scenarios` with name, description, config_json
- **THEN** a record is inserted into the local SQLite scenarios table with a generated UUID and returned

#### Scenario: List scenarios
- **WHEN** a client sends `GET /api/scenarios`
- **THEN** all scenarios are returned from the local SQLite database ordered by created_at descending

#### Scenario: Delete scenario with file cleanup
- **WHEN** a client sends `DELETE /api/scenarios/{id}` and the scenario has a db_file_path
- **THEN** the .db file is deleted from the local filesystem and the scenario record is removed from SQLite

### Requirement: Upload .db file to local filesystem
The `POST /api/scenarios/{id}/upload-db` endpoint SHALL save the uploaded file to `data/scenario_files/<scenario_id>/<uuid>.db` on the local filesystem and update the scenario's db_file_path in SQLite.

#### Scenario: Upload .db file
- **WHEN** a client uploads a .db file for a scenario
- **THEN** the file is saved to the local filesystem and the scenario record is updated with the file path
