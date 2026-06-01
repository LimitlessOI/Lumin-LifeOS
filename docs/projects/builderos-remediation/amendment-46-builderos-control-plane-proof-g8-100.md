# Amendment 46 BuilderOS Control Plane Proof G8-100: Wire Builder Routes

## Implementation-First Code Block

```javascript
// File: routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/builder-control-plane-service.js'; // Assuming this path

const router = Router();

// Route to record the start of a build
router.post('/build/start', async (req, res) => {
  const { task_id, blueprint_id, model_used } = req.body;

  if (!task_id || !blueprint_id || !model_used) {
    return res.status(