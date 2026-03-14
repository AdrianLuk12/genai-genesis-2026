## 1. Database Schema

- [x] 1.1 Add `walkthrough_steps` TEXT column (nullable, default NULL) to `scenarios` table via safe migration in `db.py`
- [x] 1.2 Update `row_to_dict` in `main.py` to parse `walkthrough_steps` from JSON string to array (similar to `config_json` handling)

## 2. API Changes

- [x] 2.1 Update `SaveRequest` model to accept optional `walkthrough_steps: list | None` field
- [x] 2.2 Update `save_walkthrough` endpoint to persist `walkthrough_steps` as JSON string in the new scenario record
- [x] 2.3 Verify `GET /api/scenarios` and `GET /api/scenarios/{id}` return `walkthrough_steps` field (handled by row_to_dict)

## 3. External Bridge Script (refactored from target app)

- [x] 3.1 Create standalone `bridge.js` at `control-panel-api/app/static/bridge.js` with click capture, input capture, replay-click, replay-input, and navigate handlers
- [x] 3.2 Add reverse proxy endpoint (`/proxy/{port}/{path}`) to FastAPI that injects bridge.js into HTML responses
- [x] 3.3 Add `httpx` dependency for async HTTP proxying
- [x] 3.4 Mount `/static` directory for serving bridge.js
- [x] 3.5 Remove `CaptureReplayBridge` component from target app and revert layout.tsx

## 4. Control Panel UI - Click Capture + Input Capture

- [x] 4.1 Add `capturedSteps` state array and `postMessage` listener to sandbox view page to receive step data from iframe
- [x] 4.2 Send `start-capture` message to iframe via postMessage once sandbox is ready and iframe has loaded
- [x] 4.3 Add a "Recording" indicator in the sandbox view showing the number of captured steps
- [x] 4.4 Pass captured steps array in the request body when calling the save walkthrough endpoint
- [x] 4.5 Support `action: "input"` steps in capture (typing into input/textarea fields)

## 5. Control Panel UI - Replay

- [x] 5.1 Fetch the parent scenario's `walkthrough_steps` when sandbox view loads to determine if replay is available
- [x] 5.2 Add "Replay" button to sandbox view header (visible only when walkthrough_steps exist)
- [x] 5.3 Implement replay logic with `flushSync` for step counter updates, supporting both click and input actions
- [x] 5.4 Add replay progress indicator showing current step / total steps
- [x] 5.5 Add error handling for failed steps (element not found after 3 retries) with Skip/Stop options
- [x] 5.6 Add "Stop Replay" control that halts replay mid-execution
- [x] 5.7 Use proxy URL for iframe src instead of direct sandbox URL
- [x] 5.8 Add click location overlay (ripple animation) on iframe during replay
- [x] 5.9 Add expandable console log panel showing live capture/replay events

## 6. Rebuild Target App Docker Image

- [x] 6.1 Rebuild the `sandbox-target-app` Docker image (bridge removed, app is clean)
