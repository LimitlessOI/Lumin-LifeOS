/**
 * services/constitutional-lock.js
 *
 * Multi-party consensus enforcement for locked amendments.
 * Any attempt to amend a locked section requires signatures from:
 * - The AI Council (1 vote, logged)
 * - 2 designated human trustees
 *
 * Coercion detection: 3+ override attempts within 1 hour triggers a 72-hour lockout.
 * The lockout cannot be cleared by any single party.
 *
 * Exports:
 *   createConstitutionalLock({ pool, logger }) → ConstitutionalLock
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createConstitutionalLock({ pool, logger }) {
  const log = logger || console;

  /**
   * Check if an amendment is locked.
   *
   * @param {string} amendment  e.g. 'AMENDMENT_21_LIFEOS_CORE_data_ethics'
   * @returns {Promise<object|null>} The constitutional_lock row, or null if not locked
   */
  async function checkLocked(amendment) {
    const { rows } = await pool.query(
      `SELECT * FROM constitutional_lock WHERE amendment = $1`,
      [amendment]
    );
    return rows[0] || null;
  }

  /**
   * Attempt a single-party override of a locked amendment.
   * This is always rejected — the purpose of this function is to:
   *   1. Count the attempt
   *   2. Detect coercion (rapid repeated attempts)
   *   3. Trigger lockout if coercion is detected
   *
   * @param {string} amendment
   * @param {object} opts
   * @param {string} opts.requestedBy
   * @param {string} [opts.reason]
   * @returns {Promise<{ok: boolean, locked?: boolean, attempts?: number, message: string}>}
   */
  async function attemptOverride(amendment, { requestedBy, reason = '' }) {
    const lock = await checkLocked(amendment);

    if (!lock) {
      return { ok: true, message: 'Not locked' };
    }

    // Check if coercion lockout is currently active
    if (lock.coercion_lockout && lock.coercion_lockout_until) {
      const lockoutUntil = new Date(lock.coercion_lockout_until);
      if (lockoutUntil > new Date()) {
        const msg = `Constitutional coercion lockout active. This lock cannot be amended by any single party until ${lockoutUntil.toISOString()}.`;
        log.error ? log.error({ amendment, requestedBy }, msg) : log.error(msg);
        throw new Error(msg);
      }
    }

    // Increment override_attempts and update last_attempt_at
    const { rows } = await pool.query(`
      UPDATE constitutional_lock
      SET
        override_attempts = override_attempts + 1,
        last_attempt_at   = NOW()
      WHERE amendment = $1
      RETURNING *
    `, [amendment]);

    const updated = rows[0];

    // Coercion detection: 3+ attempts and the last attempt was within 1 hour
    let coercionTriggered = false;
    if (updated.override_attempts >= 3 && updated.last_attempt_at) {
      const lastAttempt = new Date(updated.last_attempt_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lastAttempt > oneHourAgo) {
        // Trigger coercion lockout for 72 hours
        await pool.query(`
          UPDATE constitutional_lock
          SET
            coercion_lockout       = TRUE,
            coercion_lockout_until = NOW() + INTERVAL '72 hours'
          WHERE amendment = $1
        `, [amendment]);
        coercionTriggered = true;
        log.error
          ? log.error({ amendment, requestedBy, attempts: updated.override_attempts }, 'COERCION LOCKOUT TRIGGERED — 72-hour constitutional lock activated')
          : log.error('COERCION LOCKOUT TRIGGERED — 72-hour constitutional lock activated');
      }
    }

    const warningMsg = coercionTriggered
      ? `Coercion detected. 72-hour lockout activated. This lock cannot be amended by any single party.`
      : `This section requires multi-party consensus. Single-party override is not permitted.`;

    log.warn
      ? log.warn({ amendment, requestedBy, reason, attempts: updated.override_attempts }, `Override attempt blocked: ${amendment}`)
      : log.warn(`Override attempt blocked: ${amendment} by ${requestedBy}`);

    return {
      ok: false,
      locked: true,
      attempts: updated.override_attempts,
      coercionLockout: coercionTriggered,
      message: warningMsg,
    };
  }

  /**
   * Get the status of all locked amendments.
   *
   * @returns {Promise<Array>}
   */
  async function getLockStatus() {
    const { rows } = await pool.query(
      `SELECT * FROM constitutional_lock ORDER BY locked_at ASC`
    );
    return rows.map(row => ({
      amendment: row.amendment,
      description: row.description,
      locked_at: row.locked_at,
      locked_by: row.locked_by,
      required_signers: row.required_signers,
      override_attempts: row.override_attempts,
      last_attempt_at: row.last_attempt_at,
      coercion_lockout: row.coercion_lockout,
      coercion_lockout_until: row.coercion_lockout_until,
    }));
  }

  /**
   * Record that full multi-party consensus has been achieved for an amendment.
   * This is the only legitimate path to amend a locked constitutional section.
   * The actual amendment process happens outside this system (human deliberation,
   * AI Council vote, trustee signatures) — this records the outcome.
   *
   * @param {string} amendment
   * @param {object} opts
   * @param {string[]} opts.signers  List of who signed (AI Council + human trustees)
   * @param {string}   opts.reason   What is being amended and why
   * @returns {Promise<object>}
   */
  async function recordConsensus(amendment, { signers, reason }) {
    if (!Array.isArray(signers) || signers.length === 0) {
      throw new Error('Consensus requires at least one signer to be recorded');
    }

    const lock = await checkLocked(amendment);
    if (!lock) {
      return { ok: true, message: `Amendment "${amendment}" is not locked — no consensus needed` };
    }

    if (signers.length < lock.required_signers) {
      throw new Error(
        `Insufficient signers. This amendment requires ${lock.required_signers} signers. Got ${signers.length}: ${signers.join(', ')}`
      );
    }

    const note = `CONSENSUS RECORDED ${new Date().toISOString()} | Signers: ${signers.join(', ')} | Reason: ${reason}`;

    await pool.query(`
      UPDATE constitutional_lock
      SET description = CONCAT(description, E'\\n\\n', $2)
      WHERE amendment = $1
    `, [amendment, note]);

    log.info
      ? log.info({ amendment, signers }, 'Constitutional consensus recorded')
      : log.info(`Constitutional consensus recorded: ${amendment}`);

    return {
      ok: true,
      amendment,
      signers,
      recorded_at: new Date().toISOString(),
      message: `Consensus recorded. ${signers.length} of ${lock.required_signers} required signers confirmed.`,
    };
  }

  return {
    checkLocked,
    attemptOverride,
    getLockStatus,
    recordConsensus,
  };
}
