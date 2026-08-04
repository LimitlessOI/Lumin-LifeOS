/**
 * SYNOPSIS: Detect crisis-language phrases for LifeOS safety routing, and log a
 * minimal, non-destructive receipt when detected.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 *
 * Design: docs/products/lifeos/CRISIS_SAFETY_PROTOCOL_V1.md. Single tier,
 * deterministic (no AI call), narrow explicit-language patterns only -- broadened
 * to match the already-proven set in services/mediator-service.js (Amendment 16,
 * Word Keeper) rather than inventing a new list. Deliberately does NOT include
 * the wider metrics-based trajectory scoring in services/lifeos-risk-detection.js
 * (unwired, and its own 'critical' branch auto-triggers an "emergency alert
 * chain" with no consent gate -- contradicts the founder's explicit "never
 * contacts outside parties automatically" instruction, so it is not reused here
 * without a redesign that is out of scope for this conservative first version).
 */

const CRISIS_PATTERNS = [
  /\b(kill myself|suicide|suicidal|end my life|want to die)\b/i,
  /\b(hurt myself|self[-\s]?harm|cut myself)\b/i,
  /\b(don't want to (be here|live)|no reason to live)\b/i,
  /\bI want to (?:hurt|kill|harm) (?:myself|him|her|them)\b/i,
  /\bI(?:'m| am) going to (?:hurt|kill|harm) (?:myself|him|her|them)\b/i,
  /\bkill (?:myself|yourself|him|her|them)\b/i,
  /\bI(?:'m| am) going to end (?:it|my life)\b/i,
];

const CRISIS_RESOURCES = `You are not alone, and I want to make sure you get real support right now:
• 988 Suicide & Crisis Lifeline: call or text 988
• Crisis Text Line: text HOME to 741741
• Emergency: 911

I'm not able to diagnose or replace a professional, and I have not contacted anyone on your behalf -- this is information, not an action taken. If you're able to, please reach out to one of these or a person you trust.`;

/**
 * @param {string} text
 * @returns {{ crisis: boolean, matches: string[], severity: 'none'|'crisis' }}
 */
export function detectCrisisLanguage(text = '') {
  const raw = String(text || '');
  if (!raw.trim()) {
    return { crisis: false, matches: [], severity: 'none' };
  }
  const matches = [];
  for (const re of CRISIS_PATTERNS) {
    const m = raw.match(re);
    if (m) matches.push(m[0]);
  }
  if (!matches.length) {
    return { crisis: false, matches: [], severity: 'none' };
  }
  return {
    crisis: true,
    matches,
    severity: 'crisis',
  };
}

export function getCrisisResourceMessage() {
  return CRISIS_RESOURCES;
}

/**
 * Logs a minimal, factual receipt -- timestamp, userId, matched pattern
 * *categories* (not the raw message text, to avoid needlessly duplicating
 * sensitive content beyond what's needed to prove the gate fired). Self-
 * bootstrapping table, same pattern used throughout this codebase.
 */
export async function logCrisisDetection(pool, { userId, source, matchCount }) {
  if (!pool) return null;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crisis_detection_log (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT,
      source TEXT NOT NULL,
      match_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const { rows } = await pool.query(
    `INSERT INTO crisis_detection_log (user_id, source, match_count) VALUES ($1, $2, $3) RETURNING id, created_at`,
    [userId || null, source || 'unknown', matchCount || 0],
  );
  return rows[0];
}

export default { detectCrisisLanguage, getCrisisResourceMessage, logCrisisDetection };
