// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  getSystemHealthStatus // Assuming this exists or needs to be implemented in the service
} from '../services/builder-control-plane-service.js';