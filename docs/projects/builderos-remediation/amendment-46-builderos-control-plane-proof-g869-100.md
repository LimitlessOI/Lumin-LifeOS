### Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane Wiring (G869-100)

This note details the required implementation to wire the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as per Amendment 46, ensuring proper build lifecycle management and health-based control.

#### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of the specified `POST /build/start` and `POST /build/complete` endpoints within `routes/lifeos-council-builder-routes.js`. This includes the integration with `recordBuildStart`, `recordBuildComplete`, and the conditional `canMarkBuildDone` health check.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Adding two new `POST` routes to `