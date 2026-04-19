/**
 * services/lifeos-auth.js
 *
 * LifeOS Authentication Service
 * JWT-based auth using Node built-in crypto — no extra dependencies.
 *
 * Tokens:
 *   Access token  — short-lived (15 min), sent as Authorization: Bearer header
 *   Refresh token — long-lived (30 days), stored in DB session table; used to re-issue access tokens
 *
 * Password storage: scrypt (CPU-hard, Node built-in) with random salt.
 * JWT signing: HMAC-SHA256 over base64url-encoded header.payload.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import crypto from 'node:crypto';

const ACCESS_TTL_MS  = 15 * 60 * 1000;          // 15 minutes
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SCRYPT_N       = 16384;

function getSecret() {
  const s = process.env.LIFEOS_JWT_SECRET || process.env.COMMAND_CENTER_KEY || '';
  if (!s) throw new Error('LIFEOS_JWT_SECRET or COMMAND_CENTER_KEY must be set');
  return s;
}

// ── Password hashing ─────────────────────────────────────────────────────────

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: SCRYPT_N }).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const [, salt, hash] = stored.split(':');
  try {
    const derived = crypto.scryptSync(password, salt, 64, { N: SCRYPT_N }).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// ── JWT-like tokens (HMAC-SHA256) ────────────────────────────────────────────

function encode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function decode(str) {
  return JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
}

export function signToken(payload) {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body   = encode(payload);
  const sig    = crypto
    .createHmac('sha256', getSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') throw new Error('No token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [header, body, sig] = parts;
  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  // timingSafeEqual needs same-length buffers — pad to equal length
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid token signature');
  }
  const payload = decode(body);
  if (payload.exp && payload.exp < Date.now()) throw new Error('Token expired');
  return payload;
}

// ── Refresh token (random, stored as SHA-256 hash in DB) ────────────────────

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createLifeOSAuth(pool) {

  /**
   * Register a new user with invite code.
   * Returns { user, accessToken, refreshToken } on success.
   */
  async function register({ email, password, handle, displayName, inviteCode, userAgent, ip }) {
    if (!email || !password || !handle || !inviteCode) {
      throw Object.assign(new Error('email, password, handle, and inviteCode are required'), { status: 400 });
    }
    if (password.length < 8) {
      throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate invite
      const { rows: inv } = await client.query(
        `SELECT * FROM lifeos_invites WHERE code = $1 AND used_by IS NULL AND expires_at > NOW()`,
        [inviteCode.trim().toUpperCase()]
      );
      if (!inv.length) {
        throw Object.assign(new Error('Invalid or expired invite code'), { status: 403 });
      }
      const invite = inv[0];

      // Check email/handle uniqueness
      const { rows: existing } = await client.query(
        `SELECT id FROM lifeos_users WHERE email = LOWER($1) OR LOWER(user_handle) = LOWER($2)`,
        [email.trim(), handle.trim()]
      );
      if (existing.length) {
        throw Object.assign(new Error('Email or handle already taken'), { status: 409 });
      }

      const slug = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!slug) throw Object.assign(new Error('Invalid handle'), { status: 400 });

      const phash = hashPassword(password);

      const { rows: [user] } = await client.query(
        `INSERT INTO lifeos_users
           (user_handle, display_name, email, password_hash, role, tier)
         VALUES ($1, $2, LOWER($3), $4, $5, $6)
         RETURNING id, user_handle, display_name, email, role, tier`,
        [slug, displayName || handle, email.trim(), phash, invite.role, invite.tier]
      );

      // Mark invite used
      await client.query(
        `UPDATE lifeos_invites SET used_by = $1, used_at = NOW() WHERE id = $2`,
        [user.id, invite.id]
      );

      const { accessToken, refreshToken } = await _createSession(client, user, userAgent, ip);

      await client.query('COMMIT');
      return { user, accessToken, refreshToken };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Login with email + password.
   * Returns { user, accessToken, refreshToken }.
   */
  async function login({ email, password, userAgent, ip }) {
    if (!email || !password) {
      throw Object.assign(new Error('email and password are required'), { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT id, user_handle, display_name, email, password_hash, role, tier, active
       FROM lifeos_users WHERE email = LOWER($1)`,
      [email.trim()]
    );
    const user = rows[0];
    if (!user || !user.password_hash) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401 });
    }
    if (!user.active) {
      throw Object.assign(new Error('Account is inactive'), { status: 403 });
    }
    if (!verifyPassword(password, user.password_hash)) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401 });
    }

    await pool.query(
      `UPDATE lifeos_users SET last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

    const client = await pool.connect();
    try {
      const tokens = await _createSession(client, user, userAgent, ip);
      return { user: _safeUser(user), ...tokens };
    } finally {
      client.release();
    }
  }

  /**
   * Refresh: validate refresh token, issue new access token.
   */
  async function refresh(rawRefreshToken) {
    if (!rawRefreshToken) throw Object.assign(new Error('Refresh token required'), { status: 400 });
    const hash = hashRefreshToken(rawRefreshToken);
    const { rows } = await pool.query(
      `SELECT s.*, u.id as uid, u.user_handle, u.display_name, u.email, u.role, u.tier, u.active
       FROM lifeos_sessions s
       JOIN lifeos_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [hash]
    );
    if (!rows.length) throw Object.assign(new Error('Session expired or invalid'), { status: 401 });
    const row = rows[0];
    if (!row.active) throw Object.assign(new Error('Account inactive'), { status: 403 });

    const accessToken = _issueAccessToken({ id: row.uid, handle: row.user_handle, role: row.role, tier: row.tier });
    return { accessToken, user: { id: row.uid, user_handle: row.user_handle, display_name: row.display_name, email: row.email, role: row.role, tier: row.tier } };
  }

  /**
   * Logout: revoke the session by deleting its refresh token from DB.
   */
  async function logout(rawRefreshToken) {
    if (!rawRefreshToken) return;
    const hash = hashRefreshToken(rawRefreshToken);
    await pool.query(`DELETE FROM lifeos_sessions WHERE token_hash = $1`, [hash]);
  }

  /**
   * Create an invite code (admin only — caller must verify role before calling).
   */
  async function createInvite({ role = 'member', tier = 'core', email = null, days = 30, createdBy }) {
    const code = `LOS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const { rows: [inv] } = await pool.query(
      `INSERT INTO lifeos_invites (code, role, tier, email, expires_at, created_by)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' days')::INTERVAL, $6)
       RETURNING id, code, role, tier, email, expires_at`,
      [code, role, tier, email ? email.trim().toLowerCase() : null, String(days), createdBy]
    );
    return inv;
  }

  /**
   * Set or update Adam's password without an invite (admin bootstrap).
   * Only works if the row has no password yet OR caller passes current password.
   */
  async function setAdminPassword({ handle, newPassword, currentPassword = null }) {
    const { rows } = await pool.query(
      `SELECT id, password_hash, role FROM lifeos_users WHERE LOWER(user_handle) = LOWER($1)`,
      [handle]
    );
    if (!rows.length) throw Object.assign(new Error('User not found'), { status: 404 });
    const user = rows[0];
    if (user.password_hash && currentPassword !== null) {
      if (!verifyPassword(currentPassword, user.password_hash)) {
        throw Object.assign(new Error('Current password incorrect'), { status: 401 });
      }
    } else if (user.password_hash && currentPassword === null) {
      throw Object.assign(new Error('Current password required'), { status: 400 });
    }
    if (newPassword.length < 8) throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
    await pool.query(
      `UPDATE lifeos_users SET password_hash = $1 WHERE id = $2`,
      [hashPassword(newPassword), user.id]
    );
    return { ok: true };
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  function _issueAccessToken(user) {
    return signToken({
      sub:    String(user.id),
      handle: user.handle || user.user_handle,
      role:   user.role,
      tier:   user.tier,
      iat:    Date.now(),
      exp:    Date.now() + ACCESS_TTL_MS,
    });
  }

  async function _createSession(client, user, userAgent, ip) {
    const rawRefresh = generateRefreshToken();
    const hash = hashRefreshToken(rawRefresh);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    // Prune old expired sessions for this user (keep last 5)
    await client.query(
      `DELETE FROM lifeos_sessions WHERE user_id = $1 AND expires_at < NOW()`,
      [user.id]
    );

    await client.query(
      `INSERT INTO lifeos_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, hash, expiresAt, userAgent || null, ip || null]
    );

    const accessToken = _issueAccessToken({ id: user.id, handle: user.user_handle, role: user.role, tier: user.tier });
    return { accessToken, refreshToken: rawRefresh };
  }

  function _safeUser(u) {
    const { password_hash: _, ...safe } = u;
    return safe;
  }

  return { register, login, refresh, logout, createInvite, setAdminPassword, verifyToken, signToken };
}
