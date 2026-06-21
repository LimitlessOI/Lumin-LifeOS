<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G259 100. -->

Proof-Closing Blueprint Note: G259-100 - BuilderOS Control Plane Wiring

1. Exact Missing Implementation or Proof Gap:
The `routes/lifeos-council-builder-routes.js` module lacks endpoints and logic for BuilderOS build lifecycle management:
- `POST /build/start`: To record build initiation with `task_id`, `blueprint_id`, `model_used`.
- `POST /build/complete`: To record build completion with `token` and `OIL receipt IDs`.
- Error handling: Implement a 409 conflict response if `canMarkBuildDone` returns false when the system health is RED.

**Proposed `routes/lifeos-council-builder-routes.js` Implementation:**
```javascript
// routes/lifeos-