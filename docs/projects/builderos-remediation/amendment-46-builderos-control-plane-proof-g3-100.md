# Amendment 46: BuilderOS Control Plane Proof - G3-100 Remediation

## Proof-Closing Blueprint Note

This document addresses the OIL verifier rejection for `amendment-46-builderos-control-plane-proof-g3-100.md` and outlines the next steps for implementing the BuilderOS control plane wiring.

### 1. Exact Missing Implementation or Proof Gap

The immediate proof gap identified by the OIL verifier rejection is a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]` when attempting to process this `.md` file. This indicates the verifier environment is attempting to load the markdown file as a JavaScript module, which is incorrect for a documentation artifact. The verifier's expectation for documentation file types needs to be aligned with its purpose.

The underlying implementation gap, as per the task signal, is the missing wiring in `routes/lifeos-council-builder-routes.js` for the `/build` endpoints.

### 2. Smallest Safe Build Slice to Close It

**For Verifier Rejection:**
The smallest slice to close the verifier rejection is to ensure the verifier correctly identifies and processes `.md` files as documentation, not as executable code. This may involve a verifier configuration adjustment or clarification of expected file types. Assuming the verifier expects a valid *document* and not a JS module, this markdown file itself serves as the proof.

**For BuilderOS Control Plane Wiring:**
Implement the `POST /build` endpoints within `routes/lifeos-council-builder-routes.js` to:
1.  Call `recordBuildStart({ task_id, blueprint_id, model_used })` on build initiation.
2.  Call `recordBuildComplete` with `token` and `OIL receipt IDs` on build completion.
3.  Implement a check using `canMarkBuildDone` and return a `409 Conflict` if it fails when health is RED.

### 3. Exact Safe-Scope Files to Touch First

*   `docs/projects/builderos-remediation/amendment-46-builderos-control-plane-proof-g3-100.md` (this file, to be created/updated)
*   `routes/lifeos-council-builder-routes.js` (for endpoint wiring)
*   `services/build-record-service.js` (assuming `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are or will be defined here, or a similar dedicated service file for build operations).

### 4. Verifier/Runtime Checks

*   **Verifier Check (Documentation):** The OIL verifier should successfully process this `.md` file without `ERR_UNKNOWN_FILE_EXTENSION`. This confirms the verifier's understanding of documentation file types.
*   **Runtime Check (API Endpoints):**
    *   `POST /build` (start): Verify that `recordBuildStart` is invoked with the correct payload (`task_id`, `blueprint_id`, `model_used`).
    *   `POST /build` (complete): Verify that `recordBuildComplete` is invoked with the correct `token` and `OIL receipt IDs`.
    *   `POST /build` (complete, health RED): Verify that if `canMarkBuildDone` returns `false` when health is RED, the endpoint responds with a `409 Conflict` status.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Verifier Rejection Persists:** If the OIL verifier continues to reject this `.md` file with a syntax error or `ERR_UNKNOWN_FILE_EXTENSION`, halt and investigate the verifier's configuration and expected input types for documentation. This indicates a fundamental mismatch in the build system's understanding of documentation artifacts.
*   **API Endpoint Mismatch:** If the `POST /build` endpoints do not correctly invoke the build record services or fail to return the `409` status under the specified conditions, halt and debug the `routes/lifeos-council-builder-routes.js` implementation and its dependencies.