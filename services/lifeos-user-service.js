/**
 * SYNOPSIS: LifeOS user service — CRUD + auth helpers over lifeos_users, lifeos_sessions, lifeos_invites.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import { hashPassword, verifyPassword, signToken, generateRefreshToken } from './lifeos-auth.js';

export const LIFEOS_ROLES = ['member', 'admin', 'therapist', 'operator', 'founder_admin'];

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeRole(role) {
  if (role == null || role === '') return 'member';
  const normalized = String(role).trim().toLowerCase();
  if (!LIFEOS_ROLES.includes(normalized)) throw new Error('invalid_role');
  return normalized;
}

export async function createUser(pool, { handle, email, password, displayName, role, tier, inviteCode }) {
  if (inviteCode) {
    const { rows: inv } = await pool.query(
      `SELECT id, use_count, max_uses FROM lifeos_invites WHERE code = $1 AND used_at IS NULL AND (max_uses IS NULL OR use_count < max_uses)`,
      [inviteCode],
    );
    if (!inv.length) throw Object.assign(new Error('Invalid or expired invite code'), { statusCode: 400 });
  }

  const normalHandle = String(handle || '').trim().toLowerCase();
  const normalEmail = email ? String(email).trim().toLowerCase() : null;
  if (!normalHandle) throw Object.assign(new Error('handle is required'), { statusCode: 400 });

  const normalizedRole = normalizeRole(role);
  const hash = password ? hashPassword(password) : null;

  const { rows } = await pool.query(
    `INSERT INTO lifeos_users (user_handle, display_name, email, password_hash, role, tier)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_handle, display_name, email, role, tier, created_at`,
    [normalHandle, displayName || normalHandle, normalEmail, hash, normalizedRole, tier || 'free'],
  );

  const user = rows[0];

  if (inviteCode) {
    await pool.query(
      `UPDATE lifeos_invites SET used_by = $1, used_at = NOW(), use_count = use_count + 1 WHERE code = $2`,
      [user.id, inviteCode],
    );
  }

  return user;
}

export async function findUserByHandle(pool, handle) {
  const { rows } = await pool.query(
    `SELECT id, user_handle, display_name, email, password_hash, role, tier, last_login_at
     FROM lifeos_users WHERE LOWER(user_handle) = $1 LIMIT 1`,
    [String(handle).trim().toLowerCase()],
  );
  return rows[0] || null;
}

export async function findUserByEmail(pool, email) {
  const { rows } = await pool.query(
    `SELECT id, user_handle, display_name, email, password_hash, role, tier, last_login_at
     FROM lifeos_users WHERE LOWER(email) = $1 LIMIT 1`,
    [String(email).trim().toLowerCase()],
  );
  return rows[0] || null;
}

export async function findUserById(pool, id) {
  const { rows } = await pool.query(
    `SELECT id, user_handle, display_name, email, role, tier, last_login_at
     FROM lifeos_users WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function setPassword(pool, userId, newPassword) {
  const hash = hashPassword(newPassword);
  await pool.query(`UPDATE lifeos_users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
}

export async function loginUser(pool, { handleOrEmail, password }) {
  const isEmail = String(handleOrEmail).includes('@');
  const user = isEmail
    ? await findUserByEmail(pool, handleOrEmail)
    : await findUserByHandle(pool, handleOrEmail);

  if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  if (!user.password_hash) throw Object.assign(new Error('Password not set — use invite link'), { statusCode: 401 });
  if (!verifyPassword(password, user.password_hash)) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  await pool.query(`UPDATE lifeos_users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

  const accessToken = signToken({ sub: String(user.id), handle: user.user_handle, role: user.role, tier: user.tier });
  const refreshToken = generateRefreshToken();
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await pool.query(
    `INSERT INTO lifeos_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt],
  );

  return { user, accessToken, refreshToken };
}

export async function refreshSession(pool, refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const { rows } = await pool.query(
    `SELECT s.id, s.user_id, s.expires_at, u.user_handle, u.role, u.tier
     FROM lifeos_sessions s
     JOIN lifeos_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  if (!rows.length) throw Object.assign(new Error('Session expired or not found'), { statusCode: 401 });

  const session = rows[0];
  const accessToken = signToken({ sub: String(session.user_id), handle: session.user_handle, role: session.role, tier: session.tier });
  return { accessToken, userId: session.user_id };
}

export async function revokeSession(pool, refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await pool.query(
    `UPDATE lifeos_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}

export async function createInvite(pool, createdBy, maxUses = 1) {
  const { rows } = await pool.query(
    `INSERT INTO lifeos_invites (created_by, max_uses) VALUES ($1, $2) RETURNING id, code, created_at`,
    [createdBy || null, maxUses],
  );
  return rows[0];
}

export async function listInvites(pool) {
  const { rows } = await pool.query(
    `SELECT i.id, i.code, i.use_count, i.max_uses, i.created_at, i.used_at,
            u.user_handle AS used_by_handle
     FROM lifeos_invites i
     LEFT JOIN lifeos_users u ON u.id = i.used_by
     ORDER BY i.created_at DESC LIMIT 100`,
  );
  return rows;
}