/**
 * SYNOPSIS: Expand LCL codebook symbols in builder codegen output before syntax/governance gates.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { CODE_SYMBOLS, SYMBOL_TO_FULL } from '../config/codebook-v1.js';

const SYMBOLS_LONGEST_FIRST = [...CODE_SYMBOLS.map(([, sym]) => sym)].sort(
  (a, b) => b.length - a.length,
);

export function expandCodebookSymbols(s) {
  let result = String(s || '');
  for (const sym of SYMBOLS_LONGEST_FIRST) {
    const full = SYMBOL_TO_FULL[sym];
    if (full && result.includes(sym)) {
      result = result.split(sym).join(full);
    }
  }
  return result;
}

export function fixAsteriskShorthandParams(s) {
  return String(s || '').replace(/\*([A-Za-z_$][\w$]*)/g, (match, name, offset) => {
    const before = String(s).slice(Math.max(0, offset - 9), offset);
    if (/function\s*$/.test(before)) return match;
    return name;
  });
}

export function normalizeBuilderCodegenOutput(content) {
  return fixAsteriskShorthandParams(expandCodebookSymbols(content));
}
