/**
 * SYNOPSIS: services/envDiffService.js
 */
// services/envDiffService.js

function generateEnvDiffReceipt(oldEnv, newEnv) {
  const diffReceipt = [];
  const allKeys = new Set([...Object.keys(oldEnv), ...Object.keys(newEnv)]);

  allKeys.forEach((key) => {
    if (oldEnv[key] !== newEnv[key]) {
      diffReceipt.push({ name: key, oldValue: oldEnv[key], newValue: newEnv[key] });
    }
  });

  return diffReceipt;
}

export { generateEnvDiffReceipt };
