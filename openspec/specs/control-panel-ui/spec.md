## ADDED Requirements

### Requirement: Dashboard page
The control panel UI SHALL display a dashboard at the root route (`/`) showing a list of active sandboxes and quick-launch buttons for available scenarios. The dashboard SHALL use the warm earthy design system with boxy cards, staggered entrance animations, and skeleton loading states. The dashboard SHALL display editable sandbox names on dashboard sandbox cards. A pencil icon appears on hover next to the name, and clicking it opens the edit modal.

#### Scenario: Dashboard with active sandboxes
- **WHEN** a user navigates to `/` and 2 sandboxes are running
- **THEN** the dashboard shows 2 sandbox cards with scenario name, sandbox URL (clickable), port, and action buttons (Save State, Destroy), rendered with square corners, warm palette styling, and staggered fade-in animation

#### Scenario: Dashboard with no active sandboxes
- **WHEN** a user navigates to `/` and no sandboxes are running
- **THEN** the dashboard shows an empty state message and a link to browse scenarios, styled with muted warm tones

#### Scenario: Quick-launch from dashboard
- **WHEN** the dashboard renders and scenarios exist
- **THEN** the top 3 most recent scenarios are shown as quick-launch cards with hover micro-interactions

#### Scenario: Dashboard loading state
- **WHEN** the dashboard is loading data from the API
- **THEN** skeleton card placeholders with shimmer animation are displayed instead of plain "Loading..." text

#### Scenario: Sandbox card shows custom name
- **WHEN** a sandbox has a custom name set
- **THEN** the dashboard card displays the custom name instead of just `:port`

#### Scenario: Sandbox card shows port fallback
- **WHEN** a sandbox has no custom name (null or empty)
- **THEN** the dashboard card displays `Sandbox :port` as before

#### Scenario: Rename sandbox from dashboard
- **WHEN** a user clicks the pencil icon or name on a sandbox card
- **THEN** the edit modal opens, and on save the card name updates immediately

### Requirement: Scenario browser page
The control panel UI SHALL display a scenario browser page at `/scenarios` showing all available scenario templates with their details and a "Launch Sandbox" button for each. The page SHALL use the warm earthy design system. The scenario browser page SHALL allow inline renaming of scenarios. Each scenario card shows a pencil icon on hover next to the name.

#### Scenario: Browse scenarios
- **WHEN** a user navigates to `/scenarios`
- **THEN** all scenarios are displayed in a boxy card grid with name, description, config summary, creation date, and a "Launch Sandbox" button, using warm palette styling and staggered entrance animations

#### Scenario: Launch sandbox from scenario browser
- **WHEN** a user clicks "Launch Sandbox" on a scenario card
- **THEN** the system provisions a new sandbox, shows a loading indicator with smooth animation, and redirects to the sandbox view upon success

#### Scenario: Scenarios loading state
- **WHEN** the scenarios page is loading data from the API
- **THEN** skeleton card placeholders with shimmer animation are displayed instead of plain "Loading..." text

#### Scenario: Rename scenario from card
- **WHEN** a user clicks the pencil icon or name on a scenario card
- **THEN** the edit modal opens with name and description fields, and on save the card updates immediately

### Requirement: Scenario creation
The control panel UI SHALL provide a form to create new scenario templates with name, description, and JSON configuration parameters.

#### Scenario: Create scenario with form
- **WHEN** a user fills in the scenario creation form and submits
- **THEN** the scenario is created via the API and appears in the scenario list

### Requirement: Active sandbox view page
The control panel UI SHALL display a sandbox view page at `/sandbox/[id]` showing a preview of the running sandbox app and control buttons. The preview SHALL poll for sandbox readiness before displaying content, showing a loading skeleton during the wait. The sandbox view page SHALL display an editable sandbox name in the header. Clicking the name or pencil icon opens the edit modal.

#### Scenario: View active sandbox with loading
- **WHEN** a user navigates to `/sandbox/[containerId]` and the sandbox is still starting up
- **THEN** the page displays a loading skeleton in the preview area, polls for readiness, and reveals the iframe with a fade-in transition once the sandbox responds

#### Scenario: Save walkthrough state from sandbox view
- **WHEN** a user clicks "Save Walkthrough State"
- **THEN** a confirmation dialog appears styled with the warm design system, and upon confirmation, the system saves the state, shows an animated success message, and redirects to the dashboard

#### Scenario: Destroy sandbox from sandbox view
- **WHEN** a user clicks "Destroy Sandbox"
- **THEN** a confirmation dialog appears styled with the warm design system, and upon confirmation, the sandbox is destroyed and the user is redirected to the dashboard

#### Scenario: Sandbox view shows editable name
- **WHEN** a user views a sandbox with a custom name
- **THEN** the header shows the custom name with a pencil icon, and clicking opens the edit modal

### Requirement: API-driven UI
Every action in the control panel UI SHALL be performed through REST API calls to the control panel API at `http://localhost:8000`. The UI SHALL NOT directly interact with Docker or Supabase.

#### Scenario: All UI actions use API
- **WHEN** the UI performs any operation (list scenarios, launch sandbox, save state, destroy sandbox)
- **THEN** the operation is executed via an HTTP request to the control panel API

### Requirement: Responsive layout
The control panel UI SHALL use a responsive layout with Tailwind CSS that works on desktop screens (minimum 1024px width). All components SHALL use the boxy aesthetic with zero border-radius and warm color palette.

#### Scenario: Desktop layout
- **WHEN** the UI is viewed on a 1024px or wider screen
- **THEN** all pages render correctly with proper spacing, readable text, accessible controls, square-cornered components, and the warm earthy color scheme
