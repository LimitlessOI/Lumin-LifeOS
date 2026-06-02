// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  getSystemHealth // Assuming this exists to check health status
} from '../services/builderService.js'; // Assuming a builder service

const router = Router