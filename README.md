# Sandbox Platform

On-demand, isolated sandbox environments for a target e-commerce app. Spin up Docker containers from scenario templates, interact with the app, and save the resulting state as reusable templates.

Three services:

| Service | Stack | Port |
|---|---|---|
| `control-panel-ui` | Next.js, Tailwind, shadcn/ui | 3000 |
| `control-panel-api` | Python FastAPI, docker-py, SQLite | 8000 |
| `target-app-template` | Next.js, SQLite, Faker.js | 3000 (inside containers, mapped to 8001–8050) |

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Docker Engine** running locally

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

Start:

```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The API auto-creates its local database and file storage in `control-panel-api/data/` on first run. No external services or configuration needed.

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
