/**
 * SYNOPSIS: Mounts the governed factory hot path (BPB → Builder → SENTRY → TSOS → Historian)
 * from factory-staging/factory-core onto the production Express app under /factory/*.
 *
 * This is the production cutover of the governed factory: it exposes the same
 * execute-step / execute-mission / intake / readiness surfaces the staging server
 * (factory-staging/startup/register-routes.js) exposes, WITHOUT re-registering the
 * staging GET /health (which would collide with the production /health).
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dispatchExecuteStep, resolveRepoPath } from '../factory-staging/factory-core/builder/run-step.js';
import { autoRegisterProductModules } from '../startup/auto-register-product-modules.js';
import { dispatchExecuteMission } from '../factory-staging/factory-core/builder/run-mission.js';
import { runBpbIntakeGate } from '../factory-staging/factory-core/bpb/intake-gate.js';
import { summarizeHistorian, appendHistorianRecord } from '../factory-staging/factory-core/historian/append-record.js';
import { summarizeHistory } from '../factory-staging/factory-core/historian/mission-history.js';
import { summarizeTsosMetrics } from '../factory-staging/factory-core/tsos/tsos-summary.js';
import { reconcileRemoteTruth } from '../factory-staging/factory-core/readiness/remote-truth-reconciler.js';
import { createCodegenRunner } from '../factory-staging/factory-core/builder/codegen-runner.js';
import { runGovernedShippingQueue } from '../services/governed-shipping-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export function createFactoryMountRoutes({ requireKey, logger, pool, callCouncilMember } = {}) {
  const router = express.Router();
  const guard = typeof requireKey === 'function' ? requireKey : (_req, _res, next) => next();

  // SENTRY behavioral-proof runner, injected at the route boundary so
  // factory-core stays pure. Fail-closed: if a required assertion cannot run
  // (no runner), SENTRY returns FAIL rather than passing on omission.
  // SENTRY must re-probe the local container after a runtime reload; a public
  // baseUrl would hit a different Railway container and 404.
  const httpBase = `http://127.0.0.1:${process.env.PORT || 8080}`.replace(/\/$/, '');
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
    importModule: async (relPath) => {
      const target = resolveRepoPath(relPath);
      if (!fs.existsSync(target)) return undefined;
      const mod = await import(pathToFileURL(target).href);
      return mod;
    },
    reload: async (target) => {
      if (!target) throw new Error('reload target required');
      const results = await autoRegisterProductModules(router, { requireKey, pool }, { modules: [{ path: target, reload: true }], logger });
      const key = String(target).replace(/\\/g, '/');
      const entry = results.find((r) => r.module === key);
      if (!entry || entry.status !== 'mounted') {
        throw new Error(entry?.error || `reload did not mount ${target}`);
      }
      return entry;
    },
  };

  // STEP 4 codegen runner (the "hands"), injected at the route boundary so
  // factory-core stays pure. It returns CANDIDATE CONTENT ONLY — never assertions
  // (assertion-provenance lock). Strong-first, provider-diverse tier order; escalate
  // only on failure/empty output. The authored content is untrusted input that SENTRY
  // proves independently via the Step-3 behavior gate.
  const codegenRunner = createCodegenRunner({ callCouncilMember });


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
