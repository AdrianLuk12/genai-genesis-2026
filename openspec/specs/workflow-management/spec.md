## Purpose

Workflow management provides the ability to capture, save, list, view, delete, and replay workflows. A workflow is a sequence of captured action steps tied to a start scenario and app version, enabling repeatable test playback.

## Requirements

### Requirement: User can save a workflow during sandbox testing
The system SHALL allow users to save the captured action steps from the current sandbox session as a new workflow. The workflow SHALL store the steps array, a reference to the start scenario, and the app version ID. The system SHALL prompt the user for a name before saving. The sandbox SHALL NOT be destroyed after saving.

#### Scenario: Save workflow with captured steps
- **WHEN** user clicks "Save Workflow" during a sandbox session with 15 captured steps, enters name "Checkout Flow Test", and confirms
- **THEN** the system creates a workflow record with the name, the 15 captured steps, the start scenario ID, and the app version ID, and the sandbox continues running

#### Scenario: Save workflow with no steps
- **WHEN** user clicks "Save Workflow" but no steps have been captured
- **THEN** the system shows an error message indicating there are no steps to save

### Requirement: User can list workflows for an app version
The system SHALL return all workflows for a given app version, ordered by creation date descending.

#### Scenario: List workflows
- **WHEN** user views workflows for app version "v1.0"
- **THEN** the system displays all workflows with name, step count, start scenario name, and created date

### Requirement: User can view workflow details
The system SHALL allow users to view a workflow's details including name, description, step count, start scenario, and creation date.

#### Scenario: View workflow detail
- **WHEN** user clicks on a workflow named "Checkout Flow Test"
- **THEN** the system displays the workflow name, step count (15), start scenario name, app version, and created date

### Requirement: User can delete a workflow
The system SHALL allow users to delete a workflow with confirmation.

#### Scenario: Delete workflow
- **WHEN** user clicks delete on a workflow and confirms
- **THEN** the system deletes the workflow record

### Requirement: User can launch a sandbox and replay a workflow
The system SHALL allow users to launch a sandbox from a workflow's start scenario and replay the workflow's saved steps.

#### Scenario: Replay workflow
- **WHEN** user clicks "Replay" on a workflow
- **THEN** the system launches a sandbox from the workflow's start scenario and begins replaying the saved steps

### Requirement: Workflow API endpoints
The system SHALL provide REST API endpoints for workflow CRUD operations.

#### Scenario: Create workflow via API
- **WHEN** POST `/api/workflows` is called with name, app_version_id, scenario_id, and steps_json
- **THEN** the system creates a workflow record and returns it with a generated ID

#### Scenario: List workflows via API
- **WHEN** GET `/api/workflows?app_version_id={id}` is called
- **THEN** the system returns all workflows for that app version

#### Scenario: Delete workflow via API
- **WHEN** DELETE `/api/workflows/{id}` is called
- **THEN** the system deletes the workflow and returns success
