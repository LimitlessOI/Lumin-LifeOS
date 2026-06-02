# Amendment 46: BuilderOS Control Plane Proof - G401-100

This document serves as the proof-closing blueprint note for the BuilderOS control plane wiring specified in Amendment 46, focusing on the `routes/lifeos-council-builder-routes.js` modifications.

## 1. Exact Missing Implementation or Proof Gap

The current `routes/lifeos-council-builder-routes.js` lacks the necessary endpoints and associated logic to manage the lifecycle of a BuilderOS build process. Specifically, the gap is the absence of:
- A `POST /build/start` endpoint to initiate build recording.
- A `POST /build/complete` endpoint to finalize build recording and process OIL receipts.
- Integration of a health check (`canMarkBuildDone`) to gate build completion based on system health, returning a 409 Conflict status if health is RED.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST routes to `routes/lifeos-council-builder-routes.js` and implementing their respective handler logic, leveraging existing or newly defined internal BuilderOS service functions.

**Proposed `routes/lifeos-council-builder-routes.js` additions:**

```javascript
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/builderService.js'; // Assuming builderService handles core logic

const router = Router();

// Existing routes...

// BuilderOS Build Start Endpoint
router.post('/build/start', async (req, res) => {
  const { task_id, blueprint_id, model_used } = req.body;
  if (!task_id || !blueprint_id || !model_used) {
    return res.status(400).json({ error: 'Missing required parameters: task_id, blueprint_id, model_used' });
  }
  try {
    const result = await recordBuildStart({ task_id, blueprint_id, model_used });
    res.status(202).json(result); // 202 Accepted for build start
  } catch (error) {
    console.error('Error recording build start:', error);
    res.status(500).json({ error: 'Failed to record build start' });
  }
});

// BuilderOS Build Complete Endpoint
router.post('/build/complete', async (req, res) => {
  const { token, oil_receipt_ids } = req.body; // Assuming token for auth/context, oil_receipt_ids for receipts
  if (!token || !oil_receipt_ids || !Array.isArray(oil_receipt_ids)) {
    return res.status(400).json({ error: 'Missing required parameters: token, oil_receipt_ids (array)' });
  }

  try {
    // Health check before marking build complete
    const healthStatus = await canMarkBuildDone();
    if (healthStatus === 'RED') {
      return res.status(409).json({ error: 'System health is RED, cannot mark build complete.' });
    }

    const result = await recordBuildComplete({ token, oil_receipt_ids });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error recording build complete:', error);
    res.status(500).json({ error: 'Failed to record build complete' });
  }
});

export default router;
```

## 3. Exact Safe-Scope Files to Touch First

1.  `routes/lifeos-council-builder-routes.js`: This file will be modified to add the two new `POST` endpoints.
2.