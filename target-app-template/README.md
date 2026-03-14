# Target App Template

Containerized sample storefront app used by the Sandbox Platform when launching sandboxes.

## Stack

- Next.js App Router
- SQLite (`better-sqlite3`)
- Faker-based seed generation

## Local Development

```bash
cd target-app-template
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data Seeding

- `npm run seed` seeds `data/store.db`
- On `npm start`, `scripts/entrypoint.js` seeds automatically if DB does not exist
- Set `SEED_COUNT` env var to control how many products are generated (default: 25)
- Set `SCENARIO_CONFIG` as JSON to override individual seed parameters (e.g. `{"product_count":50,"inventory_status":"low"}`)
- `SCENARIO_CONFIG` keys take precedence over `SEED_COUNT`

See `.env.example` for all available variables.

## Docker (used by control-panel-api)

Build image:

```bash
docker build -t sandbox-target-app .
```

Run manually:

```bash
docker run --rm -p 3000:3000 sandbox-target-app
```

The API launches this image and maps container `3000` to host ports `8001-8050`.

## Build / Lint

```bash
npm run build
npm run lint
```
