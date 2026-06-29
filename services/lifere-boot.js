/**
 * SYNOPSIS: LifeRE boot — seed twins, permissions, founder extensions on startup.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
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

const DEMO_BUYER_CLIENT = {
  search_criteria: { beds: 3, area: 'local', budget_max: 450000 },
  showing_schedule: [],
  offer_prep_status: 'not_started',
};

const DEMO_SELLER_LISTING = {
  listing_health: 'active',
  address: '123 Demo St',
  showing_feedback: [],
  weekly_report_draft: null,
};

/** Ensures alpha/sentry demo refs exist for UI + agent-alpha probes (merge, never wipe). */
export async function ensureDemoDealTwins({ twinStore, userId = 'adam', logger = console } = {}) {
  if (!twinStore) return { ok: false, error: 'twinStore required' };

  const buyerTwin = twinStore.readTwin({ userId, moduleKey: 'buyer' }) || {
    schema: 'lifere_buyer_twin_v1',
    clients: {},
  };
  buyerTwin.clients = buyerTwin.clients || {};
  let buyerSeeded = false;
  if (!buyerTwin.clients.demo_buyer_001) {
    buyerTwin.clients.demo_buyer_001 = { ...DEMO_BUYER_CLIENT };
    buyerSeeded = true;
  }
  if (buyerSeeded || !twinStore.readTwin({ userId, moduleKey: 'buyer' })) {
    await twinStore.writeTwin({
      userId,
      moduleKey: 'buyer',
      twinKey: 'buyer',
      payload: buyerTwin,
      receiptMeta: { source: 'lifere_demo_seed' },
    });
    logger.info?.('[LIFERE-BOOT] Demo buyer client ensured');
  }

  const sellerTwin = twinStore.readTwin({ userId, moduleKey: 'seller' }) || {
    schema: 'lifere_seller_twin_v1',
    listings: {},
  };
  sellerTwin.listings = sellerTwin.listings || {};
  let sellerSeeded = false;
  if (!sellerTwin.listings.demo_listing_001) {
    sellerTwin.listings.demo_listing_001 = { ...DEMO_SELLER_LISTING };
    sellerSeeded = true;
  }
  if (sellerSeeded || !twinStore.readTwin({ userId, moduleKey: 'seller' })) {
    await twinStore.writeTwin({
      userId,
      moduleKey: 'seller',
      twinKey: 'seller',
      payload: sellerTwin,
      receiptMeta: { source: 'lifere_demo_seed' },
    });
    logger.info?.('[LIFERE-BOOT] Demo seller listing ensured');
  }

  return { ok: true, buyerSeeded, sellerSeeded };
}

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

    try {
      await pool.query(
        `INSERT INTO lifeos_users (user_handle, display_name, active, tier, role)
         VALUES ('adam', 'Adam Hopkins', true, 'founder', 'founder')
         ON CONFLICT (user_handle) DO NOTHING`,
      );
    } catch (err) {
      logger.warn?.('[LIFERE-BOOT] lifeos_users adam seed skip:', err.message);
    }

    await ensureDemoDealTwins({ twinStore, userId: 'adam', logger });
  } else {
    await ensureDemoDealTwins({ twinStore, userId: 'adam', logger });
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
