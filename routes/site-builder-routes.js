import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'; // Ensure env vars are loaded for GOOGLE_PLACES

// Import the health check service
import { getRegistryHealth } from '../services/env-registry-map.js';
// Import the new pipeline stats function
import { getPipelineReportStats }