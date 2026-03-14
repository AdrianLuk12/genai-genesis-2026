## Why

Demo and QA environments are tedious to set up manually, and each person's local changes pollute shared state. We need an on-demand, isolated sandbox platform that lets users (and eventually autonomous AI agents) spin up pre-configured instances of a target application, interact with them, and save the resulting state as reusable templates. This is a hackathon build targeting a working MVP.

## What Changes

- Build a **Control Panel UI** (Next.js + shadcn/ui) that lets users browse scenario templates, launch sandboxes, view active containers, and save walkthrough state.
- Build a **Control Panel API** (FastAPI + Docker SDK) that provisions/destroys Docker containers, manages scenario templates in Supabase, and handles SQLite database file extraction/upload.
- Build a **Target App Template** (Next.js + SQLite + Faker.js) — a minimal mock e-commerce app (product listing, cart, admin dashboard) that gets dockerized and used as the sandbox image.
- Every interactive element in the Target App uses semantic HTML with `data-testid` and `aria-label` attributes to support future autonomous AI agent navigation.
- All Control Panel UI actions are backed by documented REST endpoints for programmatic/agent access.

## Capabilities

### New Capabilities
- `sandbox-provisioning`: Spinning up isolated Docker containers from scenario templates, exposing them on dynamic ports, and returning sandbox URLs.
- `scenario-management`: CRUD operations for scenario templates (JSON configs + SQLite seed files) stored in Supabase.
- `data-seeding`: Faker.js-based database population inside containers driven by scenario JSON parameters.
- `walkthrough-capture`: Pausing a container, extracting its SQLite state, uploading to Supabase Storage, and creating a new reusable template from it.
- `target-app`: The minimal e-commerce app (product listing, cart, admin dashboard) that runs inside each sandbox container.
- `control-panel-ui`: The dashboard for browsing scenarios, launching sandboxes, monitoring containers, and saving state.
- `control-panel-api`: The FastAPI service orchestrating Docker, Supabase, and the full sandbox lifecycle.

### Modified Capabilities
<!-- None — greenfield project -->

## Impact

- **New services**: Three new directories at repo root — `/control-panel-ui`, `/control-panel-api`, `/target-app-template`.
- **Infrastructure**: Requires Docker Engine running locally. Supabase project for platform data and file storage.
- **Dependencies**: Next.js, Tailwind CSS, shadcn/ui, better-sqlite3, Faker.js (frontend/target); FastAPI, docker-py, supabase-py, uvicorn (backend).
- **Port allocation**: Sandboxes use dynamic ports in range 8001–8050. Control Panel API on port 8000. Control Panel UI on port 3000.
- **Docker image**: `target-app-template` directory gets built into a Docker image used for all sandbox containers.
