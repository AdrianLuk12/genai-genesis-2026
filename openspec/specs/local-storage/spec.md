## ADDED Requirements

### Requirement: Local SQLite platform database
The control-panel-api SHALL store all platform metadata (scenarios, active containers) in a local SQLite database at `control-panel-api/data/platform.db`. The database and its directory SHALL be auto-created on application startup if they do not exist.

#### Scenario: Database auto-initialization
- **WHEN** the API starts and `data/platform.db` does not exist
- **THEN** the directory and database are created with the scenarios and active_containers tables

#### Scenario: Database persistence
- **WHEN** the API restarts
- **THEN** all previously stored scenarios and container records are preserved

### Requirement: Local filesystem file storage
The control-panel-api SHALL store scenario .db files on the local filesystem at `control-panel-api/data/scenario_files/`. Files SHALL be organized by scenario ID or walkthrough subdirectories.

#### Scenario: File storage directory
- **WHEN** a .db file is uploaded or saved
- **THEN** the file is written to `data/scenario_files/<path>` on the local filesystem

#### Scenario: File retrieval
- **WHEN** a sandbox is provisioned with a scenario that has a db_file_path
- **THEN** the .db file is read from the local filesystem at `data/scenario_files/<db_file_path>`
