Amendment 46 BuilderOS Control Plane Proof - G905-100

Source Blueprint: `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`

This document outlines the proof-closing steps for wiring the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as specified by Amendment 46.

### Proof-Closing Blueprint Note

This note details the implementation plan to address the OIL verifier rejection and complete the BuilderOS control plane wiring.

**1. Exact Missing Implementation or Proof Gap:**
The primary gap is the absence of `/build/start` and `/build/complete` POST endpoints in `routes/lifeos-council-builder-routes.js`. These endpoints require:
-   `/build/start`: Call an internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
-