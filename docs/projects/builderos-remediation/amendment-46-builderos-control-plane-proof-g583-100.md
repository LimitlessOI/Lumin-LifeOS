<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G583-100 Remediation -->

# Amendment 46: BuilderOS Control Plane Proof - G583-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane, specifically addressing the integration of build start and completion signals within `routes/lifeos-council-builder-routes.js` as per the AMENDMENT_46_BUILDEROS_CONTROL_PLANE blueprint.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary POST endpoints to signal the start and completion of a build process. Specifically, the following functionalities are missing:
-   A POST endpoint to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` upon a build initiation event.
-   A POST endpoint to trigger `recordBuildComplete` with a build token and OIL receipt IDs upon build completion.
-   Conditional logic within the build completion endpoint to check `canMarkBuildDone` and return a 409 status