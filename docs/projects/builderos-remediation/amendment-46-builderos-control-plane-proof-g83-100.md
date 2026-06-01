// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/builderService.js'; // Assuming builderService.js exists and exports these functions

const router = Router();

/**
 * @route POST