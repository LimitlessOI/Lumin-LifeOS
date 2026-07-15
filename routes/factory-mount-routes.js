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
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dispatchExecuteStep, resolveRepoPath } from '../factory-staging/factory-core/builder/run-step.js';
import { autoRegisterProductModules } from '../startup/auto-register-product-modules.js';
import { dispatchExecuteMission } from '../factory-staging/factory-core/builder/run-mission.js';
import { runBpbIntakeGate } from '../factory-staging/factory-core/bpb/intake-gate.js';
import { summarizeHistorian, appendHistorianRecord } from '../factory-staging/factory-core/historian/append-record.js';
import { summarizeHistory } from '../factory-staging/factory-core/historian/mission-history.js';
import { summarizeTsosMetrics } from '../factory-staging/factory-core/tsos/tsos-summary.js';
import { reconcileRemoteTruth } from '../factory-staging/factory-core/readiness/remote-truth-reconciler.js';
import { extractContent } from '../factory-staging/factory-core/builder/authoring.js';
import { runGovernedShippingQueue } from '../services/governed-shipping-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const execFileAsync = promisify(execFile);
const CHECK_TIMEOUT_MS = 10_000;

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
  const codegenRunner = callCouncilMember
    ? {
        generate: async ({
          task, target_file, spec, tiers, max_output_tokens: stepMaxTokens,
          last_error, expected_exports, failure_context, expected_exports_context,
        }) => {
          const targetExt = path.extname(target_file || '').toLowerCase();
          const isJs = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(targetExt);
          const isSql = targetExt === '.sql';
          const isHtml = targetExt === '.html';
          const isCss = targetExt === '.css';
          const isJson = targetExt === '.json';
          const formatLines = [
            'Output ONLY the exact, complete file content for the target file.',
            'No explanation, no commentary, no markdown fences — just the file body.',
            ...(isJs ? [
              'REPO CONSTRAINT: This repository is "type": "module" (ES modules).',
              'Use ES module syntax with named exports (e.g. export function name, export const name, export { name }).',
              'CRITICAL: do NOT duplicate any export. If you declare `export function name` or `export const name`, do NOT also add `export { name }` for the same identifier.',
              'CRITICAL: if the EXISTING FILE CONTENT is provided below, preserve ALL existing code, routes, handlers, and exports. Output the COMPLETE updated file — do NOT return a stub or minimal example.',
              'Do NOT use CommonJS require or module.exports.',
            ] : []),
            ...(isSql ? [
              'REPO CONSTRAINT: This is a PostgreSQL migration file.',
              'Use valid, idempotent SQL (CREATE TABLE IF NOT EXISTS, ALTER ... IF EXISTS, etc.).',
              'Do NOT wrap the SQL in markdown code fences or JavaScript.',
            ] : []),
            ...(isHtml ? [
              'Output a valid HTML document/fragment only.',
              'Inline styles/scripts are allowed if the spec requires them.',
            ] : []),
            ...(isCss ? [
              'Output valid CSS rules only.',
            ] : []),
            ...(isJson ? [
              'Output valid, compact JSON only.',
            ] : []),
          ];
          const absTarget = target_file ? (path.isAbsolute(target_file) ? target_file : path.join(REPO_ROOT, target_file)) : null;
          const existingContentLines = [];
          if (absTarget) {
            try {
              if (fs.existsSync(absTarget) && fs.statSync(absTarget).isFile() && fs.statSync(absTarget).size <= 20000) {
                existingContentLines.push('EXISTING FILE CONTENT (preserve all existing code; output the complete updated file):\n' + fs.readFileSync(absTarget, 'utf8'));
              }
            } catch { /* ignore read errors */ }
          }
          const prompt = [
            'You are a code-authoring hand for a governed build factory.',
            ...formatLines,
            `TARGET FILE: ${target_file}`,
            task ? `TASK: ${task}` : '',
            spec ? `SPEC:\n${typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)}` : '',
            ...existingContentLines,
            expected_exports_context || (Array.isArray(expected_exports) && expected_exports.length ? `REQUIRED NAMED EXPORTS: ${expected_exports.join(', ')}\nYou MUST export each of these names from the file.` : ''),
            failure_context || (last_error ? `PREVIOUS ATTEMPT FAILED WITH: ${last_error}\nMake sure you fix that exact issue.` : ''),
          ].filter(Boolean).join('\n\n');
          const maxOutputTokens = Number(stepMaxTokens) || 8000;
          let lastError = null;
          let member = null;
          for (let i = 0; i < tiers.length; i += 1) {
            member = tiers[i];
            try {
              const raw = await callCouncilMember(member, prompt, {
                taskType: 'codegen',
                product_lane: 'builderos',
                useCache: false,
                maxOutputTokens,
                allowModelDowngrade: false,
                returnObject: true,
                critical: true,
              });
              const content = extractContent(typeof raw === 'string' ? raw : raw?.content || raw?.text || '');
              if (content && content.trim()) {
                // Fail-fast: reject syntax-broken JS/ESM codegen before it reaches SENTRY.
                // node --check parses only; it does not load modules, so missing deps
                // do not fail the check. We use .mjs to force ESM parsing. Skip for
                // non-JS targets (e.g. .sql migrations, .html overlays) so the loop
                // does not falsely reject valid non-JavaScript artifacts.
                const targetExt = path.extname(target_file || '').toLowerCase();
                const needsJsCheck = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(targetExt);
                if (needsJsCheck) {
                  const syntaxCheckFile = path.join(os.tmpdir(), `factory-codegen-${Date.now()}.mjs`);
                  try {
                    fs.writeFileSync(syntaxCheckFile, content);
                    await execFileAsync(process.execPath, ['--check', syntaxCheckFile], { timeout: CHECK_TIMEOUT_MS, killSignal: 'SIGKILL' });
                  } catch (err) {
                    lastError = `syntax_check_failed:${member}: ${String(err?.message || err)}`;
                    try { fs.unlinkSync(syntaxCheckFile); } catch {}
                    continue;
                  }
                  try { fs.unlinkSync(syntaxCheckFile); } catch {}

                  // Import-resolution check: parse-and-load the module in a short-lived
                  // child process so missing imports are caught, but do NOT let a generated
                  // module with top-level side effects (timers, connections, loops) keep
                  // the child alive and block the server's event loop. The eval imports
                  // the module and then forcibly exits after a brief delay; the outer
                  // execFile timeout kills anything that still hangs.
                  const importCheckFile = absTarget
                    ? path.join(path.dirname(absTarget), `.factory-import-check-${Date.now()}-${process.pid}.mjs`)
                    : null;
                  if (importCheckFile) {
                    try {
                      fs.writeFileSync(importCheckFile, content);
                      const importExpr = `import ${JSON.stringify(pathToFileURL(importCheckFile).href)}; setTimeout(() => process.exit(0), 1000);`;
                      await execFileAsync(process.execPath, ['--input-type=module', '-e', importExpr], { timeout: CHECK_TIMEOUT_MS, killSignal: 'SIGKILL' });
                    } catch (err) {
                      lastError = `import_resolution_failed:${member}: ${String(err?.message || err)}`;
                      try { fs.unlinkSync(importCheckFile); } catch {}
                      continue;
                    }
                    try { fs.unlinkSync(importCheckFile); } catch {}
                  }
                }
                // Prefer real usage when council returns an object; otherwise estimate from text length.
                const usage = (raw && typeof raw === 'object' && raw.usage) ? raw.usage : null;
                const promptTokens = Number(usage?.prompt_tokens) || Math.ceil(prompt.length / 4);
                const completionTokens = Number(usage?.completion_tokens) || Math.ceil(content.length / 4);
                const totalTokens = Number(usage?.total_tokens) || (promptTokens + completionTokens);
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
              lastError = `${member}: ${String(err?.message || err)}`;
            }
          }
          return { content: null, error: lastError || 'all_tiers_failed', model_tier: member || null };
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
