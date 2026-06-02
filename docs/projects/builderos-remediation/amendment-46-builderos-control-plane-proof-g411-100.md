// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  getSystemHealth
} from '../services/builder-control-plane-service.js'; // Assuming a new service file

const builderRouter = Router