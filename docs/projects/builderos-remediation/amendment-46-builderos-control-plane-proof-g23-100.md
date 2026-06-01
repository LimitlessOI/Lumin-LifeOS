Amendment 46: BuilderOS Control Plane Proof - G23-100

Proof-Closing Blueprint Note: Wire `routes/lifeos-council-builder-routes.js`

This note addresses the implementation gap for wiring the BuilderOS control plane routes as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file requires the following new `POST` endpoints to manage the BuilderOS build lifecycle:
    *   A `POST /build/start` endpoint:
        *   Accepts `task_id`, `blueprint_id`, and `model_used` in the request body.
        *   Calls an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
    *   A `POST /build/complete` endpoint: