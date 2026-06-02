// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/builderService.js'; // Assuming a builderService exists

const router = Router();

/**
 * @route POST /build/start