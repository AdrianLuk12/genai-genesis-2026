## 1. Database Schema Changes

- [x] 1.1 Create `apps` table (id, name, description, created_at) in both SQLite and Db2 init paths
- [x] 1.2 Create `app_versions` table (id, app_id, version_tag, docker_image_name, created_at) in both SQLite and Db2 init paths
- [x] 1.3 Add `app_version_id` column to `scenarios` table (nullable for backward compat)
- [x] 1.4 Create `workflows` table (id, name, description, app_version_id, scenario_id, steps_json, created_at)
- [x] 1.5 Add `app_version_id` column to `active_containers` table

## 2. App Management API

- [x] 2.1 Add CRUD endpoints for apps: GET /api/apps, POST /api/apps, PATCH /api/apps/{id}, DELETE /api/apps/{id}
- [x] 2.2 Add app version endpoints: GET /api/apps/{app_id}/versions, DELETE /api/apps/{app_id}/versions/{version_id}
- [x] 2.3 Add Docker image upload endpoint: POST /api/apps/{app_id}/versions (multipart file upload with version_tag field)
- [x] 2.4 Implement Docker image storage: save tar to /data/app_images/{app_id}/{version_id}.tar, docker load, re-tag to monkeylab-{app_id}-{version_id}:latest
- [x] 2.5 Implement cascade delete for apps (delete versions, scenarios, workflows, image files)
- [x] 2.6 Implement cascade delete for versions (delete scenarios, workflows, image file, docker rmi)

## 3. Workflow Management API

- [x] 3.1 Add workflow CRUD endpoints: POST /api/workflows, GET /api/workflows (with app_version_id query param), GET /api/workflows/{id}, DELETE /api/workflows/{id}
- [x] 3.2 Add save-workflow endpoint on sandbox: POST /api/sandboxes/{container_id}/save-workflow (accepts name, steps_json, scenario_id)

## 4. Scenario Management API Updates

- [x] 4.1 Update POST /api/scenarios to accept app_version_id
- [x] 4.2 Update GET /api/scenarios to support app_version_id query filter
- [x] 4.3 Update POST /api/sandboxes/{container_id}/save to NOT destroy the sandbox, accept name from request body, and inherit app_version_id from parent scenario

## 5. Sandbox Provisioning API Updates

- [x] 5.1 Update POST /api/sandboxes to look up scenario's app_version_id, resolve docker_image_name from app_versions, and use it instead of TARGET_IMAGE
- [x] 5.2 Store app_version_id on active_containers record
- [x] 5.3 Add app_id and version_id labels to Docker container
- [x] 5.4 Add fallback to TARGET_IMAGE env var when scenario has no app_version_id

## 6. Apps UI Page

- [x] 6.1 Create /apps page with app list (name, description, version count, created date)
- [x] 6.2 Add create app form (name, description)
- [x] 6.3 Add edit/delete actions for apps
- [x] 6.4 Create /apps/[id] app detail page showing versions list
- [x] 6.5 Add Docker image upload UI on app detail page (file input for .tar, version tag input, upload progress)
- [x] 6.6 Add delete action for versions with confirmation
- [x] 6.7 Show scenarios and workflows sections per version on app detail page
- [x] 6.8 Add "Apps" link to sidebar navigation

## 7. Scenario UI Updates

- [x] 7.1 Add app_version_id context when creating scenarios from the app detail page
- [x] 7.2 Add delete button to scenario rows with confirmation modal
- [x] 7.3 Update scenario list to show which app/version they belong to

## 8. Sandbox Save UX Updates

- [x] 8.1 Replace single "Save" button with "Save State" and "Save Workflow" buttons in sandbox toolbar
- [x] 8.2 Create save modal component with name input (pre-filled with auto-generated default)
- [x] 8.3 Wire "Save State" to POST /api/sandboxes/{id}/save with name, without destroying sandbox
- [x] 8.4 Wire "Save Workflow" to POST /api/sandboxes/{id}/save-workflow with name and captured steps
- [x] 8.5 Show success toast/message after save without redirecting away
- [x] 8.6 Disable "Save Workflow" button when no steps have been captured

## 9. Workflow UI

- [x] 9.1 Display workflows list on app detail page per version (name, step count, start scenario, date)
- [x] 9.2 Add delete button for workflows with confirmation
- [x] 9.3 Add "Replay" button on workflows that launches sandbox from start scenario and begins replay

## 10. Integration & Cleanup

- [x] 10.1 Update dashboard quick-launch to show apps instead of flat scenario list
- [x] 10.2 Update live testing page to show app/version info for active sandboxes
- [x] 10.3 Update agent page scenario dropdown to be scoped by app/version
- [x] 10.4 Update insights page to include app-level metrics
