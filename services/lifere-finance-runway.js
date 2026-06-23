/**
 * SYNOPSIS: LifeRE finance runway and GCI forecast.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */

export function createLifeREFinanceRunway({ pool = null } = {}) {
  async function forecastGci({ tenantId = 'default', userId, projectedGci = 30000, pipelineWeighted = 18000, runwayMonths = 6 }) {
    if (pool) {
      const month = new Date().toISOString().slice(0, 7) + '-01';
      await pool.query(
        `INSERT INTO lifere_finance_forecast (tenant_id, user_id, forecast_month, projected_gci, pipeline_weighted, runway_months, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6, now())`,
        [tenantId, userId, month, projectedGci, pipelineWeighted, runwayMonths]
      );
    }
    return {
      ok: true,
      projected_gci: projectedGci,
      pipeline_weighted: pipelineWeighted,
      runway_months: runwayMonths,
      label: 'THINK',
      disclaimer: 'Not tax advice',
    };
  }

  async function getForecast({ tenantId = 'default', userId }) {
    if (!pool) return forecastGci({ tenantId, userId });
    const { rows } = await pool.query(
      `SELECT * FROM lifere_finance_forecast WHERE tenant_id = $1 AND user_id = $2 ORDER BY updated_at DESC LIMIT 1`,
      [tenantId, userId]
    );
    if (!rows[0]) return forecastGci({ tenantId, userId });
    return { ok: true, ...rows[0], label: 'THINK' };
  }

  return { forecastGci, getForecast };
}
