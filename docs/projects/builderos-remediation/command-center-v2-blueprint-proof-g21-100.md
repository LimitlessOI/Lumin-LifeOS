<!-- SYNOPSIS: Command Center V2 Blueprint Proof: G21-100 - BuilderOS Loop Status Exposure -->

# Command Center V2 Blueprint Proof: G21-100 - BuilderOS Loop Status Exposure

This document outlines the next smallest build slice to advance the Command Center V2 blueprint, specifically addressing the need for real-time BuilderOS loop status visibility.

---

**1. Exact missing implementation or proof gap:**

The `COMMAND_CENTER_V2_BLUEPRINT.md` implicitly requires Command Center V2 to display the current state of BuilderOS-governed loop executions. The current BuilderOS implementation lacks a dedicated, minimal, and secure API endpoint to expose this real-time loop status data for consumption by external systems like Command Center V2. This gap prevents Command Center V2 from accurately reflecting BuilderOS operational state.

**2. Smallest safe build slice to close it:**

Implement a new, read-only HTTP GET endpoint within the BuilderOS service. This endpoint, `/builderos/v2/loop-status`, will return a concise JSON object representing the current active BuilderOS loop's status. The JSON payload will include `loopId` (string, unique identifier of the active loop), `status` (string, e.g., "idle", "running", "paused", "completed", "failed"), and `lastUpdated` (ISO 8601 timestamp of the last status change). This slice focuses solely on exposing the current state, without introducing control mechanisms.

**3. Exact safe-scope files to touch first:**

*   `services/builderos/src/api/loopStatus.js` (New file: Defines the handler for the `/builderos/v2/loop-status` endpoint, responsible for fetching and formatting the status data.)
*   `services/builderos/src/routes/index.js` (Modification: Registers the new `/builderos/v2/loop-status` route and links it to the `loopStatus.js` handler.)
*   `services/builderos/src/core/loopManager.js` (Modification: Exposes a minimal, read-only function, e.g., `getCurrentLoopStatus()`, that returns the necessary `loopId`, `status`, and `lastUpdated` data from the internal loop state.)

**4. Verifier/runtime checks:**

*   **Unit Test (`services/builderos/test/api/loopStatus.test.js`):**
    *   Verify `GET /builderos/v2/loop-status` returns HTTP 200 OK with a valid JSON structure (`{ loopId: string, status: string, lastUpdated: string }`) when a loop is active.
    *   Verify `GET /builderos/v2/loop-status` returns HTTP 200 OK with `status: "idle"` and `loopId: null` (or similar indicator) when no loop is active.
    *   Verify `lastUpdated` is a valid ISO 8601 timestamp.
*   **Integration Test (`services/builderos/test/integration/loopStatus.test.js`):**
    *   Start a BuilderOS loop via an existing internal mechanism.
    *   Immediately query `GET /builderos/v2/loop-status` and assert `status` is "running".
    *   Allow the loop to complete (or simulate completion).
    *   Query `GET /builderos/v2/loop-status` again and assert `status` is "completed" or "idle" as appropriate.
*   **Manual Verification:**
    *   Deploy the BuilderOS service with the new endpoint.
    *   Use `curl http://localhost:<BUILDEROS_PORT>/builderos/v2/loop-status` during various BuilderOS loop states (idle, running, completed, failed) and observe the JSON output. Confirm it accurately reflects the system's state.

**5. Stop conditions if runtime truth disagrees:**

*   The `/builderos/v2/loop-status` endpoint consistently returns HTTP 4xx or 5xx errors.
*   The `status` field in the JSON response does not accurately reflect the actual BuilderOS loop state (e.g., reports "running" when no loop is active, or "idle" when a loop is actively processing).
*   The endpoint introduces measurable performance degradation (e.g., increased latency, CPU usage, or memory consumption) to the core BuilderOS loop execution.
*   The endpoint exposes any data beyond the specified `loopId`, `status`, and `lastUpdated` fields, indicating a scope creep or security vulnerability.
*   The endpoint is accessible without appropriate BuilderOS-internal authentication/authorization mechanisms (if such mechanisms are already in place for other BuilderOS internal APIs).