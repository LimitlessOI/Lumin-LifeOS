/**
 * SYNOPSIS: Exports checkCiGuard — services/ciGuard.js.
 */
export function checkCiGuard(userRole) {
  const allowedRoles = ['admin', 'councilMember'];
  return allowedRoles.includes(userRole);
}

export const ciGuardService = {
  applyGuard(userRole) {
    if (!checkCiGuard(userRole)) {
      throw new Error('Access denied: User does not have the necessary permissions.');
    }
    // Logic to apply guard against bypassing council metered path
  }
};