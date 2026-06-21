<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof - G1087-100 Remediation -->

# Amendment 46 BuilderOS Control Plane Proof - G1087-100 Remediation

**Source Blueprint:** `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`

This document outlines the remediation plan and proof for the BuilderOS control plane changes, specifically addressing the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`. The previous verifier rejection was due to an `ERR_UNKNOWN_FILE_EXTENSION` for the `.md` proof file itself, indicating a verifier configuration issue rather than a flaw in the proposed implementation logic. This remediation focuses on the functional implementation required by the amendment.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of explicit route handlers within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle events:
-   Initiating a build (`/build` start).
-   Completing a build (`/build` complete).
-   Enforcing health checks (`canMarkBuildDone`) before marking a build as complete.

Specifically, the `routes/lifeos-council-builder-routes.js` file requires:
-   A `POST` endpoint for build start that calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST` endpoint for build completion that calls `recordBuildComplete` with a token and OIL receipt IDs.
-   Integration of `canMarkBuildDone` before `recordBuildComplete`, returning a 409 status code if the health check fails (i.e., health is RED).

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding the necessary `POST` route definitions and their corresponding handler logic directly within `routes/lifeos-council-builder-routes.js`. This includes importing the required internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) and implementing the conditional logic for build completion.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js` (Primary modification target)
-   (Implicit) Ensure `services/build-lifecycle.js` or similar exists and exports `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`.

## 4. Verifier/Runtime Checks

### Verifier Checks
-   The verifier successfully processes `routes/lifeos-council-builder-routes.js` without syntax errors.
-   The verifier confirms the presence of `POST /build/start` and `POST /build/complete` routes.
-   The verifier identifies the calls to `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` within the respective handlers.
-   The verifier confirms the 409 status code return path for `canMarkBuildDone` failure.

### Runtime Checks
-   **Build Start:**
    -   Send `POST /build/start` with a valid JSON body `{ "task_id": "...", "blueprint_id": "...", "model_used": "..." }`.
    -   Expected outcome: HTTP 200 OK. Verify `recordBuildStart` is invoked with the correct parameters in logs/metrics.
-   **Build Complete (Health GREEN):**
    -   Ensure `canMarkBuildDone()` returns `true` (simulated or actual GREEN health).
    -   Send `POST /build/complete` with a valid JSON body `{ "token": "...", "oil_receipt_ids": ["...", "..."] }`.
    -   Expected outcome: HTTP 200 OK. Verify `recordBuildComplete` is invoked with the correct parameters in logs/metrics.
-   **Build Complete (Health RED):**
    -   Ensure `canMarkBuildDone()` returns `false` (simulated or actual RED health).
    -   Send `POST /build/complete` with a valid JSON body `{ "token": "...", "oil_receipt_ids": ["...", "..."] }`.
    -   Expected outcome: HTTP 409 Conflict. Verify `recordBuildComplete` is *not* invoked.
-   **Isolation:** Confirm no unintended side effects on LifeOS user features or TSOS customer-facing surfaces.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` does not correctly invoke `recordBuildStart` or returns an unexpected status.
-   If `POST /build/complete` does not correctly invoke `recordBuildComplete` when health is GREEN, or returns an unexpected status.
-   If `POST /build/complete` does not return 409 when `canMarkBuildDone` indicates RED health.
-   If any existing BuilderOS functionality is regressed or new errors are introduced.
-   If the verifier continues to report syntax errors on JavaScript files related to this change, indicating a deeper integration issue.
-   If the `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` functions are not found or cannot be imported, indicating a missing dependency or incorrect path.