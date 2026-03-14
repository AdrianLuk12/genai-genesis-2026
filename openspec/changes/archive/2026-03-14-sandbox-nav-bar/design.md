## Context

The sandbox view (`/sandbox/[id]`) embeds a sandboxed app in an iframe. The header area currently shows a status indicator (LIVE/CONNECTING), a plain anchor link to the sandbox URL (e.g. `http://localhost:8001`), and a recording indicator. Users cannot navigate within the sandboxed app without opening the URL in a separate browser tab.

The iframe `src` is currently set to `sandbox.sandbox_url` once the sandbox is ready, controlled by the readiness polling logic in the page component.

## Goals / Non-Goals

**Goals:**
- Allow users to navigate to sub-paths within the sandbox iframe (e.g. `/admin`, `/dashboard`)
- Provide a browser-like URL bar experience with a locked origin and editable path
- Support back, forward, and refresh navigation controls
- Keep the existing readiness polling and loading skeleton behavior intact

**Non-Goals:**
- Full browser devtools or network inspector
- URL query parameter editing (path-only for now)
- Bookmarking or saving favorite paths
- Supporting navigation to external URLs outside the sandbox origin

## Decisions

### 1. New `SandboxNavBar` component

Create a dedicated `SandboxNavBar` component that replaces the current `CardHeader` content (lines 622-650 of the sandbox page). This keeps the nav bar logic self-contained and testable.

**Rationale**: The nav bar has its own state (current path, input value, history stack) that is distinct from the parent page's concerns. A separate component avoids bloating the already large page component.

### 2. Path input with locked origin display

The nav bar displays the origin (e.g. `http://localhost:8001`) as a non-editable label, followed by an editable text input for the path portion. The user types a path like `/admin` and presses Enter to navigate.

**Alternative considered**: A single editable URL field with validation to prevent origin changes. Rejected because splitting the display makes it visually clear which part is editable and prevents accidental origin modification.

### 3. Iframe navigation via src attribute

When the user submits a path, the component constructs the full URL (`origin + path`) and updates the iframe `src`. The parent page manages iframe src state, and the nav bar calls a callback prop to request navigation.

**Alternative considered**: Using `iframe.contentWindow.location.href` to navigate. Rejected because cross-origin restrictions on different ports would block this approach.

### 4. Navigation history managed in component state

Back/forward buttons use a simple in-memory history stack (array of paths + current index). This tracks user-initiated navigations through the nav bar only — not in-iframe link clicks, since cross-origin restrictions prevent reading the iframe's current URL.

**Rationale**: A browser-level history API isn't applicable here since we're navigating an iframe. A simple stack is sufficient and avoids complexity.

### 5. Refresh reloads iframe via key remount

The refresh button increments a React key on the iframe, forcing a full remount/reload. This avoids cross-origin issues with `iframe.contentWindow.location.reload()`.

## Risks / Trade-offs

- **[Cross-origin iframe URL tracking]** → We cannot read the iframe's current URL when the sandbox runs on a different port. The nav bar path reflects user-initiated navigations only, not in-app link clicks. This is acceptable for the initial implementation. Mitigation: the displayed path shows "last navigated path" which is still useful.
- **[History desync]** → If the user navigates within the iframe (clicking links), the back/forward buttons won't reflect those navigations. Mitigation: document this limitation; refresh button always works.
