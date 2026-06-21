<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Enhancement G2. -->

AMENDMENT 46: BuilderOS Control Plane Enhancement (G2)
This memo outlines the next buildable slice for Amendment 46, focusing on the `/build` endpoint within `routes/lifeos-council-builder-routes.js`. The current blueprint lacks a directly buildable safe-scope task, necessitating this enhancement memo to define a clear, actionable path.
---
1.  Blocking Ambiguity or Founder Decision List:
    -   A1: Request Body Schema for `/build`: The blueprint implies a single `/build` endpoint handling both "start" and "complete" actions. A decision is needed on the exact request body structure to differentiate these actions (e.g., a `type` field, or separate endpoints).
    -   A2: Definition of "health RED": Clarify the source and mechanism for determining "health RED" status that `canMarkBuildDone` relies upon.
    -   A3: Location/Signature of internal functions: Confirm the exact module paths and function signatures for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.
    -   A4: Error handling for `recordBuildStart`/`recordBuildComplete`: Define expected error responses if these internal calls fail.

2.  Already-Settled Constraints:
    -   BuilderOS-only governed loop execution; no impact on LifeOS user features or TSOS customer-facing surfaces.
    -   Target route: `POST /build` in `routes/lifeos-council-builder-routes.js`.
    -   Internal calls: `recordBuildStart({ task_id, blueprint_id, model_used })` and `recordBuildComplete({ token, oil_receipt_ids })`.
    -   Conditional 409 response: If `canMarkBuildDone()` returns `false` (indicating health RED), respond with 409 Conflict.

3.  Smallest Buildable Next Slice:
    -   **Objective**: Implement the basic `/build` POST route in `routes/lifeos-council-builder-routes.js` to handle both 'start' and 'complete' actions, including initial calls to internal services and the `canMarkBuildDone` check.
    -   **Assumptions for this slice (to be confirmed by A1-A3 decisions)**:
        -   The request body will include a `type` field (`'start'` or `'complete'`) to distinguish actions.
        -   `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are importable from a `../services/builder-control-plane.js` module.
        -   `canMarkBuildDone()` returns a boolean.
    -   **Implementation Steps**:
        1.  Add a `POST` handler for `/build` in `routes/lifeos-council-builder-routes.js`.
        2.  Parse the request body to determine the action type (`start` or `complete`).
        3.  For `type: 'start'`:
            -   Extract `task_id`, `blueprint_id`, `model_used`.
            -   Call `recordBuildStart({ task_id, blueprint_id, model_used })`.
            -   Respond with 200/201.
        4.  For `type: 'complete'`:
            -   Call `canMarkBuildDone()`. If it returns `false`, respond with 409.
            -   Extract `token`, `oil_receipt_ids`.
            -   Call `recordBuildComplete({ token, oil_receipt_ids })`.
            -   Respond with 200/201.
        5.  Handle invalid `type` or missing parameters with appropriate 400 responses.

4.  Exact Safe-Scope Files BuilderOS Should Touch First:
    -   `routes/lifeos-council-builder-routes.js` (primary modification).
    -   `services/builder-control-plane.js` (if `recordBuildStart