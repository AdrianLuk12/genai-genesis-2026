## ADDED Requirements

### Requirement: Edit name modal component
The control panel UI SHALL provide a reusable edit modal component for renaming resources, following the existing warm brutalism design system.

#### Scenario: Open edit modal for sandbox
- **WHEN** a user clicks the sandbox name or pencil icon on a sandbox card or sandbox view header
- **THEN** a modal appears with a text input pre-filled with the current name (or empty if using default `:port`), a "Save" button, and a "Cancel" button

#### Scenario: Open edit modal for scenario
- **WHEN** a user clicks the scenario name or pencil icon on a scenario card
- **THEN** a modal appears with text inputs for name and description, pre-filled with current values

#### Scenario: Save rename
- **WHEN** a user types a new name and clicks "Save"
- **THEN** the modal closes, the name updates immediately in the UI (optimistic), and a PATCH request is sent to the API

#### Scenario: Cancel rename
- **WHEN** a user clicks "Cancel" or presses Escape
- **THEN** the modal closes with no changes

#### Scenario: Empty name for sandbox
- **WHEN** a user clears the sandbox name field and saves
- **THEN** the sandbox reverts to displaying `:port` as its name

#### Scenario: API error on rename
- **WHEN** the PATCH request fails
- **THEN** the name reverts to its previous value in the UI
