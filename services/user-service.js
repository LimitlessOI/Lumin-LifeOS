/**
 * SYNOPSIS: Exports createUserService — services/user-service.js.
 */
import crypto from 'node:crypto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name) {
  const v = String(name || '').trim();
  return v || null;
}

function toSafeLogger(logger) {
  const noop = () => {};
  if (!logger) {
    return {
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
    };
  }
  return {
    info: typeof logger.info === 'function' ? logger.info.bind(logger) : noop,
    warn: typeof logger.warn === 'function' ? logger.warn.bind(logger) : noop,
    error: typeof logger.error === 'function' ? logger.error.bind(logger) : noop,
    debug: typeof logger.debug === 'function' ? logger.debug.bind(logger) : noop,
  };
}

function parseLimit(limit) {
  return Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
}

export function createUserService({ pool, logger }) {
  const log = toSafeLogger(logger);

  async function getUserById(id) {
    const userId = String(id || '').trim();
    if (!userId) {
      const err = new Error('user_id_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `SELECT id, owner_id, created_at, email, name
         FROM lifeos_users
        WHERE id = $1
        LIMIT 1`,
      [userId],
    );

    return rows[0] || null;
  }

  async function createUser({ ownerId, email, name }) {
    const normalizedOwnerId = String(ownerId || '').trim();
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = normalizeName(name);

    if (!normalizedOwnerId) {
      const err = new Error('owner_id_required');
      err.status = 400;
      throw err;
    }

    if (!normalizedEmail) {
      const err = new Error('email_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO lifeos_users (owner_id, email, name)
       VALUES ($1, $2, $3)
       RETURNING id, owner_id, created_at, email, name`,
      [normalizedOwnerId, normalizedEmail, normalizedName],
    );

    log.info?.('lifeos_user_created', {
      user_id: rows[0]?.id || null,
      owner_id: normalizedOwnerId,
    });

    return rows[0];
  }

  return {
    getUserById,
    createUser,
  };
}