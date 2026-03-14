# Sandbox Platform

On-demand, isolated sandbox environments for a target e-commerce app. Spin up Docker containers from scenario templates, interact with the app, and save the resulting state as reusable templates.

Repository services/apps:

| Service | Stack | Port |
|---|---|---|
| `control-panel-ui` | Next.js, Tailwind, shadcn/ui | 3000 |
| `control-panel-api` | Python FastAPI, docker-py, SQLite/IBM Db2 | 8000 |
| `target-app-template` | Next.js, SQLite, Faker.js | 3000 (inside containers, mapped to 8001–8050) |
| `recruitment-management-app` | Next.js App Router, TypeScript, custom CSS design system | 3002 |

## Documentation Index

- [Control Panel UI docs](control-panel-ui/README.md)
- [Recruitment app docs](recruitment-management-app/README.md)
- [Target app template docs](target-app-template/README.md)

## OpenSpec

- Specs and change history live under `openspec/`
- Active/archived changes are tracked in `openspec/changes/`
- Baseline specs are in `openspec/specs/`

## Repository Layout

- `control-panel-api/` — provisioning and scenario/sandbox API
- `control-panel-ui/` — primary control panel UI for scenario/sandbox management
- `target-app-template/` — containerized sample storefront app used for sandbox launches
- `recruitment-management-app/` — standalone recruitment domain sample app (user/admin split)

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Docker Engine** running locally

## Quick Start (Core Platform)

1. Build the target app Docker image.
2. Start `control-panel-api` on `8000`.
3. Start `control-panel-ui` on `3000`.
4. Open `http://localhost:3000`.

## 1. Target App — Build Docker Image

```bash
cd target-app-template
npm install
docker build -t sandbox-target-app .
```

This image is what gets spun up as sandbox containers.

## 2. Control Panel API

```bash
cd control-panel-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `.env` from the template:

```bash
cp .env.example .env
```

Default local mode uses SQLite (`DB_PROVIDER=sqlite`).

To use IBM Db2, set:

- `DB_PROVIDER=db2`
- Either `DB2_DSN` or split fields: `DB2_HOST`, `DB2_PORT`, `DB2_DATABASE`, `DB2_USERNAME`, `DB2_PASSWORD`
- `DB2_SECURITY=SSL`
- Optional CA certificate via `DB2_SSL_CA_FILE` or `DB2_SSL_CA_BASE64` + `DB2_SSL_CA_NAME`

Start:

```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

If you run from repo root, use:

```bash
python -m uvicorn --app-dir control-panel-api app.main:app --reload --port 8000
```

The API auto-creates its local database and file storage in `control-panel-api/data/` on first run when using SQLite mode. Db2 mode requires IBM Cloud Db2 credentials.

API docs at http://localhost:8000/docs.

## 3. Control Panel UI

```bash
cd control-panel-ui
npm install
```

Create `.env`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start:

```bash
npm run dev
```

Open http://localhost:3000.

## 4. Recruitment Management App (Standalone Sample)

```bash
cd recruitment-management-app
npm install
cp .env.example .env
npm run dev -- --port 3002
```

Open http://localhost:3002.

See [recruitment-management-app/README.md](recruitment-management-app/README.md) for route structure, auth flow, and API details.

## Usage

1. Go to **Scenarios** → create a scenario with config like `{"product_count": 15, "inventory_status": "low"}`
2. Click **Launch Sandbox** — a Docker container spins up and you get a sandbox URL
3. Interact with the target app (browse products, add to cart, checkout)
4. Click **Save Walkthrough State** to capture the SQLite state as a new reusable scenario
5. Use **Dashboard** to manage running sandboxes

## Scenario Config Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `product_count` | int | 25 | Number of products to generate |
| `buyer_count` | int | 30 | Number of unique buyer names |
| `inventory_status` | `"high"` \| `"low"` \| `"mixed"` | `"mixed"` | Stock quantity ranges |
| `order_count` | int | 40 | Number of fake orders |
| `category_list` | string[] | 7 default categories | Product categories |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | API + Docker status |
| `GET` | `/api/scenarios` | List scenarios |
| `GET` | `/api/scenarios/{id}` | Get scenario |
| `POST` | `/api/scenarios` | Create scenario |
| `DELETE` | `/api/scenarios/{id}` | Delete scenario |
| `POST` | `/api/scenarios/{id}/upload-db` | Upload .db file |
| `GET` | `/api/sandboxes` | List active sandboxes |
| `POST` | `/api/sandboxes` | Launch sandbox |
| `DELETE` | `/api/sandboxes/{id}` | Destroy sandbox |
| `POST` | `/api/sandboxes/{id}/save` | Save walkthrough state |
| `POST` | `/api/cleanup` | Destroy all sandboxes |
