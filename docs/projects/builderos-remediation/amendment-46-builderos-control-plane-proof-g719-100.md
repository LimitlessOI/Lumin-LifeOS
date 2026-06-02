// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/builder-control-plane.js'; // Assuming this path for service functions

const builderRouter = Router();

/**
 *