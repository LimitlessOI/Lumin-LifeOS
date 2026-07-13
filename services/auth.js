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

export default {
  requireAuth,
  ensureAuth,
  authRequired,
};