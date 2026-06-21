<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof - G611-100 Remediation Note -->

# Amendment 46 BuilderOS Control Plane Proof - G611-100 Remediation Note

**Context:** The previous verification failed due to a verifier configuration issue (ERR_UNKNOWN_FILE_EXTENSION for .md files), not a semantic error in the proposed amendment. This note addresses the underlying implementation gap identified for the BuilderOS control plane.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` and `/build/complete` endpoints within `routes/lifeos-council-builder-routes.js` to correctly integrate with the BuilderOS control plane functions for build lifecycle management and health checks. Specifically:
-   Missing `POST /build` endpoint to initiate a build, calling `recordBuildStart`.
-   Missing `POST /build/complete` endpoint to finalize a build, calling `recordBuildComplete`.
-   Missing conditional check for `canMarkBuildDone` and 409 response on health RED for build completion.

## 2. Smallest Safe Build Slice to Close It

Implement the two specified POST routes in `routes/lifeos-council-builder-routes.js`.
-   **`/build` (start):** Accept `task_id`, `blueprint_id`, `model_used` in the request body. Call `builderService.recordBuildStart` with these parameters.
-   **`/build/complete` (complete):** Accept `token` and `oil_receipt_ids` in the request body. First, call `builderService.canMarkBuildDone()`. If it returns false (indicating health RED), respond with a 409 Conflict. Otherwise, call `builderService.recordBuildComplete` with the provided parameters.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js` (primary modification)
-   (Assumption: `builderService` exists and contains `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`. If not, these service methods would need to be created/extended in `services/builderService.js` or similar.)

## 4. Verifier/Runtime Checks

1.  **Build Start Success:**
    -   `POST /build` with `{ "task_id": "t1", "blueprint_id": "b1", "model_used": "m1" }`
    -   Expected: HTTP 200/202 OK.
    -   Runtime check: Verify `builderService.recordBuildStart` was called with the correct payload.
2.  **Build Complete Success:**
    -   Ensure `builderService.canMarkBuildDone()` returns true (e.g., by simulating a healthy state).
    -   `POST /build/complete` with `{ "token": "abc", "oil_receipt_ids": ["r1", "r2"] }`
    -   Expected: HTTP 200/202 OK.
    -   Runtime check: Verify `builderService.recordBuildComplete` was called with the correct payload.
3.  **Build Complete Health Check Failure:**
    -   Ensure `builderService.canMarkBuildDone()` returns false (e.g., by simulating a RED health state).
    -   `POST /build/complete` with `{ "token": "abc", "oil_receipt_ids": ["r1", "r2"] }`
    -   Expected: HTTP 409 Conflict.
    -   Runtime check: Verify `builderService.recordBuildComplete` was *not* called.
4.  **Isolation Check:**
    -   Verify no changes or regressions in existing LifeOS user features or TSOS customer-facing surfaces.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `builderService.recordBuildStart` is not invoked on `/build` POST.
-   If `builderService.recordBuildComplete` is not invoked on `/build/complete` POST when health is GREEN.
-   If a 409 Conflict is not returned on `/build/complete` POST when `builderService.canMarkBuildDone()` returns false.
-   If any existing BuilderOS control plane functionality is disrupted.
-   If any LifeOS user features or TSOS customer-facing surfaces exhibit unexpected behavior or errors.

ASSUMPTIONS:
- A `builderService` module exists (e.g., `services/builderService.js`) that exports `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
- The `routes/lifeos-council-builder-routes.js` file uses an Express-like router setup.