import { Router } from 'express';
import builderController from '../controllers/builderController.js';
import { getHealthStatus } from '../services/healthService.js'; // Assuming a health service exists

const router = Router();

// Existing route for general build requests
router.post('/build', builderController.handleBuildRequest);

// New route for recording build