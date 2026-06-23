/**
 * SYNOPSIS: LifeRE scenario engine + opportunity cost.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLifeRETwinStore } from './lifere-twin-store.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createLifeREScenarioEngine({ pool = null } = {}) {
  const twinStore = createLifeRETwinStore({ pool });

  function scorePath(pathAlloc, goalWeights) {
    const income = (pathAlloc.builderos_hours || 0) * -0.5 + (pathAlloc.prospecting_hours || 0) * 2 + (pathAlloc.family_hours || 0) * 0.2;
    const family = (pathAlloc.family_hours || 0) * 3 - (pathAlloc.builderos_hours || 0) * 0.3;
    const freedom = 10 - (pathAlloc.builderos_hours || 0) * 0.2 - (pathAlloc.prospecting_hours || 0) * 0.1;
    const w = goalWeights || { income: 0.4, family: 0.35, freedom: 0.25 };
    return income * w.income + family * w.family + freedom * w.freedom;
  }

  async function projectFuturePath({ userId, horizonDays = 90 }) {
    const future = twinStore.readTwin({ userId, twinKey: 'future' }) || {
      schema: 'lifere_future_twin_v1',
      current_path_projection: {},
      confidence: 0.5,
      assumptions: ['Based on recent activity trends'],
      label: 'THINK',
    };
    future.current_path_projection[`${horizonDays}d`] = {
      note: 'If current behavior continues, pipeline velocity stays flat without prospecting increase.',
      label: 'THINK',
    };
    await twinStore.writeTwin({ userId, twinKey: 'future', payload: future });
    return future;
  }

  async function compareScenarios({ tenantId = 'default', userId, horizonDays = 90, paths = [], goalWeights }) {
    const ranked = paths.map((p) => ({
      ...p,
      goal_scores: {
        composite: scorePath(p.allocations || {}, goalWeights),
      },
    })).sort((a, b) => b.goal_scores.composite - a.goal_scores.composite);

    const opportunity_cost_notes = ranked.length > 1
      ? [`Choosing ${ranked[0].id} over ${ranked[1].id} trades ${ranked[1].id} upside for ${ranked[0].id} goal fit.`]
      : [];

    const scenarioId = `sc_${Date.now()}`;
    const payload = { horizon_days: horizonDays, paths: ranked, goal_weights: goalWeights, opportunity_cost_notes, label: 'THINK' };

    const dir = path.join(ROOT, 'data/lifere-scenarios', userId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${scenarioId}.json`), `${JSON.stringify(payload, null, 2)}\n`);

    if (pool) {
      await pool.query(
        `INSERT INTO lifere_scenarios (tenant_id, user_id, scenario_id, payload) VALUES ($1,$2,$3,$4)`,
        [tenantId, userId, scenarioId, payload]
      );
    }

    return {
      ok: true,
      scenario_id: scenarioId,
      paths: ranked,
      ranked_by_goal: ranked.map((p) => p.id),
      opportunity_cost_notes,
      label: 'THINK',
    };
  }

  function computeOpportunityCost({ baselinePath, altPath, goalWeights }) {
    const base = scorePath(baselinePath?.allocations || {}, goalWeights);
    const alt = scorePath(altPath?.allocations || {}, goalWeights);
    return { baseline_score: base, alt_score: alt, delta: alt - base, notes: [`Delta: ${(alt - base).toFixed(2)} goal units`] };
  }

  return { projectFuturePath, compareScenarios, computeOpportunityCost };
}
