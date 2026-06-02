# Amendment 12 Command Center Proof - G309-100

## Proof-Closing Blueprint Note: Initial `CommandCenterAPI` Health Endpoint

This note addresses the initial implementation gap for the `CommandCenterAPI` as outlined in `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`, focusing on establishing the foundational service and its most basic read-only endpoint.

### 1. Exact Missing Implementation or Proof Gap

The `CommandCenterAPI` backend service, specifically its initial setup and the `GET /status` endpoint for overall BuilderOS health, is not yet implemented. This endpoint is critical for providing basic operational visibility and serves as the simplest entry point for the API.

### 2. Smallest Safe Build Slice to Close It

Implement the core `CommandCenterAPI` Express application, integrate it with the existing `LifeOS` authentication middleware to enforce the `builderos-admin` scope, and expose the `GET /status` endpoint. This endpoint will return a basic `SystemHealth` object indicating the current operational status of BuilderOS components.

### 3. Exact Safe-Scope Files to Touch First

*   `src/api/command-center/index.js`: Entry point for the `CommandCenterAPI` Express application, responsible for setting up routes and middleware.
*   `src/api/command-center/routes/status.js`: Defines the `GET /status` route handler.
*   `src/api/command-center/services/health.js`: Contains the logic to determine and return the `SystemHealth` object.
*   `src/lib/auth/middleware.js`: (Existing file) Ensure the `builderos-admin` scope is correctly applied to `CommandCenterAPI` routes.
*   `src/types/command-center.d.ts`: Define the TypeScript interfaces for `SystemHealth` and its components.
*   `src/config/api.js`: (Existing file) Add configuration for the `CommandCenterAPI` base path (e.g., `/command-center`).

### 4. Verifier/Runtime Checks

1.  **Service Startup:** Verify that the `CommandCenterAPI` service starts without errors.
2.  **Authenticated Access (Success):**
    *   Make an HTTP `GET` request to `/command-center/status` with a valid `builderos-admin` scoped token.
    *   Expected result: `HTTP 200 OK` response with a JSON body conforming to the `SystemHealth` model (e.g., `{ "status": "operational", "lastCheck": "...", "components": [] }`).
3.  **Unauthenticated Access (Failure):**
    *   Make an HTTP `GET` request to `/command-center/status` without any authentication token.
    *   Expected result: `HTTP 401 Unauthorized`.
4.  **Unauthorized Scope Access (Failure):**
    *   Make an HTTP `GET` request to `/command-center/status` with