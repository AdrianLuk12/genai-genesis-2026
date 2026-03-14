## Why

The current workflow recording system discards clicks on navigation elements (`<a href>`, form submit buttons) when they cause a URL change, to avoid "double-recording" both the click and the URL change. This filtering is fragile — it uses a 500ms buffer timer and heuristic element detection — and loses valuable click context during replay. Meanwhile, ALL URL changes from the bridge are recorded (pushState, replaceState, popstate, polling), even those triggered by in-app button clicks, which creates redundant steps.

The new approach cleanly separates concerns: record ALL clicks unconditionally, and only record URL changes when the USER explicitly navigates via the control panel nav bar (typing a URL, back, forward, refresh).

## What Changes

- **Remove navigation click filtering** in bridge.js: delete the `pendingNavClick` buffer system, `isNavigationElement()` check, and associated timer logic. All clicks are sent immediately as `step-captured`.
- **Stop recording bridge-initiated URL changes as workflow steps**: the bridge still sends `url-changed` for nav bar sync, but these no longer produce captured steps.
- **Record nav bar actions as "navigate" steps** in the control panel UI: when the user types a URL + Enter, clicks back/forward, or refreshes, a new `CapturedStep` with `action: "navigate"` is appended to the captured steps array.
- **Simplify replay logic**: remove the "skip navigation-only clicks" heuristic. All click steps are replayed directly. Navigate steps trigger explicit iframe navigation. After any step that changes the URL, wait for the page to settle before continuing.
- **Extend CapturedStep action type** to include `"navigate"` alongside `"click"` and `"input"`.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `click-capture`: Remove navigation click filtering; all clicks recorded unconditionally. Add "navigate" action type for user-initiated nav bar URL changes (back, forward, refresh, URL entry).
- `walkthrough-replay`: Remove "skip navigation-only clicks" heuristic. Replay "navigate" steps via iframe navigation. All click steps replayed directly.

## Impact

- **bridge.js**: Remove ~40 lines of pending nav click buffer logic. Simplify click listener.
- **sandbox/[id]/page.tsx**: Add navigate step recording from nav bar callbacks. Remove replay skip logic for navigation clicks. Add replay handling for "navigate" action type.
- **sandbox-nav-bar.tsx**: Callbacks must signal when user-initiated navigation occurs so the parent can record steps.
- **CapturedStep interface**: `action` union type gains `"navigate"`.
- **No API/database changes**: `steps_json` already stores arbitrary step objects.
