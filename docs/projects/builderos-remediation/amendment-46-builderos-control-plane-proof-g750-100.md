Amendment 46 BuilderOS Control Plane Proof - G750-100

Proof-Closing Blueprint Note

This document outlines the missing implementation details and a plan to close the proof gap for wiring the BuilderOS control plane routes as specified in Amendment 46.

1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of wired routes in `routes/lifeos-council-builder-routes.js` for the `/build` start and complete endpoints, and the associated conditional 409 response. Specifically:
    - POST `/build/start` to call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    - POST `/build/complete` to call `recordBuildComplete` with `token` and `OIL receipt IDs`.
    - Conditional 409 response if `canMarkBuildDone` fails when health is RED during `/build/complete`.

2. Smallest Safe Build Slice to Close It
Implement the two POST routes within `routes/lifeos-council-builder-routes.js`.
    - For `/build/start`: Extract `task_id`, `blueprint_id`, `model_used` from the request body and pass them to `recordBuildStart`.
    - For `/build/complete`: Extract `token` and `OIL receipt IDs` from the request body. Before calling `recordBuildComplete`, check `canMarkBuildDone`. If it returns false and health is RED, respond with 409. Otherwise, proceed with `recordBuildComplete`.
    - Assume `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are available for import and use.

3. Exact Safe-Scope Files to Touch First
    - `routes/lifeos-council-builder-routes.js` (primary modification)
    - Potentially `services/builder-control-plane.js` or `utils/health-monitor.js` if `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` need to be defined or exposed, but the focus for this slice is the route wiring.

4. Verifier/Runtime Checks
    - **Test Case 1: Build Start Success**
        - Action: `POST /build/start` with `{ "task_id": "t123", "blueprint_id": "b456", "model_used": "g750" }`
        - Expected: HTTP 200 OK. `recordBuildStart` is called with the correct payload.
    - **Test Case 2: Build Complete Success**
        - Action: `POST /build/complete` with `{ "token": "abc", "oil_receipt_ids": ["r1", "r2"] }` (assuming `canMarkBuildDone` returns true or health is not RED)
        - Expected: HTTP 200 OK. `recordBuildComplete` is called with the correct payload.
    - **Test Case 3: Build Complete Failure (Health RED, canMarkBuildDone fails)**
        - Precondition: Configure system state such that `canMarkBuildDone` returns false and health is RED.
        - Action: `POST /build/complete` with `{ "token": "def", "oil_receipt_ids": ["r3"] }`
        - Expected: HTTP 409 Conflict. `recordBuildComplete` is NOT called.

5. Stop Conditions if Runtime Truth Disagrees
    - If any of the above test cases fail to produce the expected HTTP status code or internal service call behavior.
    - If the route handlers introduce regressions or side effects outside the BuilderOS control plane.
    - If the `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` functions are not found or throw unexpected errors upon invocation, indicating a deeper dependency issue.