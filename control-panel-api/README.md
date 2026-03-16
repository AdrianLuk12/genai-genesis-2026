# Control Panel API

Backend for **Q Labs**: apps, versions, scenarios, sandboxes, Auto QA runs, and the AI agent. Written in Python (FastAPI); uses Docker to run real containers and optional IBM Db2 or SQLite for persistence.

## Role in Q Labs

- **Apps & versions** — Register apps and upload Docker images (`.tar`) as versions. Images are stored under `data/app_images/{app_id}/{version_id}.tar` (i.e. `control-panel-api/data/app_images/...`) and loaded when a sandbox or QA run is started.
- **Scenarios** — Per-version definitions: env vars, optional seed DB upload, and config (e.g. `smoke_urls` for QA). Each scenario can launch one or more sandboxes.
- **Sandboxes** — One running container per launch. Ports are assigned from 8001–8050. Containers are labeled `sandbox-platform=true` for cleanup and port tracking.
- **Auto QA** — Starts a short-lived container from a scenario, discovers or uses paths, runs GET requests, and records results (e.g. `GET / returned 200`). Results are stored and shown in the control panel UI.
- **AI Agent** — Receives DOM + task from the UI; calls Anthropic Claude to choose the next action (click, type, navigate); returns the action for the UI to execute in the sandbox.

## Stack

- Python 3.11+
- FastAPI
- docker-py (Docker SDK)
- Anthropic SDK (Claude for the agent)
- SQLite (default) or IBM Db2 via `ibm_db_dbi`

## Prerequisites

- Docker Engine running and reachable (e.g. `DOCKER_HOST=unix:///var/run/docker.sock`).
- For the AI agent: `ANTHROPIC_API_KEY` in `.env`.

## Local development

```bash
cd control-panel-api
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` as needed (see [Environment variables](#environment-variables)). Then:

```bash
uvicorn app.main:app --reload --port 8000
```

- API: [http://localhost:8000](http://localhost:8000)
- OpenAPI docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DOCKER_HOST` | No | Docker socket; default `unix:///var/run/docker.sock` |
| `TARGET_IMAGE` | No | Fallback image name when no version image is found; default `sandbox-target-app` |
| `DB_PROVIDER` | No | `sqlite` (default) or `db2` |
| `ANTHROPIC_API_KEY` | For agent | Claude API key; required only for `/api/agent/*` |
| `SHAREABLE_SANDBOX_BASE_URL` | No | Template for shareable sandbox URLs (e.g. `https://{port}.ngrok-free.app`) |
| `API_BASE_URL` | No | Base URL for QA runner self-calls; default `http://127.0.0.1:8000` |

For Db2, set `DB_PROVIDER=db2` and configure `DB2_*` (see `.env.example`). For SQLite, `data/platform.db` is created automatically.

## Data layout (runtime)

Created under `control-panel-api/data/`:

- `platform.db` — Apps, versions, scenarios, workflows, QA runs, results (SQLite or Db2).
- `scenario_files/` — Uploaded scenario files (e.g. seed DBs).
- `app_images/` — `{app_id}/{version_id}.tar` for each uploaded image.
- `certs/` — Optional TLS/SSL certs (e.g. for Db2).

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/seed_qa_runs.py` | Seed demo apps, versions, and QA runs. Run with `--init` to (re)create tables and seed. |
| `scripts/complete_qa_run.py` | Mark a stuck QA run as completed (e.g. `python scripts/complete_qa_run.py <run_id>`). |

## API overview

| Area | Endpoints |
|------|-----------|
| Health | `GET /api/health` — API and Docker status |
| Apps | `GET/POST /api/apps`, `GET/PATCH/DELETE /api/apps/{id}` |
| Versions | `GET/POST /api/apps/{id}/versions`, `DELETE .../versions/{version_id}` — POST uploads `.tar` (multipart) |
| Workflows | `GET/POST /api/workflows`, `GET/PATCH/DELETE /api/workflows/{id}` |
| Scenarios | `GET/POST /api/scenarios`, `GET/PATCH/DELETE /api/scenarios/{id}`, `POST .../upload-db` |
| Sandboxes | `GET/POST /api/sandboxes`, `PATCH/DELETE /api/sandboxes/{container_id}`, `POST .../save`, `POST .../save-workflow` |
| QA runs | `GET /api/qa-runs`, `GET /api/qa-runs/{id}`, `POST /api/apps/{version_id}/qa-run`, `POST /api/qa-runs/{id}/results`, `PATCH /api/qa-runs/{id}`, `POST /api/qa-runs/{id}/execute` |
| Agent | `POST /api/agent/next-action`, `POST /api/agent/generate-tasks` |
| Cleanup | `POST /api/cleanup` — Stop and remove sandbox containers (no DB delete) |

Full request/response shapes are in the OpenAPI schema at `/docs`.

## CORS

The API allows `http://localhost:3000` by default (control panel UI). Adjust `allow_origins` in `app/main.py` for other hosts.

## See also

- Root [README](../README.md) — Q Labs overview, getting started, and troubleshooting.
- [control-panel-ui](../control-panel-ui/README.md) — Front end that consumes this API.

## License

Same as the root repository (MIT).
