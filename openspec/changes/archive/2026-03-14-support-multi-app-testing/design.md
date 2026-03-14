## Context

The platform (Monkey Labs) is a sandbox testing tool with a FastAPI backend, Next.js frontend, and Docker-based sandbox provisioning. Currently, all sandboxes run a single hardcoded Docker image (`sandbox-target-app`). Scenarios are flat — no grouping by app or version. Walkthroughs (captured action sequences) are stored as JSON on scenario records with `parent_scenario_id` linkage.

The user wants to support multiple apps, each with versioned Docker images, and cleanly separate scenarios and workflows per app version.

## Goals / Non-Goals

**Goals:**
- Users can create apps, upload Docker images as versions, and manage them
- Scenarios and workflows are scoped to an app version
- Save UX during sandbox testing prompts for name and offers two save types (scenario state vs. workflow actions)
- Saved items can be deleted
- Existing scenario/sandbox functionality continues to work within the new app-scoped model

**Non-Goals:**
- Docker image building from source (users upload pre-built tar files)
- Container registry integration (images stored as local tar files)
- App sharing or multi-tenancy
- Migrating existing scenarios to the new model (fresh start is acceptable)

## Decisions

### 1. Data Model: Apps → Versions → Scenarios/Workflows hierarchy

**Decision**: Introduce `apps` and `app_versions` tables. Add `app_version_id` FK to `scenarios`. Create separate `workflows` table.

**Rationale**: Clean separation of concerns. Apps group versions, versions group scenarios and workflows. This is simpler than overloading the scenarios table with workflow data.

**Alternative considered**: Keeping workflows as a type flag on scenarios — rejected because workflows have fundamentally different data (steps + start scenario reference) and different UI needs.

### 2. Docker Image Storage: Tar files on disk + `docker load`

**Decision**: Store uploaded Docker image tar files at `/data/app_images/{app_id}/{version_id}.tar`. On upload, run `docker load` to import the image into the local Docker daemon. Store the loaded image name in `app_versions.docker_image_name`.

**Rationale**: Simple, no registry dependency. `docker load` is the inverse of `docker save` and handles multi-layer images correctly. Tar files serve as persistent backup even if Docker cache is pruned.

**Alternative considered**: Pulling from a registry — adds infrastructure complexity not needed for a hackathon project.

### 3. Workflow vs. Scenario saves: Two distinct save actions

**Decision**: During sandbox testing, present two save buttons:
- "Save State" → extracts current DB state, creates a new scenario (prompts for name)
- "Save Workflow" → saves captured steps array + reference to the start scenario (prompts for name)

Neither action destroys the sandbox — the user continues testing.

**Rationale**: The current save destroys the sandbox, which is disruptive. Keeping the sandbox alive lets users save multiple checkpoints during a session. The two save types map to distinct use cases: state snapshots for reproducibility, action recordings for automation/replay.

### 4. Sandbox provisioning: Dynamic image from app version

**Decision**: When creating a sandbox, the API looks up the scenario's `app_version_id`, gets the `docker_image_name`, and uses that instead of `TARGET_IMAGE`. The container is labeled with `app_id` and `version_id` for tracking.

**Rationale**: Minimal change to existing provisioning logic — just swap the image name source.

### 5. UI Navigation: App-centric flow

**Decision**: Add an "Apps" page accessible from the sidebar. The app detail page shows versions, and each version shows its scenarios and workflows. The existing scenarios page is replaced by the app-scoped view.

**Rationale**: Follows the natural hierarchy: pick an app → pick a version → see scenarios/workflows → launch sandbox.

### 6. Save modal with name prompt

**Decision**: When saving (either type), show a modal with a text input for the name. Auto-generate a default name (e.g., "Scenario - 2026-03-14 10:30" or "Workflow - 2026-03-14 10:30") that users can override.

**Rationale**: Names make saved items identifiable. Auto-generated defaults reduce friction while still allowing customization.

## Risks / Trade-offs

- **Large Docker images** → Upload may be slow/fail for images >1GB. Mitigation: Show upload progress, set reasonable timeout (10 min).
- **Disk usage** → Storing tar files per version can consume significant disk. Mitigation: Out of scope for now; can add cleanup later.
- **Docker load conflicts** → If two versions use the same image tag, `docker load` may overwrite. Mitigation: Re-tag loaded images to `monkeylab-{app_id}-{version_id}:latest` to ensure uniqueness.
- **Breaking existing data** → Adding `app_version_id` to scenarios means existing scenarios won't have an app. Mitigation: Accept fresh start; existing scenarios still queryable but won't appear in app-scoped views.
- **Save without destroying sandbox** → Containers stay running, consuming ports. Mitigation: Keep existing cleanup and destroy functionality; add reminder in UI.
