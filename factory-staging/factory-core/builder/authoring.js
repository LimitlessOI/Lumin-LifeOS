/**
 * SYNOPSIS: STEP 4 — codegen as an UNTRUSTED authoring sub-step (the "dumb pipe").
 * A model produces candidate file CONTENT ONLY; that content becomes the
 * exact_content of a normal write_file_exact step and is proven independently by
 * the Step-3 SENTRY behavior gate. factory-core stays pure — the codegen runner
 * (cheapest model tier first, escalate on failure) is injected at the route boundary.
 *
 * ASSERTION-PROVENANCE LOCK (Chair ruling, live council SHA 2da1eb0be):
 * behavior_assertions are authored by the blueprint/step spec, NEVER by codegen.
 * If codegen wrote both the code and the assertions that prove it, SENTRY would be
 * validating model-written tests against model-written code — the gate would not be
 * independent. The codegen runner contract therefore returns CONTENT ONLY; there is
 * structurally no channel for it to supply assertions, and a server-code authoring
 * step that declares no blueprint assertions fails closed BEFORE any model is called.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { stepRequiresBehaviorProof } from '../sentry/behavior-assertions.js';
import { normalizeCommonJsToEsm } from '../bpb/author-assertions.js';
import { resolveRepoPath } from '../repo-paths.js';
import { TRUSTED_FALLBACK_MODELS } from '../../../config/task-model-routing.js';

export const AUTHORING_ACTION_TYPE = 'author_then_write';

// Strong-first, provider-diverse failover chain (SO-003). Never start with the cheapest
// free tier on a load-bearing codegen step. Fail over across providers, never sit
// idle. Overridable per step via step.authoring.tiers.
export const DEFAULT_CODEGEN_TIERS = TRUSTED_FALLBACK_MODELS;

// Inject a canonical @ssot tag for any source file owned by a known product.
// The builder output is untrusted input; the conductor rail enforces the repo's
// SSOT coupling rule before the file is written and SENTRY-proved.
function ensureSsotTag(content, target_file, product_id) {
  if (!product_id || !target_file) return content;
  const ext = path.extname(target_file).toLowerCase();
  const isJs = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(ext);
  const isHtml = ext === '.html';
  if (!isJs && !isHtml) return content;

  const canonicalSsot = `docs/products/${product_id}/PRODUCT_HOME.md`;
  const existingTag = content.match(/@ssot\s+([^\s*\n]+)/);
  if (existingTag) {
    // Replace a foreign or placeholder tag with the canonical product home.
    if (existingTag[1] !== canonicalSsot && existingTag[1] !== 'docs/products/PRODUCT_REGISTRY.json') {
      return content.replace(existingTag[0], `@ssot ${canonicalSsot}`);
    }
    return content;
  }

  const header = isJs
    ? `/**\n * @ssot ${canonicalSsot}\n */\n`
    : `<!-- @ssot ${canonicalSsot} -->\n`;
  return header + content;
}

export function stepRequiresAuthoring(step) {
  if (!step) return false;
  return step.action_type === AUTHORING_ACTION_TYPE || Boolean(step.authoring);
}

// Strip a single fenced code block if the model wrapped its output in markdown.
export function extractContent(raw) {
  const text = String(raw || '');
  const fence = text.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
  if (fence) return fence[1];
  return text;
}

/**
 * Run the authoring sub-step. Returns CONTENT ONLY (provenance lock).
 * Fail-closed: no runner, empty output, or a server-code target with no
 * blueprint-authored behavior_assertions all return ok:false without shipping.
 *
 * @param {object} step
 * @param {{ generate?: Function } | null} codegenRunner injected at route boundary
 */
export async function runAuthoring(step, codegenRunner) {
  const target_file = String(step?.target_file || '');
  const base = { action: 'author_then_write', target_file, checked_at: new Date().toISOString() };

  // Provenance / fail-closed gate BEFORE spending a model call: if SENTRY will
  // require behavioral proof for this target, the blueprint MUST have declared the
  // assertions up front. We never let codegen author code we cannot independently prove.
  const declared = Array.isArray(step?.behavior_assertions) ? step.behavior_assertions : [];
  if (stepRequiresBehaviorProof({ ...step, behavior_assertions: undefined }) && declared.length === 0) {
    return { ...base, ok: false, reason: 'authoring_requires_blueprint_assertions' };
  }

  if (!codegenRunner || typeof codegenRunner.generate !== 'function') {
    return { ...base, ok: false, reason: 'no_codegen_runner' };
  }

  const authoring = step.authoring || {};
  let result;
  try {
    const failureContext = step.last_error
      ? `PREVIOUS ATTEMPT FAILED WITH: ${step.last_error}\nMake sure you fix that exact issue.\n`
      : '';
    const expectedExports = Array.isArray(step.expected_exports) && step.expected_exports.length
      ? `REQUIRED NAMED EXPORTS: ${step.expected_exports.join(', ')}\nYou MUST export each of these names from the file.\n`
      : '';
    result = await codegenRunner.generate({
      task: authoring.task || step.task || '',
      target_file,
      spec: authoring.spec || step.spec || '',
      tiers: Array.isArray(authoring.tiers) && authoring.tiers.length ? authoring.tiers : DEFAULT_CODEGEN_TIERS,
      max_output_tokens: Number(authoring.max_output_tokens || step.max_output_tokens) || 8000,
      module_type: authoring.module_type || step.module_type || null,
      last_error: step.last_error || null,
      expected_exports: step.expected_exports || null,
      failure_context: failureContext,
      expected_exports_context: expectedExports,
    });
  } catch (err) {
    const errMsg = String(err?.message || err);
    return { ...base, ok: false, reason: `codegen_threw: ${errMsg.slice(0, 500)}`, error: errMsg };
  }

  const rawContent = extractContent(result?.content);
  let content = normalizeCommonJsToEsm(rawContent, target_file);

  // Enforce SSOT coupling on every generated product file before SENTRY proves it.
  content = ensureSsotTag(content, target_file, step?.product_id || null);

  // Fail-closed regression guard: do not let a model replace an existing, larger
  // file with a minimal stub that only satisfies the export assertion.
  let existingSize = 0;
  try {
    existingSize = fs.statSync(resolveRepoPath(target_file)).size;
  } catch {
    existingSize = 0;
  }
  if (existingSize > 0 && content.length < existingSize * 0.3) {
    return {
      ...base,
      ok: false,
      reason: `codegen_stub_detected: generated ${content.length}b is < 30% of existing ${existingSize}b`,
      error: `generated content appears to be a stub (existing ${existingSize}b, generated ${content.length}b)`,
      model_tier: result?.model_tier || null,
    };
  }

  if (!content || !content.trim()) {
    const errMsg = result?.error || null;
    return {
      ...base,
      ok: false,
      reason: errMsg ? `codegen_empty: ${String(errMsg).slice(0, 500)}` : 'codegen_empty',
      model_tier: result?.model_tier || null,
      error: errMsg,
    };
  }

  const usage = result?.usage && typeof result.usage === 'object' ? result.usage : null;
  const promptTokens = Number(usage?.prompt_tokens ?? usage?.promptTokens ?? result?.prompt_tokens) || 0;
  const completionTokens = Number(usage?.completion_tokens ?? usage?.completionTokens ?? result?.completion_tokens) || 0;
  const totalTokens = Number(usage?.total_tokens ?? usage?.totalTokens ?? result?.total_tokens)
    || (promptTokens + completionTokens);
  const estimatedUsd = Number(usage?.estimated_usd ?? usage?.estimatedUsd ?? result?.estimated_usd) || 0;

  return {
    ...base,
    ok: true,
    content,
    content_sha256: crypto.createHash('sha256').update(Buffer.from(content, 'utf8')).digest('hex'),
    model_tier: result?.model_tier || null,
    escalated: Boolean(result?.escalated),
    token_cost: totalTokens,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    estimated_usd: estimatedUsd,
    // Explicit provenance record: assertions are the blueprint's, not codegen's.
    assertion_provenance: 'blueprint',
  };
}
