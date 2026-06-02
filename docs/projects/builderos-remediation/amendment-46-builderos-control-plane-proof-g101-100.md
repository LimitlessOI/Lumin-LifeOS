// File: routes/lifeos-council-builder-routes.js (Proposed additions/modifications)

import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone
} from '../services/builder-control-plane-service.js'; // Assuming these services exist or will be created

const