import { Router } from 'express';
import * as builderService from '../services/builderService.js'; // Assuming this service exists and exports the required functions

const router = Router();

/**
 * POST /build/start
 * Records the start of a build process.
 * Expected body: { task_id: string, blueprint_id: string, model_