/**
 * SYNOPSIS: Pure: should the codegen prompt inline this file's existing content?
 */
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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
import { runGovernedAutonomousShipOnce } from '../services/governed-autonomous-shipping-loop.js';
import { getModelRankings, KNOWN_ROLES } from '../services/model-capability-ledger.js';
import { runGovernanceReview } from '../services/governance-law-review.js';
import { recordFounderDecision, getFounderDecisionHistory, findFounderDecisions } from '../services/founder-intent-model.js';
import {
  blueprintFollowClaim,
  exactChangeClaim,
  getTwinStep,
  reverseExactChange,
  sealExactChangeIntoTwin,
} from '../services/truth-ladder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export const MAX_EXISTING_CONTENT_BYTES = 200000;

/** Pure: should the codegen prompt inline this file's existing content? */
export function shouldIncludeExistingFileContent(byteSize) {
  return Number.isFinite(byteSize) && byteSize >= 0 && byteSize <= MAX_EXISTING_CONTENT_BYTES;
}

export function createFactoryMountRoutes({ requireKey, logger, pool, callCouncilMember } = {}) {
  const router = express.Router();
  const guard = typeof requireKey === 'function' ? requireKey : (_req, _res, next) => next();

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

  const codegenRunner = callCouncilMember
    ? {
        generate: async ({
          task, target_file, spec, tiers, max_output_tokens: stepMaxTokens, patch_mode,
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
              ...(patch_mode ? [
                'PATCH MODE: Do NOT output the complete file. Output EXACTLY ONE block in this exact format, nothing else: <<<OLD>>>\n(the exact, verbatim existing lines you are replacing, copied character-for-character from EXISTING FILE CONTENT below)\n<<<NEW>>>\n(your replacement lines)\n<<<END>>>. The OLD block must match a contiguous substring of EXISTING FILE CONTENT EXACTLY, including whitespace -- copy it, do not retype it from memory.',
              ] : [
                'CRITICAL: if the EXISTING FILE CONTENT is provided below, preserve ALL existing code, routes, handlers, and exports. Output the COMPLETE updated file — do NOT return a stub or minimal example.',
              ]),
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
          let existingFileContent = null;
          const existingContentLines = [];
          if (absTarget) {
            try {
              if (fs.existsSync(absTarget) && fs.statSync(absTarget).isFile()
                && shouldIncludeExistingFileContent(fs.statSync(absTarget).size)) {
                existingFileContent = fs.readFileSync(absTarget, 'utf8');
                existingContentLines.push('EXISTING FILE CONTENT (preserve all existing code; output the complete updated file):\n' + existingFileContent);
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
          // Full per-tier failure history, not just the last one. Found
          // live 2026-07-28: this loop already tries every tier in order
          // (the model-ordering fix works), but only ever kept the LAST
          // tier's error string -- so when all 8 tiers failed, the response
          // showed only the final one (e.g. openai_builder_mini's quota
          // error) and completely hid what happened with claude_sonnet and
          // every other tier tried before it. Real diagnostic gap, not a
          // dispatch bug -- this makes it possible to tell "the strong
          // model failed for a real reason" apart from "the strong model
          // was never actually reachable."
          const tierErrors = [];
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
              let content = extractContent(typeof raw === 'string' ? raw : raw?.content || raw?.text || '');

              if (patch_mode && existingFileContent) {
                const oldMarker = '<<<OLD>>>\n';
                const newMarker = '<<<NEW>>>\n';
                const endMarker = '<<<END>>>';

                const oldStartIndex = content.indexOf(oldMarker);
                const newStartIndex = content.indexOf(newMarker, oldStartIndex + oldMarker.length);
                const newEndIndex = content.indexOf(endMarker, newStartIndex + newMarker.length);

                if (oldStartIndex !== -1 && newStartIndex !== -1 && newEndIndex !== -1) {
                  const oldText = content.substring(oldStartIndex + oldMarker.length, newStartIndex).trim();
                  const newText = content.substring(newStartIndex + newMarker.length, newEndIndex).trim();

                  if (!oldText) {
                    lastError = 'patch_apply_failed: old_text_empty';
                    tierErrors.push({ tier: member, reason: lastError });
                    continue;
                  }

                  // Read current file content fresh from disk for patch application
                  const currentFileContent = fs.readFileSync(absTarget, 'utf8');
                  const occurrences = currentFileContent.split(oldText).length - 1;

                  if (occurrences !== 1) {
                    lastError = `patch_apply_failed: old_text_ambiguous:${occurrences}_matches`;
                    tierErrors.push({ tier: member, reason: lastError });
                    continue;
                  }

                  content = currentFileContent.replace(oldText, newText);
                } else {
                  lastError = 'patch_apply_failed: markers_missing';
                  tierErrors.push({ tier: member, reason: lastError });
                  continue;
                }
              }

              if (content && content.trim()) {
                const targetExt = path.extname(target_file || '').toLowerCase();
                const needsJsCheck = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(targetExt);
                if (needsJsCheck) {
                  const syntaxCheckFile = path.join(os.tmpdir(), `factory-codegen-${Date.now()}.mjs`);
                  try {
                    fs.writeFileSync(syntaxCheckFile, content);
                    execFileSync(process.execPath, ['--check', syntaxCheckFile]);
                  } catch (err) {
                    lastError = `syntax_check_failed:${member}: ${String(err?.message || err)}`;
                    tierErrors.push({ tier: member, reason: lastError });
                    try { fs.unlinkSync(syntaxCheckFile); } catch {}
                    continue;
                  }
                  try { fs.unlinkSync(syntaxCheckFile); } catch {}

                  const importCheckFile = absTarget
                    ? path.join(path.dirname(absTarget), `.factory-import-check-${Date.now()}-${process.pid}.mjs`)
                    : null;
                  if (importCheckFile) {
                    try {
                      fs.writeFileSync(importCheckFile, content);
                      execFileSync(process.execPath, ['--input-type=module', '-e', `import ${JSON.stringify(pathToFileURL(importCheckFile).href)};`]);
                    } catch (err) {
                      lastError = `import_resolution_failed:${member}: ${String(err?.message || err)}`;
                      tierErrors.push({ tier: member, reason: lastError });
                      try { fs.unlinkSync(importCheckFile); } catch {}
                      continue;
                    }
                    try { fs.unlinkSync(importCheckFile); } catch {}
                  }
                }
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
              tierErrors.push({ tier: member, reason: lastError });
            } catch (err) {
              lastError = `${member}: ${String(err?.message || err)}`;
              tierErrors.push({ tier: member, reason: lastError });
            }
          }
          return { content: null, error: lastError || 'all_tiers_failed', model_tier: member || null, tier_errors: tierErrors };
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

  // Real, per-model-tier ranking from actual governed-factory codegen
  // outcomes -- founder, direct: "every model that sits in here needs to be
  // rated... Have we ranked any of them?" Data is recorded automatically by
  // every governed ship (services/model-capability-ledger.js, hooked into
  // runGovernedAutonomousShipOnce's mandatory result path) -- this route
  // makes that ledger actually visible, not just written to a silent table.
  router.get('/factory/model-rankings', guard, async (req, res) => {
    try {
      const rankings = await getModelRankings(pool, { role: req.query.role || null });
      res.json({
        ok: true,
        rankings,
        known_roles: KNOWN_ROLES,
        note: rankings.length === 0 ? 'no outcomes recorded yet for this filter' : undefined,
      });
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // North Star §2.0G Governance Evolution Law: "at fixed cadence, review
  // which laws helped/hurt/caused drift." On-demand for now (Companion §0.6
  // requires a new automatic timer be reviewed/approved before it runs
  // unattended) -- real data, callable now, not yet scheduled.
  router.get('/factory/governance-review', guard, async (_req, res) => {
    try {
      const review = await runGovernanceReview({ pool });
      res.json(review);
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // North Star §2.0H Founder Intent Model — Tier-0: preserve founder intent
  // as a real, queryable decision log. Deliberately records only decisions
  // already made, never predictions (see services/founder-intent-model.js
  // for why prediction is scoped out for now).
  router.post('/factory/founder-decisions', guard, async (req, res) => {
    try {
      const result = await recordFounderDecision(pool, req.body || {});
      res.status(result.ok ? 201 : 400).json(result);
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
  });

  router.get('/factory/founder-decisions', guard, async (req, res) => {
    try {
      const result = req.query.q
        ? await findFounderDecisions(pool, { query: req.query.q, limit: req.query.limit })
        : await getFounderDecisionHistory(pool, { category: req.query.category, limit: req.query.limit });
      res.json(result);
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
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

  router.post('/factory/ship-queue', guard, async (req, res) => {
    try {
      const {
        mission_id,
        blueprint_id,
        steps,
        start_index,
        skip_intake_gate,
        claim_following_blueprint,
      } = req.body || {};
      if (!Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ ok: false, error: 'steps[] required' });
      }
      const firstStep = steps[0] || {};
      const stepKey = firstStep.blueprint_step_id || firstStep.step_id || firstStep.id;
      const twinProbe = blueprintFollowClaim({
        blueprint_id,
        blueprint_step_id: stepKey,
        claim_following_blueprint: claim_following_blueprint !== false,
      });
      if (!twinProbe.ok) {
        return res.status(422).json({
          ok: false,
          status: 'NOT_ON_BLUEPRINT',
          error: twinProbe.error,
          twin_probe: twinProbe,
        });
      }
      const exactProbe = exactChangeClaim({
        blueprint_id,
        blueprint_step_id: stepKey,
        claim_following_blueprint: claim_following_blueprint !== false,
      });
      if (!exactProbe.ok) {
        return res.status(422).json({
          ok: false,
          status: exactProbe.status || 'NOT_EXACT_BLUEPRINT_STEP',
          error: exactProbe.error,
          exact_probe: exactProbe,
          twin_probe: twinProbe,
        });
      }
      const boundSteps = steps.map((s) => {
        const sid = s.blueprint_step_id || s.step_id || s.id;
        const loaded = getTwinStep(blueprint_id, sid);
        if (!loaded.ok) return s;
        const twin = loaded.step;
        return {
          ...s,
          step_id: s.step_id || sid,
          blueprint_step_id: sid,
          blueprint_id,
          target_file: twin.target_file || s.target_file,
          task: twin.task || s.task,
          spec: twin.spec || s.spec,
          assertion_spec: twin.assertion_spec || s.assertion_spec,
          expected_exports: twin.expected_exports || s.expected_exports,
          action_type: twin.action_type || s.action_type,
          exact_inputs: twin.exact_inputs || s.exact_inputs,
          sandbox_boundary: s.sandbox_boundary || (twin.target_file
            ? `${String(twin.target_file).split('/')[0]}/**`
            : s.sandbox_boundary),
        };
      });
      let prior_commit_sha = null;
      try {
        prior_commit_sha = execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: REPO_ROOT,
          encoding: 'utf8',
        }).trim();
      } catch { /* reverse falls back to delete_file */ }
      const productTwin = twinProbe.twin_source === 'product_build_queue_twin'
        || twinProbe.twin_source === 'product_blueprint';
      const allowSkip = productTwin === true;
      const dispatch = async ({ mission_id: m, blueprint_id: b, step }) => dispatchExecuteStep(
        { mission_id: m, blueprint_id: b, step, skip_intake_gate: allowSkip },
        dispatchOptions,
      );
      const signal = async (sig) => {
        appendHistorianRecord({
          type: 'governed_shipping_signal',
          mission_id,
          blueprint_id,
          ...sig,
          trust_level: 'outcome-linked',
        });
      };
      const outcome = await runGovernedShippingQueue({
        steps: boundSteps,
        mission_id: mission_id || twinProbe.mission_id,
        blueprint_id: blueprint_id || twinProbe.blueprint_id,
        dispatch,
        signal,
        startIndex: Number(start_index) || 0,
        claim_following_blueprint: claim_following_blueprint !== false,
      });
      const seals = [];
      if (Array.isArray(outcome.shipped)) {
        for (const shipped of outcome.shipped) {
          const sid = shipped.blueprint_step_id || shipped.step_id;
          const commit_sha = shipped?.codegen?.commit_sha
            || outcome.commit_sha
            || null;
          const seal = sealExactChangeIntoTwin({
            blueprint_id: blueprint_id || twinProbe.blueprint_id,
            blueprint_step_id: sid,
            commit_sha,
            prior_commit_sha,
          });
          seals.push(seal);
          appendHistorianRecord({
            type: 'exact_change_sealed',
            mission_id: mission_id || twinProbe.mission_id,
            blueprint_id: blueprint_id || twinProbe.blueprint_id,
            step_id: sid,
            ...seal,
            trust_level: 'outcome-linked',
          });
        }
      }
      res.status(outcome.ok ? 200 : 422).json({
        ...outcome,
        exact_probe: {
          status: exactProbe.status,
          target_file: exactProbe.target_file,
          sealed: exactProbe.sealed,
        },
        exact_seals: seals,
      });
    } catch (err) {
      res.status(500).json({ ok: false, status: 'FACTORY_SHIP_QUEUE_ERROR', error: err?.message || String(err) });
    }
  });

  router.post('/factory/ship-queue-and-commit', guard, async (req, res) => {
    try {
      const result = await runGovernedAutonomousShipOnce({ logger, maxStepsPerProduct: req.body?.maxStepsPerProduct || 1 });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/factory/reverse-step', guard, async (req, res) => {
    try {
      const { blueprint_id, blueprint_step_id, apply = false } = req.body || {};
      const exact = exactChangeClaim({
        blueprint_id,
        blueprint_step_id,
        claim_following_blueprint: true,
      });
      if (!exact.ok && exact.status === 'NOT_ON_BLUEPRINT') {
        return res.status(422).json({ ok: false, status: exact.status, error: exact.error });
      }
      const result = reverseExactChange({
        blueprint_id,
        blueprint_step_id,
        apply: apply === true,
      });
      appendHistorianRecord({
        type: apply === true ? 'exact_change_reversed' : 'exact_change_reverse_plan',
        blueprint_id,
        step_id: blueprint_step_id,
        ...result,
        trust_level: 'outcome-linked',
      });
      res.status(result.ok ? 200 : 422).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, status: 'FACTORY_REVERSE_STEP_ERROR', error: err?.message || String(err) });
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

  if (logger?.info) {
    logger.info('✅ [FACTORY-MOUNT] Governed factory mounted at /factory/{execute-step,ship-queue,reverse-step,execute-mission,gates/intake,readiness,historian/summary,tsos/summary}');
  }
  return router;
}