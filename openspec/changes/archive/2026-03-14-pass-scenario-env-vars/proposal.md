## Why

Scenario environment variables defined in `config_json.env` are not actually passed as individual environment variables to Docker containers — only the entire `config_json` blob is passed as a single `SCENARIO_CONFIG` variable. Additionally, the `start_url` configured on a scenario is stored but never used when launching the sandbox — the iframe always starts at `/`. This means scenario configuration has no real effect on the container or sandbox behavior.

## What Changes

- **Pass individual env vars to container**: When launching a sandbox, extract each key-value pair from `config_json.env` and pass them as individual Docker environment variables alongside `SCENARIO_CONFIG`.
- **Return start_url from sandbox creation API**: The `POST /api/sandboxes` response should include the scenario's `start_url` so the UI can navigate the iframe to the correct initial page.
- **Use start_url when opening sandbox**: After creating a sandbox, the UI should navigate to the sandbox page with the `start_url` so the iframe loads the correct initial page instead of always defaulting to `/`.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `sandbox-provisioning`: Container environment setup must inject individual env vars from scenario config; API response must include `start_url`.
- `scenario-management`: No spec change needed (config_json format is already correct), but documenting that env vars and start_url are now actively consumed.

## Impact

- **Backend** (`control-panel-api/app/main.py`): `POST /api/sandboxes` handler — env var injection logic (lines 630-632), response shape (line 662-668).
- **Frontend** (`control-panel-ui/src/app/sandbox/[id]/page.tsx`): Initial `iframePath` state must respect `start_url` instead of hardcoded `/`.
- **Frontend** (`control-panel-ui/src/app/apps/[id]/page.tsx`, `scenarios/[id]/page.tsx`, `live/page.tsx`): `launchSandbox` functions must pass `start_url` to sandbox page.
- **No breaking changes**: `SCENARIO_CONFIG` continues to be set for backward compatibility. Individual env vars are additive.
