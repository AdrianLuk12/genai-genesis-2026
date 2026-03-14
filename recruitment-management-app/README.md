# Recruitment Management App

Recruitment-focused sample app built with Next.js App Router and TypeScript.

This app is designed to be managed by the Sandbox Platform (control panel), similar to other sample target apps, while keeping all product functionality within the recruitment domain.

## Scope

- Job requisition management
- Candidate pipeline tracking
- Interview scheduling board
- Live dashboard metrics
- User-facing careers portal
- Protected admin operations console

## Architecture

The app is organized by intent using Next.js route groups:

- `src/app/(public)` for role entry and sign-in routes
- `src/app/(workspace)` for recruiter and candidate workspace screens
- `src/app/api` for route handlers

Shared UI and behavior live in:

- `src/components/layout` for app shell and navigation framing
- `src/components/auth` for reusable login form behavior
- `src/lib` for auth utilities and data-store logic

Styling uses a custom design system in `src/app/globals.css` (no Tailwind CSS).

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm run dev -- --port 3002
   ```

3. Open `http://localhost:3002`.

## Experience split (for demos)

- Role selector on first load: `/`
- User login: `/user-login`
- Admin login: `/login`
- Recruitment operations UI (shared dashboards/pages): `/jobs`, `/candidates`, `/interviews`
- User-facing careers portal: `/careers`, `/careers/apply`
- Admin console: `/admin`, `/admin/jobs`, `/admin/candidates`, `/admin/interviews`

Admin and user routes are protected by proxy route guards and require their respective auth cookies.

Recruiter operation routes are also protected:

- `/jobs`
- `/candidates`
- `/interviews`

Configure credentials in `.env` (copy from `.env.example`) using:

- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`
- `AUTH_USER_EMAIL`
- `AUTH_USER_PASSWORD`

Login forms are prefilled with development defaults for quick demos.

To use your own credentials, update `.env` values and restart the app.

## Data model

Current implementation uses local JSON stores:

- `data/recruitment.json` for recruitment workflows

The store auto-seeds realistic mock data and auto-backfills sparse existing files.

## Recruitment API endpoints

- `GET/POST /api/jobs`
- `PATCH/DELETE /api/jobs/:id`
- `GET/POST /api/candidates`
- `PATCH/DELETE /api/candidates/:id`
- `GET/POST /api/interviews`
- `PATCH/DELETE /api/interviews/:id`
- `GET /api/metrics`

## Auth endpoints

- `POST /api/auth/login`
- `POST /api/auth/user-login`
- `POST /api/auth/logout`

## Mock data included

- Multiple jobs
- Candidates across all funnel stages
- Scheduled/completed/canceled interviews

## IBM Db2 readiness

Environment variables are included in `.env.example` for future Db2 migration:

- `DB_PROVIDER`
- `DB2_DSN`
- `DB2_HOST`, `DB2_PORT`, `DB2_DATABASE`
- `DB2_USERNAME`, `DB2_PASSWORD`, `DB2_SECURITY`

## Environment setup

```bash
cp .env.example .env
```

## Build check

```bash
npm run build
```