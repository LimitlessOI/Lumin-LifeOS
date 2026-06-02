### Proof-Closing Blueprint Note: G1007-100 - Builder Control Plane Wiring

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` currently lacks the necessary POST endpoints for `/build/start` and `/build/complete` to integrate with the BuilderOS control plane. Specifically, the routes need to