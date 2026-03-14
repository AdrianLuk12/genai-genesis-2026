## Purpose
Click capture capability for recording user interactions within sandboxed target app iframes via postMessage bridge communication.

## Requirements

### Requirement: Capture click events via postMessage bridge
The control panel UI SHALL send a `start-capture` message to the target app iframe via `postMessage` when a sandbox view page loads. The target app bridge script SHALL attach a document-level click event listener that captures each click and posts the step data back to the parent window.

#### Scenario: Start capture on sandbox load
- **WHEN** the sandbox view page loads and the iframe becomes ready
- **THEN** the control panel sends `{ type: "start-capture" }` to the iframe via postMessage, and the bridge script begins recording clicks

#### Scenario: Capture a click event
- **WHEN** a user clicks any element inside the target app iframe while capture is active
- **THEN** the bridge script posts a message to the parent window containing the element's `data-testid` selector (if present), fallback CSS selector, element tag name, element text content, current page URL path, and a timestamp

#### Scenario: Stop capture
- **WHEN** the control panel sends `{ type: "stop-capture" }` to the iframe
- **THEN** the bridge script removes the click listener and stops recording

### Requirement: DOM selector extraction
The bridge script SHALL extract selectors for clicked elements using a priority order: `data-testid` attribute first, then semantic element with text content, then CSS path as fallback.

#### Scenario: Element with data-testid
- **WHEN** a user clicks an element with `data-testid="add-to-cart-btn-1"`
- **THEN** the captured step's selector is `[data-testid="add-to-cart-btn-1"]`

#### Scenario: Element without data-testid but with text
- **WHEN** a user clicks a `<button>` element with text "Checkout" and no `data-testid`
- **THEN** the captured step's selector uses the nearest ancestor with a `data-testid`, or falls back to a CSS path, and includes `elementText: "Checkout"` for debugging

#### Scenario: Fallback to CSS path
- **WHEN** a user clicks an element with no `data-testid` and no identifiable text
- **THEN** the captured step's selector is a CSS path like `main > div:nth-child(2) > button`

### Requirement: Step data structure
Each captured step SHALL be a JSON object with fields: `index` (number), `timestamp` (milliseconds), `url` (page path), `selector` (primary DOM selector string), `fallbackSelectors` (array of alternative selectors), `elementTag` (HTML tag name), `elementText` (trimmed text content, max 100 chars), and `pageTitle` (document title).

#### Scenario: Step object shape
- **WHEN** a click is captured on the cart page checkout button
- **THEN** the step object contains `{ index: 2, timestamp: 1710000000000, url: "/cart", selector: "[data-testid=\"checkout-btn\"]", fallbackSelectors: [], elementTag: "BUTTON", elementText: "Checkout", pageTitle: "Cart" }`

### Requirement: Accumulated steps state in control panel
The control panel UI SHALL maintain an array of captured steps in React state during the sandbox session. Each incoming step message from the iframe SHALL be appended to this array.

#### Scenario: Multiple clicks accumulate
- **WHEN** a user clicks 5 elements in sequence inside the iframe
- **THEN** the control panel holds an array of 5 step objects in state, each with incrementing index values

### Requirement: Bridge script in target app layout
The target app SHALL include a postMessage bridge script in its root layout that listens for messages from the parent window. The script SHALL validate `event.origin` before processing any message.

#### Scenario: Bridge script loads
- **WHEN** the target app loads inside an iframe
- **THEN** the bridge script is active and listening for postMessage events from the parent origin

#### Scenario: Origin validation
- **WHEN** a postMessage is received from an unknown origin
- **THEN** the bridge script ignores the message
