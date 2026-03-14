# Sandbox Platform

On-demand, isolated sandbox environments for testing any Docker-based application. Upload Docker images, manage versioned apps, spin up containers from scenario templates, capture interaction workflows, and save/restore state.

Three services:

| Service | Stack | Port |
|---|---|---|
| `control-panel-ui` | Next.js, Tailwind, shadcn/ui | 3000 |
| `control-panel-api` | Python FastAPI, docker-py, SQLite/IBM Db2 | 8000 |
| `target-app-template` | Next.js, SQLite, Faker.js | 3000 (inside containers, mapped to 8001–8050) |

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Docker Engine** running locally

## 1. Build a Docker Image (.tar)

Any Docker image that exposes port 3000 can be uploaded. To create a `.tar` file from a Docker image:

```bash
# Option A: Build and export from a Dockerfile
cd your-app
docker build -t my-app .
docker save my-app -o my-app.tar

# Option B: Use the included target-app-template
cd target-app-template
npm install
docker build -t sandbox-target-app .
docker save sandbox-target-app -o sandbox-target-app.tar
```

The `.tar` file is what you upload through the UI.

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

## User Flows

### Flow 1: Create an app and start testing

1. Go to **Apps** → click **New App** → enter name and description
2. On the app detail page, click **Upload New Version** → select a `.tar` Docker image file, enter a version tag (e.g. `v1.0`), click Upload
3. Under the version, click **New Scenario** → enter a name and optional config JSON → this creates a start state
4. Click **Launch** on the scenario → a Docker container spins up and you enter the sandbox
5. Interact with the app in the sandbox iframe
6. Click **Save State** → enter a name → saves the current DB state as a new scenario (sandbox keeps running)
7. Click **Save Workflow** → enter a name → saves all captured actions from the session as a replayable workflow

### Flow 2: Create another scenario for the same app

1. Go to the app detail page → under the same version, click **New Scenario**
2. Configure a different start state (different config JSON or upload a `.db` file)
3. Launch a sandbox from this new scenario

### Flow 3: Upload a new version

1. Go to the app detail page → click **Upload New Version** → select a new `.tar` file with a new version tag (e.g. `v1.1`)
2. Create scenarios under the new version
3. Workflows and scenarios are tied to a specific version — switching versions gives you a clean slate

### AI Agent

1. Go to **AI Agent** → select a scenario (grouped by app/version) → describe a task
2. The agent navigates the sandbox autonomously using Claude

## Scenario Config Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `product_count` | int | 25 | Number of products to generate |
| `buyer_count` | int | 30 | Number of unique buyer names |
| `inventory_status` | `"high"` \| `"low"` \| `"mixed"` | `"mixed"` | Stock quantity ranges |
| `order_count` | int | 40 | Number of fake orders |
| `category_list` | string[] | 7 default categories | Product categories |

These config options apply to the included `target-app-template`. Custom apps use their own configuration.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | API + Docker status |
| **Apps** | | |
| `GET` | `/api/apps` | List apps |
| `POST` | `/api/apps` | Create app |
| `PATCH` | `/api/apps/{id}` | Update app |
| `DELETE` | `/api/apps/{id}` | Delete app (cascades) |
| `GET` | `/api/apps/{id}/versions` | List versions |
| `POST` | `/api/apps/{id}/versions` | Upload Docker image (multipart) |
| `DELETE` | `/api/apps/{id}/versions/{vid}` | Delete version (cascades) |
| **Scenarios** | | |
| `GET` | `/api/scenarios` | List scenarios (filter: `?app_version_id=`) |
| `POST` | `/api/scenarios` | Create scenario |
| `DELETE` | `/api/scenarios/{id}` | Delete scenario |
| `POST` | `/api/scenarios/{id}/upload-db` | Upload .db file |
| **Workflows** | | |
| `GET` | `/api/workflows` | List workflows (filter: `?app_version_id=`) |
| `POST` | `/api/workflows` | Create workflow |
| `DELETE` | `/api/workflows/{id}` | Delete workflow |
| **Sandboxes** | | |
| `GET` | `/api/sandboxes` | List active sandboxes |
| `POST` | `/api/sandboxes` | Launch sandbox |
| `DELETE` | `/api/sandboxes/{id}` | Destroy sandbox |
| `POST` | `/api/sandboxes/{id}/save` | Save state as scenario |
| `POST` | `/api/sandboxes/{id}/save-workflow` | Save actions as workflow |
| `POST` | `/api/cleanup` | Destroy all sandboxes |
