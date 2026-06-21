<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G917 100. -->

The specification is contradictory regarding the primary output: it asks to "Write docs/projects/builderos-remediation/amendment-46-builderos-control-plane-proof-g917-100.md" (a markdown file whose content is provided in REPO FILE CONTENTS) but then instructs to "Generate the complete implementation code. Output ONLY the code first" and provides a "Signal requiring follow-through" to "Wire `routes/lifeos-council-builder-routes.js`" (a JavaScript file). Prioritizing the explicit instruction to "Generate the complete implementation code" and the "Signal requiring follow-through" for a code file, the output will be the JavaScript implementation.

```javascript
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/buildControlService.js'; // Assumed path based on blueprint note

const router = Router();

/**
 * POST