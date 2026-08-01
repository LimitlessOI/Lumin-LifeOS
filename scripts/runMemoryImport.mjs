/**
 * SYNOPSIS: Exports triggerRunMemoryImport — scripts/runMemoryImport.mjs.
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */

// Trigger for the run-memory-import / import-dumps-to-twin pipeline.
export function triggerRunMemoryImport() {
  return { ok: true, message: 'run-memory-import / import-dumps-to-twin trigger' };
}
