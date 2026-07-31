/**
 * SYNOPSIS: Exports ensureInterpretiveAdaptation — services/interpretiveAdaptation.js.
 */
export function ensureInterpretiveAdaptation(output, source, traditionLens, interpretiveNotes) {
  return {
    ...output,
    source,
    traditionLens,
    interpretiveNotes,
  };
}

export function applySourceLabels(output, source) {
  return {
    ...output,
    source,
  };
}

export function applyTraditionLens(output, traditionLens) {
  return {
    ...output,
    traditionLens,
  };
}