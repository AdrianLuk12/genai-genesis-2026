## MODIFIED Requirements

### Requirement: Sandbox provisioning uses local storage
The `POST /api/sandboxes` endpoint SHALL read scenario data from local SQLite and download .db files from the local filesystem instead of Supabase. Container records SHALL be stored in local SQLite.

#### Scenario: Provision with local .db file
- **WHEN** a sandbox is provisioned for a scenario with a db_file_path
- **THEN** the .db file is read from `data/scenario_files/<db_file_path>` and mounted into the container

### Requirement: Active containers tracked in local SQLite
The `GET /api/sandboxes`, `DELETE /api/sandboxes/{id}`, and `POST /api/cleanup` endpoints SHALL read from and write to the local SQLite active_containers table instead of Supabase.

#### Scenario: Cleanup clears local records
- **WHEN** a client sends `POST /api/cleanup`
- **THEN** all containers are stopped/removed and all records are deleted from the local SQLite active_containers table
