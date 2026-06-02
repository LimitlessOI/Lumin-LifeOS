Amendment 46: BuilderOS Control Plane Proof G41-100

Proof-Closing Blueprint Note: Wire `routes/lifeos-council-builder-routes.js`

This note outlines the implementation required to integrate BuilderOS control plane signals into `routes/lifeos-council-builder-routes.js` for build lifecycle management and health-based completion gating.

### Implementation Snippet for `routes/lifeos-council-builder-routes.js`

```javascript
// routes/lifeos-council-builder-routes.js
import express from 'express';
// Assuming builderControlPlaneService provides the necessary functions
import { recordBuildStart, recordBuildComplete, canMarkBuildDone } from '../services/builderControlPlaneService.js';

const router = express.Router();