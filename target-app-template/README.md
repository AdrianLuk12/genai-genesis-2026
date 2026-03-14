# Target App Template

Containerized sample storefront app used by the Sandbox Platform when launching sandboxes.

## Stack

- Next.js App Router
- SQLite (`better-sqlite3`)
- Faker-based seed generation

## Local Development

```bash
cd target-app-template
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data Seeding

- `npm run seed` seeds `data/store.db`
- On `npm start`, `scripts/entrypoint.js` seeds automatically if DB does not exist

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

