/**
 * SYNOPSIS: routes/lifeos-auth-routes.js
 * routes/lifeos-auth-routes.js
 *
 * LifeOS Authentication API
 * Mounted at /api/v1/lifeos/auth
 *
 * Public endpoints (no auth required):
 *   POST /api/v1/lifeos/auth/register       — create account with invite code
 *   POST /api/v1/lifeos/auth/login          — email + password → access + refresh tokens
 *   POST /api/v1/lifeos/auth/refresh        — refresh token → new access token
 *   POST /api/v1/lifeos/auth/logout         — revoke refresh token
 *   POST /api/v1/lifeos/auth/set-password   — set/change password for a handle
 *
 * Authenticated endpoints (requireLifeOSUser):
 *   GET  /api/v1/lifeos/auth/me             — current user info
 *
 * Admin-only endpoints (requireLifeOSUser + role=admin):
 *   POST /api/v1/lifeos/auth/invite         — generate new invite code; response `invite.signup_url` when `PUBLIC_BASE_URL` or proxy Host is known
 *   GET  /api/v1/lifeos/auth/invites        — list invites; each unused row includes `signup_url` (same origin rules)
 *
 * Operator endpoints (requireKey — Adam's admin key, NOT member login):
 *   POST /api/v1/lifeos/auth/operator/invite           — create invite for Sherry / new members
 *   POST /api/v1/lifeos/auth/operator/provision-member — create member account + optional household link
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import express from 'express';
import { createLifeOSAuth } from '../services/lifeos-auth.js';
import { requireLifeOSUser, requireLifeOSAdmin, createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';
import { createHouseholdSync } from '../services/household-sync.js';

const ACCESS_COOKIE_NAME = 'lifeos_access_token';
const ACCESS_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Absolute web origin for invite links (Railway / prod). */
function publicWebOrigin(req) {
  const env = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (env) return env;
  const xfProto = (req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  const proto = xfProto || req.protocol || 'https';
  if (!host) return '';
  return `${proto}://${host}`;
}

function setAccessCookie(res, accessToken) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearAccessCookie(res) {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function signupUrlForCode(req, code) {
  if (!code) return '';
  const path = `/overlay/lifeos-login.html?invite=${encodeURIComponent(code)}`;
  const origin = publicWebOrigin(req);
  return origin ? `${origin}${path}` : path;
}

export function createLifeOSAuthRoutes({ pool, logger, requireKey }) {
  const router = express.Router();
  const log    = logger || console;
  const auth   = createLifeOSAuth(pool);
  const householdSvc = createHouseholdSync({ pool });
  const requireUserOrKey = createRequireLifeOSUserOrKey(requireKey);

  // ── Register ────────────────────────────────────────────────────────────────
  router.post('/register', async (req, res) => {
    try {
      const { email, password, handle, displayName, inviteCode } = req.body;
      const result = await auth.register({
        email, password, handle, displayName, inviteCode,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      log.info({ handle: result.user.user_handle }, '[LIFEOS-AUTH] user registered');
      setAccessCookie(res, result.accessToken);
      res.json({
        ok: true,
        user: result.user,
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
    } catch (e) {
      log.warn({ err: e.message }, '[LIFEOS-AUTH] register failed');
      res.status(e.status || 500).json({ ok: false, error: e.message });
    }
  });

  // ── Login ───────────────────────────────────────────────────────────────────
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await auth.login({
        email, password,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      log.info({ handle: result.user.user_handle }, '[LIFEOS-AUTH] login');
      setAccessCookie(res, result.accessToken);
      res.json({
        ok: true,
        user: result.user,
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
    } catch (e) {
      log.warn({ err: e.message }, '[LIFEOS-AUTH] login failed');
      res.status(e.status || 500).json({ ok: false, error: e.message });
    }
  });

  // ── Refresh ─────────────────────────────────────────────────────────────────
  router.post('/refresh', async (req, res) => {
    try {
      const raw = req.body.refresh_token || req.headers['x-refresh-token'];
      const result = await auth.refresh(raw);
      setAccessCookie(res, result.accessToken);
      res.json({ ok: true, access_token: result.accessToken, user: result.user });
    } catch (e) {
      res.status(e.status || 401).json({ ok: false, error: e.message });
    }
  });

  // ── Logout ──────────────────────────────────────────────────────────────────
  router.post('/logout', async (req, res) => {
    try {
      const raw = req.body.refresh_token || req.headers['x-refresh-token'];
      await auth.logout(raw);
      clearAccessCookie(res);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ── Set / change password (admin bootstrap + user self-service) ──────────────
  router.post('/set-password', async (req, res) => {
    try {
      const { handle, newPassword, currentPassword } = req.body;
      if (!handle || !newPassword) {
        return res.status(400).json({ ok: false, error: 'handle and newPassword required' });
      }
      const result = await auth.setAdminPassword({ handle, newPassword, currentPassword: currentPassword || null });
      res.json(result);
    } catch (e) {
      res.status(e.status || 500).json({ ok: false, error: e.message });
    }
  });

  // ── Me ──────────────────────────────────────────────────────────────────────
  router.get('/me', requireUserOrKey, async (req, res) => {
    try {
      const isCommandKeyFallback = req.auth_mode === 'command_key_fallback'
        || String(req.lifeosUser?.sub || '') === 'emergency-key';
      const isHandleOnlyJwt = !isCommandKeyFallback && !req.lifeosUser?.sub && req.lifeosUser?.handle;
      const query = (isCommandKeyFallback || isHandleOnlyJwt)
        ? `SELECT id, user_handle, display_name, email, role, tier, timezone,
                  be_statement, do_statement, have_vision, truth_style, last_login_at
             FROM lifeos_users
            WHERE LOWER(user_handle) = LOWER($1)
            LIMIT 1`
        : `SELECT id, user_handle, display_name, email, role, tier, timezone,
                  be_statement, do_statement, have_vision, truth_style, last_login_at
             FROM lifeos_users
            WHERE id = $1`;
      const queryArg = (isCommandKeyFallback || isHandleOnlyJwt)
        ? (req.lifeosUser?.handle || 'adam')
        : req.lifeosUser.sub;
      const { rows } = await pool.query(query, [queryArg]);
      if (!rows.length) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({
        ok: true,
        user: rows[0],
        auth_mode: req.auth_mode || 'account_jwt',
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ── Create invite (admin) ───────────────────────────────────────────────────
  router.post('/invite', requireLifeOSUser, requireLifeOSAdmin, async (req, res) => {
    try {
      const { role = 'member', tier = 'core', email = null, days = 30 } = req.body;
      const invite = await auth.createInvite({
        role, tier, email,
        days: Math.min(Math.max(parseInt(days) || 30, 1), 365),
        createdBy: req.lifeosUser.sub,
      });
      const signup_url = signupUrlForCode(req, invite.code);
      log.info({ code: invite.code }, '[LIFEOS-AUTH] invite created');
      res.json({ ok: true, invite: { ...invite, signup_url } });
    } catch (e) {
      res.status(e.status || 500).json({ ok: false, error: e.message });
    }
  });

  // ── List invites (admin) ────────────────────────────────────────────────────
  router.get('/invites', requireLifeOSUser, requireLifeOSAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT i.id, i.code, i.role, i.tier, i.email,
                i.used_at, i.expires_at, i.created_at,
                u.user_handle AS used_by_handle
         FROM lifeos_invites i
         LEFT JOIN lifeos_users u ON u.id = i.used_by
         ORDER BY i.created_at DESC`
      );
      const invites = rows.map((row) => ({
        ...row,
        signup_url: row.used_at ? '' : signupUrlForCode(req, row.code),
      }));
      res.json({ ok: true, invites });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  async function resolveAdamId() {
    const { rows } = await pool.query(
      `SELECT id FROM lifeos_users WHERE LOWER(user_handle) = 'adam' LIMIT 1`
    );
    return rows[0]?.id || null;
  }

  // ── Operator: create invite (command key — for provisioning family members) ─
  if (requireKey) {
    router.post('/operator/invite', requireKey, async (req, res) => {
      try {
        const { role = 'member', tier = 'premium', email = null, days = 90, label = 'member' } = req.body || {};
        const adamId = await resolveAdamId();
        if (!adamId) return res.status(503).json({ ok: false, error: 'adam user row missing' });
        const invite = await auth.createInvite({
          role,
          tier,
          email,
          days: Math.min(Math.max(parseInt(days, 10) || 90, 1), 365),
          createdBy: adamId,
        });
        const signup_url = signupUrlForCode(req, invite.code);
        log.info({ code: invite.code, tier }, '[LIFEOS-AUTH] operator invite created');
        res.json({
          ok: true,
          invite: { ...invite, signup_url },
          note: 'Member uses signup URL with their own email + password — not COMMAND_CENTER_KEY.',
        });
      } catch (e) {
        res.status(e.status || 500).json({ ok: false, error: e.message });
      }
    });

    router.post('/operator/provision-member', requireKey, async (req, res) => {
      try {
        const {
          handle,
          email,
          password,
          displayName,
          display_name,
          role = 'member',
          tier = 'premium',
          link_adam = true,
        } = req.body || {};
        if (!handle || !email || !password) {
          return res.status(400).json({ ok: false, error: 'handle, email, and password required' });
        }
        const result = await auth.register({
          email,
          password,
          handle,
          displayName: display_name || displayName || handle,
          inviteCode: (await auth.createInvite({
            role,
            tier,
            email,
            days: 1,
            createdBy: await resolveAdamId(),
          })).code,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        });
        let link = null;
        if (link_adam) {
          const adamId = await resolveAdamId();
          if (adamId) {
            link = await householdSvc.linkUsers({
              userIdA: Math.min(Number(adamId), Number(result.user.id)),
              userIdB: Math.max(Number(adamId), Number(result.user.id)),
              relationship: 'partner',
            });
          }
        }
        res.json({
          ok: true,
          user: result.user,
          household_link: link,
          login_url: `${publicWebOrigin(req) || ''}/overlay/lifeos-login.html`,
          note: 'Sherry signs in with email + password on the Login tab.',
        });
      } catch (e) {
        res.status(e.status || 500).json({ ok: false, error: e.message });
      }
    });
  }

  return router;
}
