/**
 * SYNOPSIS: Pure: should the codegen prompt inline this file's existing content?
 * @ssot docs/products/builderos/PRODUCT_HOME.md
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
import { GRADE_ESCALATION_TIERS } from '../services/builderos-model-escalation-gate.js';
import { runGovernedAutonomousShipOnce } from '../services/governed-autonomous-shipping-loop.js';
import { getModelRankings, getCapabilityProfiles, KNOWN_ROLES } from '../services/model-capability-ledger.js';
import { detectSystemicPattern } from '../config/trust-scoring.js';
import { runGovernanceReview } from '../services/governance-law-review.js';
import { recordFounderDecision, getFounderDecisionHistory, findFounderDecisions } from '../services/founder-intent-model.js';
import { recordModelOutcome } from '../services/model-capability-ledger.js';
import { getCandidateModelsForTask } from '../config/task-model-routing.js';
import {
  blueprintFollowClaim,
  exactChangeClaim,
  getTwinStep,
  reverseExactChange,
  sealExactChangeIntoTwin,
  unsealExactChangeInTwin,
} from '../services/truth-ladder.js';
import {
  loadBuildQueue,
  persistQueue,
  escalateBlockedStep,
} from '../services/product-build-orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export const MAX_EXISTING_CONTENT_BYTES = 200000;
// patch_mode's whole point is efficient editing of large files via a small
// OLD/NEW block, not full-file regeneration -- but PATCH MODE instructs the
// model to copy its OLD block verbatim from "EXISTING FILE CONTENT below", so
// gating that section by the SAME threshold used for full-file regeneration
// left patch_mode structurally broken for anything over 200KB: the model was
// told to copy from a section that was never included, and produced garbage
// (confirmed live 2026-08-08: two straight ~100-500 byte outputs against a
// 234KB target, both real MODEL failures caused by this real PROMPT gap, not
// a codegen quality issue). Patch mode gets a much higher ceiling since its
// output size doesn't scale with input size the way full regeneration does.
export const MAX_EXISTING_CONTENT_BYTES_PATCH_MODE = 2_000_000;

/** Pure: should the codegen prompt inline this file's existing content? */
export function shouldIncludeExistingFileContent(byteSize, { patchMode = false } = {}) {
  const ceiling = patchMode ? MAX_EXISTING_CONTENT_BYTES_PATCH_MODE : MAX_EXISTING_CONTENT_BYTES;
  return Number.isFinite(byteSize) && byteSize >= 0 && byteSize <= ceiling;
}

