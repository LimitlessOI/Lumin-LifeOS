/**
 * routes/lifeos-gate-change-routes.js
 *
 * North Star §2.6 ¶8 — Persist gate-change / efficiency hypotheses, run one council
 * review pass, allow human PATCH of final disposition. Direct user/API action only
 * (no scheduled AI burn).
 *
 * Base path: /api/v1/lifeos/gate-change
 *
 * **GET /presets** — list named `run-preset` keys (metadata only; no council call).
 * Auth: same command-key headers as other internal routes **or** LifeOS **admin** JWT (`Authorization: Bearer`).
 *
 * **Server-side debate:** `POST /run-preset` creates the row and runs the full
 * multi-model protocol **on this process** (Railway has provider keys) — use this
 * so agents and operators do not need local API keys for council providers.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { safeId, safeLimit } from '../services/lifeos-request-helpers.js';
import { createLifeOSGateChangeProposals } from '../services/lifeos-gate-change-proposals.js';
import {
  runGateChangeCouncilDebate,
  resolveMemberKeys,
} from '../services/lifeos-gate-change-council-run.js';
import { GATE_CHANGE_PRESETS } from '../config/gate-change-presets.js';
import { getModelForTask } from '../config/task-model-routing.js';
import { verifyToken } from '../services/lifeos-auth.js';
import { createMemoryIntelligenceService } from '../services/memory-intelligence-service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, '..', 'prompts', 'lifeos-gate-change-proposal.md');

/** Same key sources as `src/server/auth/requireKey.js` — plus admin JWT for read-only preset list (overlay Settings). */
function configuredCommandKeys() {
  return ['COMMAND_CENTER_KEY', 'LIFEOS_KEY', 'API_KEY']
    .map((n) => process.env[n])
    .filter(Boolean);
}

function requireKeyOrLifeOSAdmin(req, res, next) {
  try {
    if (process.env.LIFEOS_OPEN_ACCESS === 'true') return next();
    const configured = configuredCommandKeys();
    if (configured.length === 0) return next();

    const hk =
      (typeof req.get === 'function' ? req.get('x-command-key') : null) ||
      req.headers?.['x-command-key'] ||
      (typeof req.get === 'function' ? req.get('x-command-center-key') : null) ||
      req.headers?.['x-command-center-key'] ||
      (typeof req.get === 'function' ? req.get('x-lifeos-key') : null) ||
      req.headers?.['x-lifeos-key'];
    if (hk && configured.includes(hk)) return next();

    const authHeader = req.headers.authorization || '';
    const raw = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (raw) {
      try {
        const payload = verifyToken(raw);
        if (payload.role === 'admin') return next();
      } catch {
        /* fall through */
      }
    }
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  } catch (e) {
    return next(e);
  }
}

