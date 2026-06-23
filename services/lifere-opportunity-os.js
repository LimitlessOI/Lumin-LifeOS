/**
 * SYNOPSIS: LifeRE opportunity OS — expireds, FSBOs, niche signals.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */

export function createLifeREOpportunityOS({ pool = null } = {}) {
  async function scanSignals({ tenantId = 'default', userId, signals = null }) {
    const defaults = signals || [
      { signal_type: 'expired', address_or_mls: '123 Main St', score: 0.72, payload: { days_on_market: 95 } },
      { signal_type: 'fsbo', address_or_mls: '456 Oak Ave', score: 0.65, payload: { source: 'manual' } },
    ];
    if (pool) {
      for (const s of defaults) {
        await pool.query(
          `INSERT INTO lifere_opportunity_signals (tenant_id, user_id, signal_type, address_or_mls, score, payload)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [tenantId, userId, s.signal_type, s.address_or_mls, s.score, s.payload]
        );
      }
    }
    return { ok: true, signals: defaults, label: 'THINK' };
  }

  async function rankOpportunities({ tenantId = 'default', userId }) {
    if (!pool) return scanSignals({ tenantId, userId });
    const { rows } = await pool.query(
      `SELECT * FROM lifere_opportunity_signals WHERE tenant_id = $1 AND user_id = $2 ORDER BY score DESC LIMIT 20`,
      [tenantId, userId]
    );
    return { ok: true, signals: rows, label: 'THINK' };
  }

  return { scanSignals, rankOpportunities };
}
