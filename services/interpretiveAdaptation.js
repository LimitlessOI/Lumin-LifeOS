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