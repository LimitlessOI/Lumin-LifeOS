<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof - G503-100 -->

# Amendment 46 BuilderOS Control Plane Proof - G503-100

This document serves as a proof-closing blueprint note for the BuilderOS Control Plane, specifically addressing the integration of build lifecycle management within the `lifeos-council-builder-routes.js`.

---

### Proof-Closing Blueprint Note: BuilderOS Build Lifecycle Wiring

This note outlines the missing implementation and the plan to integrate build start and complete signals into the BuilderOS control plane via dedicated API endpoints.

#### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to:
*   Receive a `POST` request signaling the start of a build, capturing `task_id`, `blueprint_id`, and `model_used`.
*   Receive a `POST` request signaling the completion of a build, including a build `token` and `OIL receipt IDs`.
*   Enforce a pre-condition check using `canMarkBuildDone` for build completion, returning a `409 Conflict` if the system health is RED.

These endpoints are crucial for the BuilderOS-only governed loop execution, ensuring proper state tracking and operational integrity without impacting LifeOS user features or TSOS customer-facing surfaces.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Adding two new