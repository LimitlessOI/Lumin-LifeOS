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
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import { stepRequiresBehaviorProof } from '../sentry/behavior-assertions.js';

export const AUTHORING_ACTION_TYPE = 'author_then_write';

// Cheapest capable hands first, escalate only on failure (Adam: "cheapest hands,
// highest quality"). Overridable per step via step.authoring.tiers.
export const DEFAULT_CODEGEN_TIERS = ['cerebras_llama', 'openai', 'claude_sonnet'];

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
    result = await codegenRunner.generate({
      task: authoring.task || step.task || '',
      target_file,
      spec: authoring.spec || step.spec || '',
      tiers: Array.isArray(authoring.tiers) && authoring.tiers.length ? authoring.tiers : DEFAULT_CODEGEN_TIERS,
    });
  } catch (err) {
    return { ...base, ok: false, reason: 'codegen_threw', error: String(err?.message || err) };
  }

  const content = extractContent(result?.content);
  if (!content || !content.trim()) {
    return { ...base, ok: false, reason: 'codegen_empty', model_tier: result?.model_tier || null };
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
