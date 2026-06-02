The specification is contradictory: the target file is a markdown document (`.md`), but the instruction asks to "Output ONLY the code first" and the OIL verifier rejected the previous attempt due to an unknown file extension for `.md`, implying it expects executable code.

```javascript
// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/builder-control-plane.js'; // Assuming this service exists and exports these functions

const router = Router();

// Existing routes would go here...

// BuilderOS Control Plane - Build Lifecycle Events
// POST /build/start - Records the initiation of a build task.
router.post('/build