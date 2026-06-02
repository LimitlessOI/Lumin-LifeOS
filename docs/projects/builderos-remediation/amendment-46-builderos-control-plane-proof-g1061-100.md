// routes/lifeos-council-builder-routes.js
import express from 'express';
// Assuming these services exist and are ESM modules
import * as builderControlService from '../services/builder-control-service.js';
import * as healthMonitorService from '../services/health-monitor-service.js';

const router = express.Router();

// Middleware for basic payload validation for /build/start
const validateBuildStartPayload = (req, res, next) => {
    const { task_id, blueprint_id, model_used } = req.body;
    if (!task_id || !blueprint_id || !model_used) {
        return res.status(400).json({ error: 'Missing required fields: task_id, blueprint_id, model_used' });
    }
    next();
};

// Middleware for basic payload validation for /build/complete
const validateBuildCompletePayload = (req, res, next) => {