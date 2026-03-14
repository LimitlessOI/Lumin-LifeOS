import express from 'express';
import { callOutreach, smsOutreach } from '../middleware/simulationMiddleware.js';

const router = new express.Router();

// POST /api/v1/outreach/call
router.post('/call', callOutreach);

// POST /api/v1/outreach/sms
router.post('/sms', smsOutreach);

export default router;
