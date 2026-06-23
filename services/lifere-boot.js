/**
 * SYNOPSIS: LifeRE boot — seed twins, permissions, founder extensions on startup.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLifeRETwinStore } from './lifere-twin-store.js';
import { createLifeREPermissionTwin } from './lifere-permission-twin.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ADAM_DEFAULTS = {
  personal: {
    schema: 'lifere_personal_twin_v1',
    name: 'Adam',
    roles: ['founder', 'agent', 'tc'],
    timezone: 'America/Chicago',
    motivations: ['family', 'freedom', 'impact'],
    label: 'THINK',
  },
  goal: {
    schema: 'lifere_goal_twin_v1',
    horizons: { '90d': { income_gci: 30000 } },
    weights: { income: 0.35, family: 0.25, freedom: 0.2, health: 0.2 },
  },
  performance: {
    schema: 'lifere_performance_twin_v1',
    income_goal_monthly: 30000,
    funnel_counts: {},
    conversion_rates: {},
  },
};

export async function bootLifeRE({ pool = null, logger = console } = {}) {
  const twinStore = createLifeRETwinStore({ pool, logger });
  const permission = createLifeREPermissionTwin({ pool });

  const founderDir = path.join(ROOT, 'data/twins/founder');
  if (!fs.existsSync(founderDir)) {
    try {
      const { seedFounderTwins } = await import('../scripts/seed-lifere-founder-twins.mjs');
      seedFounderTwins({ force: false });
      logger.info?.('[LIFERE-BOOT] Founder extension twins seeded');
    } catch (err) {
      logger.warn?.('[LIFERE-BOOT] Founder seed skip:', err.message);
    }
  }

  for (const [key, payload] of Object.entries(ADAM_DEFAULTS)) {
    const existing = twinStore.readTwin({ userId: 'adam', twinKey: key });
    if (!existing) {
      await twinStore.writeTwin({
        userId: 'adam',
        twinKey: key,
        payload,
        receiptMeta: { source: 'lifere_boot' },
      });
    }
  }

  if (pool) {
    try {
      await permission.seedDefaults({ userId: 'adam' });
    } catch (err) {
      logger.warn?.('[LIFERE-BOOT] Permission seed skip:', err.message);
    }

    const buyerTwin = twinStore.readTwin({ userId: 'adam', moduleKey: 'buyer' });
    if (!buyerTwin?.clients || Object.keys(buyerTwin.clients).length === 0) {
      await twinStore.writeTwin({
        userId: 'adam',
        moduleKey: 'buyer',
        twinKey: 'buyer',
        payload: {
          schema: 'lifere_buyer_twin_v1',
          clients: {
            demo_buyer_001: {
              search_criteria: { beds: 3, area: 'local', budget_max: 450000 },
              showing_schedule: [],
              offer_prep_status: 'not_started',
            },
          },
        },
        receiptMeta: { source: 'lifere_boot' },
      });
      logger.info?.('[LIFERE-BOOT] Demo buyer client seeded');
    }
  }

  const marriageEdge = path.join(ROOT, 'data/twins/default/relationships/adam_sherry_marriage.json');
  if (!fs.existsSync(marriageEdge)) {
    fs.mkdirSync(path.dirname(marriageEdge), { recursive: true });
    fs.writeFileSync(marriageEdge, `${JSON.stringify({
      schema: 'lifere_relationship_twin_v1',
      edge_id: 'adam_sherry_marriage',
      type: 'marriage',
      parties: ['adam', 'sherry'],
      trust_level: 0.92,
      friction_points: ['schedule_overload', 'builder_hours'],
      shared_goals: ['family_dinner_4x_week'],
      updated_at: new Date().toISOString(),
    }, null, 2)}\n`);
  }

  return { ok: true, booted: true };
}

export function createLifeREBootService(deps) {
  return { boot: () => bootLifeRE(deps) };
}
