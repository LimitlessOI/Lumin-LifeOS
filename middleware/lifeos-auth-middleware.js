/**
 * SYNOPSIS: middleware/lifeos-auth-middleware.js
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
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { verifyToken } from '../services/lifeos-auth.js';

function readCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  if (!raw) return '';
  const pairs = raw.split(';');
  for (const pair of pairs) {
    const [k, ...rest] = pair.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('=') || '');
  }
  return '';
}

/**
 * Require a valid LifeOS JWT. Attaches req.lifeosUser on success.
 * Tries Bearer, x-lifeos-token, then httpOnly cookie — skips expired candidates.
 */
export function requireLifeOSUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const altHeader  = req.headers['x-lifeos-token'] || '';
  const cookieTok  = readCookie(req, 'lifeos_access_token');
  const candidates = [];
  if (authHeader.startsWith('Bearer ')) candidates.push(authHeader.slice(7).trim());
  if (altHeader.trim()) candidates.push(altHeader.trim());
  if (cookieTok) candidates.push(cookieTok);

  if (!candidates.length) {
    return res.status(401).json({
      ok: false,
      error: 'Login required',
      redirect: '/overlay/lifeos-login.html',
    });
  }

  let lastErr = null;
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      req.lifeosUser = verifyToken(raw);
      return next();
    } catch (e) {
      lastErr = e;
    }
  }

  return res.status(401).json({
    ok: false,
    error: lastErr?.message || 'Invalid token',
    redirect: '/overlay/lifeos-login.html',
  });
}

/**
 * Require admin role. Must be used AFTER requireLifeOSUser.
 */
export function requireLifeOSAdmin(req, res, next) {
  if (!req.lifeosUser) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }
  if (!['admin', 'founder_admin'].includes(String(req.lifeosUser.role || '').toLowerCase())) {
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
  const candidates = collectAccessTokenCandidates(req);
  for (const raw of candidates) {
    try {
      req.lifeosUser = verifyToken(raw);
      break;
    } catch { /* try next candidate */ }
  }
  next();
}

function collectAccessTokenCandidates(req) {
  const authHeader = req.headers.authorization || '';
  const altHeader  = req.headers['x-lifeos-token'] || '';
  const cookieTok  = readCookie(req, 'lifeos_access_token');
  const candidates = [];
  if (authHeader.startsWith('Bearer ')) candidates.push(authHeader.slice(7).trim());
  if (altHeader.trim()) candidates.push(altHeader.trim());
  if (cookieTok) candidates.push(cookieTok);
  return candidates;
}

/**
 * JWT account login OR legacy command key — for routes founders hit from the app shell.
 */
export function createRequireLifeOSUserOrKey(requireKey) {
  return function requireLifeOSUserOrKey(req, res, next) {
    const candidates = collectAccessTokenCandidates(req);
    for (const raw of candidates) {
      try {
        req.lifeosUser = verifyToken(raw);
        req.auth_mode = 'account_jwt';
        return next();
      } catch { /* fall through to command key */ }
    }
    if (typeof requireKey === 'function') {
      return requireKey(req, res, () => {
        req.auth_mode = 'command_key_fallback';
        req.lifeosUser = req.lifeosUser || {
          sub: 'emergency-key',
          handle: 'adam',
          role: 'founder_admin',
        };
        next();
      });
    }
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  };
}