export function createFactoryMountRoutes({ requireKey, logger, pool, callCouncilMember, commitToGitHub } = {}) {
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
      // Cache-bust: Node's ESM loader caches by resolved URL, so re-importing
      // the same path without a unique query string returns whatever version
      // was FIRST imported into this process (often at server boot, for any
      // file already in the live route/service graph) -- never the content
      // this dispatch just wrote to disk. Confirmed live 2026-08-08: 5
      // consecutive SENTRY_FAILED attempts against services/general-browser-agent.js
      // (a boot-time-imported file) all reported the identical stale
      // missing_exports failure regardless of model tier, patch vs full-regen,
      // or genuinely different generated content (different sha256 each time)
      // -- SENTRY was verifying the pre-dispatch cached module, not the write.
      // Brand-new (never-before-imported) files never hit this, which is why
      // it didn't surface during tonight's earlier greenfield service builds.
      const mod = await import(`${pathToFileURL(target).href}?t=${Date.now()}`);
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
                && shouldIncludeExistingFileContent(fs.statSync(absTarget).size, { patchMode: patch_mode === true })) {
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

                  // ES-import-resolution check only makes sense for real ES modules.
                  // public/** browser scripts in this repo are loaded via plain
                  // <script src="..."> tags (confirmed: public/overlay/lifeos-app.html
                  // loads lifeos-voice-chat.js with no type="module"), commonly as the
                  // classic (function (global) { ... })(window) IIFE-global pattern --
                  // Node's bare `import` of that file throws ReferenceError on `window`,
                  // a category error, not a real bug in the generated content. Confirmed
                  // live 2026-08-08: this false-failed a correct patch twice in a row.
                  const isPublicBrowserScript = /^public\//.test(String(target_file || '').replace(/\\/g, '/'));
                  const importCheckFile = (absTarget && !isPublicBrowserScript)
                    ? path.join(path.dirname(absTarget), `.factory-import-check-${Date.now()}-${process.pid}.mjs`)
                    : null;
                  if (importCheckFile) {
                    try {
                      // The probe has to sit beside the target so the module's own
                      // relative imports resolve, which means the target's directory
                      // must exist even when this is the very first file in a new
                      // folder. Without this, every tier failed with ENOENT and the
                      // step reported codegen_empty as if no model had answered
                      // (confirmed live 2026-08-12 on services/taloa/).
                      fs.mkdirSync(path.dirname(importCheckFile), { recursive: true });
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

  const commitRunner = typeof commitToGitHub === 'function'
    ? async (targetFile, content, message) => commitToGitHub(targetFile, content, message)
    : null;
  const dispatchOptions = { assertionRunner, codegenRunner, commitRunner };

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
      const filter = { role: req.query.role || null, factory_id: req.query.factory_id || null };
      const rankings = await getModelRankings(pool, { role: filter.role });
      // Profiles sit alongside the ranking on purpose. A rank is one number and
      // a single number is what a system learns to game, so the per-dimension
      // capability profile is served with it rather than behind it.
      const profiles = await getCapabilityProfiles(pool, filter);
      // A failure reproducing across independent factories indicts the design,
      // not the factory. Surfacing it here means the evidence is read rather
      // than merely recorded.
      const systemic = detectSystemicPattern(
        profiles
          .filter((p) => p.dimensions.reality_performance !== null && p.dimensions.reality_performance < 1)
          .map((p) => ({ failure_signature: `low_reality:${p.role}`, factory_id: p.factory_id }))
      );
      res.json({
        ok: true,
        rankings,
        capability_profiles: profiles,
        systemic_patterns: systemic,
        known_roles: KNOWN_ROLES,
        note: rankings.length === 0 ? 'no outcomes recorded yet for this filter' : undefined,
        unscored_warning: profiles.some((p) => p.reality_unscored > 0)
          ? 'some attempts have no Reality outcome yet — unscored work is not success'
          : undefined,
      });
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // North Star §2.0G Governance Evolution Law: "at fixed cadence, review
  // which laws helped/hurt/caused drift." Now on a real scheduled cadence
  // (services/governance-review-scheduler.js, default 24h, wired in
  // startup/boot-domains.js) with persisted history in
  // governance_review_log -- this route still runs it live, on demand, for
  // an immediate answer without waiting for the next tick.
  router.get('/factory/governance-review', guard, async (_req, res) => {
    try {
      const review = await runGovernanceReview({ pool });
      res.json(review);
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
  });

  router.get('/factory/governance-review/history', guard, async (req, res) => {
    try {
      const { getGovernanceReviewHistory } = await import('../services/governance-review-scheduler.js');
      const result = await getGovernanceReviewHistory(pool, { limit: req.query.limit });
      res.json(result);
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

  // North Star §2.0H Founder Intent Model — real backfill from the existing
  // historical conversation corpus (docs/conversation_dumps/raw/*.jsonl +
  // Lumin-Memory/00_INBOX), not a wait-for-future-events-only log. Founder,
  // direct (2026-07-28): "I have hours and hours of communication... study
  // that shit and make my twin." Server-side because real provider keys only
  // exist in the Railway env; the caller sends raw text, the model here does
  // the actual extraction, and this endpoint also doubles as the first real
  // call site for KNOWN_ROLES.founder_intent_modeling (previously unwired).
  router.post('/factory/founder-decisions/extract', guard, async (req, res) => {
    try {
      const { text_batch, source = 'historical_conversation_backfill', file_label = null } = req.body || {};
      const text = String(text_batch || '').trim();
      if (!text) return res.status(400).json({ ok: false, error: 'text_batch required' });
      if (!callCouncilMember) return res.status(503).json({ ok: false, error: 'callCouncilMember not available' });

      const prompt = `You are extracting REAL things the founder (Adam) expressed in this raw historical conversation excerpt, for a durable record of how he actually thinks and decides -- not prediction, not feature-mining. Only extract what he actually said or clearly experienced, in his own words or a faithful close paraphrase.

Extract FOUR kinds of real content, each a distinct category:

1. decisions/directives/preferences (category: governance, product_scope, financial, quality_standard, process, or priority) -- "always do X", "never do Y", "I've decided Z", a clear choice between options, a correction of the system's approach.

2. ai_failure_pattern -- a real moment where Adam identified or experienced an AI system failing him: lying or overclaiming, taking a shortcut instead of the real fix, missing an obvious connection he had to point out himself ("have you thought of X" moments), going in circles on the same problem repeatedly, or any other concrete AI weakness he named from direct experience. This is the single most valuable category in this corpus -- founder, direct: "I didn't realize how much AI lies to me... the AI takes the shortest cut path... AI can [fail to] see something that's so easily understood as connected." Capture the SPECIFIC failure, not a generic complaint.

3. founder_insight -- an original idea, connection, or solution Adam came up with himself, especially ones that came from him "connecting dots" the AI had missed. Not a system feature request -- his own reasoning or realization, in his own words.

4. other -- skip small talk and pure debugging back-and-forth with no lasting content. If genuinely nothing in this excerpt fits any category, return {"decisions":[]}. Do not invent content to have something to return.

Output rules:
- category must be exactly one of: governance, product_scope, financial, quality_standard, process, priority, ai_failure_pattern, founder_insight, other.
- decision_text: Adam's own words or a faithful close paraphrase. Keep it concrete and specific -- name the actual failure, the actual idea, the actual decision, not a vague summary.
- context: one sentence on what prompted it, if inferable from the excerpt. null if not inferable.
- Return STRICT JSON only, no markdown fences, no commentary: {"decisions":[{"decision_text":"...","context":"...","category":"..."}]}

EXCERPT${file_label ? ` (source: ${file_label})` : ''}:
${text.slice(0, 24000)}`;

      const candidates = getCandidateModelsForTask('founder_intent.extract_decisions');
      let raw = null;
      let usedTier = null;
      let lastErr = null;
      for (const tier of candidates) {
        try {
          raw = await callCouncilMember(tier, prompt, {
            taskType: 'json',
            product_lane: 'builderos',
            // Raised from 3000 after observing real truncation failures
            // ("Unterminated string in JSON") on chunks with unusually many
            // extractable items; the 4-category prompt (2026-07-29) extracts
            // more per chunk on average, not less.
            maxOutputTokens: 6000,
            responseFormat: 'json',
            useCache: false,
          });
          usedTier = tier;
          break;
        } catch (err) {
          lastErr = err;
          recordModelOutcome(pool, { model_tier: tier, role: 'founder_intent_modeling', ok: false }).catch(() => {});
        }
      }
      if (!raw) {
        return res.status(503).json({ ok: false, error: `all model tiers failed: ${lastErr?.message || 'unknown'}` });
      }

      let parsed;
      try {
        const cleaned = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
        parsed = JSON.parse(cleaned);
      } catch (err) {
        recordModelOutcome(pool, { model_tier: usedTier, role: 'founder_intent_modeling', ok: false, theater_detected: true }).catch(() => {});
        return res.status(502).json({ ok: false, error: `model returned non-JSON: ${err.message}`, raw_preview: String(raw).slice(0, 300) });
      }

      const items = Array.isArray(parsed?.decisions) ? parsed.decisions : [];
      recordModelOutcome(pool, { model_tier: usedTier, role: 'founder_intent_modeling', ok: true, trust_earned: true }).catch(() => {});

      const written = [];
      for (const item of items) {
        const result = await recordFounderDecision(pool, {
          decision_text: item?.decision_text,
          context: item?.context || null,
          category: item?.category,
          source,
        });
        if (result.ok) written.push(result.id);
      }

      res.json({ ok: true, model_used: usedTier, candidates_extracted: items.length, written_count: written.length, written_ids: written });
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // North Star §2.0J model benchmarking, role 'security_review': the real
  // AI-judgment layer on top of scripts/lib/security-invariants.mjs's
  // deterministic floor. Confirmed live (2026-07-29) that no AI-powered
  // security check existed anywhere in this codebase before this — every
  // security fix landed this session was pattern-matching, which cannot
  // catch a vulnerability class nobody wrote a rule for yet. ROUTE posture
  // (Gate Charter / Chair ruling c646160f-128a-4b43-9884-af37cd5a868a),
  // not BLOCK -- this is a brand-new, unproven mechanism; reports findings,
  // does not refuse anything yet.
  router.post('/factory/security-review', guard, async (req, res) => {
    try {
      const { diff_text, changed_files } = req.body || {};
      const { reviewDiffForSecurity } = await import('../scripts/ai-security-review.mjs');
      const candidates = getCandidateModelsForTask('security_review.review_diff');
      let result = null;
      // Same diagnostic gap already found and fixed once this session for
      // codegen (tier_errors): a single lastErr string threw away which
      // tier failed and why, making a real live failure ("Finding 1: ..."
      // prose from a weak fallback tier) undiagnosable from the HTTP
      // response alone. Keep every tier's result, not just the last.
      const tierAttempts = [];
      for (const tier of candidates) {
        result = await reviewDiffForSecurity({
          diffText: diff_text,
          changedFiles: Array.isArray(changed_files) ? changed_files : [],
          callModel: callCouncilMember,
          model: tier,
          pool,
        });
        tierAttempts.push({ tier, ok: result.ok, error: result.error, raw_preview: result.raw_preview });
        if (result.ok) break;
      }
      if (!result?.ok) {
        return res.status(503).json({ ok: false, error: result?.error || 'all model tiers failed', tier_attempts: tierAttempts });
      }
      res.json(result);
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // North Star §2.0D Mission State Machine Law + Companion §0.9: found live
  // (2026-07-28) that a real, complete, already-approved implementation of
  // this already exists and is already live -- services/mission-ledger.js +
  // routes/mission-routes.js (registerMissionRoutes, GET/POST /api/missions,
  // /api/missions/:id/transition, etc.), backed by real tables from
  // db/migrations/20260604_mission_runtime_v1.sql, per BPB-0001 and AIC
  // DISCUSSION-6 (founder-only, mandatory-note-justified backward
  // transitions -- a more correct rule than a first hand-authored attempt
  // at this made here and then removed). No new route added: /api/missions
  // already satisfies this requirement and adding a parallel /factory/
  // alias over the same data would be exactly the "competing authority
  // vocabulary" North Star §2.0F forbids.

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
        model_escalation,
        auto_generate_reasoning_plan,
      } = req.body || {};
      // Autonomous loop sends model_escalation (>0) after repeated same-signature
      // failures. Apply GRADE_ESCALATION_TIERS to every bound step's authoring.tiers
      // so codegen starts on the strong-first chain instead of silently ignoring the
      // request (previous behavior: accepted the field, never changed dispatch).
      const escalationRequested = Math.max(0, Number(model_escalation) || 0);
      const escalationTiers = escalationRequested > 0 ? [...GRADE_ESCALATION_TIERS] : null;
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
        allow_terminal_steps: false,
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
        let bound;
        if (!loaded.ok) {
          bound = { ...s };
        } else {
          const twin = loaded.step;
          // Twin (the committed blueprint step) is authoritative over the caller's
          // request body for every field the blueprint actually declares -- was a
          // hardcoded per-field whitelist here (target_file/task/spec/assertion_spec/
          // expected_exports/behavior_assertions/action_type/exact_inputs only), so
          // any newly-used blueprint field (patch_mode, ssot, ...) silently never
          // reached dispatch. Confirmed live 2026-08-08: CV1P-S02's blueprint-declared
          // patch_mode:true was dropped here, so a 1369-line file kept going through
          // full-file regeneration (which failed twice on an unrelated truncation)
          // instead of the safer patch it was configured to use. Full twin spread
          // fixes this for every field, present and future, in one place. Ephemeral
          // per-call fields the blueprint never declares (last_error, model_escalation)
          // still pass through untouched since twin has no key to overwrite them with.
          bound = {
            ...s,
            ...twin,
            step_id: s.step_id || sid,
            blueprint_step_id: sid,
            blueprint_id,
          };
          if (!bound.sandbox_boundary && twin.target_file) {
            bound.sandbox_boundary = `${String(twin.target_file).split('/')[0]}/**`;
          }
        }
        if (escalationTiers) {
          bound.authoring = {
            ...(bound.authoring || {}),
            tiers: escalationTiers,
          };
          bound.model_escalation = escalationRequested;
        }
        return bound;
      });
      if (escalationRequested > 0) {
        appendHistorianRecord({
          type: 'model_escalation_applied',
          mission_id: mission_id || twinProbe.mission_id,
          blueprint_id: blueprint_id || twinProbe.blueprint_id,
          model_escalation: escalationRequested,
          tiers: escalationTiers,
          trust_level: 'outcome-linked',
        });
      }
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
        {
          mission_id: m,
          blueprint_id: b,
          step,
          skip_intake_gate: allowSkip,
          auto_generate_reasoning_plan: auto_generate_reasoning_plan === true,
        },
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
      const groundingFailures = [];
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
          if (!seal.ok && seal.status === 'GROUNDING_FAIL') {
            groundingFailures.push({ step_id: sid, ...seal });
            appendHistorianRecord({
              type: 'exact_change_grounding_failed',
              mission_id: mission_id || twinProbe.mission_id,
              blueprint_id: blueprint_id || twinProbe.blueprint_id,
              step_id: sid,
              ...seal,
              trust_level: 'outcome-linked',
            });
            // Do not seal; do not claim shipped; fail-closed for this step.
            outcome.ok = false;
            continue;
          }
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
      res.status(outcome.ok && groundingFailures.length === 0 ? 200 : 422).json({
        ...outcome,
        model_escalation: escalationRequested,
        model_escalation_tiers: escalationTiers,
        grounding_failures: groundingFailures,
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
        allow_terminal_steps: true,
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

  router.post('/factory/unseal-step', guard, async (req, res) => {
    try {
      const { blueprint_id, blueprint_step_id, unsealed_by, unseal_reason, evidence } = req.body || {};
      const result = unsealExactChangeInTwin({
        blueprint_id,
        blueprint_step_id,
        unsealed_by,
        unseal_reason,
        evidence,
      });
      appendHistorianRecord({
        type: 'exact_change_unsealed',
        blueprint_id,
        step_id: blueprint_step_id,
        ...result,
        trust_level: 'outcome-linked',
      });
      res.status(result.ok ? 200 : 422).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, status: 'FACTORY_UNSEAL_STEP_ERROR', error: err?.message || String(err) });
    }
  });

  router.post('/factory/escalate-step', guard, async (req, res) => {
    try {
      const { product_id, step_id, escalation_note, escalated_by } = req.body || {};
      if (!product_id || !step_id) {
        return res.status(400).json({ ok: false, error: 'product_id and step_id required' });
      }
      const queue = loadBuildQueue(product_id);
      const result = escalateBlockedStep(queue, step_id, { escalation_note, escalated_by });
      if (result.ok) persistQueue(queue);
      res.status(result.ok ? 200 : 422).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, status: 'FACTORY_ESCALATE_STEP_ERROR', error: err?.message || String(err) });
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
// from '../services/builderos-tsos-hook-service.js'
// from '../services/builderos-tsos-routing.js'
// emitTSOSHookReading
// logShadowRoutingDecision

// Re-export factory-core run-step bindings that BUILD_QUEUE artifact proof expects.
export { dispatchExecuteStep, resolveRepoPath };
