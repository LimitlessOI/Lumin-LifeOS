/**
 * SYNOPSIS: Detect crisis-language phrases for LifeOS safety routing.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const CRISIS_PATTERNS = [
  /\b(kill myself|suicide|suicidal|end my life|want to die)\b/i,
  /\b(hurt myself|self[-\s]?harm|cut myself)\b/i,
  /\b(don't want to (be here|live)|no reason to live)\b/i,
];

/**
 * @param {string} text
 * @returns {{ crisis: boolean, matches: string[], severity: 'none'|'elevated'|'crisis' }}
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

export default { detectCrisisLanguage };