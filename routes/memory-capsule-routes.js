// routes/memory-capsule-routes.js
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js'; // Assuming common middleware location
import * as memorySignalIntakeService from '../services/memory-signal-intake.js';
import * as memoryCandidateService from '../services/memory-candidate.js';
import * as memoryCapsuleService from '../services/memory-capsule.js';
import * as memoryRetrievalService from '../services/memory-retrieval.js';
import * as memoryHealthService from '../services/memory-health.js';
import * as memoryReceiptsService from '../services/memory-receipts.js';

const router = Router();

// All routes require auth
router.use(authMiddleware);

/**
 * @api {post} /api/v1/memory/signal Process a new memory signal
 * @apiGroup MemoryCapsule
 * @apiBody {string} source_type Type of the signal source
 * @apiBody {string} content The signal content
 * @apiBody {string} domain The domain of the signal
 * @apiBody {string} signal_type Type of the signal
 * @apiSuccess {string} capsule_id ID of the created memory capsule
 * @apiSuccess {string} signal_id ID of the signal intake receipt
 * @apiError (400) {object} halt_code, message Governance halt error
 * @apiError (500) {string} message Server error
 */
router.post('/signal', async (req, res) => {
  try {
    const { source_type, content, domain, signal_type } = req.body;

    const normalizedSignal = await memorySignalIntakeService.normalizeSignal({ source_type, content, domain, signal_type });
    const signalReceipt = await memorySignalIntakeService.writeSignalIntakeReceipt(normalizedSignal);
    const candidate = await memoryCandidateService.createCandidate(signalReceipt);
    const capsule = await memoryCapsuleService.createCapsule(candidate);

    res.status(200).json({ capsule_id: capsule.id, signal_id: signalReceipt.id });
  } catch (error) {
    if (error.halt_code) {
      return res.status(400).json({ halt_code: error.halt_code, message: error.message });
    }
    console.error('Error processing signal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @api {post} /api/v1/memory/retrieve Retrieve memory capsules
 * @apiGroup MemoryCapsule
 * @apiBody {string} query The retrieval query
 * @apiBody {string} lane The retrieval lane (required)
 * @apiBody {string} [task_scope] Optional task scope
 * @apiSuccess {array} results Array of retrieved capsules
 * @apiError (400) {object} halt_code, message Governance halt error
 * @apiError (500) {string} message Server error
 */
router.post('/retrieve', async (req, res) => {
  try {
    const { query, lane, task_scope } = req.body;

    if (!lane) {
      return res.status(400).json({ halt_code: 'MEMORY_RETRIEVAL_PERMISSION_UNKNOWN', message: 'Retrieval lane is required.' });
    }

    const results = await memoryRetrievalService.retrieveCapsules({ query, lane, task_scope });
    res.status(200).json(results);
  } catch (error) {
    if (error.halt_code) {
      return res.status(400).json({ halt_code: error.halt_code, message: error.message });
    }
    console.error('Error retrieving capsules:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @api {get} /api/v1/memory/health Get memory system health report
 * @apiGroup MemoryCapsule
 * @apiSuccess {object} health Health report object
 * @apiError (500) {string} message Server error
 */
router.get('/health', async (req, res) => {
  try {
    const healthReport = await memoryHealthService.getHealthReport();
    res.status(200).json(healthReport);
  } catch (error) {
    console.error('Error getting health report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @api {get} /api/v1/memory/capsule/:id Get a specific memory capsule
 * @apiGroup MemoryCapsule
 * @apiParam {string} id Capsule ID
 * @apiSuccess {object} capsule The memory capsule object
 * @apiError (404) {string} message Capsule not found