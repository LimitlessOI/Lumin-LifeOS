/**
 * SYNOPSIS: Mounts the governed factory hot path (BPB → Builder → SENTRY → TSOS → Historian)
 * from factory-staging/factory-core onto the production Express app under /factory/*.
 *
 * This is the production cutover of the governed factory: it exposes the same
 * execute-step / execute-mission / intake / readiness surfaces the staging server
 * (factory-staging/startup/register-routes.js) exposes, WITHOUT re-registering the
 * staging GET /health (which would collide with the production /health).
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import fs from 'node:fs';
import { dispatchExecuteStep, resolveRepoPath } from '../factory-staging/factory-core/builder/run-step.js';
import { dispatchExecuteMission } from '../factory-staging/factory-core/builder/run-mission.js';
import { runBpbIntakeGate } from '../factory-staging/factory-core/bpb/intake-gate.js';
import { summarizeHistorian, appendHistorianRecord } from '../factory-staging/factory-core/historian/append-record.js';
import { summarizeHistory } from '../factory-staging/factory-core/historian/mission-history.js';
import { summarizeTsosMetrics } from '../factory-staging/factory-core/tsos/tsos-summary.js';
import { reconcileRemoteTruth } from '../factory-staging/factory-core/readiness/remote-truth-reconciler.js';
import { extractContent } from '../factory-staging/factory-core/builder/authoring.js';
import { runGovernedShippingQueue } from '../services/governed-shipping-runner.js';

export function createFactoryMountRoutes({ requireKey, logger, pool, baseUrl, callCouncilMember } = {}) {
  const router = express.Router();
  const guard = typeof requireKey === 'function' ? requireKey : (_req, _res, next) => next();

  // SENTRY behavioral-proof runner, injected at the route boundary so
  // factory-core stays pure. Fail-closed: if a required assertion cannot run
  // (no runner), SENTRY returns FAIL rather than passing on omission.
  const httpBase = (baseUrl || process.env.SITE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 8080}`).replace(/\/$/, '');
  const assertionRunner = {
    db: pool
      ? async (sql, params) => {
          const { rows } = await pool.query(sql, params);
          return rows;
        }
      : undefined,
    http: async ({ method = 'GET', path, headers }) => {
      const res = await fetch(`${httpBase}${path}`, { method, headers });
      return { status: res.status };
    },
    readFile: async (relPath) => fs.readFileSync(resolveRepoPath(relPath), 'utf8'),
  };

  // STEP 4 codegen runner (the "hands"), injected at the route boundary so
  // factory-core stays pure. It returns CANDIDATE CONTENT ONLY — never assertions
  // (assertion-provenance lock). Cheapest capable tier first; escalate only on
  // failure/empty output. The authored content is untrusted input that SENTRY
  // proves independently via the Step-3 behavior gate.
  const codegenRunner = callCouncilMember
    ? {
        generate: async ({ task, target_file, spec, tiers }) => {
          const prompt = [
            'You are a code-authoring hand for a governed build factory.',
            'Output ONLY the exact, complete file content for the target file.',
            'No explanation, no commentary, no markdown fences — just the file body.',
            `TARGET FILE: ${target_file}`,
            task ? `TASK: ${task}` : '',
            spec ? `SPEC:\n${typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)}` : '',
          ].filter(Boolean).join('\n\n');
          let lastError = null;
          for (let i = 0; i < tiers.length; i += 1) {
            const member = tiers[i];
            try {
              const raw = await callCouncilMember(member, prompt, { taskType: 'builder_lane' });
              const content = extractContent(typeof raw === 'string' ? raw : raw?.content || raw?.text || '');
              if (content && content.trim()) {
                // Prefer real usage when council returns an object; otherwise estimate from text length.
                const usage = (raw && typeof raw === 'object' && raw.usage) ? raw.usage : null;
                const promptTokens = Number(usage?.prompt_tokens) || Math.ceil(prompt.length / 4);
                const completionTokens = Number(usage?.completion_tokens) || Math.ceil(content.length / 4);
                const totalTokens = Number(usage?.total_tokens) || (promptTokens + completionTokens);
                // Conservative USD estimate when provider usage lacks cost (free tiers → 0).
                const estimatedUsd = Number(usage?.estimated_usd) || 0;
                return {
                  content,
                  model_tier: member,
                  escalated: i > 0,
                  usage: {
                    prompt_tokens: promptTokens,
                    completion_tokens: completionTokens,
                    total_tokens: totalTokens,
                    estimated_usd: estimatedUsd,
                  },
                  prompt_tokens: promptTokens,
                  completion_tokens: completionTokens,
                  total_tokens: totalTokens,
                  estimated_usd: estimatedUsd,
                };
              }
              lastError = `empty_output_from:${member}`;
            } catch (err) {
              lastError = String(err?.message || err);
            }
          }
          return { content: null, error: lastError || 'all_tiers_failed' };
        },
      }
    : null;

  const dispatchOptions = { assertionRunner, codegenRunner };

  router.get('/factory/readiness', guard, (_req, res) => {
    try {
      const truth = reconcileRemoteTruth();
      res.json({
        ok: true,
        mounted: 'production',
        remote_truth: truth,
        historian: summarizeHistorian(),
        tsos: summarizeTsosMetrics(),
        pipeline: 'BPB->Builder->SENTRY->TSOS->Historian',
      });
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
  });

  router.get('/factory/historian/summary', guard, (_req, res) => {
    res.json({ ok: true, historian: summarizeHistorian(), history: summarizeHistory() });
  });

  router.get('/factory/tsos/summary', guard, (_req, res) => {
    res.json({ ok: true, tsos: summarizeTsosMetrics(), guardrails: 'measurement_only_no_mission_authority' });
  });

  router.get('/factory/gates/intake', guard, (req, res) => {
    const mission_id = req.query.mission_id;
    if (!mission_id) return res.status(400).json({ ok: false, error: 'mission_id query required' });
    const intake = runBpbIntakeGate(String(mission_id), { strict_pd: req.query.strict === 'true' });
    res.status(intake.ok ? 200 : 422).json({ ok: intake.ok, intake });
  });

  router.post('/factory/execute-step', guard, async (req, res) => {
    try {
      const { httpStatus, body } = await dispatchExecuteStep(req.body || {}, dispatchOptions);
      res.status(httpStatus).json(body);
    } catch (err) {
      res.status(500).json({ ok: false, status: 'FACTORY_EXECUTE_STEP_ERROR', error: err?.message || String(err) });
    }
  });

  // STEP 5c — the governed shipping runner as a live surface. Walks a build queue
  // and ships EVERY step through the governed pipe (in-process dispatchExecuteStep:
  // BPB->Builder->SENTRY->TSOS->Historian) instead of the legacy ungoverned /build.
  // Century's flag: crash/block signals are recorded durably to the Historian with
  // resume_from, so a mid-queue failure is loud + resumable, never a silent skip.
  router.post('/factory/ship-queue', guard, async (req, res) => {
    try {
      const { mission_id, blueprint_id, steps, start_index, skip_intake_gate } = req.body || {};
      if (!Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ ok: false, error: 'steps[] required' });
      }
      const dispatch = async ({ mission_id: m, blueprint_id: b, step }) => dispatchExecuteStep(
        { mission_id: m, blueprint_id: b, step, skip_intake_gate: skip_intake_gate === true },
        dispatchOptions,
      );
      const signal = async (sig) => {
        appendHistorianRecord({ type: 'governed_shipping_signal', mission_id, blueprint_id, ...sig, trust_level: 'outcome-linked' });
      };
      const outcome = await runGovernedShippingQueue({
        steps, mission_id, blueprint_id, dispatch, signal, startIndex: Number(start_index) || 0,
      });
      res.status(outcome.ok ? 200 : 422).json(outcome);
    } catch (err) {
      res.status(500).json({ ok: false, status: 'FACTORY_SHIP_QUEUE_ERROR', error: err?.message || String(err) });
    }
  });

  router.post('/factory/execute-mission', guard, async (req, res) => {
    try {
      const { httpStatus, body } = await dispatchExecuteMission(req.body || {}, dispatchOptions);
      res.status(httpStatus).json(body);
    } catch (err) {
      res.status(500).json({ ok: false, status: 'FACTORY_EXECUTE_MISSION_ERROR', error: err?.message || String(err) });
    }
  });

  if (logger?.info) logger.info('✅ [FACTORY-MOUNT] Governed factory mounted at /factory/{execute-step,ship-queue,execute-mission,gates/intake,readiness,historian/summary,tsos/summary}');
  return router;
}
