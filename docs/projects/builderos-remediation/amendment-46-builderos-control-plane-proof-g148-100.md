### Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane Wiring (G148-100)

This note addresses the signal to wire `routes/lifeos-council-builder-routes.js` for build start and completion events, including health-based conditional logic.

#### 1. Exact Missing Implementation or Proof Gap

The current `routes/lifeos-council-builder-routes.js` is missing two critical POST endpoints to manage the BuilderOS build lifecycle:
-   `POST /build/start`: To record the initiation of a build process.
-   `POST /build/complete`: To record the successful or failed completion of a build, with a preceding health check.

Specifically, the gap is the integration of `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions into the router, along with appropriate request body parsing and response handling.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new `router.post` handlers to `routes/lifeos-council-builder-routes.js`.

**Endpoint 1: `POST /build/start`