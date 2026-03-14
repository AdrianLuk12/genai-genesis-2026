## Purpose

Provides a browser-like navigation bar for sandbox iframe previews, including a locked origin display, editable path input, and back/forward/refresh controls.

## Requirements

### Requirement: Locked origin display
The sandbox nav bar SHALL display the sandbox origin (scheme + host + port) as a non-editable label. The origin portion SHALL be visually distinct from the editable path input.

#### Scenario: Origin displayed for active sandbox
- **WHEN** the sandbox is ready and the nav bar is rendered
- **THEN** the origin (e.g. `http://localhost:8001`) is displayed as static text that cannot be edited or selected for modification

### Requirement: Editable path input
The sandbox nav bar SHALL provide a text input field adjacent to the locked origin where users can type a URL path. The input SHALL default to `/` when the sandbox first loads.

#### Scenario: User types a path and submits
- **WHEN** the user types `/admin` into the path input and presses Enter
- **THEN** the iframe navigates to `http://localhost:80xx/admin` where `80xx` is the sandbox port

#### Scenario: User submits empty path
- **WHEN** the user clears the path input and presses Enter
- **THEN** the iframe navigates to the sandbox root URL (origin + `/`)

#### Scenario: Path auto-prepends slash
- **WHEN** the user types `admin` (without leading slash) and presses Enter
- **THEN** the path is normalized to `/admin` before navigation

### Requirement: Navigation controls
The sandbox nav bar SHALL include back, forward, and refresh buttons for iframe navigation.

#### Scenario: Back navigation
- **WHEN** the user has navigated to `/admin` then `/settings` via the path input, and clicks the back button
- **THEN** the iframe navigates back to `/admin` and the path input updates to `/admin`

#### Scenario: Forward navigation after back
- **WHEN** the user has clicked back (now at `/admin`) and clicks the forward button
- **THEN** the iframe navigates forward to `/settings` and the path input updates to `/settings`

#### Scenario: Back button disabled at start of history
- **WHEN** the user has not navigated away from the initial path
- **THEN** the back button SHALL be visually disabled and non-interactive

#### Scenario: Forward button disabled at end of history
- **WHEN** the user is at the most recent path in the history
- **THEN** the forward button SHALL be visually disabled and non-interactive

#### Scenario: Refresh reloads current page
- **WHEN** the user clicks the refresh button
- **THEN** the iframe reloads the current URL without changing the path

### Requirement: Nav bar layout
The sandbox nav bar SHALL replace the existing URL anchor in the iframe card header. It SHALL maintain the existing status indicator (LIVE/CONNECTING) and recording indicator alongside the navigation controls.

#### Scenario: Full nav bar layout
- **WHEN** the sandbox view is rendered with the nav bar
- **THEN** the header displays: status indicator, back/forward/refresh buttons, locked origin, editable path input, and recording indicator (when applicable) — all in a single horizontal row

### Requirement: New navigation clears forward history
When the user navigates to a new path while not at the end of the history stack, the forward history SHALL be discarded.

#### Scenario: New navigation from mid-history
- **WHEN** the user has navigated to `/a`, `/b`, `/c`, gone back to `/b`, and then navigates to `/d`
- **THEN** the history becomes `/a`, `/b`, `/d` and the forward button is disabled
