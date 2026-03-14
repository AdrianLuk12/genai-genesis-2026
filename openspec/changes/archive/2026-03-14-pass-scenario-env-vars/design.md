## Context

Scenarios store configuration in a `config_json` field with the structure `{ start_url: string, env: Record<string, string> }`. Currently, the `POST /api/sandboxes` endpoint bundles the entire `config_json` into a single `SCENARIO_CONFIG` environment variable when launching a Docker container. Individual env vars from `config_json.env` are never injected as separate Docker environment variables. The `start_url` is stored but never returned in the API response or used by the frontend — the sandbox iframe always opens at `/`.

## Goals / Non-Goals

**Goals:**
- Pass each key-value pair from `config_json.env` as an individual Docker environment variable so containerized apps can read them via standard `process.env` access.
- Continue passing `SCENARIO_CONFIG` for backward compatibility with seed scripts.
- Return `start_url` from the `POST /api/sandboxes` response so the UI can navigate to the correct initial page.
- Have the sandbox iframe load the scenario's `start_url` instead of `/`.

**Non-Goals:**
- Changing the `config_json` schema or storage format.
- Adding env var validation or allowlisting on the backend.
- Modifying how `SCENARIO_CONFIG` is parsed by target apps.

## Decisions

### 1. Inject individual env vars alongside SCENARIO_CONFIG

The backend will iterate over `config_json["env"]` and add each key-value pair to the Docker `environment` dict. `SCENARIO_CONFIG` continues to be set with the full `config_json` blob.

**Rationale**: This is additive and backward-compatible. Apps that read `SCENARIO_CONFIG` keep working. Apps that want individual env vars (e.g., `process.env.API_KEY`) now get them directly.

**Alternative considered**: Only pass individual env vars and remove `SCENARIO_CONFIG`. Rejected because existing seed scripts depend on `SCENARIO_CONFIG`.

### 2. Return start_url in the sandbox creation API response

The `POST /api/sandboxes` response will include a `start_url` field extracted from the scenario's `config_json.start_url`, defaulting to `/`.

**Rationale**: The UI needs to know where to point the iframe. Returning it in the response avoids a second fetch to get the scenario config.

### 3. Pass start_url as a query parameter to the sandbox page

The `launchSandbox` function in the UI will navigate to `/sandbox/{container_id}?startUrl={start_url}`. The sandbox page reads this query param and uses it as the initial `iframePath`.

**Rationale**: This is the simplest approach — no extra API calls, no state management changes. The query param is only used on initial load.

**Alternative considered**: Fetching scenario config from the sandbox page. Rejected as it adds unnecessary network requests and complexity.

## Risks / Trade-offs

- **Env var name collision with SCENARIO_CONFIG**: If a user defines an env var named `SCENARIO_CONFIG`, it would override the system-set one. → Mitigation: The individual env vars are applied first, then `SCENARIO_CONFIG` is set, so the system value wins. Document this behavior.
- **Large env var payloads**: If users add many or large env vars, Docker has limits. → Low risk in practice; no mitigation needed now.
- **URL encoding of start_url in query param**: Paths with special characters need encoding. → Use `encodeURIComponent` on the frontend.
