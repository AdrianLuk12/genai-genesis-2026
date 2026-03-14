## 1. Database Schema

- [x] 1.1 Add `data_path` column to `app_versions` table in SQLite schema (`_init_sqlite_db` in `db.py`) with default `/app/data`
- [x] 1.2 Add `data_path` column to `app_versions` table in Db2 schema (`_init_db2_db` in `db.py`) with default `/app/data`
- [x] 1.3 Add migration for existing databases — `ALTER TABLE app_versions ADD COLUMN data_path` with default `/app/data` (both SQLite and Db2)

## 2. API — Version Upload

- [x] 2.1 Update `POST /api/apps/{app_id}/versions` in `main.py` to accept optional `data_path` form field
- [x] 2.2 Store `data_path` in the `INSERT INTO app_versions` statement (strip trailing slashes, default to `/app/data`)
- [x] 2.3 Return `data_path` in the version response

## 3. API — Save State

- [x] 3.1 Update `POST /api/sandboxes/{container_id}/save` to look up `data_path` from the `app_versions` table via `app_version_id`
- [x] 3.2 Replace hardcoded `/app/data` in `container.get_archive()` with the looked-up `data_path`
- [x] 3.3 Dynamically strip the tar prefix using the basename of `data_path` instead of hardcoded `"data/"`

## 4. API — Sandbox Provisioning

- [x] 4.1 Update sandbox provisioning in `main.py` to read `data_path` from the `app_versions` table
- [x] 4.2 Replace hardcoded `/app/data` mount target with the looked-up `data_path` (directory format)
- [x] 4.3 Replace hardcoded `/app/data/store.db` mount target with `{data_path}/store.db` (legacy single-file format)

## 5. UI — Version Upload Form

- [x] 5.1 Add `dataPath` state variable and "Data Path" input field to the upload form in `apps/[id]/page.tsx`
- [x] 5.2 Send `data_path` in the form data when uploading a version
- [x] 5.3 Add placeholder "/app/data" and helper text to the input field

## 6. Recruitment App Fix

- [x] 6.1 Add `RUN mkdir -p /app/data` to `recruitment-management-app/Dockerfile` before `EXPOSE`
