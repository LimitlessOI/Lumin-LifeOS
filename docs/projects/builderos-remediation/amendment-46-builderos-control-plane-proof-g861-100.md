// File: routes/lifeos-council-builder-routes.js (Proposed additions/modifications)

import { Router } from 'express';
import { recordBuildStart, recordBuildComplete } from '../services/builderControlPlaneService.js';
import { canMarkBuildDone, getSystemHealth } from '../services/builderHealthService.js'; // Assuming this