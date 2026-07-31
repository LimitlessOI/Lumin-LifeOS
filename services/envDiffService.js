/**
 * SYNOPSIS: Exports generateEnvDiffReceipt — services/envDiffService.js.
 */
export function generateEnvDiffReceipt(oldEnv, newEnv) {
  const receipt = {
    renamed: {},
  };

  const oldKeys = new Set(Object.keys(oldEnv));
  const newKeys = new Set(Object.keys(newEnv));

  // Identify keys that exist in oldEnv but not in newEnv (potential renames from)
  const removedKeys = [...oldKeys].filter(key => !newKeys.has(key));

  // Identify keys that exist in newEnv but not in oldEnv (potential renames to)
  const addedKeys = [...newKeys].filter(key => !oldKeys.has(key));

  // Simple heuristic for renames: a removed key's value now exists under an added key
  // This is a basic approach and might not catch all complex rename scenarios.
  // For a more robust solution, a fuzzy matching or edit distance algorithm might be needed.
  for (const removedKey of removedKeys) {
    const oldValue = oldEnv[removedKey];
    for (const addedKey of addedKeys) {
      const newValue = newEnv[addedKey];
      if (oldValue === newValue) {
        receipt.renamed[removedKey] = addedKey;
        // Remove from addedKeys to avoid re-matching
        addedKeys.splice(addedKeys.indexOf(addedKey), 1);
        break; // Assume one-to-one rename for simplicity
      }
    }
  }

  return receipt;
}