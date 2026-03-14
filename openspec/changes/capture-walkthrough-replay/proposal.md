## Why

When users interact with a sandbox to build a walkthrough, only the final database state is captured. There is no record of _how_ the user got there — the sequence of clicks, the pages visited, the buttons pressed. This means saved walkthroughs can reproduce the end state but cannot demonstrate the journey. Capturing and replaying the exact interaction steps turns walkthroughs into reproducible, demonstrable workflows — essential for training, QA, and onboarding use cases.

## What Changes

- Inject a click-capture layer into the target app iframe that records every user click as a DOM selector + metadata (element tag, text content, data-testid, page URL, timestamp)
- Store captured interaction steps as a JSON array alongside the saved walkthrough database state
- Add API endpoints to persist and retrieve walkthrough steps
- Add a "Replay" button in the sandbox view that, when a walkthrough with saved steps is launched, automatically replays each captured click in sequence within the iframe
- The replay system navigates pages and triggers clicks using DOM selectors (not coordinates), making replays resilient to layout changes

## Capabilities

### New Capabilities
- `click-capture`: Intercepts and records user clicks inside the target app iframe using DOM selectors (data-testid, CSS selectors), storing each step with element metadata, page URL, and timestamp
- `walkthrough-replay`: Replays a saved sequence of interaction steps within a sandbox iframe — navigates to pages, locates elements by DOM selector, and triggers clicks with visual feedback

### Modified Capabilities
- `walkthrough-capture`: Save endpoint now also persists the captured interaction steps JSON alongside the database file
- `control-panel-api`: New endpoints to store and retrieve walkthrough steps; steps stored in the scenarios table or a related table
- `control-panel-ui`: Sandbox view page gains a Replay button when the active sandbox was launched from a walkthrough that has saved steps

## Impact

- **Target app iframe**: A capture script is injected via postMessage bridge or iframe content script — no changes to the target app source code itself
- **Control panel UI**: Sandbox view page (`/sandbox/[id]`) gets replay controls and a capture indicator
- **Control panel API**: New fields/table for interaction steps; modified save endpoint
- **Database schema**: New `walkthrough_steps` column or table in local SQLite
- **No breaking changes**: Existing walkthroughs without steps continue to work; replay button simply doesn't appear
