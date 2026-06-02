// File: routes/lifeos-council-builder-routes.js (proposed additions/modifications)

import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  getBuilderHealthStatus
} from '../utils/builder-control-plane-utils.js'; // Assuming this