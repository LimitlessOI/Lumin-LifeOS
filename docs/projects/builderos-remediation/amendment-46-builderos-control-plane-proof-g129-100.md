<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G129 100. -->

Amendment 46 BuilderOS Control Plane Proof - G129-100
This document serves as a proof-closing blueprint note for the BuilderOS Control Plane, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` as per Amendment 46.

```javascript
// File: routes/lifeos-council-builder-routes.js
import express from 'express';
import { recordBuildStart, recordBuildComplete, canMarkBuildDone } from '../services/build-record-service.js';
import { getSystemHealth } from '../utils/system-health.js'; // Assuming this utility exists

const router = express.Router();

// POST /build/start
router.post('/build/start', async (req, res) =>