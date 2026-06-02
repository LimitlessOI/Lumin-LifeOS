# Command Center V2 Blueprint Proof: G1081-100 - BuilderOS Loop Status Readout

This document outlines the next smallest build slice for Command Center V2, focusing on providing a read-only view of the BuilderOS loop execution status, addressing the immediate need for operational visibility within BuilderOS.

---

### 1. Exact Missing Implementation or Proof Gap

The current BuilderOS operational tooling lacks a standardized, programmatic interface to query the real-time status of the BuilderOS governed loop execution. This gap prevents automated monitoring and immediate feedback mechanisms for build engineers, leading to manual inspection and delayed issue detection.

### 2. Smallest Safe Build Slice to Close It

Implement a new, read-only API endpoint within the BuilderOS internal services that exposes the current state and last known activity timestamp of the BuilderOS execution loop. This endpoint will provide a lightweight, non-mutating view of the loop's health and progress.

### 3. Exact Safe-Scope Files to Touch First

*   `services/builderos-api/src/routes/status.js`: New route definition for `/builderos/v2/status`.
*   `services/builderos-api/src/controllers/statusController.js`: New controller to handle status requests, querying the BuilderOS core.
*   `services/builderos-core/src/lib/loopStatus.js`: New utility module to encapsulate logic for retrieving the current loop status from internal BuilderOS state or persistence.
*   `services/builderos-api/src/schemas/builderosStatusSchema.js`: (If using schema validation) Define the JSON schema for the status response.

### 4. Verifier/Runtime Checks

*   **API Accessibility:** `GET /builderos/v2/status` returns HTTP 200 OK.
*   **Response Structure:** The response body is a JSON object containing at least `{"status": "running" | "idle" | "error", "lastActivityTimestamp": "ISO_8601_STRING"}`.
*   **Data Freshness:** `lastActivityTimestamp` reflects recent BuilderOS loop activity (e.g., within the last minute if the loop is active).
*   **Isolation:** No observable impact on LifeOS user features or TSOS customer-facing surfaces.
*   **Error Handling:** Appropriate 5xx responses for internal errors, 4xx for invalid requests (though this endpoint is simple).

### 5. Stop Conditions if Runtime Truth Disagrees

*   The API endpoint consistently returns non-200 status codes.
*   The API response schema is incorrect or inconsistent.
*   The reported `status` or `lastActivityTimestamp` is stale or inaccurate for more than 2 consecutive checks.
*   Any measurable increase in latency or error rates in existing BuilderOS internal services.
*   Any observed side effects or performance degradation in LifeOS or TSOS.