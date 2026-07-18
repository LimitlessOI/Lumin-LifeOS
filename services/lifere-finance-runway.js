/**
 * SYNOPSIS: LifeRE finance runway and GCI forecast from weighted BoldTrail pipeline.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { fetchBoldTrailPipeline } from './lifere-boldtrail-bridge.js';

const STAGE_WEIGHT = {
  new: 0.08,
  prospect: 0.18,
  active: 0.45,
  client: 0.55,
  pending: 0.7,
  sphere: 0.05,
  closed: 1,
  unknown: 0.1,
};

const DEFAULT_GCI_PER_DEAL = 9000;

function weightedFromPipeline(contacts, { assumedGciPerDeal = DEFAULT_GCI_PER_DEAL } = {}) {
  let weighted = 0;
  const byStage = {};
  for (const c of contacts || []) {
    const stage = c.status_label || 'unknown';
    const w = STAGE_WEIGHT[stage] ?? STAGE_WEIGHT.unknown;
    byStage[stage] = (byStage[stage] || 0) + 1;
    weighted += assumedGciPerDeal * w;
  }
  return {
    pipeline_weighted: Math.round(weighted),
    contact_count: (contacts || []).length,
    by_stage: byStage,
    assumed_gci_per_deal: assumedGciPerDeal,
  };
}

export function createLifeREFinanceRunway({ pool = null } = {}) {
  async function forecastGci({
    tenantId = 'default',
    userId,
    projectedGci,
    pipelineWeighted,
    runwayMonths = 6,
    monthlyBurn = 4000,
  } = {}) {
    const pipeline = await fetchBoldTrailPipeline({ limit: 50 });
    const derived = pipeline.ok
      ? weightedFromPipeline(pipeline.contacts)
      : { pipeline_weighted: pipelineWeighted ?? 18000, contact_count: 0, by_stage: {}, assumed_gci_per_deal: DEFAULT_GCI_PER_DEAL };

    const weighted = Number.isFinite(Number(pipelineWeighted))
      ? Number(pipelineWeighted)
      : derived.pipeline_weighted;
    const projected = Number.isFinite(Number(projectedGci))
      ? Number(projectedGci)
      : Math.round(weighted * 1.15);

    const months = Math.max(1, Number(runwayMonths) || 6);
    const burn = Number(monthlyBurn) || 4000;
    const runwayFromPipeline = burn > 0 ? Math.round((weighted / burn) * 10) / 10 : months;

    if (pool) {
      try {
        const month = new Date().toISOString().slice(0, 7) + '-01';
        await pool.query(
          `INSERT INTO lifere_finance_forecast (tenant_id, user_id, forecast_month, projected_gci, pipeline_weighted, runway_months, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6, now())`,
          [tenantId, userId, month, projected, weighted, runwayFromPipeline || months],
        );
      } catch {
        /* table optional */
      }
    }

    return {
      ok: true,
      projected_gci: projected,
      pipeline_weighted: weighted,
      runway_months: runwayFromPipeline || months,
      boldtrail_connected: !!pipeline.connected,
      pipeline_contacts: derived.contact_count,
      by_stage: derived.by_stage,
      assumed_gci_per_deal: derived.assumed_gci_per_deal,
      label: pipeline.connected ? 'THINK' : 'GUESS',
      disclaimer: 'Not tax advice. Weights are stage heuristics until deal GCI is on contacts.',
      source: pipeline.connected ? 'boldtrail_weighted' : 'defaults',
    };
  }

  async function getForecast({ tenantId = 'default', userId }) {
    const live = await forecastGci({ tenantId, userId });
    if (!pool) return live;
    try {
      const { rows } = await pool.query(
        `SELECT * FROM lifere_finance_forecast WHERE tenant_id = $1 AND user_id = $2 ORDER BY updated_at DESC LIMIT 1`,
        [tenantId, userId],
      );
      if (!rows[0]) return live;
      return {
        ...live,
        last_persisted: rows[0],
        label: live.label,
      };
    } catch {
      return live;
    }
  }

  return { forecastGci, getForecast, weightedFromPipeline };
}
