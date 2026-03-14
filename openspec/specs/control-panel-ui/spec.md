## ADDED Requirements

### Requirement: Dashboard page
The control panel UI SHALL display a dashboard at the root route (`/`) showing a list of active sandboxes and quick-launch buttons for available scenarios.

#### Scenario: Dashboard with active sandboxes
- **WHEN** a user navigates to `/` and 2 sandboxes are running
- **THEN** the dashboard shows 2 sandbox cards with scenario name, sandbox URL (clickable), port, and action buttons (Save State, Destroy)

#### Scenario: Dashboard with no active sandboxes
- **WHEN** a user navigates to `/` and no sandboxes are running
- **THEN** the dashboard shows an empty state message and a link to browse scenarios

#### Scenario: Quick-launch from dashboard
- **WHEN** the dashboard renders and scenarios exist
- **THEN** the top 3 most recent scenarios are shown as quick-launch buttons

### Requirement: Scenario browser page
The control panel UI SHALL display a scenario browser page at `/scenarios` showing all available scenario templates with their details and a "Launch Sandbox" button for each.

#### Scenario: Browse scenarios
- **WHEN** a user navigates to `/scenarios`
- **THEN** all scenarios are displayed in a list/grid with name, description, config summary, creation date, and a "Launch Sandbox" button

#### Scenario: Launch sandbox from scenario browser
- **WHEN** a user clicks "Launch Sandbox" on a scenario card
- **THEN** the system provisions a new sandbox, shows a loading indicator, and redirects to the sandbox view upon success

### Requirement: Scenario creation
The control panel UI SHALL provide a form to create new scenario templates with name, description, and JSON configuration parameters.

#### Scenario: Create scenario with form
- **WHEN** a user fills in the scenario creation form and submits
- **THEN** the scenario is created via the API and appears in the scenario list

### Requirement: Active sandbox view page
The control panel UI SHALL display a sandbox view page at `/sandbox/[id]` showing an iframe of the running sandbox app and control buttons.

#### Scenario: View active sandbox
- **WHEN** a user navigates to `/sandbox/[containerId]`
- **THEN** the page displays an iframe pointing to the sandbox URL and buttons for "Save Walkthrough State" and "Destroy Sandbox"

#### Scenario: Save walkthrough state from sandbox view
- **WHEN** a user clicks "Save Walkthrough State"
- **THEN** a confirmation dialog appears, and upon confirmation, the system saves the state, shows a success message with the new scenario name, and redirects to the dashboard

#### Scenario: Destroy sandbox from sandbox view
- **WHEN** a user clicks "Destroy Sandbox"
- **THEN** a confirmation dialog appears, and upon confirmation, the sandbox is destroyed and the user is redirected to the dashboard

### Requirement: API-driven UI
Every action in the control panel UI SHALL be performed through REST API calls to the control panel API at `http://localhost:8000`. The UI SHALL NOT directly interact with Docker or Supabase.

#### Scenario: All UI actions use API
- **WHEN** the UI performs any operation (list scenarios, launch sandbox, save state, destroy sandbox)
- **THEN** the operation is executed via an HTTP request to the control panel API

### Requirement: Responsive layout
The control panel UI SHALL use a responsive layout with Tailwind CSS and shadcn/ui components that works on desktop screens (minimum 1024px width).

#### Scenario: Desktop layout
- **WHEN** the UI is viewed on a 1024px or wider screen
- **THEN** all pages render correctly with proper spacing, readable text, and accessible controls
