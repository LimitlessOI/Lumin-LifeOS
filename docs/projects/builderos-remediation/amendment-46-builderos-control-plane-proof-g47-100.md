# Amendment 46: BuilderOS Control Plane Proof - G47-100

This document serves as a proof-closing note for the implementation of the BuilderOS control plane wiring as specified in `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`. It addresses the signal requiring follow-through for `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of the `/build` start and complete POST endpoints within `routes/lifeos-council-builder-routes.js`. This includes the necessary integration with internal build management services for recording build states and performing health checks before marking a build as complete. Specifically:
-   Missing `POST /build/start` endpoint to initiate build recording.
-   Missing `POST /build/complete` endpoint to finalize build recording.
-   Missing integration with a `canMarkBuildDone` health check, specifically returning a 409 status when this check fails due to a RED health state.
-   The underlying service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are assumed to exist or need to be created/extended in a dedicated builder control plane service layer.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new POST routes to `routes/lifeos-council-builder-routes.js`.
2.  Implementing the request handlers for these routes, including input validation.
3.  Integrating with a `builderControlPlaneService` (or similar) to call `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.
4.  Handling the 409 conflict response specifically when `canMarkBuildDone` indicates a failure due to health RED.

**Proposed `builderControlPlaneService` Interface (conceptual):**

```javascript
// services/builder-control-plane-service.js (conceptual)
export const builderControlPlaneService = {
  /**
   * Records the start of a build process.
   * @param {object} params
   * @param {string} params.task_id - The ID of the task initiating the build.
   * @param {string} params.blueprint_id - The ID of the blueprint being built.
   * @param {string} params.model_used - The model used for the build.
   * @returns {Promise<object>} Build record details.
   */
  async recordBuildStart({ task_id, blueprint_id, model_used }) {
    // Implementation to persist build start details
    console.log(`Recording build start for task ${task_id}, blueprint ${blueprint_id}`);
    return { buildId: 'new-build-id-123', status: 'STARTED' };
  },

  /**
   * Records the completion of a build process.
   * @param {object} params
   * @param {string} params.build_token - A token identifying the build.
   * @param {string[]} params.oil_receipt_ids - Array of OIL receipt IDs.
   * @returns {Promise<object>} Updated build record details.
   */
  async recordBuildComplete({ build_token, oil_receipt_ids }) {
    // Implementation to update build completion details
    console.log(`Recording build complete for token ${build_token}`);
    return { buildId: 'existing-build-id-123', status: 'COMPLETED' };
  },

  /**
   * Checks if a build can be marked as done, considering system health.
   * @returns {Promise<boolean>} True if allowed, false if health is RED or other conditions prevent completion.
   */
  async canMarkBuildDone() {
    // Implementation to check system health (e.g., BuilderOS health, resource availability)
    // For this proof, assume a simple check.
    const isHealthRed = Math.random() < 0.1; // Simulate occasional RED health
    if (isHealthRed) {
      console.warn("System health is RED, cannot mark build done.");
      return false;
    }
    return true;
  }
};