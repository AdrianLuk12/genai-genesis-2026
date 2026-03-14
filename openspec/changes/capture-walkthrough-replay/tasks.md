## 1. Database Schema

- [ ] 1.1 Add `walkthrough_steps` TEXT column (nullable, default NULL) to `scenarios` table via safe migration in `db.py`
- [ ] 1.2 Update `row_to_dict` in `main.py` to parse `walkthrough_steps` from JSON string to array (similar to `config_json` handling)

## 2. API Changes

- [ ] 2.1 Update `SaveRequest` model to accept optional `walkthrough_steps: list | None` field
- [ ] 2.2 Update `save_walkthrough` endpoint to persist `walkthrough_steps` as JSON string in the new scenario record
- [ ] 2.3 Verify `GET /api/scenarios` and `GET /api/scenarios/{id}` return `walkthrough_steps` field (handled by row_to_dict)

## 3. Target App Bridge Script

- [ ] 3.1 Create a `CaptureReplayBridge` client component in the target app (`target-app-template/src/components/capture-bridge.tsx`)
- [ ] 3.2 Implement `start-capture` handler: attach document-level click listener that extracts DOM selectors (data-testid first, CSS path fallback) and posts step data to parent window
- [ ] 3.3 Implement `stop-capture` handler: remove the click listener
- [ ] 3.4 Implement `replay-click` handler: find element by selector, apply highlight effect, trigger `.click()`, post confirmation
- [ ] 3.5 Implement `navigate` handler: navigate to specified URL path, post confirmation when page content has loaded
- [ ] 3.6 Add origin validation to only accept messages from the control panel origin
- [ ] 3.7 Include the bridge component in target app root layout (`layout.tsx`)

## 4. Control Panel UI - Click Capture

- [ ] 4.1 Add `capturedSteps` state array and `postMessage` listener to sandbox view page to receive step data from iframe
- [ ] 4.2 Send `start-capture` message to iframe via postMessage once sandbox is ready and iframe has loaded
- [ ] 4.3 Add a "Recording" indicator in the sandbox view showing the number of captured steps
- [ ] 4.4 Pass captured steps array in the request body when calling the save walkthrough endpoint

## 5. Control Panel UI - Replay

- [ ] 5.1 Fetch the parent scenario's `walkthrough_steps` when sandbox view loads to determine if replay is available
- [ ] 5.2 Add "Replay" button to sandbox view header (visible only when walkthrough_steps exist)
- [ ] 5.3 Implement replay logic: iterate through steps sequentially, sending `navigate` and `replay-click` messages via postMessage, waiting for confirmations between steps
- [ ] 5.4 Add replay progress indicator showing current step / total steps
- [ ] 5.5 Add error handling for failed steps (element not found after 3 retries) with Skip/Stop options
- [ ] 5.6 Add "Stop Replay" control that halts replay mid-execution

## 6. Rebuild Target App Docker Image

- [ ] 6.1 Rebuild the `sandbox-target-app` Docker image to include the bridge script changes
