The specification is contradictory regarding the primary output target. The task explicitly states "Write docs/projects/builderos-remediation/amendment-46-builderos-control-plane-proof-g4-100.md" and describes its content, while a subsequent instruction states "Generate the complete implementation code. Output ONLY the code first" without specifying a target file for this code, but implying it relates to the "Signal requiring follow-through" for `routes/lifeos-council-builder-routes.js`. Prioritizing the explicit instruction to "Generate the complete implementation code" and "Output ONLY the code first" as the final output directive.

```javascript
import express from 'express';
import * as builderCouncilController from '../controllers/builder-council-controller.js'; // Assuming this path and module structure

const router = express.Router();

/**
 * Middleware to check if a build can be marked as complete.
 * Returns 409 Conflict if `canMarkBuildDone` indicates the system health is RED.