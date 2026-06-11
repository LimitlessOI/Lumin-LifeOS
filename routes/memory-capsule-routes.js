// routes/memory-capsule-routes.js
/** @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md */
import { Router } from 'express';
import * as memorySignalIntakeService from '../services/memory-signal-intake.js';
import * as memoryCandidateService from '../services/memory-candidate.js';
import * as memoryCapsuleService from '../services/memory-capsule.js';
import * as memoryRetrievalService from '../services/memory-retrieval.js';
import * as memoryHealthService from '../services/memory-health.js';
import * as memoryReceiptsService from '../services/memory-receipts.js';

export function createMemoryCapsuleRoutes({ pool, requireKey }) {
const router = Router();

router.use(requireKey);

router.post('/signal', async (req, res) => {
  try {
    const { source_type, content, domain, signal_type } = req.body;
    const normalizedSignal = await memorySignalIntakeService.normalizeSignal(
      { source_type, content, domain, signal_type },
      { pool }
    );
    await memorySignalIntakeService.writeSignalIntakeReceipt(normalizedSignal, pool);
    const candidate = await memoryCandidateService.createCandidate(normalizedSignal, pool);
    const capsule = await memoryCapsuleService.createCapsule(
      candidate,
      {
        title: String(content).substring(0, 100),
        capsule_type: 'knowledge',
        truth_class: 'objective',
        source_type: source_type || 'user_input',
      },
      pool
    );
    res.status(200).json({ capsule_id: capsule.capsule_id });
  } catch (error) {
    if (error.halt_code) {
      return res.status(400).json({ halt_code: error.halt_code, message: error.message });
    }
    console.error('Error processing signal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/retrieve', async (req, res) => {
  try {
    const { query, lane, task_scope, why_retrieved, allowed_use } = req.body;
    if (!lane) {
      return res.status(400).json({
        halt_code: 'MEMORY_RETRIEVAL_PERMISSION_UNKNOWN',
        message: 'Retrieval lane is required.',
      });
    }
    if (!why_retrieved || !allowed_use) {
      return res.status(400).json({
        halt_code: 'MEMORY_RETRIEVAL_UNJUSTIFIED',
        message: 'why_retrieved and allowed_use are required.',
      });
    }
    const results = await memoryRetrievalService.retrieveCapsules(
      query, lane, task_scope, why_retrieved, allowed_use, pool
    );
    res.status(200).json(results);
  } catch (error) {
    if (error.halt_code) {
      return res.status(400).json({ halt_code: error.halt_code, message: error.message });
    }
    console.error('Error retrieving capsules:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const healthReport = await memoryHealthService.getHealthReport(pool);
    res.status(200).json(healthReport);
  } catch (error) {
    console.error('Error getting health report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/capsule/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const capsule = await memoryCapsuleService.getCapsule(id, pool);
    if (!capsule) {
      return res.status(404).json({ message: 'Capsule not found' });
    }
    res.status(200).json(capsule);
  } catch (error) {
    console.error('Error getting capsule:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/correct', async (req, res) => {
  try {
    const { capsule_id, new_trust_level, receipt_note } = req.body;
    if (!capsule_id || !new_trust_level) {
      return res.status(400).json({
        halt_code: 'CAPSULE_SCHEMA_INCOMPLETE',
        message: 'capsule_id and new_trust_level are required.',
      });
    }
    await memoryCapsuleService.updateCapsuleTrust(capsule_id, new_trust_level, receipt_note, pool);
    await memoryReceiptsService.writeMemoryUseReceipt(
      capsule_id,
      'trusted_state_mutation',
      `correction:${capsule_id}`,
      'manual_correction',
      'review_lane',
      pool
    );
    res.status(200).json({ ok: true, capsule_id, new_trust_level });
  } catch (error) {
    if (error.halt_code) {
      return res.status(400).json({ halt_code: error.halt_code, message: error.message });
    }
    console.error('Error correcting capsule trust:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

return router;
}
