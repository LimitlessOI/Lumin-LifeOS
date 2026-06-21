<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G30-100 Remediation -->

# Amendment 46: BuilderOS Control Plane Proof - G30-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane, specifically addressing the integration of build start and completion signals within `routes/lifeos-council-builder-routes.js` as per the Amendment 46 blueprint.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of API endpoints and corresponding logic within `routes/lifeos-council-builder-routes.js` to:
-   Receive a `POST` request signaling a build start and internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   Receive a `POST` request signaling a build completion and internally call `recordBuildComplete` with the provided token and OIL receipt IDs.
-   Enforce a health check via `canMarkBuildDone` before allowing build completion, returning a `409 Conflict` if the health is RED.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `POST` routes to `routes/lifeos-council-builder-routes