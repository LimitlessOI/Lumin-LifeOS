/**
 * middleware/lifeos-auth-middleware.js
 *
 * LifeOS per-user authentication middleware.
 * Reads JWT from Authorization: Bearer header OR x-lifeos-token header.
 * Falls back to x-command-key for internal/legacy routes via requireKey.
 *
 * Usage:
 *   router.get('/me', requireLifeOSUser, handler)            — any authenticated user
 *   router.post('/invite', requireLifeOSUser, requireLifeOSAdmin, handler)  — admin only
 *
 * req.lifeosUser shape after passing:
 *   { sub: <user_id string>, handle: <user_handle>, role: 'admin'|'member', tier: 'free'|'core'|'premium'|'family' }
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { verifyToken } from '../services/lifeos-auth.js';

/**
 * Require a valid LifeOS JWT. Attaches req.lifeosUser on success.
 */
export function requireLifeOSUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const altHeader  = req.headers['x-lifeos-token'] || '';
  const raw = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : altHeader.trim();

  if (!raw) {
    return res.status(401).json({
      ok: false,
      error: 'Login required',
      redirect: '/overlay/lifeos-login.html',
    });
  }

  try {
    req.lifeosUser = verifyToken(raw);
    next();
  } catch (e) {
    return res.status(401).json({
      ok: false,
      error: e.message,
      redirect: '/overlay/lifeos-login.html',
    });
  }
}

/**
 * Require admin role. Must be used AFTER requireLifeOSUser.
 */
export function requireLifeOSAdmin(req, res, next) {
  if (!req.lifeosUser) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }
  if (req.lifeosUser.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Admin access required' });
  }
  next();
}

/**
 * Optional auth — attaches req.lifeosUser if token is present and valid,
 * but never blocks the request. Useful for routes that serve both
 * authenticated and anonymous users with different data.
 */
export function optionalLifeOSUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const altHeader  = req.headers['x-lifeos-token'] || '';
  const raw = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : altHeader.trim();
  if (raw) {
    try { req.lifeosUser = verifyToken(raw); } catch { /* ignore */ }
  }
  next();
}
