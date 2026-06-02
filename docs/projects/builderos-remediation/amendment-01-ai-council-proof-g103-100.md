# Amendment 01: AI Council Proof - G103-100

This document serves as a proof-closing blueprint note for `proof-g103-100` related to `AMENDMENT_01_AI_COUNCIL`. The objective of this proof point is to establish the foundational mechanism for the AI Council to receive BuilderOS remediation signals.

---

## Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The AI Council requires a defined, secure, and validated input channel to receive remediation signals from the BuilderOS platform. The current gap is the absence of a concrete API endpoint and associated data schema for ingesting these signals, preventing the council from receiving its initial operational data.

**2. Smallest Safe Build Slice to Close It:**
Implement a dedicated, authenticated API endpoint within the BuilderOS domain for the AI Council to receive remediation signals. This slice will define the signal payload schema, implement basic validation, and ensure the endpoint can successfully receive and acknowledge a signal without processing its content beyond initial validation and logging.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/schemas/builderos/remediation-signal.js`: Define the Joi/Zod schema for the `BuilderOSRemediationSignal` payload.
*   `src/services/builderos/ai-council-signal-receiver.js`: Implement a service function to handle the reception, validation, and initial logging of remediation signals.
*   `src/routes/builderos/ai-council.js`: Add a new POST route (e.g., `/builderos/ai-council/remediation-signal`) that utilizes the `ai-council-signal-receiver` service.
*   `src/routes/index.js` (or equivalent main router): Ensure the `builderos/ai-council` router is mounted.

**4. Verifier/Runtime Checks:**
*   **API Endpoint Availability:** Send a POST request to `/builderos/ai-council/remediation-signal` with a valid, authenticated token and an empty body. Expect a 400 Bad Request due to schema validation.
*   **Schema Validation (Invalid Payload):** Send a POST request with an authenticated token and a malformed or incomplete `BuilderOSRemediationSignal` payload. Expect a 400 Bad Request with specific schema validation errors.
*   **Schema Validation (Valid Payload):** Send a POST request with an authenticated token and a complete, valid `BuilderOSRemediationSignal` payload. Expect a 202 Accepted or 200 OK response.
*   **Logging Confirmation:** Verify that a log entry is generated upon successful reception of a valid signal, indicating the signal ID and source.
*   **Authentication/Authorization:** Send a POST request without authentication or with an unauthorized token. Expect a 401 Unauthorized or 403 Forbidden response.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   The `/builderos/ai-council/remediation-signal` endpoint returns a 404 Not Found.
*   Valid `BuilderOSRemediationSignal` payloads are rejected with a 5xx server error.
*   Invalid `BuilderOSRemediationSignal` payloads are accepted without validation errors.
*   No log entry is generated for successfully received valid signals.
*   The endpoint is accessible without proper authentication/authorization.