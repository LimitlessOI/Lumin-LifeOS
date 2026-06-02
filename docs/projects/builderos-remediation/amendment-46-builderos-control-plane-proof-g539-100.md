// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  getSystemHealthStatus // Assuming this exists or will be implemented for health checks
} from '../services/buildControlService.js'; // Assuming a service