# BuilderOS Remediation: Amendment 12 Command Center - TODO-10-G4

## Blueprint Enhancement Memo: `/api/health` Endpoint

This memo outlines the next buildable slice for implementing the `/api/health` endpoint as specified in `AMENDMENT_12_COMMAND_CENTER.md`, specifically for uptime monitors requiring no authentication and a 200 OK response.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **Health Check Response Body:** The blueprint specifies "returns 200" but not the content of the response body.
    *   **Decision Required:** Should the response body be empty, or a minimal JSON object (e.g., `{ status: 'ok' }`)?
    *   *Assumption for this slice:* A minimal JSON object `{ status: 'ok' }` will be used, as it provides clear status without adding complexity.

---

### 2. Already-Settled Constraints

*   **Endpoint Path:** `/api/health`
*   **HTTP Method:** GET (standard for health checks)
*   **Response Status:** HTTP 200 OK
*   **Authentication:** No authentication required. This endpoint must bypass all authentication middleware.
*   **Purpose:** Uptime monitoring.

---

### 3. Smallest Buildable Next Slice

Implement the `/api/health` GET endpoint that returns a 200 OK status with a minimal JSON body, ensuring it is accessible without any authentication. This involves adding a new route handler *before* any global authentication middleware.

---

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/app.js` (or `src/server.js` if `app.js` is not the primary entry point for route definitions).
    *   **Rationale:** This file is typically where the main Express application instance is initialized and global middleware (including authentication) is applied. The health check route must be registered early to bypass auth.

---

### 5. Required Verifier/Runtime Checks

*   **Automated Test (Integration/E2E):**
    *   Send a GET request to `/api/health`.
    *   Assert that the response status code is `200`.
    *   Assert that the response body is `{ status: 'ok' }` (or matches the decided body).
    *   Crucially, perform this test *without* any authentication headers or tokens.
*   **Manual Verification:**
    *   Use `curl http://localhost:<PORT>/api/health` from a terminal.
    *   Verify the HTTP status code is 200 and the response body is as expected.

---

### 6. Stop Conditions

*   The `/api/health` endpoint successfully returns an HTTP 200 status code.
*   The `/api/health` endpoint is accessible without requiring any form of authentication (e.g., API keys, JWTs, session tokens).
*   All specified verifier/runtime checks pass.