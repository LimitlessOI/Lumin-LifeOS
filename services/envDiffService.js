/**
 * SYNOPSIS: Exports generateEnvDiffReceipt — services/envDiffService.js.
 */
export function generateEnvDiffReceipt(oldEnv, newEnv) {
  const receipt = {
    renamed: {},
    added: {},
    removed: {},
    changed: {},
    unchanged: {},
  };

  const oldKeys = new Set(Object.keys(oldEnv));
  const newKeys = new Set(Object.keys(newEnv));

  // Identify keys that exist in oldEnv but not in newEnv (potential renames from or removals)
  const removedKeys = [...oldKeys].filter(key => !newKeys.has(key));

  // Identify keys that exist in newEnv but not in oldEnv (potential renames to or additions)
  const addedKeys = [...newKeys].filter(key => !oldKeys.has(key));

  // Identify keys that exist in both
  const commonKeys = [...oldKeys].filter(key => newKeys.has(key));

  // Simple heuristic for renames: a removed key's value now exists under an added key
  // This is a basic approach and might not catch all complex rename scenarios.
  // For a more robust solution, a fuzzy matching or edit distance algorithm might be needed.
  const unmatchedAddedKeys = [...addedKeys]; // Create a mutable copy for matching
  for (const removedKey of removedKeys) {
    const oldValue = oldEnv[removedKey];
    let matched = false;
    for (let i = 0; i < unmatchedAddedKeys.length; i++) {
      const addedKey = unmatchedAddedKeys[i];
      const newValue = newEnv[addedKey];
      if (oldValue === newValue) {
        receipt.renamed[removedKey] = addedKey;
        unmatchedAddedKeys.splice(i, 1); // Remove from unmatchedAddedKeys
        matched = true;
        break; // Assume one-to-one rename for simplicity
      }
    }
    if (!matched) {
      receipt.removed[removedKey] = oldValue;
    }
  }

  // Any remaining keys in unmatchedAddedKeys are truly added
  for (const key of unmatchedAddedKeys) {
    receipt.added[key] = newEnv[key];
  }

  // Identify changed and unchanged common keys
  for (const key of commonKeys) {
    if (oldEnv[key] !== newEnv[key]) {
      receipt.changed[key] = {
        oldValue: oldEnv[key],
        newValue: newEnv[key],
      };
    } else {
      receipt.unchanged[key] = oldEnv[key];
    }
  }

  return receipt;
}