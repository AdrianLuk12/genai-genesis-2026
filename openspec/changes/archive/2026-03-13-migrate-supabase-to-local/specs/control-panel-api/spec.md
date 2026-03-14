## MODIFIED Requirements

### Requirement: CORS configuration
No change — the API SHALL continue to allow CORS requests from `http://localhost:3000`.

### Requirement: Health check endpoint
The API SHALL expose `GET /api/health` that returns the API status and Docker connectivity status. The health check no longer reports Supabase connectivity.

#### Scenario: Health check
- **WHEN** a client sends `GET /api/health`
- **THEN** the API returns `{"status": "healthy", "docker": "connected"}` or `{"status": "degraded", "docker": "disconnected"}`

### Requirement: No external service dependencies
The API SHALL NOT require any external service credentials or connections beyond Docker Engine. The `SUPABASE_URL` and `SUPABASE_KEY` environment variables SHALL be removed.

#### Scenario: Startup without Supabase
- **WHEN** the API starts without any Supabase environment variables
- **THEN** the API starts successfully using local SQLite and filesystem storage

### Requirement: Dependency cleanup
The `supabase` package SHALL be removed from `requirements.txt`. The `supabase_schema.sql` file SHALL be deleted.
