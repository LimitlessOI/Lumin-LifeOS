/**
 * SYNOPSIS: Canonical self-repair escalation policy for BuilderOS repair loops.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
export const SELF_REPAIR_MAX_ATTEMPTS = 3;

export const QUORUM_ROUNDS_PER_STAGE = 3;

export function getSelfRepairAttemptStage(attempt) {
  const n = Number(attempt || 0);
  if (n <= 1) return 'same_tier_initial';
  if (n === 2) return 'same_tier_lessons';
  return 'same_tier_research_consensus';
}

export function buildSelfRepairAttemptRequirements(attempt) {
  const stage = getSelfRepairAttemptStage(attempt);
  return {
    attempt: Number(attempt || 0),
    stage,
    require_prior_lessons: Number(attempt || 0) >= 2,
    require_research: Number(attempt || 0) >= 3,
    require_consensus_context: Number(attempt || 0) >= 3,
  };
}

// Blockers where outside knowledge (docs, changelogs, community fixes) is the
// fast path — an unfamiliar API, a missing module, a version/deprecation break,
// or a network/cert failure. For these it is wasteful to burn a plain retry.
const KNOWLEDGE_GAP_PATTERNS = [
  /not found|cannot find module|module not found|no such (file|module)|unresolved|unknown (option|flag|field|command)|unrecognized/i,
  /deprecat|no longer supported|removed in|breaking change|has been renamed/i,
  /incompatib|peer dep|version mismatch|requires .{0,20}\d+\.\d+|expected version/i,
  /\bapi\b.*(error|docs|schema|endpoint)|invalid_request|unsupported (parameter|model|endpoint)|rate.?limit/i,
  /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|certificate|self.?signed|TLS|SSL handshake/i,
];

// Blockers the model can almost always fix itself without spending web-search
// budget — syntax/lint, truncation, and our own deploy/cache/CSS mechanics.
const SELF_FIXABLE_PATTERNS = [
  /syntax|unexpected token|parse error|lint|eslint|prettier|format/i,
  /truncat|incomplete|max.?tokens|output too long|length limit/i,
  /cache|CACHE_NAME|service worker|redeploy|deploy sha|not yet live/i,
  /FOUNDER_VISUAL_NOT_VERIFIED|css|inline style|selector|theme.?override/i,
];

/**
 * Is this the kind of failure where searching online actually helps? Self-fixable
 * signatures win over knowledge-gap ones so we never pay for a search on a typo.
 */
export function isKnowledgeGapBlocker(blocker) {
  const b = String(blocker || '');
  if (!b.trim()) return false;
  if (SELF_FIXABLE_PATTERNS.some((re) => re.test(b))) return false;
  return KNOWLEDGE_GAP_PATTERNS.some((re) => re.test(b));
}

/**
 * Adaptive web-search gate. The final attempt always researches. Earlier attempts
 * (e.g. attempt 2) only research when the blocker looks like a knowledge gap that
 * outside sources can close — otherwise the retry stays a cheap self-fix.
 */
export function shouldRunWebSearchBeforeAttempt(attempt, blocker = null) {
  const n = Number(attempt);
  if (n >= SELF_REPAIR_MAX_ATTEMPTS) return true;
  if (n >= 2 && isKnowledgeGapBlocker(blocker)) return true;
  return false;
}
