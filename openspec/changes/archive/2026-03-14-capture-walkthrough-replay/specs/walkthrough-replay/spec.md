## ADDED Requirements

### Requirement: Replay button in sandbox view
The control panel UI SHALL display a "Replay" button in the sandbox view header when the active sandbox was launched from a scenario that has saved walkthrough steps. The button SHALL NOT appear if the scenario has no saved steps.

#### Scenario: Replay button visible
- **WHEN** a sandbox is launched from a scenario with saved walkthrough steps
- **THEN** the sandbox view header shows a "Replay" button alongside the existing action buttons

#### Scenario: Replay button hidden
- **WHEN** a sandbox is launched from a scenario with no walkthrough steps (null or empty array)
- **THEN** no "Replay" button appears in the sandbox view header

### Requirement: Sequential step replay
When the user clicks "Replay", the control panel SHALL send each saved step to the target app iframe via postMessage in sequence. For each step, the control panel SHALL:
1. Check if the step's URL matches the iframe's current page — if not, send a navigate message and wait for confirmation
2. Send a `replay-click` message with the step's selector
3. Wait for the bridge script to confirm the click was executed before proceeding to the next step

#### Scenario: Replay a 3-step walkthrough
- **WHEN** the user clicks "Replay" on a sandbox with 3 saved steps
- **THEN** the system replays each step in order — navigating to the correct page if needed, locating the element by selector, and clicking it — with a visible pause between steps

#### Scenario: Replay with page navigation
- **WHEN** step 1 is on `/` and step 2 is on `/cart`
- **THEN** the replay navigates the iframe to `/cart` before executing step 2's click

### Requirement: Replay visual feedback
During replay, the target app bridge script SHALL briefly highlight the clicked element with a visible outline or overlay before triggering the click. The control panel SHALL display a replay progress indicator showing the current step number out of total steps.

#### Scenario: Element highlight during replay
- **WHEN** a replay click is executed on an element
- **THEN** the element receives a temporary visual highlight (e.g., colored outline) for 500ms before the click is triggered

#### Scenario: Progress indicator
- **WHEN** replay is in progress at step 3 of 5
- **THEN** the control panel displays "Replaying step 3 / 5" or a similar progress indicator

### Requirement: Replay error handling
If a replay step fails to find the target element after 3 retries (500ms apart), the replay SHALL pause and display an error message indicating which step failed and the selector that could not be found. The user SHALL be able to skip the failed step or abort replay.

#### Scenario: Element not found during replay
- **WHEN** replay attempts to click `[data-testid="deleted-btn"]` and the element does not exist
- **THEN** after 3 retries, replay pauses and shows "Step 4 failed: element not found [data-testid=\"deleted-btn\"]" with "Skip" and "Stop Replay" options

### Requirement: Replay controls
The control panel SHALL provide controls to stop an in-progress replay. During replay, the "Replay" button SHALL change to "Stop Replay".

#### Scenario: Stop replay mid-execution
- **WHEN** the user clicks "Stop Replay" during an active replay at step 3 of 5
- **THEN** replay stops immediately, no further steps are executed, and the button reverts to "Replay"

### Requirement: Bridge script replay support
The target app bridge script SHALL handle `replay-click` messages by locating the element using the provided selector, applying a visual highlight, calling `.click()` on the element, and posting a confirmation message back to the parent. The bridge script SHALL handle `navigate` messages by navigating to the specified URL path and posting a confirmation once the page has loaded.

#### Scenario: Replay click execution
- **WHEN** the bridge receives `{ type: "replay-click", selector: "[data-testid=\"add-to-cart-btn-1\"]" }`
- **THEN** the script finds the element, highlights it, clicks it, and posts `{ type: "replay-click-done", index: 0, success: true }`

#### Scenario: Navigate for replay
- **WHEN** the bridge receives `{ type: "navigate", url: "/admin" }`
- **THEN** the script navigates to `/admin` and posts `{ type: "navigate-done", url: "/admin" }` once the page content has loaded

#### Scenario: Element not found for replay
- **WHEN** the bridge receives a `replay-click` for a selector that matches no element
- **THEN** the script posts `{ type: "replay-click-done", index: 0, success: false, error: "Element not found" }`
