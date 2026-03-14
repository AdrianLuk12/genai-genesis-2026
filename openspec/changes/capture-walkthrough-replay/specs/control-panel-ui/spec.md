## MODIFIED Requirements

### Requirement: Active sandbox view page
The control panel UI SHALL display a sandbox view page at `/sandbox/[id]` showing a preview of the running sandbox app and control buttons. The preview SHALL poll for sandbox readiness before displaying content, showing a loading skeleton during the wait. The sandbox view page SHALL display an editable sandbox name in the header. Clicking the name or pencil icon opens the edit modal. The sandbox view SHALL automatically capture user clicks inside the iframe and include a "Replay" button when the sandbox was launched from a scenario with saved walkthrough steps.

#### Scenario: View active sandbox with loading
- **WHEN** a user navigates to `/sandbox/[containerId]` and the sandbox is still starting up
- **THEN** the page displays a loading skeleton in the preview area, polls for readiness, and reveals the iframe with a fade-in transition once the sandbox responds

#### Scenario: Save walkthrough state from sandbox view
- **WHEN** a user clicks "Save Walkthrough State"
- **THEN** a confirmation dialog appears styled with the warm design system, and upon confirmation, the system saves the state along with the captured interaction steps, shows an animated success message, and redirects to the dashboard

#### Scenario: Destroy sandbox from sandbox view
- **WHEN** a user clicks "Destroy Sandbox"
- **THEN** a confirmation dialog appears styled with the warm design system, and upon confirmation, the sandbox is destroyed and the user is redirected to the dashboard

#### Scenario: Sandbox view shows editable name
- **WHEN** a user views a sandbox with a custom name
- **THEN** the header shows the custom name with a pencil icon, and clicking opens the edit modal

#### Scenario: Click capture active indicator
- **WHEN** the sandbox iframe is loaded and capture is active
- **THEN** a small "Recording" indicator is visible in the sandbox view, showing the number of steps captured so far

#### Scenario: Replay button for walkthrough-derived sandbox
- **WHEN** a sandbox is launched from a scenario that has walkthrough_steps
- **THEN** a "Replay" button appears in the header action buttons area

#### Scenario: No replay button for fresh scenario
- **WHEN** a sandbox is launched from a scenario with no walkthrough_steps
- **THEN** no "Replay" button appears
