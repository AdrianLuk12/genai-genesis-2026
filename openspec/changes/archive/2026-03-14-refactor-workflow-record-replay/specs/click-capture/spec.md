## MODIFIED Requirements

### Requirement: Capture click events via postMessage bridge
The control panel UI SHALL send a `start-capture` message to the target app iframe via `postMessage` when a sandbox view page loads. The target app bridge script SHALL attach a document-level click event listener that captures each click and posts the step data back to the parent window. The bridge script SHALL NOT filter, buffer, or discard any clicks — all clicks SHALL be sent immediately as `step-captured` messages regardless of whether the clicked element is a navigation element (anchor tag, form submit button, etc.).

#### Scenario: Start capture on sandbox load
- **WHEN** the sandbox view page loads and the iframe becomes ready
- **THEN** the control panel sends `{ type: "start-capture" }` to the iframe via postMessage, and the bridge script begins recording clicks

#### Scenario: Capture a click event
- **WHEN** a user clicks any element inside the target app iframe while capture is active
- **THEN** the bridge script immediately posts a `step-captured` message to the parent window containing the element's selector, tag name, text content, current page URL path, and timestamp

#### Scenario: Capture a click on a navigation element
- **WHEN** a user clicks an anchor tag (`<a href="/cart">`) inside the target app iframe while capture is active
- **THEN** the bridge script immediately posts a `step-captured` message with the click data, without buffering or waiting to see if a URL change follows

#### Scenario: Capture a click on a form submit button
- **WHEN** a user clicks a submit button inside a form while capture is active
- **THEN** the bridge script immediately posts a `step-captured` message with the click data

#### Scenario: Stop capture
- **WHEN** the control panel sends `{ type: "stop-capture" }` to the iframe
- **THEN** the bridge script removes the click listener and stops recording

### Requirement: Step data structure
Each captured step SHALL be a JSON object with fields: `index` (number), `timestamp` (milliseconds), `url` (page path), `selector` (primary DOM selector string), `fallbackSelectors` (array of alternative selectors), `elementTag` (HTML tag name), `elementText` (trimmed text content, max 100 chars), `pageTitle` (document title), and `action` (one of `"click"`, `"input"`, or `"navigate"`). Input steps SHALL additionally include `inputValue` and `inputType`. Navigate steps SHALL have empty `selector`, `fallbackSelectors`, `elementTag`, and `elementText` fields.

#### Scenario: Click step object shape
- **WHEN** a click is captured on the cart page checkout button
- **THEN** the step object contains `{ index: 2, timestamp: 1710000000000, url: "/cart", selector: "[data-testid=\"checkout-btn\"]", fallbackSelectors: [], elementTag: "BUTTON", elementText: "Checkout", pageTitle: "Cart", action: "click" }`

#### Scenario: Navigate step object shape
- **WHEN** the user types "/admin" in the nav bar and presses Enter
- **THEN** the step object contains `{ index: 3, timestamp: 1710000000000, url: "/admin", selector: "", fallbackSelectors: [], elementTag: "", elementText: "", pageTitle: "", action: "navigate" }`

## ADDED Requirements

### Requirement: Record user-initiated nav bar actions as navigate steps
The control panel UI SHALL record a `CapturedStep` with `action: "navigate"` when the user performs any of the following nav bar actions: typing a URL path and pressing Enter, clicking the back button, clicking the forward button, or clicking the refresh button. The step's `url` field SHALL contain the target path. These navigate steps SHALL be appended to the captured steps array alongside click and input steps.

#### Scenario: User navigates via URL bar
- **WHEN** the user types "/products" in the nav bar input and presses Enter
- **THEN** a navigate step with `url: "/products"` and `action: "navigate"` is appended to the captured steps array

#### Scenario: User clicks back button
- **WHEN** the user clicks the back button in the nav bar
- **THEN** a navigate step with `url` set to the previous history path and `action: "navigate"` is appended to the captured steps array

#### Scenario: User clicks forward button
- **WHEN** the user clicks the forward button in the nav bar
- **THEN** a navigate step with `url` set to the next history path and `action: "navigate"` is appended to the captured steps array

#### Scenario: User clicks refresh button
- **WHEN** the user clicks the refresh button in the nav bar
- **THEN** a navigate step with `url` set to the current path and `action: "navigate"` is appended to the captured steps array

#### Scenario: Nav bar actions not recorded during replay
- **WHEN** replay is in progress and the nav bar is not interactive
- **THEN** no navigate steps are recorded from nav bar actions
