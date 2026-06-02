// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import { recordBuildStart, recordBuildComplete, canMarkBuildDone } from '../services/builderControlService.js'; // Assuming this service exists or will be created

const router = Router();

// POST /build/start - Record build start event