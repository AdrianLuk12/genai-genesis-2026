## Context

The sandbox platform lets users spin up Docker containers from scenario templates, interact with a target e-commerce app via iframe, and save the resulting database state as a new scenario. Currently, only the final DB state is captured — there's no record of the user's click journey. The target app already has `data-testid` attributes on all interactive elements, making DOM-based identification straightforward.

The iframe currently loads at `sandbox.sandbox_url` (e.g., `http://localhost:8005/`) and the control panel UI has no communication channel with it.

## Goals / Non-Goals

**Goals:**
- Capture every user click inside the target app iframe as a DOM-selector-based step (not pixel coordinates)
- Persist captured steps alongside the saved walkthrough DB state
- Replay saved steps automatically when a walkthrough-derived sandbox is launched
- Make replays resilient to layout changes by relying on `data-testid` and CSS selectors

**Non-Goals:**
- Capturing non-click interactions (typing, scrolling, drag-and-drop) — clicks only for v1
- Recording timing/delays between steps for exact-speed replay
- Modifying the target app source code — capture must work externally
- Supporting cross-origin iframes (target app runs on localhost, same-origin policy doesn't apply since we control both)

## Decisions

### 1. Capture mechanism: Injected script via iframe contentWindow

**Decision:** Access the iframe's `contentWindow.document` from the control panel UI and attach a click event listener at the document level.

**Rationale:** Since both the control panel (localhost:3000) and target app (localhost:800x) are on the same host but different ports, they are technically cross-origin. However, we can use `postMessage` as a communication bridge. The approach:
- Inject a small capture script into the iframe via a `<script>` tag appended to the iframe's document after load, OR use a `postMessage`-based approach where the target app includes a lightweight listener.
- **Chosen: postMessage bridge.** The control panel sends a "start-capture" message to the iframe. The target app includes a small inline script (added to its layout) that listens for this message, attaches a document-level click listener, and posts back each click event's DOM selector info.

**Why not direct contentWindow access:** Cross-origin restrictions prevent direct DOM access between different ports. postMessage is the standard cross-origin communication mechanism.

**Why not coordinates:** Coordinates break when viewport size changes, when content reflows, or when dynamic content shifts elements. DOM selectors via `data-testid` are stable identifiers.

### 2. DOM selector strategy: data-testid first, fallback to CSS path

**Decision:** For each captured click, build the selector in priority order:
1. `[data-testid="<value>"]` — if the clicked element or nearest ancestor has one
2. `button:has-text("<text>")` / `a:has-text("<text>")` — for semantic elements with text
3. CSS selector path (e.g., `main > div:nth-child(2) > button`) — as last resort

Store all three when available so replay can try the most stable selector first.

**Rationale:** The target app spec requires `data-testid` on all interactive elements, so option 1 will cover most cases. The fallbacks handle edge cases.

### 3. Step data model

Each captured step is a JSON object:
```json
{
  "index": 0,
  "timestamp": 1710000000000,
  "url": "/cart",
  "selector": "[data-testid=\"checkout-btn\"]",
  "fallbackSelectors": ["button:nth-child(1)"],
  "elementTag": "BUTTON",
  "elementText": "Checkout",
  "pageTitle": "Cart - Store"
}
```

Steps are stored as a JSON array in a `walkthrough_steps` TEXT column on the `scenarios` table (not a separate table — the data is always accessed together with the scenario and is bounded in size).

### 4. Storage: Column on scenarios table

**Decision:** Add a `walkthrough_steps TEXT DEFAULT NULL` column to the `scenarios` table.

**Why not a separate table:** Steps are always loaded/saved with their parent scenario. A JSON column keeps the schema simple and avoids joins. Step arrays are bounded (a walkthrough is typically 5-50 clicks).

### 5. Replay mechanism: Sequential click dispatch with page navigation

**Decision:** Replay runs in the control panel UI. For each step:
1. Check if the iframe's current URL path matches the step's `url` — if not, navigate the iframe by setting `iframe.contentWindow.postMessage({ type: 'navigate', url: step.url })`.
2. Wait for the target app to confirm navigation complete via postMessage.
3. Send a `{ type: 'replay-click', selector: step.selector }` message to the iframe.
4. The target app's bridge script locates the element and calls `.click()` on it.
5. Wait for confirmation or a short timeout before proceeding to the next step.

Visual feedback: highlight the clicked element briefly (CSS outline flash) during replay.

### 6. Target app bridge script

A small script added to the target app's root layout (`layout.tsx`) that:
- Listens for `postMessage` events from the parent window
- On `start-capture`: attaches a document click listener that posts back step data
- On `stop-capture`: removes the listener
- On `replay-click`: finds element by selector, highlights it, clicks it, posts confirmation
- On `navigate`: uses `window.location.href` or Next.js router to navigate, posts confirmation when ready

This is the only change to the target app source code — a single `<script>` block or small component in the layout.

## Risks / Trade-offs

- **Cross-origin postMessage security** → Validate `event.origin` in both directions to prevent injection. Only accept messages from `localhost:3000` in the target app and from `localhost:800x` in the control panel.
- **SPA navigation during replay** → Next.js client-side navigation may not trigger a full page load. The bridge script should listen for `popstate` and Next.js route changes to detect navigation completion. → Mitigation: use `MutationObserver` or a short delay after navigation.
- **Dynamic content timing** → Elements may not exist immediately after navigation (React hydration, data fetching). → Mitigation: retry finding the selector up to 3 times with 500ms intervals before failing the step.
- **Step count growth** → For very long walkthroughs, the JSON blob could get large. → Acceptable for v1; typical walkthroughs are under 50 steps. Can add compression later if needed.
- **iframe sandbox attribute** → The iframe currently has no `sandbox` attribute, which is fine. Adding one would restrict postMessage. → Ensure no `sandbox` attribute is added.
