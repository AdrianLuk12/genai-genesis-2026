## MODIFIED Requirements

### Requirement: Sandbox readiness polling
The sandbox view page SHALL poll the sandbox URL for availability before rendering the iframe content. The iframe `src` SHALL remain unset (or `about:blank`) until the sandbox responds successfully. Once ready, the iframe `src` SHALL be set to the sandbox URL and further navigation SHALL be controlled by the sandbox nav bar component.

#### Scenario: Sandbox becomes ready within timeout
- **WHEN** a user navigates to `/sandbox/[id]` and the sandbox container is starting up
- **THEN** the page displays a loading skeleton in the iframe area, polls the sandbox URL every 1 second, and upon receiving a successful response, sets the iframe `src` to the sandbox URL with the current nav bar path

#### Scenario: Sandbox ready immediately
- **WHEN** a user navigates to `/sandbox/[id]` and the sandbox URL responds on the first poll
- **THEN** the iframe is shown immediately with a fade-in transition (no unnecessary loading delay)

#### Scenario: Sandbox exceeds timeout
- **WHEN** polling has continued for 30 seconds without a successful response
- **THEN** the page displays a timeout message ("Sandbox is taking longer than expected") with a "Retry" button that restarts polling
