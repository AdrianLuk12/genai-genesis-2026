# Q Labs – Autonomous QA Sandboxes for Any App

Q Labs turns any Docker image into an on-demand QA playground.

Upload a container image, define a few scenarios, and Q Labs will:

- spin up **isolated sandboxes per test run**
- run **automatic smoke / resilience checks** across your app’s real routes
- capture **agent-driven user journeys** you can replay and iterate on
- keep a **versioned history** of runs so you can show “we found this, then we fixed it”

The goal is to feel like you have a dedicated infra team for product-quality QA, without touching your production stack.

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

- `control-panel-api/` — Q Labs API for apps, versions, scenarios, sandboxes, QA runs, and AI agents
- `control-panel-ui/` — primary control panel UI for running QA and driving sandboxes
- `target-app-template/` — opinionated storefront app used as a canonical demo target
- `recruitment-management-app/` — standalone recruitment domain sample app (user/admin split)

## Why Q Labs?

**Q Labs tells a clear story:**

- **Real containers, real state** – every run spins up its own Docker container and mounts a per-scenario datastore. You can break things, save the broken state, and come back later.
- **Version-aware QA** – QA runs are attached to specific app versions and scenarios, so it’s easy to say “this broke in v1.1, we fixed it in v1.2”.
- **Zero-setup target apps** – the included storefront template and recruitment app mean you can show end‑to‑end flows without building a product from scratch.
- **AI-powered navigation** – the AI agent can be pointed at any sandbox and asked to complete real user tasks (e.g. “add something to cart and checkout”), giving you repeatable flows over a real UI.
- **Simple, explainable results** – automatic QA runs report which URLs were checked, which failed, and why, using concise status lines like “GET /cart returned 404”.

This makes it ideal for “upload → run → debug → fix → re-run” stories on stage.

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Docker Engine** running locally

## Quickstart (Happy Path)

### 1. Build a Docker image tar

Any Docker image that exposes port 3000 can be uploaded.

**Option A – your own app**

```bash
cd your-app
docker build -t my-app .
docker save my-app -o my-app.tar
```

**Option B – use the included storefront template**

```bash
cd target-app-template
npm install
docker build -t qlabs-storefront-app .
docker save qlabs-storefront-app -o qlabs-storefront-app.tar
```

You’ll upload the `.tar` through the Q Labs UI.

### 2. Start the API (Q Labs backend)

```bash
cd control-panel-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Default local mode uses SQLite (`DB_PROVIDER=sqlite`) and stores data under `control-panel-api/data/`.

To run:

```bash
uvicorn app.main:app --reload --port 8000
```

Or from the repo root:

```bash
python -m uvicorn --app-dir control-panel-api app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

### 3. Start the Q Labs control panel UI

```bash
cd control-panel-ui
npm install
```

Create `.env`:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env
``>

Start:

```bash
npm run dev
```

Open `http://localhost:3000`.

### 4. (Optional) Start the recruitment sample app

```bash
cd recruitment-management-app
npm install
cp .env.example .env
npm run dev -- --port 3002
```

Open `http://localhost:3002`. This app is independent but useful as another target for sandboxes or agents.

## Core Demo Flows

### Flow 1: Upload an app and run Auto QA

1. In the Q Labs UI, go to **Apps → New App** and create an app (e.g. “Storefront – Q Labs Demo”).
2. On the app page, click **Upload New Version**, choose your `.tar` image and a tag like `v1.0`, then upload.
3. Once the version appears, click **Add Scenario** and create a “Happy path” scenario. For the included storefront, you can leave most config as default.
4. On the **QA Runs** tab, start an **Auto QA** run for that app version. Q Labs will:
   - create a sandbox container from your image
   - probe multiple real routes (e.g. `/`, `/cart`, `/products`, `/health`)
   - record which ones passed and which failed
5. Open the QA run report:
   - Green items: “GET /… returned 200”
   - Red items: “GET /cart returned 404”, “GET /admin/orders returned 500”, etc.

This gives you a single-screen story: *“We uploaded our app, Q Labs explored key pages, and here’s what broke.”*

### Flow 2: Introduce a bug, fix it, and re-run

1. Use the **Environment Variables** on a scenario (for the target app, e.g. `DEMO_BUG=1`) so a specific route (like `/cart`) returns a 404.
2. Run Auto QA again. The report now shows:
   - Several green checks (healthy pages)
   - One or more red failures (e.g. `GET /cart returned 404`).
3. “Fix” the bug:
   - Create a new scenario or version without `DEMO_BUG` set.
4. Run Auto QA on the new scenario. The same routes are re-checked:
   - All now show as passed.

On stage you can literally show: *“We had a broken cart. We fixed the app and re-ran Q Labs; now everything passes.”*

### Flow 3: Let the AI agent walk the app

1. With a scenario selected, go to **AI Agent**.
2. Describe a task such as:
   - “Add any product to the cart and proceed to checkout.”
3. The agent:
   - reads the current page’s DOM from the sandbox
   - decides the next action (click, type, navigate) using the Q Labs agent API
   - steps through the app, building up a human-readable action history.
4. You can use this live on a projector to show “AI as QA engineer” walking through an actual UI.

## Scenario Config Options (Storefront Template)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `product_count` | int | 25 | Number of products to generate |
| `buyer_count` | int | 30 | Number of unique buyer names |
| `inventory_status` | `"high"` \| `"low"` \| `"mixed"` | `"mixed"` | Stock quantity ranges |
| `order_count` | int | 40 | Number of fake orders |
| `category_list` | string[] | 7 default categories | Product categories |

These config options apply to the included `target-app-template`. Custom apps can define and consume their own configuration through `config_json` on scenarios.

## API Cheat Sheet (selected endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | API + Docker status |
| **Apps** | | |
| `GET` | `/api/apps` | List apps |
| `POST` | `/api/apps` | Create app |
| `PATCH` | `/api/apps/{id}` | Update app |
| `DELETE` | `/api/apps/{id}` | Delete app (cascades) |
| `GET` | `/api/apps/{id}/versions` | List versions |
| `POST` | `/api/apps/{id}/versions` | Upload Docker image (multipart, becomes `qlabs-{app_id}-{version_id}:latest`) |
| `DELETE` | `/api/apps/{id}/versions/{vid}` | Delete version (image + scenarios + workflows) |
| **Scenarios** | | |
| `GET` | `/api/scenarios` | List scenarios (filter: `?app_version_id=`) |
| `POST` | `/api/scenarios` | Create scenario |
| `DELETE` | `/api/scenarios/{id}` | Delete scenario |
| `POST` | `/api/scenarios/{id}/upload-db` | Upload `.db`/state bundle for a scenario |
| **QA Runs** | | |
| `POST` | `/api/apps/{version_id}/qa-run` | Start QA run for an app version |
| `GET` | `/api/qa-runs` | List runs with pass/fail counts |
| `GET` | `/api/qa-runs/{run_id}` | Detailed run with per-path results |
| `POST` | `/api/qa-runs/{run_id}/results` | Append a result (used by the runner) |
| **Sandboxes** | | |
| `GET` | `/api/sandboxes` | List active sandboxes |
| `POST` | `/api/sandboxes` | Launch sandbox for a scenario |
| `DELETE` | `/api/sandboxes/{id}` | Destroy sandbox |
| `POST` | `/api/sandboxes/{id}/save` | Save state as scenario |
| `POST` | `/api/sandboxes/{id}/save-workflow` | Save actions as workflow |
| `POST` | `/api/cleanup` | Destroy all sandboxes |
