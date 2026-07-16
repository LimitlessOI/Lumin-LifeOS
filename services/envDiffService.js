/**
 * SYNOPSIS: services/envDiffService.js
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
// services/envDiffService.js

function generateEnvDiffReceipt(oldEnv, newEnv) {
  const diffReceipt = [];
  const allKeys = new Set([...Object.keys(oldEnv), ...Object.keys(newEnv)]);

  allKeys.forEach((key) => {
    if (oldEnv[key] !== newEnv[key]) {
      diffReceipt.push({ name: key });
    }
  });

  return diffReceipt;
}

function detectEnvNameChanges(oldEnv, newEnv) {
  const nameChanges = [];
  const allKeys = new Set([...Object.keys(oldEnv), ...Object.keys(newEnv)]);

  allKeys.forEach((key) => {
    if (oldEnv[key] !== undefined && newEnv[key] !== undefined && oldEnv[key] !== newEnv[key]) {
      nameChanges.push(key);
    }
  });

  return nameChanges;
}

export { generateEnvDiffReceipt, detectEnvNameChanges };
