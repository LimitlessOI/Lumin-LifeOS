<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof (G525-100) -->

# Amendment 46 BuilderOS Control Plane Proof (G525-100)

**Source Blueprint:** `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`

This document outlines the remediation for the BuilderOS control plane, specifically addressing the wiring of build start and completion events within `routes/lifeos-council-builder-routes.js` as per the OIL verifier rejection follow-through signal.

---

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary POST endpoints and associated handler logic to:
-   Initiate a build process by recording its start parameters (`task_id`, `blueprint_id`, `model_used`).
-   Finalize a build process by recording its completion details (`token`, `oil_receipt_ids`).
-   Enforce a critical health check (`canMarkBuildDone`) before allowing build completion, returning a 409 Conflict status if the system health is RED.

This gap prevents the BuilderOS control plane from accurately tracking and governing the lifecycle of builds, leading to potential inconsistencies and operational risks.

### 2. Smallest Safe Build Slice to Close It

The remediation involves introducing two new POST routes within `routes/lifeos-council-builder-routes.js`:
-   `/build/start`: To handle the initiation of a build.
-   `/build/complete`: To handle the finalization of a build, including the health check.

These routes will leverage existing or newly defined internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) to interact with the underlying BuilderOS state management and health monitoring systems. The implementation will adhere to existing Node/ESM patterns and error handling conventions.

### 3. Exact Safe-Scope Files to Touch First

1.  **`routes/lifeos-council-builder-routes.js`**: This file will be modified to add the new `/build/start` and `/build/complete` POST endpoints.
2.  **`services/builder-service.js`** (or similar internal service module): This file will contain or be extended to include the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If `services