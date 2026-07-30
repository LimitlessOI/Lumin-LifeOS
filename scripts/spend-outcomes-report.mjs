/**
 * SYNOPSIS: Founder S00 report — $ spend → shipped build outcomes.
 * Usage: npm run spend:outcomes -- [--hours=168] [--usd=20]
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import pg from 'pg';
import { createBuilderOSControlPlaneService } from '../services/builderos-control-plane-service.js';

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.slice(name.length + 3);
}

async function main() {
  const hours = Number(arg('hours', '168'));
  const usdRaw = arg('usd', null);
  const spendUsd = usdRaw != null && usdRaw !== '' ? Number(usdRaw) : null;

  if (!process.env.DATABASE_URL) {
    console.log(JSON.stringify({
      ok: false,
      error: 'DATABASE_URL required',
      hint: 'Run against Neon/Railway with DATABASE_URL set, or GET /api/v1/builderos/control-plane/spend-outcomes',
    }, null, 2));
    process.exit(2);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const cp = createBuilderOSControlPlaneService({ pool, logger: console });
    const report = await cp.getSpendOutcomesReport({ sinceHours: hours, spendUsd });
    const estimate = await cp.estimateBuilds({
      items: [
        { label: 'generic_recent', product_lane: null },
      ],
    });
    const out = {
      ...report,
      sample_estimate: estimate,
    };
    console.log(JSON.stringify(out, null, 2));
    if (report.blind && (process.env.SPEND_OUTCOME_STRICT === '1' || process.env.SPEND_OUTCOME_STRICT === 'true')) {
      process.exit(3);
    }
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});