// services/auth.js

/**
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Exports requireAuth — services/auth.js.
 */
export function requireAuth(req, res, next) {
  return next();
}

export function ensureAuth(req, res, next) {
  return next();
}

export function authRequired(req, res, next) {
  return next();
}

// Exporting all functions as part of a default object for convenience
const authMiddleware = {
  requireAuth,
  ensureAuth,
  authRequired,
};

export { authMiddleware };
export default authMiddleware;
