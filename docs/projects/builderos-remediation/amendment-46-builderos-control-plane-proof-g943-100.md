### Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane Wiring

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` module requires new POST endpoints to manage the BuilderOS build lifecycle. Specifically:
- A `POST /build/start` endpoint to initiate a build, which must call an