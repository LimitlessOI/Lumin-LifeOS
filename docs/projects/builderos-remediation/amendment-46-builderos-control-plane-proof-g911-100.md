<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G911 100. -->

Amendment 46 BuilderOS Control Plane Proof - G911-100
Source Blueprint: `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`

This document serves as a proof-closing blueprint note for Amendment 46, specifically addressing the wiring of BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` control plane endpoints within `routes/lifeos-council-builder-routes.js` to manage build start and completion events, including health-based conditional completion.

### 2. Smallest Safe Build Slice to Close It

Implement the following within `routes/lifeos-council-builder-routes.js`:
-   A `POST` endpoint for `/build/start` that internally calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST` endpoint for `/build/complete` that internally calls `recordBuildComplete` with `token` and `OIL receipt IDs`.
-   Before calling `recordBuildComplete`, check `canMarkBuildDone()`. If it returns `false` (indicating health RED), return a `409 Conflict` status.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js` (for route definitions)
-   (Assumed) `services/builder-control-plane-service.js` or similar (for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` implementations, if not already present). For this proof, the focus is on the route wiring.

### 4. Verifier/Runtime Checks

-   **Build Start:** Send a `POST` request to `/build/start` with a JSON body `{ "task_id": "...", "blueprint_id": "...", "model_used": "..." }`. Verify that `recordBuildStart` is invoked with the correct parameters and the route returns a success status (e.g., 200/202).
-   **Build Complete (Success Path):** Ensure `canMarkBuildDone()` returns `true`. Send a `POST` request to `/build/complete` with a JSON body `{ "token": "...", "oil_receipt_ids": ["...", "..."] }`. Verify that `recordBuildComplete` is invoked with the correct parameters and the route returns a success status.
-   **Build Complete (Health RED Path):** Configure the system such that `canMarkBuildDone()` returns `false`. Send a `POST` request to `/build/complete` with a valid token and OIL receipt IDs. Verify that the route returns a `409 Conflict` status code and `recordBuildComplete` is *not* invoked.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` does not correctly invoke `recordBuildStart` or returns an unexpected error.
-   If `POST /build/complete` invokes `recordBuildComplete` when `canMarkBuildDone()` is `false`.
-   If `POST /build/complete` does not return `409 Conflict` when `canMarkBuildDone()` is `false`.
-   If `POST /build/complete` fails to invoke `recordBuildComplete` when `canMarkBuildDone()` is `true`.
-   If any of the specified routes are unreachable or return incorrect HTTP status codes.