## ADDED Requirements

### Requirement: Sandbox readiness polling
The sandbox view page SHALL poll the sandbox URL for availability before rendering the iframe content. The iframe `src` SHALL remain unset (or `about:blank`) until the sandbox responds successfully.

#### Scenario: Sandbox becomes ready within timeout
- **WHEN** a user navigates to `/sandbox/[id]` and the sandbox container is starting up
- **THEN** the page displays a loading skeleton in the iframe area, polls the sandbox URL every 1 second, and upon receiving a successful response, sets the iframe `src` to the sandbox URL

#### Scenario: Sandbox ready immediately
- **WHEN** a user navigates to `/sandbox/[id]` and the sandbox URL responds on the first poll
- **THEN** the iframe is shown immediately with a fade-in transition (no unnecessary loading delay)

#### Scenario: Sandbox exceeds timeout
- **WHEN** polling has continued for 30 seconds without a successful response
- **THEN** the page displays a timeout message ("Sandbox is taking longer than expected") with a "Retry" button that restarts polling

### Requirement: Loading skeleton animation
The sandbox view page SHALL display an animated skeleton placeholder in the iframe area while polling for sandbox readiness. The skeleton SHALL match the dimensions of the iframe container.

#### Scenario: Skeleton displayed during polling
- **WHEN** the sandbox URL has not yet responded successfully
- **THEN** a skeleton with a shimmer animation is shown in place of the iframe, occupying the full iframe area

#### Scenario: Skeleton transitions to content
- **WHEN** the sandbox URL responds successfully and the iframe loads
- **THEN** the skeleton crossfades to the iframe content with a smooth opacity transition (300ms)

### Requirement: Iframe content reveal animation
The iframe SHALL be revealed with a smooth fade-in transition once the sandbox content is loaded, rather than appearing abruptly.

#### Scenario: Fade-in on load
- **WHEN** the iframe finishes loading the sandbox page
- **THEN** the iframe transitions from `opacity: 0` to `opacity: 1` over 300ms with an ease-out curve

### Requirement: Polling uses no-cors fetch
The readiness check SHALL use `fetch` with `mode: 'no-cors'` to avoid cross-origin restrictions. A resolved fetch (even with an opaque response) SHALL be treated as the sandbox being ready.

#### Scenario: CORS-safe polling
- **WHEN** the sandbox URL is on a different port than the control panel
- **THEN** the polling fetch uses `mode: 'no-cors'` and treats any non-error response as ready
