# EventsTracker Web Migration Skill

Use this skill when the user wants to convert the EventsTracker iOS app into a web app, or when they want to make app updates in a browser-based version.

## Project context

This repository contains a SwiftUI app for tracking events and analyzing them via charts. It currently uses:

- SwiftUI
- local JSON persistence via DataStore
- chart logic in AnalyticsView and related files
- Thing and LogEntry models in Models.swift

The goal is to migrate the product to a web app, typically with React + TypeScript + Vite, while preserving the app's business logic and analytics model.

## Default approach

When asked to make changes, prefer the following architecture:

1. Keep the domain data model as close as possible to the current app concepts:
   - Thing
   - LogEntry
   - ColorData
   - LocationData
2. Port business logic to TypeScript rather than trying to keep Swift logic in place.
3. Rebuild the UI in React components rather than translating SwiftUI views directly.
4. Replace iOS persistence with localStorage or IndexedDB for a first pass.
5. Replace Swift Charts with Recharts or Chart.js.
6. Keep the analytics filtering and aggregation logic consistent with the current app behavior.

## Rules

- Do not suggest porting raw SwiftUI code directly to the browser.
- Do not leave platform-specific iOS APIs in the web app.
- Use TypeScript interfaces and React components for the browser implementation.
- Keep the app data model stable when possible to avoid breaking the analytics logic.
- Favor incremental migration over a full rewrite in one step.

## Common migration tasks

### When asked to add a feature

- Identify whether it belongs in domain logic, UI, or storage.
- Port the behavior to the web stack in the simplest browser-compatible form.
- Preserve the same user-facing data semantics.

### When asked to preserve analytics behavior

- Keep the same date range filtering logic.
- Keep the same groupings by day, month, or year.
- Keep the same time-of-day aggregation behavior.
- Preserve color mapping between things and chart series.

### When asked to change persistence

- Prefer localStorage for a lightweight first version.
- Use IndexedDB for larger data sets or more complex persistence needs.
- Treat JSON-serializable models as the data interchange format.

### When asked to build or refactor the app

- Prefer a minimal viable web app first.
- Add features only after the core data model and chart logic are stable.

## Target stack

Recommended default stack for this repo:

- React
- TypeScript
- Vite
- Recharts
- localStorage or IndexedDB

## Execution guideline

When making updates for this project:

- Start by understanding the current data shape in Models.swift and DataStore.swift.
- Reuse the same concepts in the web app rather than inventing a new domain model.
- Prefer clean, maintainable TypeScript over a direct port of Swift patterns.
- Verify that analytics and persisted data still work after each change.

## Example prompts to use with Claude

- "Port the EventsTracker data model to a React TypeScript app."
- "Convert the analytics logic from Swift to a browser charting implementation."
- "Create a web version of the add/edit thing forms and keep local persistence."
- "Migrate the JSON storage pattern from iOS Documents directory to browser localStorage."
- "Refactor this app into a web app while preserving the existing chart behavior."
