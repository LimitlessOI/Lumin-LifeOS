/**
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: services/envDiffService.js
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

export { generateEnvDiffReceipt };