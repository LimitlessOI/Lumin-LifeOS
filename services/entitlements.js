/**
 * SYNOPSIS: Service module — Entitlements.
 */
const projectEntitlements = {
  featureA: ['basic', 'premium'],
  featureB: ['premium'],
  featureC: ['enterprise']
};

function checkEntitlements(userEntitlement, feature) {
  const allowedEntitlements = projectEntitlements[feature] || [];
  return allowedEntitlements.includes(userEntitlement);
}

export { checkEntitlements };
