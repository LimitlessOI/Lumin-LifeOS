/**
 * services/toon-formatter.js — TCO-A09-NEW
 *
 * TOON: Token-Oriented Object Notation.
 * Converts JSON payloads to a compact format before injecting into AI prompts.
 * TOON achieves 30–61% fewer tokens than JSON with neutral-to-improved accuracy.
 * Source: arXiv/InfoQ 2025 — TOON benchmarks on GPT-5 Nano + Claude.
 *
 * Rules:
 *   - Objects → YAML-style key: value (no braces, no quotes on simple values)
 *   - Uniform arrays of objects → CSV-style (header row + data rows)
 *   - Mixed/nested → compact JSON (last resort, still strips whitespace)
 *   - Protected spans: never reformats code, URLs, IDs, SQL — pass through raw
 *
 * Exports: { toTOON, fromJSON, estimateSavings }
 */

// Values that must never be reformatted — they go through as-is
const PROTECTED_PATTERNS = [
  /^https?:\/\//,                     // URLs
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i,       // UUIDs
  /SELECT|INSERT|UPDATE|DELETE|CREATE/i, // SQL
  /^[a-z_]+\s*\(/i,                   // function calls
];

function isProtected(val) {
  if (typeof val !== 'string') return false;
  return PROTECTED_PATTERNS.some(re => re.test(val.trim()));
}

function isSimpleValue(val) {
  if (val === null || val === undefined) return true;
  if (typeof val === 'boolean' || typeof val === 'number') return true;
  if (typeof val === 'string') {
    // Simple string: no newlines, not too long, not protected
    return !isProtected(val) && !val.includes('\n') && val.length < 120;
  }
  return false;
}

function isUniformArray(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return false;
  const firstKeys = Object.keys(arr[0] || {}).sort().join(',');
  return arr.every(item =>
    item && typeof item === 'object' && !Array.isArray(item) &&
    Object.keys(item).sort().join(',') === firstKeys
  );
}

// Format a simple scalar for TOON output
function formatScalar(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'string') {
    // Quote strings with special chars
    if (val.includes(',') || val.includes('\n') || val.includes('"')) {
      return `"${val.replace(/"/g, '\\"')}"`;
    }
    return val;
  }
  return String(val);
}

// Convert object to YAML-style key: value lines
function objectToTOON(obj, indent = '') {
  const lines = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (isSimpleValue(val)) {
      lines.push(`${indent}${key}: ${formatScalar(val)}`);
    } else if (Array.isArray(val)) {
      if (isUniformArray(val) && val.length > 1) {
        // Inline CSV-style
        const keys = Object.keys(val[0]);
        lines.push(`${indent}${key}:`);
        lines.push(`${indent}  ${keys.join(',')}`);
        for (const row of val) {
          lines.push(`${indent}  ${keys.map(k => formatScalar(row[k])).join(',')}`);
        }
      } else if (val.every(v => isSimpleValue(v))) {
        // Simple scalar array — inline
        lines.push(`${indent}${key}: [${val.map(formatScalar).join(', ')}]`);
      } else {
        // Nested complex array — compact JSON
        lines.push(`${indent}${key}: ${JSON.stringify(val)}`);
      }
    } else if (val && typeof val === 'object') {
      lines.push(`${indent}${key}:`);
      lines.push(objectToTOON(val, indent + '  '));
    } else {
      lines.push(`${indent}${key}: ${JSON.stringify(val)}`);
    }
  }
  return lines.join('\n');
}

// Convert uniform array to CSV-style TOON
function uniformArrayToTOON(arr) {
  const keys = Object.keys(arr[0]);
  const header = keys.join(',');
  const rows = arr.map(item => keys.map(k => formatScalar(item[k])).join(','));
  return [header, ...rows].join('\n');
}

/**
 * Convert a JavaScript value (object, array, or primitive) to TOON notation.
 * Returns { toon: string, originalChars: number, toonChars: number, savedPct: number }
 */
export function toTOON(value) {
  const jsonStr = JSON.stringify(value, null, 2);
  const originalChars = jsonStr.length;

  let toon;
  try {
    if (value === null || value === undefined || typeof value !== 'object') {
      toon = String(value);
    } else if (isUniformArray(value)) {
      toon = uniformArrayToTOON(value);
    } else if (Array.isArray(value)) {
      // Mixed array — try to TOON each element
      toon = value.map(item =>
        (item && typeof item === 'object') ? objectToTOON(item) : formatScalar(item)
      ).join('\n---\n');
    } else {
      toon = objectToTOON(value);
    }
  } catch {
    // Never fail — fall back to compact JSON
    toon = JSON.stringify(value);
  }

  const toonChars = toon.length;
  const savedPct = originalChars > 0
    ? Math.round((1 - toonChars / originalChars) * 100)
    : 0;

  return { toon, originalChars, toonChars, savedPct };
}

/**
 * Given a prompt string, find embedded JSON blocks and replace them with TOON.
 * Returns { text, savedChars, savedPct, replacements }
 */
export function compressJSONInPrompt(promptText) {
  if (!promptText || typeof promptText !== 'string') {
    return { text: promptText, savedChars: 0, savedPct: 0, replacements: 0 };
  }

  let result = promptText;
  let totalSaved = 0;
  let replacements = 0;

  function tryReplace(match, jsonContent) {
    try {
      const parsed = JSON.parse(jsonContent.trim());
      const { toon, savedPct } = toTOON(parsed);
      if (savedPct > 10) {
        totalSaved += match.length - toon.length;
        replacements++;
        return toon;
      }
    } catch { /* not valid JSON — leave as-is */ }
    return match;
  }

  // Pass 1: fenced ```json blocks
  result = result.replace(/```json\s*([\s\S]*?)```/g, (match, body) =>
    tryReplace(match, body) === match ? match : `\`\`\`toon\n${tryReplace(match, body)}\n\`\`\``
  );

  // Pass 2: inline objects/arrays injected via JSON.stringify — must be
  // substantial (>100 chars) to be worth replacing, and clearly JSON-shaped.
  // Pattern: standalone { ... } or [ ... ] on their own line(s)
  result = result.replace(/(?:^|\n)([ \t]*)([\[{][\s\S]{100,}?[\]}])(?=\n|$)/gm,
    (match, indent, jsonContent) => {
      const replaced = tryReplace(jsonContent, jsonContent);
      if (replaced !== jsonContent) {
        return `\n${indent}${replaced}`;
      }
      return match;
    }
  );

  const savedPct = promptText.length > 0
    ? Math.round((totalSaved / promptText.length) * 100)
    : 0;

  return { text: result, savedChars: totalSaved, savedPct, replacements };
}

/**
 * Estimate how many tokens TOON would save on a given object.
 * Uses the 4-chars-per-token heuristic.
 */
export function estimateSavings(value) {
  const { originalChars, toonChars, savedPct } = toTOON(value);
  return {
    originalTokens: Math.ceil(originalChars / 4),
    toonTokens: Math.ceil(toonChars / 4),
    savedTokens: Math.ceil((originalChars - toonChars) / 4),
    savedPct,
  };
}
