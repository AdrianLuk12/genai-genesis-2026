## 1. Backend — Pass individual env vars to container

- [x] 1.1 In `POST /api/sandboxes` handler (`control-panel-api/app/main.py`), extract `config_json.env` dict and add each key-value pair to the Docker `environment` dict before setting `SCENARIO_CONFIG`
- [x] 1.2 Ensure `SCENARIO_CONFIG` is set after individual env vars so it takes precedence on name collision

## 2. Backend — Return start_url in sandbox creation response

- [x] 2.1 In `POST /api/sandboxes` handler, extract `start_url` from `config_json` (default to `/`) and include it in the response dict

## 3. Frontend — Pass start_url to sandbox page on launch

- [x] 3.1 In `control-panel-ui/src/app/apps/[id]/page.tsx` `launchSandbox`, read `start_url` from API response and append as `?startUrl=` query param when navigating to sandbox page
- [x] 3.2 In `control-panel-ui/src/app/scenarios/[id]/page.tsx` `launchSandbox`, same change — pass `start_url` as query param
- [x] 3.3 In `control-panel-ui/src/app/live/page.tsx` `launchSandbox`, same change — pass `start_url` as query param

## 4. Frontend — Sandbox page uses start_url for initial iframe path

- [x] 4.1 In `control-panel-ui/src/app/sandbox/[id]/page.tsx`, read `startUrl` from `searchParams` and use it as the initial value of `iframePath` state instead of hardcoded `/`
