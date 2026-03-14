## 1. Bridge: Remove navigation click filtering

- [x] 1.1 Delete `pendingNavClick`, `pendingNavTimer`, `flushPendingNavClick()`, `discardPendingNavClick()`, and `isNavigationElement()` from bridge.js
- [x] 1.2 Simplify click listener to always post `step-captured` immediately (remove the `isNavigationElement` branch)
- [x] 1.3 Remove the `discardPendingNavClick()` call from `notifyUrlChange()` — URL changes no longer interact with click recording

## 2. Control panel: Record nav bar actions as navigate steps

- [x] 2.1 Extend `CapturedStep` action type to `"click" | "input" | "navigate"` in sandbox/[id]/page.tsx
- [x] 2.2 Add a callback prop to `SandboxNavBar` (e.g. `onStepCaptured`) or handle in existing `onNavigate`/`onRefresh`/`goBack`/`goForward` callbacks to record navigate steps when the user interacts with the nav bar
- [x] 2.3 In sandbox page, create navigate steps (action: "navigate", url: target path, empty selector/elementTag/elementText) and append to `capturedStepsRef` + `setCapturedSteps` when nav bar actions fire — skip recording during replay (`replayingRef.current`)

## 3. Replay: Support new step types and remove skip heuristic

- [x] 3.1 Remove the "skip navigation-only clicks" block in `startReplay()` (the `if (action === "click") { const nextStep = ... if (nextStep && nextStep.url !== step.url) continue; }` block)
- [x] 3.2 Remove the URL-comparison-based `navigate` logic at the top of the replay loop (the `if (prevUrl !== step.url)` block)
- [x] 3.3 Add a new branch in the replay loop for `action === "navigate"`: send `{ type: "navigate", url: step.url }` to iframe, wait for `navigate-done` or `bridge-ready` (up to 8s), then settle delay
- [x] 3.4 After `replay-click-done`, check if a `url-changed` or `bridge-ready` message arrives within 2s — if so, wait for page to settle before proceeding to the next step
