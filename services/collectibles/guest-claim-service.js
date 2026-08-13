/**
 * SYNOPSIS: Guest capture session → claim into authenticated Vault.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';

/**
 * @param {{ pool: import('pg').Pool, logger?: object }} deps
 */
export function createGuestClaimService({ pool, logger } = {}) {
  if (!pool) throw new Error('pool required');
  const log = logger || { info() {}, warn() {}, error() {} };

  function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
  }

  async function startGuestSession() {
    const token = crypto.randomBytes(24).toString('hex');
    const guest_claim_token_hash = hashToken(token);
    return { guest_session_token: token, guest_claim_token_hash };
  }

  async function bindTwinToGuestToken(twinId, guestSessionToken) {
    if (!twinId || !guestSessionToken) throw new Error('twinId and guestSessionToken required');
    const guest_claim_token_hash = hashToken(guestSessionToken);
    const result = await pool.query(
      `UPDATE collectible_twins
          SET guest_claim_token_hash = $2, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, guest_claim_token_hash`,
      [twinId, guest_claim_token_hash],
    );
    if (!result.rows.length) throw new Error(`twin not found: ${twinId}`);
    return { twin_id: twinId, guest_claim_token_hash };
  }

  async function claimGuestTwins(guestSessionToken, ownerUserId) {
    if (!guestSessionToken || !ownerUserId) throw new Error('guestSessionToken and ownerUserId required');
    const guest_claim_token_hash = hashToken(guestSessionToken);
    const result = await pool.query(
      `UPDATE collectible_twins
          SET owner_user_id = $2,
              guest_claim_token_hash = NULL,
              updated_at = NOW()
        WHERE guest_claim_token_hash = $1
          AND deleted_at IS NULL
      RETURNING id, owner_user_id, display_name`,
      [guest_claim_token_hash, ownerUserId],
    );
    for (const row of result.rows) {
      await pool.query(
        `INSERT INTO collectible_audit_events (id, twin_id, actor_user_id, event_type, payload)
         VALUES (gen_random_uuid(), $1, $2, 'guest_claim', '{}'::jsonb)`,
        [row.id, ownerUserId],
      );
    }
    log.info?.({ count: result.rows.length, ownerUserId }, 'claimGuestTwins');
    return result.rows;
  }

  return { startGuestSession, bindTwinToGuestToken, claimGuestTwins };
}
