# Amendment 46: BuilderOS Control Plane Proof - G591-100

## Proof-Closing Blueprint Note: BuilderOS Control Plane Wiring

This document outlines the missing implementation and the plan to close the proof gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`. This is an implementation-first blueprint for the next C2 build pass.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary endpoints and associated logic to manage the BuilderOS build lifecycle signals:
-   A `POST /build/start` endpoint to initiate the recording of a build start event.
-   A `POST /build/complete` endpoint to finalize the recording of a build completion event, including a critical health check.

Specifically, the gap involves:
-   Defining two new POST routes in `lifeos-council-builder-routes.js`.
-   Implementing controller functions to handle these routes, which will parse request bodies and delegate to a dedicated BuilderOS control plane service.
-   Implementing the `recordBuildStart({ task_id, blueprint_id, model_used })` logic within a service layer.
-   Implementing the `recordBuildComplete({ token, oil_receipt_ids })` logic within a service layer.
-   Integrating a `canMarkBuildDone()` check before `recordBuildComplete`, returning a 409 Conflict status if the check fails due to a RED health state.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Route Definition**: Adding two new POST routes to `routes/lifeos-council-builder-routes.js`.
2.  **Controller Layer**: Creating or extending a `BuilderControlPlaneController` to handle the request parsing and response formatting for these routes.
3.  **Service Layer**: Creating or extending a `BuilderControlPlaneService` to encapsulate the core business logic for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. This service will interact with the underlying data store (e.g., `build_records` table) and health monitoring systems.

**Proposed `routes/lifeos-council-builder-routes.js` additions:**

```javascript
// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import { builderControlPlaneController } from '../controllers/builder-control-plane-controller.js'; // Assuming this path

const router = Router();

// ... existing routes ...

router.post('/build/start', builderControlPlaneController.handleBuildStart);
router.post('/build/complete', builderControlPlaneController.handleBuildComplete);

export default router;
```

**Proposed `controllers/builder-control-plane-controller.js` (new or extended):**