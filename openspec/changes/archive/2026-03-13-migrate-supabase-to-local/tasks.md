## 1. Create local database module

- [x] 1.1 Create `control-panel-api/app/db.py` with `init_db()` that creates `data/` directory, `data/scenario_files/` directory, and `data/platform.db` with scenarios and active_containers tables
- [x] 1.2 Add helper functions: `get_db()` returning a sqlite3 connection with row_factory=sqlite3.Row

## 2. Migrate scenario management endpoints

- [x] 2.1 Replace `GET /api/scenarios` to query local SQLite, return rows as dicts ordered by created_at desc
- [x] 2.2 Replace `GET /api/scenarios/{id}` to query local SQLite
- [x] 2.3 Replace `POST /api/scenarios` to insert into local SQLite with uuid4() id, return created record
- [x] 2.4 Replace `DELETE /api/scenarios/{id}` to delete from local SQLite and remove .db file from local filesystem
- [x] 2.5 Replace `POST /api/scenarios/{id}/upload-db` to save file to `data/scenario_files/<id>/<uuid>.db` and update db_file_path in SQLite

## 3. Migrate sandbox provisioning endpoints

- [x] 3.1 Replace `POST /api/sandboxes` to read scenario from local SQLite, copy .db from local filesystem, insert container record into local SQLite
- [x] 3.2 Replace `GET /api/sandboxes` to query local SQLite active_containers table
- [x] 3.3 Replace `DELETE /api/sandboxes/{container_id}` to delete from local SQLite active_containers
- [x] 3.4 Replace `POST /api/cleanup` to delete all rows from local SQLite active_containers

## 4. Migrate walkthrough capture endpoint

- [x] 4.1 Replace `POST /api/sandboxes/{container_id}/save` to save .db to `data/scenario_files/walkthroughs/<uuid>.db`, insert new scenario in local SQLite, delete container record from local SQLite

## 5. Remove Supabase dependency

- [x] 5.1 Remove all `supabase` imports and `get_supabase()` function from main.py
- [x] 5.2 Remove `supabase` from `requirements.txt`
- [x] 5.3 Delete `control-panel-api/supabase_schema.sql`
- [x] 5.4 Update `control-panel-api/.env.example` to remove `SUPABASE_URL` and `SUPABASE_KEY`

## 6. Wire up startup

- [x] 6.1 Call `init_db()` in the FastAPI startup event
- [x] 6.2 Verify `GET /api/health` no longer references Supabase

## 7. Update documentation

- [x] 7.1 Update root `README.md`: remove Supabase prerequisite, remove Supabase setup section, remove Supabase env vars from API setup, update service stack table to show SQLite instead of supabase-py
