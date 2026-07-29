#!/usr/bin/env node
/**
 * SYNOPSIS: AI-powered adversarial security review of a diff — the real
 * model-judgment layer on top of scripts/lib/security-invariants.mjs's
 * deterministic substring-count floor, same relationship as
 * services/chair-findings-review.js's AI layer on top of its rule-based
 * floor (SO-003: high-stakes reasoning must not be served a canned answer).
 *
 * North Star §2.0J model benchmarking, role 'security_review': confirmed
 * live (2026-07-29) that no real AI-powered security check existed
 * anywhere in this codebase -- every security fix landed this session
 * (path traversal in factory-staging/factory-core/builder/run-step.js,
 * the requireLifeOSAdmin regression, security-invariants.mjs itself) was
 * deterministic pattern-matching, not model judgment. Deterministic checks
 * catch known, named regressions; they cannot catch a NEW vulnerability
 * class nobody wrote a rule for yet -- that needs a real adversarial
 * reviewer, same reasoning as why oil_review and verifier exist as AI
 * layers rather than pure rule-based ones.
 *
 * Posture: ROUTE, not BLOCK (Gate Charter / Chair ruling
 * c646160f-128a-4b43-9884-af37cd5a868a) -- this is a brand-new, unproven
 * mechanism. Auto-blocking commits on an unvalidated model's opinion would
 * itself be a governance risk (a false positive halts the whole ship
 * path). Findings are reported with proposed_solution (SO-002), never
 * silently swallowed, but nothing here refuses a commit yet. Promotion to
 * a blocking gate is a separate, later decision once there's a real track
 * record of true-positive vs false-positive findings to judge it by.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { recordModelOutcome } from '../services/model-capability-ledger.js';

const VULN_CLASSES = [
  'command injection', 'SQL injection', 'path traversal', 'SSRF',
  'auth bypass or missing auth check', 'secret exposure (hardcoded key/token/password)',
  'insecure deserialization', 'prototype pollution', 'XSS', 'CSRF',
  'insecure direct object reference (IDOR)', 'race condition on a security-relevant check',
  'overly permissive CORS', 'unbounded resource consumption (DoS via user input)',
];

export function buildSecurityReviewPrompt(diffText, { changedFiles = [] } = {}) {
  return `You are an adversarial security reviewer. You are not being nice. Your job is to find real, exploitable vulnerabilities in this diff, not style issues.

Look specifically for these vulnerability classes (not an exhaustive list, but the most common real ones):
${VULN_CLASSES.map((v) => `- ${v}`).join('\n')}

Rules:
- Only report a finding if you can point to the SPECIFIC line/pattern and explain the concrete exploit scenario (what input, what happens). A vague "this could be risky" is not a finding.
- Do not report something already guarded elsewhere in the same diff (e.g. a path already validated by assertSafeExternalUrl or similar) unless the guard itself has a real gap.
- If the diff genuinely has no security-relevant issue, say so plainly. Do not invent a finding to have something to report.
- Every finding MUST include proposed_solution: the specific file/line and the concrete fix, not "add validation."

Changed files: ${changedFiles.join(', ') || '(not provided)'}

DIFF:
${diffText.slice(0, 20000)}

Return STRICT JSON only, no markdown fences, no commentary:
{"findings":[{"severity":"P0"|"P1"|"P2","vuln_class":"...","file":"...","description":"...","exploit_scenario":"...","proposed_solution":"..."}],"clean":true|false}`;
}

/**
 * @param {object} opts
 * @param {string} opts.diffText — unified diff text to review
 * @param {string[]} [opts.changedFiles]
 * @param {Function} opts.callModel — (model, prompt, options) => Promise<string>
 * @param {string} [opts.model]
 * @param {object} [opts.pool] — optional, for model_capability_ledger recording
 * @param {object} [opts.logger]
 */
export async function reviewDiffForSecurity({
  diffText,
  changedFiles = [],
  callModel,
  model = 'claude_sonnet',
  pool = undefined,
  logger = console,
} = {}) {
  if (!diffText || !diffText.trim()) {
    return { ok: true, clean: true, findings: [], skipped: 'empty_diff' };
  }
  if (typeof callModel !== 'function') {
    logger?.warn?.('[AI-SECURITY-REVIEW] no callModel available — skipping (no rule-based fallback exists for this role, unlike oil_review)');
    return { ok: false, skipped: 'no_model_available' };
  }

  const prompt = buildSecurityReviewPrompt(diffText, { changedFiles });
  let raw;
  try {
    raw = await callModel(model, prompt, { maxOutputTokens: 2000, taskType: 'security_review', responseFormat: 'json' });
  } catch (err) {
    recordModelOutcomeSafe(pool, { model_tier: model, role: 'security_review', ok: false });
    logger?.warn?.(`[AI-SECURITY-REVIEW] model call failed: ${err.message}`);
    return { ok: false, error: err.message };
  }

  let parsed;
  try {
    const cleaned = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    parsed = JSON.parse(cleaned);
  } catch (err) {
    recordModelOutcomeSafe(pool, { model_tier: model, role: 'security_review', ok: false, theater_detected: true });
    logger?.warn?.(`[AI-SECURITY-REVIEW] model returned non-JSON: ${err.message}`);
    return { ok: false, error: `non-JSON response: ${err.message}`, raw_preview: String(raw).slice(0, 300) };
  }

  const findings = Array.isArray(parsed?.findings) ? parsed.findings : [];
  // SO-002: a finding without proposed_solution is an incomplete report --
  // downgrade rather than silently drop, so the gap is visible not hidden.
  const validated = findings.map((f) => ({
    ...f,
    proposed_solution: f.proposed_solution || '(none provided — incomplete finding per SO-002, needs manual follow-up)',
  }));

  recordModelOutcomeSafe(pool, { model_tier: model, role: 'security_review', ok: true, trust_earned: true });
  return { ok: true, clean: validated.length === 0, findings: validated };
}

function recordModelOutcomeSafe(pool, fields) {
  if (!pool) return;
  recordModelOutcome(pool, fields).catch(() => {});
}

// No CLI entry point: local machines in this repo have zero provider keys
// (confirmed live 2026-07-29 while building the founder-decision extraction
// endpoint), so a git-hook-time AI call is not feasible without hitting the
// live server anyway. reviewDiffForSecurity() is exposed server-side via
// POST /factory/security-review (routes/factory-mount-routes.js), which has
// real callCouncilMember access — call it from there, not from a local CLI
// pretending to have a model it doesn't.
