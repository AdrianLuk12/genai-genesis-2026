## Context

This is a greenfield hackathon project building a "Demo/QA Environment as a Service" platform. There is no existing code. The platform must support both human users and (post-hackathon) autonomous AI agents navigating the target app via headless browsers. The monorepo will contain three services: a Next.js control panel UI, a FastAPI control panel API, and a Next.js target app template that gets dockerized.

Key constraints:
- Must run entirely locally (Docker Engine required)
- Supabase is the external dependency for platform data and file storage
- Target app must have agent-friendly DOM (data-testid, aria-labels, semantic HTML)
- All UI actions must have corresponding REST endpoints

## Goals / Non-Goals

**Goals:**
- Provision isolated Docker sandbox containers on demand from scenario templates
- Seed sandbox databases with configurable fake data via Faker.js
- Capture sandbox state (SQLite extraction) and save as reusable templates
- Build an agent-friendly target app with explicit DOM labeling
- API-first design: every UI action backed by a REST endpoint

**Non-Goals:**
- Production deployment or cloud hosting (local Docker only)
- User authentication or multi-tenancy for the control panel
- Actual payment processing in the target e-commerce app
- AI agent integration itself (only the hooks/architecture for it)
- Automated testing or CI/CD pipelines
- Container orchestration beyond single-host Docker

## Decisions

### Monorepo structure with three independent services

```
/control-panel-ui    — Next.js 14+ App Router, Tailwind, shadcn/ui (port 3000)
/control-panel-api   — Python FastAPI, docker-py, supabase-py (port 8000)
/target-app-template — Next.js 14+ App Router, Tailwind, better-sqlite3, Faker.js
```

**Rationale**: Each service has distinct runtime needs. The target app is a self-contained image. The API needs Python for docker-py. The control panel UI is a standard Next.js dashboard. Keeping them as sibling directories in one repo simplifies hackathon workflow without coupling deployments.

### FastAPI for the control panel API

**Rationale**: docker-py (Docker SDK) is Python-native and well-maintained. FastAPI provides automatic OpenAPI docs (critical for API-first/agent-friendly requirement), async support, and fast development. Alternative considered: Node.js with dockerode — rejected because docker-py is more mature and FastAPI's auto-generated docs are superior for the agent use case.

### Supabase for platform data and file storage

**Rationale**: Provides both a Postgres database (for scenario configs, container metadata, template registry) and object storage (for SQLite .db files) in one managed service. Eliminates need to run a separate database server locally. Alternative considered: local Postgres + MinIO — rejected as too much infrastructure for a hackathon.

**Supabase schema:**
- `scenarios` table: id, name, description, config_json (scenario parameters), db_file_path (Supabase Storage reference), created_at, parent_scenario_id
- `active_containers` table: id, scenario_id, container_id (Docker), port, sandbox_url, status, created_at
- `scenario_files` bucket in Supabase Storage for .db files

### SQLite for target app state

**Rationale**: Maximum portability — the entire app state is a single file that can be extracted from a container, uploaded, and mounted into a new container. No network database needed inside containers. better-sqlite3 provides synchronous writes ensuring state consistency for agent interactions.

**Schema (inside target app):**
- `products`: id, name, description, price, image_url, stock_quantity, category
- `orders`: id, buyer_name, total, status, created_at
- `order_items`: id, order_id, product_id, quantity, price
- `cart_items`: id, session_id, product_id, quantity

### Docker container lifecycle

1. **Provision**: API receives scenario_id → fetches config + .db from Supabase → finds available port (8001-8050) → runs container with .db volume mount → returns sandbox_url
2. **Seed**: Container entrypoint runs seed script if no .db mounted, or uses mounted .db as-is
3. **Save**: API pauses container → copies .db out via `docker cp` → uploads to Supabase Storage → creates new scenario record → removes container
4. **Destroy**: API stops and removes container, frees port

Port allocation: maintain an in-memory set of used ports in the API. On startup, query Docker for existing containers to rebuild the set.

### Target app Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

The SQLite .db file is mounted at `/app/data/store.db`. The seed script checks if the file exists; if not, it creates and populates it based on scenario config passed via environment variable `SCENARIO_CONFIG`.

### Control Panel UI architecture

- `/` — Dashboard: list active sandboxes, quick-launch buttons
- `/scenarios` — Browse/manage scenario templates
- `/sandbox/[id]` — Active sandbox view with iframe embed + controls (save state, destroy)

Uses server components for data fetching, client components for interactive elements. API calls go to `http://localhost:8000`.

## Risks / Trade-offs

**[Port exhaustion]** → Limited to 50 concurrent sandboxes (ports 8001-8050). Mitigation: sufficient for hackathon demo. Could switch to dynamic port allocation later.

**[Docker dependency]** → Requires Docker Engine running locally. Mitigation: clear error messages if Docker is not available. Document in README.

**[Supabase cold start]** → Free tier Supabase projects may pause after inactivity. Mitigation: document that users need an active Supabase project. Provide .env.example with required keys.

**[SQLite file locking]** → Extracting .db while app is running could catch a write in progress. Mitigation: pause the container before extraction (already in the design).

**[No auth]** → Anyone with network access can provision/destroy containers. Mitigation: acceptable for local-only hackathon use. Flag as post-hackathon concern.

**[Container cleanup]** → Orphaned containers if API crashes. Mitigation: label all managed containers with `sandbox-platform=true` label. Add a cleanup endpoint that removes all labeled containers.
