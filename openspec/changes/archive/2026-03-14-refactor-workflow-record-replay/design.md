## Context

The workflow record/replay system captures user interactions inside sandboxed target app iframes and replays them later. It consists of:

1. **bridge.js** (injected into the target app iframe): captures clicks, inputs, and URL changes via postMessage
2. **sandbox/[id]/page.tsx** (control panel UI): accumulates captured steps, drives replay
3. **sandbox-nav-bar.tsx** (control panel): user-facing URL bar with back/forward/refresh

Currently, bridge.js uses a 500ms buffer to detect "navigation-only clicks" (clicks on `<a href>` or form submit buttons) and discards them if a URL change follows. All URL changes from the bridge are forwarded as events. This conflates two concerns: click recording and navigation tracking.

## Goals / Non-Goals

**Goals:**
- Record ALL clicks unconditionally — no heuristic filtering
- Record user-initiated nav bar actions (URL entry, back, forward, refresh) as explicit "navigate" steps
- Simplify replay by removing the "skip navigation-only clicks" heuristic
- Maintain nav bar sync (bridge still reports URL changes for display purposes)

**Non-Goals:**
- Changing the step data structure beyond adding `"navigate"` to the action union
- Modifying the API or database schema
- Changing input capture behavior
- Changing the agent loop's use of navigate/click commands

## Decisions

### 1. Remove navigation click buffer entirely from bridge.js

**Decision**: Delete `pendingNavClick`, `pendingNavTimer`, `flushPendingNavClick()`, `discardPendingNavClick()`, and `isNavigationElement()`. All clicks post `step-captured` immediately.

**Rationale**: The buffer approach was fragile (500ms timing, heuristic element detection). Recording all clicks is simpler and preserves full interaction context. The 500ms delay also caused visible lag in the recording indicator.

**Alternative considered**: Keeping the buffer but making it configurable — rejected because the whole buffering concept is the problem, not the timing.

### 2. Nav bar actions recorded in the control panel UI, not the bridge

**Decision**: The sandbox page records "navigate" steps when `SandboxNavBar` callbacks fire (back, forward, refresh, URL submit). The bridge does NOT record these — it only reports URL changes for nav bar sync.

**Rationale**: Nav bar actions happen in the control panel, not the iframe. The control panel already has the callbacks (`onNavigate`, `onRefresh`, `goBack`, `goForward`). Recording at the source avoids cross-boundary coordination.

### 3. Bridge URL-changed messages remain but don't create steps

**Decision**: bridge.js continues sending `url-changed` messages. The control panel continues using them to sync the nav bar display and `iframePath`. But they no longer trigger step recording.

**Rationale**: The nav bar sync is a separate concern from step recording. Removing `url-changed` entirely would break the nav bar display.

### 4. Replay: remove URL-based navigation heuristic, add "navigate" step type

**Decision**: Replay no longer checks if `prevUrl !== step.url` to send navigate commands. Instead:
- `"click"` steps: send `replay-click`, wait for done. If the click causes navigation, the bridge reinitializes and replay proceeds.
- `"navigate"` steps: send `navigate` message to iframe, wait for `navigate-done` or `bridge-ready`.
- `"input"` steps: unchanged.

The "skip navigation-only clicks" block (lines 461-469 in page.tsx) is removed entirely.

**Rationale**: With all clicks recorded, no clicks should be skipped. Navigation between pages happens either naturally (from click side effects) or explicitly (from navigate steps). This is more predictable than heuristic URL diffing.

### 5. Post-click navigation settling

**Decision**: After replaying a click step, if the iframe sends `url-changed` or `bridge-ready` within the existing 800ms inter-step sleep, replay naturally waits. For full page reloads, the bridge sends `bridge-ready`, and replay should wait for it before proceeding to the next step.

**Implementation**: After `replay-click-done`, check if the next step's URL differs. If so, wait for `bridge-ready` or `navigate-done` (up to 5s) before proceeding. This handles click-triggered navigations gracefully.

**Rationale**: Some clicks trigger full page reloads (e.g., `<a href>` to a different page). The replay must wait for the new page to load before executing the next step. The current 800ms sleep is insufficient for full reloads.

## Risks / Trade-offs

- **More steps recorded**: Without filtering, workflows will have more steps (navigation clicks + their resulting page loads are both captured). This increases step count but improves fidelity. → Acceptable trade-off; steps are cheap to store.
- **Replay timing after click-triggered navigation**: A click that causes a full page reload destroys the bridge. The new bridge instance sends `bridge-ready`. Replay must handle the gap. → Mitigated by waiting for `bridge-ready` after click steps where URL changes.
- **Refresh recording**: Recording refresh as a "navigate" step means replay will reload the page. This is correct behavior but adds replay time. → Acceptable; refresh is an explicit user action.
