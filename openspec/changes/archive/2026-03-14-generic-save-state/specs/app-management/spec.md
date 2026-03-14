## MODIFIED Requirements

### Requirement: User can upload a Docker image as a new version
The system SHALL allow users to upload a Docker image tar file for an app. The system SHALL assign a version tag (user-provided or auto-generated), store the tar file on disk at `/data/app_images/{app_id}/{version_id}.tar`, run `docker load` to import the image, re-tag it to `monkeylab-{app_id}-{version_id}:latest`, and store the image name in the database. The system SHALL also accept an optional `data_path` form field specifying the container directory that holds persistent state. If not provided, `data_path` SHALL default to `/app/data`. The system SHALL strip trailing slashes from `data_path` before storing.

#### Scenario: Upload Docker image tar with default data path
- **WHEN** user uploads a tar file for app "abc-123" with version tag "v1.0" without specifying a data path
- **THEN** the system creates an `app_versions` record with `data_path` set to `/app/data`

#### Scenario: Upload Docker image tar with custom data path
- **WHEN** user uploads a tar file for app "abc-123" with version tag "v1.0" and data path "/app/state"
- **THEN** the system creates an `app_versions` record with `data_path` set to `/app/state`

#### Scenario: Upload Docker image tar with trailing slash on data path
- **WHEN** user uploads a tar file with data path "/app/data/"
- **THEN** the system stores `data_path` as `/app/data` (trailing slash stripped)

### Requirement: App version schema includes data_path
The `app_versions` table SHALL include a `data_path` column (TEXT, default `/app/data`) indicating the container directory path where the app stores persistent data. Existing rows without a `data_path` value SHALL default to `/app/data`.

#### Scenario: Existing versions have default data_path
- **WHEN** the database is migrated to include `data_path`
- **THEN** all existing `app_versions` rows have `data_path` defaulting to `/app/data`

### Requirement: App management UI includes data path field
The version upload form SHALL include an optional "Data Path" text input field. The field SHALL have a placeholder showing the default value `/app/data` and a helper label explaining it specifies the container directory to save/restore state from.

#### Scenario: Upload form shows data path field
- **WHEN** user opens the version upload form
- **THEN** a "Data Path" input field is visible with placeholder "/app/data"

#### Scenario: Upload form submits data path
- **WHEN** user fills in data path as "/app/state" and submits the upload form
- **THEN** the form sends `data_path` as a form field alongside `file` and `version_tag`
