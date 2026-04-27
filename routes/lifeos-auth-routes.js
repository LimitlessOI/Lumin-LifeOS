/**
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
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSAuth } from '../services/lifeos-auth.js';
import { requireLifeOSUser, requireLifeOSAdmin } from '../middleware/lifeos-auth-middleware.js';

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

function signupUrlForCode(req, code) {
  if (!code) return '';
  const path = `/overlay/lifeos-login.html?invite=${encodeURIComponent(code)}`;
  const origin = publicWebOrigin(req);
  return origin ? `${origin}${path}` : path;
}

export function createLifeOSAuthRoutes({ pool, logger }) {
  const router = express.Router();
  const log    = logger || console;
  const auth   = createLifeOSAuth(pool);

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
  router.get('/me', requireLifeOSUser, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, user_handle, display_name, email, role, tier, timezone,
                be_statement, do_statement, have_vision, truth_style, last_login_at
         FROM lifeos_users WHERE id = $1`,
        [req.lifeosUser.sub]
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, user: rows[0] });
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

  return router;
}
