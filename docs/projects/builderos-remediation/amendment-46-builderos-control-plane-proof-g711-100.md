# Amendment 46 BuilderOS Control Plane Proof - G711-100

**Source Blueprint:** `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`

---

## Proof-Closing Blueprint Note

This note outlines the missing implementation details and the next steps required to fully wire the BuilderOS control plane routes as specified in Amendment 46.

**1. Exact Missing Implementation or Proof Gap:**
The primary gap is the implementation of two new POST endpoints within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. These endpoints must integrate with existing internal BuilderOS service functions.
Specifically:
*   A `POST /build/start` endpoint is required to accept `task_id`, `blueprint_id`, and `model_used` and invoke an internal `recordBuildStart` function.
*   A `POST /build/complete` endpoint is required to accept a `token` and `OIL receipt IDs` and invoke an internal `recordBuildComplete` function.
*   Crucially, the `/build/complete` endpoint must perform a health check using an internal `canMarkBuildDone` function. If `canMarkBuildDone` returns `false` when the system health is determined to be RED, the endpoint must return a `409 Conflict` HTTP status code.

**2. Smallest Safe Build Slice to Close It:**
The smallest safe build slice involves adding the two specified POST routes (`/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`. Each route handler will be responsible for:
*   Input validation (e.g., ensuring required parameters are present).
*   Calling the respective internal BuilderOS service function (`recordBuildStart`, `recordBuildComplete`).
*   For `/build/complete`, implementing the conditional `canMarkBuildDone` check and returning `409 Conflict` as required.
*   Returning appropriate success (e.g., `200 OK`, `202 Accepted`) or error (e.g., `400 Bad Request`, `500 Internal