## MODIFIED Requirements

### Requirement: Sequential step replay
When the user clicks "Replay", the control panel SHALL send each saved step to the target app iframe via postMessage in sequence. For each step, the control panel SHALL:
1. If the step's action is `"navigate"`: send a `navigate` message with the step's URL and wait for `navigate-done` or `bridge-ready` confirmation
2. If the step's action is `"click"`: send a `replay-click` message with the step's selector and wait for confirmation. If the click causes a URL change (detected by receiving `url-changed` or `bridge-ready` within the inter-step delay), wait for the new page to settle before proceeding.
3. If the step's action is `"input"`: send a `replay-input` message with the step's selector and value, and wait for confirmation

The replay SHALL NOT skip any steps based on URL comparisons between consecutive steps. All recorded steps SHALL be replayed in order.

#### Scenario: Replay a workflow with mixed step types
- **WHEN** the user clicks "Replay" on a workflow with steps: [click "Add to Cart", click "Cart" link, click "Checkout"]
- **THEN** all three clicks are replayed in order — the second click navigates to /cart as a side effect, and replay waits for the page to load before executing the third click

#### Scenario: Replay a navigate step
- **WHEN** the replay encounters a step with `action: "navigate"` and `url: "/admin"`
- **THEN** the replay sends `{ type: "navigate", url: "/admin" }` to the iframe and waits for `navigate-done` or `bridge-ready` before proceeding

#### Scenario: Replay a click that causes navigation
- **WHEN** the replay executes a click on an `<a href="/cart">` element
- **THEN** the click is executed, and if a `url-changed` or `bridge-ready` message is received within the settling period, replay waits for the page to stabilize before proceeding to the next step

#### Scenario: Replay with page navigation via navigate step
- **WHEN** step 1 is a click on `/` and step 2 is a navigate step to `/admin`
- **THEN** step 1's click is replayed, then the iframe is navigated to `/admin` via the navigate step

### Requirement: Replay visual feedback
During replay, the target app bridge script SHALL briefly highlight the clicked element with a visible outline or overlay before triggering the click. The control panel SHALL display a replay progress indicator showing the current step number out of total steps. For navigate steps, no element highlight is shown — only the progress indicator advances.

#### Scenario: Element highlight during replay click
- **WHEN** a replay click is executed on an element
- **THEN** the element receives a temporary visual highlight (e.g., colored outline) for 500ms before the click is triggered

#### Scenario: Progress indicator during navigate step
- **WHEN** replay is executing a navigate step (step 3 of 5)
- **THEN** the control panel displays "Replaying step 3 / 5" and no element highlight is shown in the iframe

#### Scenario: Progress indicator
- **WHEN** replay is in progress at step 3 of 5
- **THEN** the control panel displays "Replaying step 3 / 5" or a similar progress indicator

### Requirement: Replay error handling
If a replay click or input step fails to find the target element after 3 retries (500ms apart), the replay SHALL pause and display an error message indicating which step failed and the selector that could not be found. The user SHALL be able to skip the failed step or abort replay. Navigate steps SHALL NOT fail due to element-not-found errors — they only fail on navigation timeout.

#### Scenario: Element not found during replay
- **WHEN** replay attempts to click `[data-testid="deleted-btn"]` and the element does not exist
- **THEN** after 3 retries, replay pauses and shows "Step 4 failed: element not found [data-testid=\"deleted-btn\"]" with "Skip" and "Stop Replay" options

#### Scenario: Navigate step timeout
- **WHEN** replay sends a navigate message and neither `navigate-done` nor `bridge-ready` is received within 8 seconds
- **THEN** replay logs a warning and proceeds to the next step
