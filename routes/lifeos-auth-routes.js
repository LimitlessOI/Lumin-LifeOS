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
 *   POST /api/v1/lifeos/auth/set-password   — authenticated self-service or operator password change
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
 *   POST /api/v1/lifeos/auth/operator/provision-alpha-auditor — founder-level test account from Railway vault creds
 *   POST /api/v1/lifeos/auth/operator/sync-founder-login — sync adam founder email+password from LIFEOS_FOUNDER_LOGIN_* vault
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import express from 'express';
import { createLifeOSAuth, hashPassword } from '../services/lifeos-auth.js';
import { requireLifeOSUser, requireLifeOSAdmin, createRequireLifeOSUserOrKey } from '../middleware/lifeos-auth-middleware.js';
import { createHouseholdSync } from '../services/household-sync.js';

const ACCESS_COOKIE_NAME = 'lifeos_access_token';
const ACCESS_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PASSWORD_OPERATOR_ROLES = new Set(['founder_admin', 'operator', 'admin']);

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

function normalizeHandle(value) {
  return String(value || '').trim().toLowerCase();
}

export function canSetPasswordForHandle({ authMode = '', lifeosUser = null, targetHandle = '' } = {}) {
  const requestedHandle = normalizeHandle(targetHandle);
  const userHandle = normalizeHandle(lifeosUser?.handle);
  const role = String(lifeosUser?.role || '').toLowerCase();

  if (!requestedHandle) return false;
  if (authMode === 'command_key_fallback' || String(lifeosUser?.sub || '') === 'emergency-key') return true;
  if (PASSWORD_OPERATOR_ROLES.has(role)) return true;
  return Boolean(userHandle && userHandle === requestedHandle);
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

  // ── Set / change password (operator bootstrap + user self-service) ───────────
  router.post('/set-password', requireUserOrKey, async (req, res) => {
    try {
      const { handle, newPassword, currentPassword } = req.body;
      if (!handle || !newPassword) {
        return res.status(400).json({ ok: false, error: 'handle and newPassword required' });
      }
      if (!canSetPasswordForHandle({
        authMode: req.auth_mode,
        lifeosUser: req.lifeosUser,
        targetHandle: handle,
      })) {
        return res.status(403).json({ ok: false, error: 'Cannot set password for another user' });
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

  async function resolveAdamId() {
    const { rows } = await pool.query(
      `SELECT id FROM lifeos_users WHERE LOWER(user_handle) = 'adam' LIMIT 1`
    );
    return rows[0]?.id || null;
  }

  function isValidTestEmail(email) {
    const e = String(email || '').trim();
    if (!e || e === 'null' || e === 'undefined') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function resolveFounderLoginCreds() {
    const pairs = [
      ['LIFEOS_FOUNDER_LOGIN_EMAIL', 'LIFEOS_FOUNDER_LOGIN_PASSWORD'],
      ['WORK_EMAIL', 'WORK_EMAIL_APP_PASSWORD'],
    ];
    for (const [emailKey, passKey] of pairs) {
      const email = String(process.env[emailKey] || '').trim();
      const password = String(process.env[passKey] || '');
      if (isValidTestEmail(email) && password.length >= 8) {
        return { email, password, source: `${emailKey}+${passKey}` };
      }
    }
    return null;
  }

  function diagnoseFounderLoginCreds() {
    const pairs = [
      ['LIFEOS_FOUNDER_LOGIN_EMAIL', 'LIFEOS_FOUNDER_LOGIN_PASSWORD'],
      ['WORK_EMAIL', 'WORK_EMAIL_APP_PASSWORD'],
    ];
    return pairs.map(([emailKey, passKey]) => {
      const email = String(process.env[emailKey] || '').trim();
      const password = String(process.env[passKey] || '');
      return {
        pair: `${emailKey}+${passKey}`,
        email_set: Boolean(email),
        email_valid: isValidTestEmail(email),
        password_set: Boolean(password),
        password_len_ok: password.length >= 8,
      };
    });
  }

  function resolveAlphaAuditorCreds() {
    const pairs = [
      ['ALPHA_TEST_EMAIL', 'ALPHA_TEST_PASSWORD'],
      ['GMAIL_SIGNUP_EMAIL', 'GMAIL_SIGNUP_APP_PASSWORD'],
      ['WORK_EMAIL', 'WORK_EMAIL_APP_PASSWORD'],
    ];
    for (const [emailKey, passKey] of pairs) {
      const email = String(process.env[emailKey] || '').trim();
      const password = String(process.env[passKey] || '');
      if (isValidTestEmail(email) && password.length >= 8) {
        return { email, password, source: `${emailKey}+${passKey}` };
      }
    }
    return null;
  }

  function diagnoseAlphaAuditorCreds() {
    const pairs = [
      ['ALPHA_TEST_EMAIL', 'ALPHA_TEST_PASSWORD'],
      ['GMAIL_SIGNUP_EMAIL', 'GMAIL_SIGNUP_APP_PASSWORD'],
      ['WORK_EMAIL', 'WORK_EMAIL_APP_PASSWORD'],
    ];
    return pairs.map(([emailKey, passKey]) => {
      const email = String(process.env[emailKey] || '').trim();
      const password = String(process.env[passKey] || '');
      return {
        pair: `${emailKey}+${passKey}`,
        email_set: Boolean(email),
        email_valid: isValidTestEmail(email),
        password_set: Boolean(password),
        password_len_ok: password.length >= 8,
      };
    });
  }

  if (requireKey) {
    router.get('/operator/founder-chat-health', requireKey, async (req, res) => {
      const started = Date.now();
      const creds = resolveFounderLoginCreds();
      const cred_diagnosis = diagnoseFounderLoginCreds();
      let login_probe = null;
      if (creds) {
        try {
          const loginResult = await auth.login({
            email: creds.email,
            password: creds.password,
            userAgent: 'operator-founder-chat-health',
            ip: req.ip,
          });
          login_probe = {
            ok: true,
            handle: loginResult.user.user_handle,
            email: loginResult.user.email,
            role: loginResult.user.role,
          };
        } catch (e) {
          login_probe = { ok: false, error: e.message };
        }
      }
      const { rows: adamRow } = await pool.query(
        `SELECT user_handle, email, role, active FROM lifeos_users WHERE LOWER(user_handle) = 'adam' LIMIT 1`
      ).catch(() => ({ rows: [] }));
      const adam = adamRow[0] || null;
      const commandKeyFallbackOk =
        !login_probe?.ok &&
        !!process.env.COMMAND_CENTER_KEY &&
        adam?.active === true &&
        ['founder_admin', 'admin'].includes(String(adam?.role || '').toLowerCase());
      const ok = login_probe?.ok === true || commandKeyFallbackOk;
      const roleSource = login_probe?.role || adam?.role || null;
      res.json({
        ok,
        duration_ms: Date.now() - started,
        cred_source: creds?.source || null,
        cred_diagnosis,
        login_probe: commandKeyFallbackOk
          ? {
              ok: true,
              auth_mode: 'command_key_fallback',
              handle: adam?.user_handle || 'adam',
              email: adam?.email || null,
              role: adam?.role || null,
            }
          : login_probe,
        db_adam: adam,
        blockers: [
          ...(ok ? [] : ['founder_login_sync_required']),
          ...(creds || commandKeyFallbackOk ? [] : ['LIFEOS_FOUNDER_LOGIN_* missing in Railway env']),
          ...(ok && roleSource && !['founder_admin', 'admin'].includes(String(roleSource).toLowerCase()) ? ['role_cannot_execute'] : []),
        ],
        fix: commandKeyFallbackOk
          ? 'Founder chat health is satisfied through command-key fallback for local/operator execution.'
          : 'Set LIFEOS_FOUNDER_LOGIN_EMAIL=adam@hopkinsgroup.org + LIFEOS_FOUNDER_LOGIN_PASSWORD in Railway, redeploy, POST /operator/sync-founder-login',
      });
    });
  }

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

    router.post('/operator/sync-founder-login', requireKey, async (req, res) => {
      const opStarted = Date.now();
      const task_id = `founder-login-sync-${opStarted}`;
      try {
        await pool.query(
          `INSERT INTO system_operation_log (task_id, operation, source, status, started_at, metadata)
           VALUES ($1, 'sync_founder_login', 'lifeos-auth', 'running', NOW(), $2)`,
          [task_id, JSON.stringify({ route: '/operator/sync-founder-login' })]
        ).catch(() => {});
        const creds = resolveFounderLoginCreds();
        if (!creds) {
          await pool.query(
            `UPDATE system_operation_log SET status = 'failed', ended_at = NOW(),
             metadata = metadata || $2::jsonb
             WHERE task_id = $1 AND status = 'running'`,
            [task_id, JSON.stringify({ error: 'founder_login_creds_missing' })]
          ).catch(() => {});
          return res.status(503).json({
            ok: false,
            error: 'No founder login creds in server env (expected LIFEOS_FOUNDER_LOGIN_EMAIL + LIFEOS_FOUNDER_LOGIN_PASSWORD)',
            cred_diagnosis: diagnoseFounderLoginCreds(),
            note: 'GMAIL_SIGNUP_* is the system lumea mailbox — do not use it for your LifeOS sign-in.',
            task_id,
            duration_ms: Date.now() - opStarted,
          });
        }
        const handle = String(process.env.LIFEOS_FOUNDER_LOGIN_HANDLE || 'adam').trim().toLowerCase();
        const { rows: existing } = await pool.query(
          `SELECT id, user_handle, email, role, tier, display_name FROM lifeos_users
           WHERE LOWER(user_handle) = LOWER($1)
           LIMIT 1`,
          [handle]
        );
        if (!existing.length) {
          return res.status(404).json({ ok: false, error: `founder handle not found: ${handle}` });
        }
        const phash = hashPassword(creds.password);
        const { rows: [user] } = await pool.query(
          `UPDATE lifeos_users
           SET password_hash = $1, email = LOWER($2), active = TRUE
           WHERE id = $3
           RETURNING id, user_handle, display_name, email, role, tier`,
          [phash, creds.email.trim(), existing[0].id]
        );
        log.info({ handle: user.user_handle, email: user.email }, '[LIFEOS-AUTH] founder login synced from vault');

        let login_probe = null;
        try {
          const loginResult = await auth.login({
            email: creds.email,
            password: creds.password,
            userAgent: 'operator-sync-founder-login',
            ip: req.ip,
          });
          login_probe = { ok: true, handle: loginResult.user.user_handle };
        } catch (e) {
          login_probe = { ok: false, error: e.message };
        }

        res.json({
          ok: login_probe?.ok === true,
          user,
          cred_source: creds.source,
          login_probe,
          task_id,
          duration_ms: Date.now() - opStarted,
          login_url: `${publicWebOrigin(req) || ''}/overlay/lifeos-login.html?next=${encodeURIComponent('/overlay/lifeos-app.html?direct_system=1')}`,
          note: 'Founder account email+password synced from LIFEOS_FOUNDER_LOGIN_* — sign in on Login tab, not COMMAND_CENTER_KEY.',
        });
        await pool.query(
          `UPDATE system_operation_log SET status = $2, ended_at = NOW(),
           metadata = metadata || $3::jsonb
           WHERE task_id = $1 AND status = 'running'`,
          [
            task_id,
            login_probe?.ok ? 'ok' : 'failed',
            JSON.stringify({ email: user.email, login_probe }),
          ]
        ).catch(() => {});
      } catch (e) {
        await pool.query(
          `UPDATE system_operation_log SET status = 'failed', ended_at = NOW(),
           metadata = metadata || $2::jsonb
           WHERE task_id = $1 AND status = 'running'`,
          [task_id, JSON.stringify({ error: e.message })]
        ).catch(() => {});
        res.status(e.status || 500).json({ ok: false, error: e.message, task_id, duration_ms: Date.now() - opStarted });
      }
    });

    router.post('/operator/provision-alpha-auditor', requireKey, async (req, res) => {
      try {
        const creds = resolveAlphaAuditorCreds();
        if (!creds) {
          return res.status(503).json({
            ok: false,
            error: 'No alpha auditor creds in server env (expected GMAIL_SIGNUP_* or ALPHA_TEST_*)',
            cred_diagnosis: diagnoseAlphaAuditorCreds(),
          });
        }
        const handle = String(process.env.ALPHA_TEST_HANDLE || 'alpha-auditor').trim().toLowerCase();
        const displayName = String(process.env.ALPHA_TEST_DISPLAY_NAME || 'Alpha Auditor').trim();
        const role = 'founder_admin';
        const tier = 'premium';

        const { rows: existing } = await pool.query(
          `SELECT id, user_handle, email, role, tier FROM lifeos_users
           WHERE LOWER(user_handle) = LOWER($1) OR email = LOWER($2)`,
          [handle, creds.email]
        );

        if (existing.length) {
          const phash = hashPassword(creds.password);
          const { rows: [user] } = await pool.query(
            `UPDATE lifeos_users
             SET password_hash = $1, role = $2, tier = $3, active = TRUE, display_name = $4, email = LOWER($5)
             WHERE id = $6
             RETURNING id, user_handle, display_name, email, role, tier`,
            [phash, role, tier, displayName, creds.email.trim(), existing[0].id]
          );
          log.info({ handle: user.user_handle, role }, '[LIFEOS-AUTH] alpha auditor upgraded');
          return res.json({
            ok: true,
            mode: 'updated',
            user,
            cred_source: creds.source,
            login_url: `${publicWebOrigin(req) || ''}/overlay/lifeos-login.html?next=${encodeURIComponent('/lifeos?direct_system=1')}`,
            note: 'Founder-level test account — same build authority as adam. Disable after alpha.',
          });
        }

        const adamId = await resolveAdamId();
        if (!adamId) return res.status(503).json({ ok: false, error: 'adam user row missing' });

        const result = await auth.register({
          email: creds.email,
          password: creds.password,
          handle,
          displayName,
          inviteCode: (await auth.createInvite({
            role,
            tier,
            email: creds.email,
            days: 1,
            createdBy: adamId,
          })).code,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        });
        log.info({ handle: result.user.user_handle, role }, '[LIFEOS-AUTH] alpha auditor provisioned');
        res.json({
          ok: true,
          mode: 'created',
          user: result.user,
          cred_source: creds.source,
          login_url: `${publicWebOrigin(req) || ''}/overlay/lifeos-login.html?next=${encodeURIComponent('/lifeos?direct_system=1')}`,
          note: 'Founder-level test account — sign in with vault email + password, not COMMAND_CENTER_KEY.',
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
