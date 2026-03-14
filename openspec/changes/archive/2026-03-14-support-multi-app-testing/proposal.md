## Why

The platform currently supports testing only a single hardcoded Docker image (`sandbox-target-app`). Users need to test their own applications by uploading Docker images, manage multiple versions of the same app, and organize scenarios/workflows per app and version. Additionally, the save experience during sandbox testing needs refinement — users need to save both state snapshots (scenarios) and action recordings (workflows) with proper naming, and be able to delete saved items.

## What Changes

- Introduce an "App" entity as the top-level organizational unit
- Users can upload Docker image tar files as versions of an app
- Scenarios and workflows are scoped to a specific app version
- During sandbox testing, users can save the current state as a new scenario (with name prompt)
- During sandbox testing, users can save captured actions as a new workflow (with name prompt and start state)
- Saved scenarios and workflows can be deleted
- Sandbox provisioning uses the app version's Docker image instead of a hardcoded image
- Navigation updated with an Apps section for managing apps and versions

## Capabilities

### New Capabilities
- `app-management`: CRUD for apps and app versions, Docker image upload/loading, version listing
- `workflow-management`: Save, list, load, and delete workflows; workflows store captured action steps tied to an app version and start scenario

### Modified Capabilities
- `scenario-management`: Scenarios are scoped to an app version; save prompts for name; scenarios can be deleted from the UI during sandbox testing
- `sandbox-provisioning`: Sandbox creation uses the Docker image from the selected app version instead of a hardcoded image name

## Impact

- **Database**: New `apps` and `app_versions` tables; `scenarios` table gains `app_version_id` column; new `workflows` table
- **API**: New endpoints for apps, app versions, image upload, and workflows; modified sandbox creation to accept app version context
- **UI**: New Apps page for managing apps/versions/image uploads; scenarios and workflows pages scoped per app; save modal enhanced with name input and save-type choice; delete buttons on saved items
- **Docker**: Image tar files stored on disk and loaded via `docker load`; dynamic image names per sandbox
- **Storage**: Docker image tar files stored under `/data/app_images/`
