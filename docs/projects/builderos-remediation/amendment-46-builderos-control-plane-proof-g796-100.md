<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G796 100. -->

The specification is contradictory regarding the expected output format for the target `.md` file, given the verifier's behavior.

```javascript
// File: routes/lifeos-council-builder-routes.js (Illustrative implementation for the proof note)
// This code block is provided as the "implementation-first" component of the proof note,
// demonstrating the required wiring. It is NOT the content of the .md file itself.

import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../controllers/builder-control-controller.js'; // ASSUMPTION: Controller exists

const router = Router();

// POST /build/start
// Records the initiation of a build process.
router