/**
 * SYNOPSIS: Seed 100 Limitless Protocol paper accounts
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Seed 100 Limitless Protocol paper accounts
 */
import { seedAccounts } from './lib/accounts.mjs';

const force = process.argv.includes('--force');
const countArg = process.argv.find((a) => a.startsWith('--count='));
const count = countArg ? Number(countArg.split('=')[1]) : 100;

const payload = seedAccounts({ count, lane: 'crypto', force });
const total = payload.accounts.reduce((s, a) => s + a.balance_usd, 0);
const byTranche = payload.accounts.reduce((m, a) => {
  m[a.tranche] = (m[a.tranche] || 0) + 1;
  return m;
}, {});

console.log(
  JSON.stringify(
    {
      ok: true,
      strategy_id: payload.strategy_id,
      count: payload.count,
      total_paper_usd: Math.round(total * 100) / 100,
      tranche_counts: byTranche,
      path: 'data/lip/accounts.json',
    },
    null,
    2
  )
);
