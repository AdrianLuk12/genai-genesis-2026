## MODIFIED Requirements

### Requirement: Dashboard page
The control panel UI SHALL display editable sandbox names on dashboard sandbox cards. A pencil icon appears on hover next to the name, and clicking it opens the edit modal.

#### Scenario: Sandbox card shows custom name
- **WHEN** a sandbox has a custom name set
- **THEN** the dashboard card displays the custom name instead of just `:port`

#### Scenario: Sandbox card shows port fallback
- **WHEN** a sandbox has no custom name (null or empty)
- **THEN** the dashboard card displays `Sandbox :port` as before

#### Scenario: Rename sandbox from dashboard
- **WHEN** a user clicks the pencil icon or name on a sandbox card
- **THEN** the edit modal opens, and on save the card name updates immediately

### Requirement: Active sandbox view page
The sandbox view page SHALL display an editable sandbox name in the header. Clicking the name or pencil icon opens the edit modal.

#### Scenario: Sandbox view shows editable name
- **WHEN** a user views a sandbox with a custom name
- **THEN** the header shows the custom name with a pencil icon, and clicking opens the edit modal

### Requirement: Scenario browser page
The scenario browser page SHALL allow inline renaming of scenarios. Each scenario card shows a pencil icon on hover next to the name.

#### Scenario: Rename scenario from card
- **WHEN** a user clicks the pencil icon or name on a scenario card
- **THEN** the edit modal opens with name and description fields, and on save the card updates immediately
