# Amendment 12: Command Center - Proof G1003-100 (Web UI Initial Status Display)

This document outlines the proof-closing blueprint note for the initial build slice of the Command Center Web UI, specifically focusing on establishing basic connectivity and status display (G1003-100).

---

### Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**

The initial implementation of the `CommandCenterWeb` module is missing. Specifically, the gap is the establishment of a minimal web server endpoint that can expose the current BuilderOS system status by integrating with the existing `CommandCenterAPI.queryStatus()` method. This forms the foundational layer for any subsequent web UI development.

**2. Smallest Safe Build Slice to Close It:**

Implement a new `CommandCenterWeb` module that:
*   Initializes an HTTP server (e.g., using Express.js).
*   Exposes a single GET endpoint, `/builder-os/command-center/status`, which, when accessed, calls `CommandCenterAPI.queryStatus()` and returns its result as a JSON response.
*   Integrates this web module into the main BuilderOS application startup sequence.

**3. Exact Safe-Scope Files to Touch First:**

*   `src/builder-os/command-center/web/CommandCenterWeb.js` (NEW): Contains the Express app setup and the `/status` endpoint logic.
*   `src/builder-os/command-center/web/index.js` (NEW): Exports the `start` function for the web module.
*   `src/builder-os/command-center/index.js` (MODIFY): Import and call the `CommandCenterWeb.start()` function during BuilderOS initialization.
*   `package.json` (MODIFY): Add `express` dependency if not already present for BuilderOS internal web services.
*   `src/builder-os/command-center/api/CommandCenterAPI.js` (EXISTING): Ensure `queryStatus` is correctly implemented and exported.

**4. Verifier/Runtime Checks:**

1.  Start the BuilderOS application in a development environment.
2.  Open a web browser or use a tool like `curl` to access the endpoint: `http://localhost:<BUILDEROS_WEB_PORT>/builder-os/command-center/status`.
3.  Verify that the request returns a `200 OK` HTTP status code.
4.  Verify that the response body is a valid JSON object containing system status information, consistent with the expected output of `CommandCenterAPI.queryStatus()`.
5.  Check the BuilderOS application logs for any errors or warnings related to the `CommandCenterWeb` module startup or endpoint handling.

**5. Stop Conditions if Runtime Truth Disagrees:**

*   If the `http://localhost:<BUILD