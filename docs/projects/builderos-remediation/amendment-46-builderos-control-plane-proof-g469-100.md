# Amendment 46: BuilderOS Control Plane Proof - G469-100 Remediation

## Proof-Closing Blueprint Note

This document addresses the OIL verifier rejection by outlining the necessary implementation to close the identified gap in the BuilderOS control plane, specifically regarding the `/build` lifecycle management.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` endpoint within `routes/lifeos-council-builder-routes.js` to correctly handle build start and completion events, and to enforce health-based completion constraints. Specifically:
- Missing `POST /build/start` endpoint to invoke `recordBuildStart({ task_id, blueprint_id, model_used })`.
- Missing `POST /build/complete` endpoint to invoke `recordBuildComplete` with `token` and `oil_receipt_ids`.
- Missing conditional check for `canMarkBuildDone` on `POST /build/complete` to return a 409 status when BuilderOS health is RED.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding new POST routes and their respective handlers to `routes/lifeos-council-builder-routes.js`. This will involve:
- Defining a `POST /build/start` route that extracts `task_id`, `blueprint_id`, and `model_used` from the request body and passes them to `recordBuildStart`.
- Defining a `POST /build/complete` route that extracts `token` and `oil_receipt_ids` from the request body.
- Before calling `recordBuildComplete` in the `/build/complete` route, asynchronously call `canMarkBuildDone`. If `canMarkBuildDone` returns `false`, respond with a 409 status.
- If `canMarkBuildDone` returns `true`, proceed to call `recordBuildComplete`.

### 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their logic.
- `services/builder-control-plane-service.js` (ASSUMPTION): This file is assumed to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. No modifications to this file are expected, only imports.

### 4. Verifier/Runtime Checks

To verify the implementation:
- **Unit/Integration Tests:**
    - Test `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used` to ensure `recordBuildStart` is called with correct parameters and a 202 Accepted status is returned.
    - Test `POST /build/complete` with valid `token` and `oil_receipt_ids` when `canMarkBuildDone` returns `true`, ensuring `recordBuildComplete` is called and a 202 Accepted status is returned.
    - Test `POST /build/complete` with valid `token` and `oil_receipt_ids` when `canMarkBuildDone` returns `false` (simulating health RED), ensuring a 409 Conflict status is returned and `recordBuildComplete` is *not* called.
- **End-to-End Verification:**
    - Trigger a BuilderOS build process and monitor logs to confirm `recordBuildStart` and `recordBuildComplete` are invoked at the appropriate lifecycle stages.
    - Artificially set BuilderOS health to RED (if possible) and attempt to complete a build; verify the 409 response.
    - Confirm no regressions in existing BuilderOS functionality.
    - Confirm no impact on LifeOS user features or TSOS customer-facing surfaces.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be stopped and flagged for re-evaluation if any of the following conditions are met:
- `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` functions are not resolvable or throw unexpected errors during execution.
- The `POST /build/start` endpoint fails to correctly record build initiation.
- The `POST /build/complete` endpoint fails to correctly record build completion when health allows.
- The `POST /build/complete` endpoint does *not* return a 409 status when `canMarkBuildDone` indicates health is RED.
- Any existing BuilderOS control plane functionality is observed to be broken or altered.
- Any LifeOS user features or TSOS customer-facing surfaces exhibit unexpected behavior or errors.

---

**Proposed `routes/lifeos-council-builder-routes.js` snippet (for context):**

```javascript
// Assuming imports for express and internal services
import express from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone
} from '../services/builder-control-plane-service.js'; // ASSUMPTION: Path to service

const router = express.Router();

// ... existing routes ...

/**
 * @route POST /build/start