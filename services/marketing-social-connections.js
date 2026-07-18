// SYNOPSIS: social account connection seam for MarketingOS publisher
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { encrypt, decrypt } from '../core/tco-encryption.js';

function toStructuredError(error) {
  return {
    message: error instanceof Error ? error.message : String(error),
    code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
  };
}

function sanitizeRow(row) {
  if (!row) return null;
  const { session_state_encrypted: _sessionStateEncrypted, ...rest } = row;
  return rest;
}

export async function saveConnection(pool, { ownerId, platform, sessionState, status = 'connected' }) {
  try {
    const sessionStateJson = JSON.stringify(sessionState);
    const encrypted = await encrypt(sessionStateJson);

    const result = await pool.query(
      `
      INSERT INTO marketing_social_connections (
        owner_id,
        platform,
        auth_mode,
        session_state_encrypted,
        status,
        connected_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 = 'connected' THEN NOW() ELSE NULL END, NOW())
      ON CONFLICT (owner_id, platform)
      DO UPDATE SET
        auth_mode = EXCLUDED.auth_mode,
        session_state_encrypted = EXCLUDED.session_state_encrypted,
        status = EXCLUDED.status,
        connected_at = CASE WHEN EXCLUDED.status = 'connected' THEN NOW() ELSE marketing_social_connections.connected_at END,
        updated_at = NOW()
      RETURNING id, owner_id, platform, auth_mode, status, connected_at, last_verified_at, last_error, created_at, updated_at
      `,
      [ownerId, platform, 'session', encrypted, status],
    );

    return { ok: true, connection: result.rows[0] ? sanitizeRow(result.rows[0]) : null };
  } catch (error) {
    return { ok: false, error: toStructuredError(error) };
  }
}

export async function getConnection(pool, { ownerId, platform }) {
  try {
    const result = await pool.query(
      `
      SELECT id, owner_id, platform, auth_mode, session_state_encrypted, status, connected_at, last_verified_at, last_error, created_at, updated_at
      FROM marketing_social_connections
      WHERE owner_id = $1 AND platform = $2
      LIMIT 1
      `,
      [ownerId, platform],
    );

    const row = result.rows[0];
    if (!row) return { ok: true, connection: null };

    let sessionState = null;
    if (row.session_state_encrypted) {
      const decrypted = await decrypt(row.session_state_encrypted);
      sessionState = decrypted ? JSON.parse(decrypted) : null;
    }

    return {
      ok: true,
      connection: {
        ...sanitizeRow(row),
        sessionState,
      },
    };
  } catch (error) {
    return { ok: false, error: toStructuredError(error) };
  }
}

export async function listConnections(pool, { ownerId }) {
  try {
    const result = await pool.query(
      `
      SELECT platform, status, connected_at, last_verified_at, last_error
      FROM marketing_social_connections
      WHERE owner_id = $1
      ORDER BY platform ASC
      `,
      [ownerId],
    );

    return { ok: true, connections: result.rows };
  } catch (error) {
    return { ok: false, error: toStructuredError(error) };
  }
}

export async function revokeConnection(pool, { ownerId, platform }) {
  try {
    const result = await pool.query(
      `
      UPDATE marketing_social_connections
      SET status = 'revoked',
          session_state_encrypted = NULL,
          updated_at = NOW()
      WHERE owner_id = $1 AND platform = $2
      RETURNING id, owner_id, platform, auth_mode, status, connected_at, last_verified_at, last_error, created_at, updated_at
      `,
      [ownerId, platform],
    );

    return { ok: true, connection: result.rows[0] ? sanitizeRow(result.rows[0]) : null };
  } catch (error) {
    return { ok: false, error: toStructuredError(error) };
  }
}

export default {
  saveConnection,
  getConnection,
  listConnections,
  revokeConnection,
};