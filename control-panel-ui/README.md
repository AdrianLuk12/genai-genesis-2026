# Control Panel UI

Front-end UI for managing scenarios and launched sandboxes in the Sandbox Platform.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS + shadcn/ui components

## Local Development

```bash
cd control-panel-ui
npm install
```

Create `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build / Lint

```bash
npm run build
npm run lint
```

## Key Routes

- `/` — sandbox dashboard
- `/scenarios` — scenario management
- `/sandbox/[id]` — sandbox session view

## API Dependency

This UI expects `control-panel-api` to be running and reachable at `NEXT_PUBLIC_API_URL`.

