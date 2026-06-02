### Proof-Closing Blueprint Note: G153-100 - BuilderOS Control Plane Wiring

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` module requires new route definitions and associated handler logic to support the BuilderOS build lifecycle. Specifically, the following are missing:
-   A `POST /build/start