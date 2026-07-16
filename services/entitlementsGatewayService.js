/**
 * SYNOPSIS: Existing code
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
// Existing code
// Assume there are other utility functions and imports above

export function checkEntitlements(userId, featureKey, entitlements) {
  const userEntitlements = entitlements[userId];

  if (!userEntitlements) {
    return false;
  }

  return userEntitlements.includes(featureKey);
}

// Other existing exports and code below