## Context

The control-panel-api uses Supabase for two things: a Postgres database (scenarios + active_containers tables) and object storage (scenario .db files). Both are being replaced with local equivalents. The API surface (endpoints, request/response shapes) stays identical — only the persistence layer changes.

## Goals / Non-Goals

**Goals:**
- Replace Supabase database with local SQLite (`control-panel-api/data/platform.db`)
- Replace Supabase Storage with local filesystem (`control-panel-api/data/scenario_files/`)
- Remove `supabase` Python dependency
- Auto-create data directory and tables on startup
- Update README to remove Supabase setup, simplify getting-started
- Keep all API endpoints and response shapes identical

**Non-Goals:**
- Changing any API contracts or adding new endpoints
- Migrating existing Supabase data (clean start is fine)
- Adding database migration tooling

## Decisions

### Use Python stdlib sqlite3 (not aiosqlite)

**Rationale**: The API is simple and low-traffic. Synchronous sqlite3 from stdlib is the simplest option — no new dependency needed. FastAPI handles async fine with sync database calls for this use case. Matches how the target-app uses better-sqlite3 synchronously.

### Local SQLite schema

Same structure as the Supabase tables, adapted for SQLite:

```sql
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  config_json TEXT DEFAULT '{}',
  db_file_path TEXT,
  parent_scenario_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS active_containers (
  id TEXT PRIMARY KEY,
  scenario_id TEXT,
  container_id TEXT NOT NULL UNIQUE,
  port INTEGER NOT NULL,
  sandbox_url TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Differences from Supabase version**: UUIDs stored as TEXT (generated via `uuid.uuid4()` in Python). `config_json` stored as TEXT (JSON serialized). No foreign key constraints (simpler, matches current loose coupling). Timestamps as ISO strings.

### File storage layout

```
control-panel-api/data/
├── platform.db          # SQLite database
└── scenario_files/      # .db file storage
    ├── <scenario_id>/
    │   └── <uuid>.db
    └── walkthroughs/
        └── <uuid>.db
```

File paths in the `scenarios.db_file_path` column remain relative paths like `<scenario_id>/<uuid>.db` — the storage module resolves them against the `scenario_files/` base directory.

### Database module (`app/db.py`)

Extract database logic into a separate module:
- `init_db()`: creates data directory, initializes SQLite, creates tables
- Helper functions wrapping common queries (list, get, insert, delete for both tables)
- Called on app startup

### Refactor main.py in place

Replace all `get_supabase()` / `sb.table(...)` / `sb.storage.from_(...)` calls with direct sqlite3 queries and filesystem operations. No intermediate abstraction layers — keep it simple.

## Risks / Trade-offs

**[No concurrent write safety]** → SQLite has limited concurrent write support. Mitigation: acceptable for single-user local hackathon tool. WAL mode helps.

**[No cloud backup]** → Data is only local now. Mitigation: this is intentional — the platform is designed to be fully local. Users can back up the `data/` directory.

**[Data loss on clean]** → `data/` directory could be accidentally deleted. Mitigation: add `data/` to `.gitignore` (already done). Document in README.
