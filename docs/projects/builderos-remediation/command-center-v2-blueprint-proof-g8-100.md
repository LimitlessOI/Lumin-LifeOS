The instruction to write `docs/projects/builderos-remediation/command-center-v2-blueprint-proof-g8-100.md` is contradictory with the OIL verifier's rejection of `.md` files.

Command Center V2 Blueprint Proof: G8-100 - Basic Health Endpoint

This document serves as a proof-closing note for the G8-100 build slice, focusing on establishing a foundational health check endpoint for the Command Center V2 backend.

1.  **Exact Missing Implementation or Proof Gap**
    The current Command Center V2 API lacks a standard, accessible health check endpoint to verify its operational status. This gap prevents basic liveness/readiness probes and quick operational status checks, which are critical for platform observability and reliability.

2.  **Smallest Safe Build Slice to Close It**
    Implement a `GET /health` endpoint in the Command Center V2 backend. This endpoint should return a `200 OK` status with a JSON body `{ "status": "ok", "service": "command-center-v2" }`. No database access or complex business logic is required for this initial slice.

3.  **Exact Safe-Scope Files to Touch First**
    *   `src/api/v2/routes/health.js` (new file for the health route handler)
    *   `src/api/v2/index.js` (to register the new health route with the V2 API router)
    *   `src/app.js` (to ensure the V2 API router is correctly mounted, if not already)

4.  **Verifier/Runtime Checks**
    *   **Unit Test**: Add a unit test for `src/api/v2/routes/health.js` to verify it returns the expected status and body.
    *   **Integration Test**: Deploy the service locally and make a `curl http://localhost:<port>/health` request. Verify `HTTP/1.1 200 OK` and the JSON payload.
    *   **Liveness/Readiness Probe Simulation**: Use `kubectl probe` or similar tooling against the deployed endpoint in a staging environment.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `GET /health` returns anything other than `200 OK` or the expected JSON payload.
    *   If the endpoint is not accessible (e.g., returns a 404 or connection refused).
    *   If the service fails to start or crashes after adding the endpoint.
    *   If existing, unrelated API routes are negatively impacted or exhibit regressions.