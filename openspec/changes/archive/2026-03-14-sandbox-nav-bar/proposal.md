## Why

The sandbox preview currently displays the full URL as a simple anchor link (e.g. `http://localhost:8001`). Users cannot navigate to sub-paths within the sandbox (e.g. `/admin`, `/settings`) without manually editing the browser URL or opening a new tab. A browser-style navigation bar with a locked origin and editable path would let users explore the sandboxed app directly within the control panel.

## What Changes

- Replace the static URL anchor link in the sandbox iframe header with an interactive navigation bar
- Lock the origin portion of the URL (e.g. `http://localhost:8001`) so users cannot change the host/port
- Provide an editable path input where users can type a path (e.g. `/admin`) and press Enter to navigate the iframe
- Add back/forward navigation buttons for iframe history traversal
- Add a refresh button to reload the current iframe page

## Capabilities

### New Capabilities
- `sandbox-nav-bar`: Interactive browser-style navigation bar for sandbox iframe with locked origin, editable path input, and navigation controls (back, forward, refresh)

### Modified Capabilities
- `sandbox-preview-loader`: The iframe header area changes from a static anchor to the new nav bar component. The iframe `src` is now controlled by the nav bar path input in addition to the existing readiness polling logic.

## Impact

- `control-panel-ui/src/app/sandbox/[id]/page.tsx` — iframe header (lines 622-650) replaced with nav bar component
- New component file for the sandbox nav bar
- No API changes, no backend changes — purely a frontend UI enhancement
