/**
 * services/risk-scorer.js
 *
 * Scores any idea or proposal 1–6 based on what it touches.
 * This is the gate between "Adam approves" and "system approves".
 *
 * Risk levels:
 *   1 — New standalone file, no deps, no DB          → auto-approve + auto-build
 *   2 — New route/service/migration (additive only)  → auto-approve + auto-build
 *   3 — Modifies existing service or route           → SMS Adam (one reply)
 *   4 — Modifies server.js imports/mounts, schema    → SMS Adam (one reply)
 *   5 — Core logic, auth, billing, large rewrites    → manual login required
 *   6 — Security, payments, deployment config        → manual login required
 *
 * Exports: scoreIdea(idea) → { score, reasons, autoApprove, needsSMS, needsManual }
 */

// Files that are protected — touching them raises risk immediately
const PROTECTED_FILES = [
  'server.js',
  'package.json',
  'package-lock.json',
  '.env',
  'railway.toml',
  '.github/workflows',
];

const HIGH_RISK_PATHS = [
  'middleware/auth',
  'services/auth',
  'stripe',
  'billing',
  'payment',
  'checkout',
  'startup/environment',
  'core/two-tier',
];

const MEDIUM_RISK_PATHS = [
  'core/',
  'server.js',
  'services/council-service',
  'services/deployment-service',
];

// Keywords in title/description that signal risk
const RISK_KEYWORDS = {
  critical: ['delete all', 'drop table', 'remove auth', 'disable security', 'bypass', 'hard reset'],
  high:     ['auth', 'payment', 'stripe', 'billing', 'checkout', 'credential', 'token', 'secret', 'password', 'encryption', 'deploy config', 'railway env', 'production'],
  medium:   ['refactor', 'rewrite', 'modify existing', 'update server', 'change schema', 'alter table', 'migration'],
  low:      ['add', 'new', 'create', 'build', 'feature', 'product', 'page', 'endpoint', 'service', 'route'],
};

/**
 * Extract likely file paths from an idea's description and component hints.
 */
function extractFilePaths(idea) {
  const text = `${idea.title || ''} ${idea.description || ''} ${idea.components_hint || ''}`.toLowerCase();
  const paths = [];

  // Look for explicit file paths mentioned
  const pathMatches = text.match(/[\w/-]+\.(js|ts|sql|html|css|json)/g) || [];
  paths.push(...pathMatches);

  return paths;
}

/**
 * Score a single idea/proposal object.
 *
 * @param {object} idea — { title, description, category, components_hint, files_hint }
 * @returns {{ score: number, reasons: string[], autoApprove: boolean, needsSMS: boolean, needsManual: boolean }}
 */
export function scoreIdea(idea) {
  const reasons = [];
  let score = 1; // Start optimistic

  const text = `${idea.title || ''} ${idea.description || ''}`.toLowerCase();
  const filePaths = extractFilePaths(idea);

  // ── File path analysis ────────────────────────────────────────────────────

  for (const path of filePaths) {
    if (PROTECTED_FILES.some(p => path.includes(p.toLowerCase()))) {
      score = Math.max(score, 5);
      reasons.push(`Touches protected file: ${path}`);
    } else if (HIGH_RISK_PATHS.some(p => path.includes(p))) {
      score = Math.max(score, 5);
      reasons.push(`Touches high-risk path: ${path}`);
    } else if (MEDIUM_RISK_PATHS.some(p => path.includes(p))) {
      score = Math.max(score, 4);
      reasons.push(`Touches medium-risk path: ${path}`);
    } else if (path.includes('routes/') || path.includes('services/')) {
      // Check if it's a NEW file (additive) or modification
      score = Math.max(score, 2);
    }
  }

  // ── Keyword analysis ──────────────────────────────────────────────────────

  for (const keyword of RISK_KEYWORDS.critical) {
    if (text.includes(keyword)) {
      score = Math.max(score, 6);
      reasons.push(`Critical keyword: "${keyword}"`);
    }
  }

  for (const keyword of RISK_KEYWORDS.high) {
    if (text.includes(keyword)) {
      score = Math.max(score, 5);
      reasons.push(`High-risk keyword: "${keyword}"`);
    }
  }

  for (const keyword of RISK_KEYWORDS.medium) {
    if (text.includes(keyword)) {
      score = Math.max(score, 3);
      reasons.push(`Medium-risk keyword: "${keyword}"`);
    }
  }

  // ── Category analysis ─────────────────────────────────────────────────────

  const category = (idea.category || '').toLowerCase();
  if (['security', 'auth', 'billing', 'payment'].includes(category)) {
    score = Math.max(score, 5);
    reasons.push(`High-risk category: ${category}`);
  } else if (['refactor', 'architecture', 'infrastructure'].includes(category)) {
    score = Math.max(score, 4);
    reasons.push(`Medium-risk category: ${category}`);
  } else if (['feature', 'product', 'enhancement', 'ui'].includes(category)) {
    // Additive — stays low unless keywords say otherwise
    score = Math.max(score, 1);
  }

  // ── Size estimate ─────────────────────────────────────────────────────────
  // Long descriptions with many files implied = more risk of unintended side effects

  const wordCount = text.split(/\s+/).length;
  if (wordCount > 300 && score < 3) {
    score = 3;
    reasons.push('Large scope (300+ word description)');
  }

  // ── Clamp and classify ────────────────────────────────────────────────────

  score = Math.max(1, Math.min(6, score));

  if (!reasons.length) {
    reasons.push('New additive feature — low risk');
  }

  return {
    score,
    reasons,
    label: LABELS[score],
    autoApprove: score <= 2,
    needsSMS:    score === 3 || score === 4,
    needsManual: score >= 5,
  };
}

const LABELS = {
  1: 'Safe — new standalone file',
  2: 'Low — new route/service/migration',
  3: 'Medium — modifies existing service',
  4: 'Elevated — touches core files',
  5: 'High — auth/billing/core logic',
  6: 'Critical — security/payment/config',
};

/**
 * Convenience: score an array of ideas, return sorted by score ascending
 * (lowest risk first — build safe things first).
 */
export function scoreAndSort(ideas) {
  return ideas
    .map(idea => ({ ...idea, risk: scoreIdea(idea) }))
    .sort((a, b) => a.risk.score - b.risk.score);
}
