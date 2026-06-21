<!-- SYNOPSIS: Documentation — Command Center V2 Blueprint Proof G999 100. -->

Blueprint Proof: Command Center V2 - Core Telemetry Display (g999-100)
This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, derived from `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`.
---
Blueprint Note: Core Telemetry Display - Initial Data Flow Proof
1. Exact Missing Implementation or Proof Gap:
The fundamental gap is the initial data flow for core telemetry: a backend endpoint to serve mock system metrics and a corresponding frontend component to consume and display this data. This proves the basic plumbing for Phase 1, "Core Telemetry & Dashboard (MVP) - Display key system metrics."
2. Smallest Safe Build Slice to Close It:
Implement a new backend apiEP `/api/v2/command-center/telemetry/core` that returns a static, mock JSON payload representing core system metrics (e.g., CPU usage, memory usage, network I/O). Concurrently, create a minimal React component and page to fetch data from this endpoint and display it in a basic, read-only format. This slice focuses purely on establishing the data path and UI rendering without persistence, real-time updates, or complex ingestion.
3. Exact Safe-Scope Files to Touch First:
-   Backend (API):
    -   `src/api/v2/command-center/telemetry/core.js` (new endpoint handler)
    -   `src/routes/v2/command-center.js` (update to register new endpoint)
    -   `src/services/telemetryService.js` (new service for mock data generation)
-   Frontend (UI):
    -   `src/ui/pages/CommandCenterV2TelemetryPage.jsx` (new page component)
    -   `src/ui/components/telemetry/CoreTelemetryDisplay.jsx` (new display component)
    -   `src/ui/routes.js` (update to register new frontend route)
    -   `src/ui/api/commandCenterV2.js` (new API client module for V2 endpoints)
4. Verifier/Runtime Checks:
-   Backend:
    -   `GET /api/v2/command-center/telemetry/core` returns HTTP 200 OK.
    -   Response body is valid JSON matching the expected mock telemetry structure (e.g., `{ cpu: '25%', memory: '4GB', network: '100Mbps' }`).
-   Frontend:
    -   Navigating to `/command-center/v2/telemetry` successfully loads the `CommandCenterV2TelemetryPage`.
    -   The `CoreTelemetryDisplay` component renders on the page.
    -   The UI displays the mock telemetry data fetched from the backend endpoint.
    -   No console errors or warnings related to API calls, component rendering, or data parsing.
5. Stop Conditions if Runtime Truth Disagrees:
-   Backend:
    -   Endpoint returns non-200 status code.
    -   Endpoint returns malformed JSON or a data structure that does not conform to the expected telemetry schema.
    -   The route is inaccessible (e.g., 404 Not Found).
-   Frontend:
    -   The `/command-center/v2/telemetry` page fails to load or displays an unhandled error.
    -   The API call to `/api/v2/command-center/telemetry/core` fails (e.g., network error, CORS issue, server error).
    -   The `CoreTelemetryDisplay` component fails to render or throws a runtime error.
    -   The displayed data is empty, stale, or incorrect despite a successful API response.