<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof (G893-100) -->

# Amendment 46: BuilderOS Control Plane Proof (G893-100)

## Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane Wiring (G893-100)

This note addresses the follow-through signal for wiring `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints for `/build/start` and `/build/complete` to integrate with the BuilderOS control plane. Specifically:
    *   A `POST /build/start` endpoint is needed to call an internal `recordBuildStart` function, expecting `task_id`, `blueprint_id`, and `model_used` in the request body.
    *   A `POST /build/complete` endpoint is needed to call an internal `recordBuildComplete` function, expecting a `token` and `OIL receipt IDs` (e.g., an array or comma-separated string) in the request body.
    *   The `/build/complete` endpoint must include a health check: if `canMarkBuildDone` fails when the system health is `RED`, it must return a `409 Conflict` status. This implies an internal `healthService` or similar utility and a `canMarkBuildDone` function need to be accessible and utilized within the route handler.

2.  **Smallest Safe Build Slice to Close It:**
    The smallest safe build slice involves adding two new POST route handlers within `routes/lifeos-council-builder-routes.js`. These handlers will:
    *   Parse request body parameters.
    *   Call existing or new internal service functions (`recordBuildStart`, `recordBuildComplete`).
    *   Implement the conditional `canMarkBuildDone` check and 409 response for `/build/complete`.
    *   Ensure proper error handling and response formatting.
    This slice does not involve modifying existing LifeOS user features or TSOS customer-facing surfaces, adhering to the specification.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-