export function createLifeOSGateChangeRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const log = logger || console;
  const router = express.Router();
  const memorySvc = pool?.query ? createMemoryIntelligenceService(pool, log) : null;

  if (!pool?.query) {
    router.use((req, res) => {
      res.status(503).json({ ok: false, error: 'Database not configured' });
    });
    return router;
  }

  const svc = createLifeOSGateChangeProposals({ pool });

  // GET /presets — list run-preset keys + titles (no AI, no DB; operator/Conductor discoverability)
  router.get('/presets', requireKeyOrLifeOSAdmin, (req, res) => {
    const presets = Object.entries(GATE_CHANGE_PRESETS).map(([key, p]) => ({
      key,
      title: p.title,
      hypothesis_label: p.hypothesis_label,
      created_by: p.created_by,
    }));
    res.json({ ok: true, presets });
  });

  async function loadRubric() {
    try {
      return await readFile(PROMPT_PATH, 'utf8');
    } catch {
      return '(missing prompts/lifeos-gate-change-proposal.md)';
    }
  }

  async function executeCouncilForRow(row, reqBody) {
    const rubric = await loadRubric();
    const explicitModels = Array.isArray(reqBody?.models)
      ? reqBody.models.map((m) => String(m)).filter(Boolean)
      : [];
    let memberKeys = resolveMemberKeys(
      explicitModels.length ? explicitModels : undefined,
      getModelForTask
    );
    if (memorySvc) {
      try {
        const recommendation = await memorySvc.getAuthorizedModelsForTask({
          taskType: 'council.gate_change.debate',
          candidateModels: memberKeys,
          preferredModel: getModelForTask('council.gate_change.debate'),
        });
        memberKeys = recommendation.orderedCandidates.slice(0, Math.max(1, memberKeys.length));
        if (!memberKeys.length) {
          throw new Error('No authorized council members are currently allowed for council.gate_change.debate');
        }
      } catch (memoryErr) {
        log.warn({ err: memoryErr.message }, '[GATE-CHANGE] Memory authority unavailable — using static council members');
      }
    }
    return runGateChangeCouncilDebate({
      callCouncilMember,
      rubricText: rubric,
      row,
      memberKeys,
    });
  }

  async function persistGateChangeDebate(row, debateRun) {
    if (!memorySvc) return null;
    const { round1, oppositeRound, consensus, rounds } = debateRun;
    const unresolved = !consensus.unanimous && consensus.reached;
    const residueRisk = unresolved
      ? {
          argument: 'Council reached a non-unanimous verdict after opposite-argument review',
          confidence: 0.5,
          conditions_that_would_reopen: 'equivalence metrics fail, new evidence emerges, or a verified exception appears',
        }
      : null;

    return memorySvc.recordDebate({
      subject: `Gate-change: ${row.title}`,
      initialPositions: (round1 || []).map((entry) => ({
        agent: entry.member,
        position: entry.verdict,
        confidence: null,
        evidence_citations: [],
        raw: entry.raw,
      })),
      arguments: [
        ...(round1 || []).map((entry) => ({
          agent: entry.member,
          argument: entry.raw,
          type: 'round1',
          timestamp: new Date().toISOString(),
        })),
        ...(oppositeRound || []).map((entry) => ({
          agent: entry.member,
          argument: entry.raw,
          type: 'opposite_argument',
          timestamp: new Date().toISOString(),
        })),
      ],
      whatMovedMinds: consensus.summary,
      consensus: consensus.final_verdict,
      consensusMethod: consensus.unanimous ? 'unanimous' : (consensus.reached ? 'majority' : 'timed_out'),
      consensusReachedBy: 'lifeos_gate_change_council',
      lessonsLearned: 'Use opposite-argument review plus future-back scan before changing gates.',
      problemClass: 'gate_change',
      residueRisk,
      futureLookback: {
        protocol: rounds?.protocol || 'consensus_v3_opposite_argument_future_back',
        note: 'Future-back analysis is embedded in the raw round outputs and persisted in council_rounds_json on the proposal row.',
      },
      councilRunId: row.id,
      durationMinutes: null,
    });
  }

  // POST /run-preset — create + run full debate on **server** (one request; uses Railway env keys)
  router.post('/run-preset', requireKey, async (req, res) => {
    try {
      const preset = String(req.body?.preset || '').trim();
      const p = GATE_CHANGE_PRESETS[preset];
      if (!p) {
        return res.status(400).json({
          ok: false,
          error: 'Unknown preset',
          available: Object.keys(GATE_CHANGE_PRESETS),
        });
      }
      const row = await svc.create({ ...p, steps_to_remove: p.steps_to_remove });
      const debateRun = await executeCouncilForRow(
        row,
        req.body || {}
      );
      const { consensus, rounds, councilOutput, memberKeys } = debateRun;
      const updated = await svc.markDebated(row.id, {
        council_output: councilOutput,
        council_model: memberKeys.join(','),
        council_verdict: consensus.final_verdict,
        council_rounds_json: rounds,
        consensus_reached: consensus.reached,
        consensus_summary: consensus.summary,
      });
      if (!updated) {
        return res.status(409).json({ ok: false, error: 'Proposal state changed concurrently' });
      }
      try {
        await persistGateChangeDebate(updated, debateRun);
      } catch (memoryErr) {
        log.warn({ err: memoryErr.message, proposalId: updated.id }, '[GATE-CHANGE] debate persisted to proposal but not memory');
      }
      res.json({
        ok: true,
        proposal: updated,
        council_verdict: consensus.final_verdict,
        consensus_reached: consensus.reached,
        vote_counts: consensus.vote_counts,
        models_used: memberKeys,
        source: 'server_run_preset',
      });
    } catch (err) {
      log.error({ err: err.message }, '[GATE-CHANGE] run-preset failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /proposals — create row (hypothesis must be THINK|GUESS)
  router.post('/proposals', requireKey, async (req, res) => {
    try {
      const row = await svc.create(req.body || {});
      res.status(201).json({ ok: true, proposal: row });
    } catch (err) {
      const status = err.status || 500;
      log.error({ err: err.message }, '[GATE-CHANGE] create failed');
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // GET /proposals?status=&limit=
  router.get('/proposals', requireKey, async (req, res) => {
    try {
      const limit = safeLimit(req.query.limit, { min: 1, max: 200, fallback: 50 });
      const status = req.query.status ? String(req.query.status).toLowerCase() : null;
      const rows = await svc.list({ status, limit });
      res.json({ ok: true, proposals: rows });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // GET /proposals/:id
  router.get('/proposals/:id', requireKey, async (req, res) => {
    try {
      const id = safeId(req.params.id);
      if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });
      const row = await svc.getById(id);
      if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
      res.json({ ok: true, proposal: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /proposals/:id/run-council — consensus protocol (user-triggered)
  router.post('/proposals/:id/run-council', requireKey, async (req, res) => {
    try {
      const id = safeId(req.params.id);
      if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });
      const row = await svc.getById(id);
      if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
      if (row.status !== 'raised') {
        return res.status(409).json({
          ok: false,
          error: 'Council run only allowed when status is raised',
          proposal: row,
        });
      }

      const debateRun = await executeCouncilForRow(
        row,
        req.body || {}
      );
      const { consensus, rounds, councilOutput, memberKeys } = debateRun;

      const updated = await svc.markDebated(id, {
        council_output: councilOutput,
        council_model: memberKeys.join(','),
        council_verdict: consensus.final_verdict,
        council_rounds_json: rounds,
        consensus_reached: consensus.reached,
        consensus_summary: consensus.summary,
      });

      if (!updated) {
        return res.status(409).json({ ok: false, error: 'Proposal state changed concurrently' });
      }
      try {
        await persistGateChangeDebate(updated, debateRun);
      } catch (memoryErr) {
        log.warn({ err: memoryErr.message, proposalId: updated.id }, '[GATE-CHANGE] debate persisted to proposal but not memory');
      }

      res.json({
        ok: true,
        proposal: updated,
        council_verdict: consensus.final_verdict,
        consensus_reached: consensus.reached,
        vote_counts: consensus.vote_counts,
        models_used: memberKeys,
        source: 'server_run_council',
      });
    } catch (err) {
      log.error({ err: err.message }, '[GATE-CHANGE] run-council failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /proposals/:id/status — human disposition after debate
  router.patch('/proposals/:id/status', requireKey, async (req, res) => {
    try {
      const id = safeId(req.params.id);
      if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });
      const row = await svc.getById(id);
      if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
      if (row.status !== 'debated') {
        return res.status(409).json({
          ok: false,
          error: 'Set status only after status is debated',
          proposal: row,
        });
      }
      const next = req.body?.status;
      const updated = await svc.setStatus(id, next);
      if (!updated) return res.status(404).json({ ok: false, error: 'Not found' });
      res.json({ ok: true, proposal: updated });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  return router;
}
