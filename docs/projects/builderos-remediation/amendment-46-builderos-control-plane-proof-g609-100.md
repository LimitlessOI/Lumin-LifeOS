import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  BUILDER_HEALTH_STATUS
} from '../services/builderService.js'; // Assuming builderService.js exists and exports these functions

const router = Router();

/**
 * POST /build/start
 * Records