## Why

The control-panel-api currently requires an external Supabase project for scenario/container metadata and .db file storage. This adds setup friction (creating a Supabase project, running SQL, configuring keys) and an external dependency for what is a fully local, single-machine platform. Replacing Supabase with local SQLite + filesystem eliminates this dependency and simplifies setup to zero configuration.

## What Changes

- Replace all Supabase database calls (scenarios, active_containers tables) with a local SQLite database at `control-panel-api/data/platform.db`
- Replace Supabase Storage (.db file uploads/downloads) with local filesystem storage at `control-panel-api/data/scenario_files/`
- Remove `supabase` dependency from requirements.txt
- Remove Supabase-related environment variables (`SUPABASE_URL`, `SUPABASE_KEY`)
- Remove `supabase_schema.sql` (no longer needed)
- Update `.env.example` to remove Supabase config
- Update root `README.md` to remove Supabase setup section and simplify getting-started

## Capabilities

### New Capabilities
- `local-storage`: Local SQLite database and filesystem-based file storage replacing Supabase for all platform data

### Modified Capabilities
- `control-panel-api`: Storage backend changes from Supabase to local SQLite/filesystem — all endpoint behavior stays the same, only the persistence layer changes
- `scenario-management`: Scenarios stored in local SQLite instead of Supabase; .db files stored on local filesystem instead of Supabase Storage
- `sandbox-provisioning`: Active container records stored in local SQLite; .db files read from local filesystem
- `walkthrough-capture`: Extracted .db files saved to local filesystem; new scenario records written to local SQLite

## Impact

- **Dependencies**: Remove `supabase` from requirements.txt. Add `aiosqlite` or use Python stdlib `sqlite3`.
- **Configuration**: No external service configuration needed. `SUPABASE_URL` and `SUPABASE_KEY` env vars removed.
- **Data**: Platform data stored at `control-panel-api/data/` (auto-created on startup).
- **Files removed**: `control-panel-api/supabase_schema.sql`
- **Files modified**: `control-panel-api/app/main.py`, `control-panel-api/.env.example`, `control-panel-api/requirements.txt`, `README.md`
- **API surface**: No changes — all endpoints keep the same request/response contracts.
