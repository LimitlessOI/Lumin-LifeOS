/**
 * SYNOPSIS: Scan CoinGecko for pump-like live movers (identify / look — paper only)
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Scan CoinGecko for pump-like live movers (identify / look — paper only)
 */
import { appendJsonl, loadAccounts, seedAccounts } from './lib/accounts.mjs';
import { SCANS_PATH } from './lib/paths.mjs';

const CG = 'https://api.coingecko.com/api/v3';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Lumin-LIP-paper/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function classify(m) {
  const ch = Number(m.price_change_percentage_24h) || 0;
  const vol = Number(m.total_volume) || 0;
  const mcap = Number(m.market_cap) || 1;
  const volToMcap = vol / mcap;
  let score = 0;
  if (ch >= 15) score += Math.min(40, ch);
  if (ch >= 40) score += 20;
  if (volToMcap >= 0.5) score += 25;
  if (volToMcap >= 1.5) score += 15;
  if (mcap > 0 && mcap < 50_000_000) score += 10;
  const likely_pd = ch >= 25 && volToMcap >= 0.35 && mcap < 200_000_000;
  const legit_trend = ch >= 12 && mcap >= 500_000_000 && volToMcap < 0.25;
  const label = likely_pd ? 'likely_pd' : legit_trend ? 'legit_trend' : score >= 35 ? 'unclear' : 'weak';
  return { score: Math.round(score), label, vol_to_mcap: Math.round(volToMcap * 1000) / 1000, ch_24h: ch };
}

async function main() {
  if (!loadAccounts()) seedAccounts({ count: 100 });

  const markets = await fetchJson(
    `${CG}/coins/markets?vs_currency=usd&order=volume_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`
  );

  const candidates = markets
    .map((m) => {
      const c = classify(m);
      return {
        id: m.id,
        symbol: m.symbol,
        name: m.name,
        price: m.current_price,
        market_cap: m.market_cap,
        total_volume: m.total_volume,
        ...c,
      };
    })
    .filter((c) => c.score >= 30 || c.label === 'likely_pd' || c.label === 'legit_trend')
    .sort((a, b) => b.score - a.score);

  const row = {
    at: new Date().toISOString(),
    source: 'coingecko_markets',
    candidate_count: candidates.length,
    top: candidates.slice(0, 25),
  };
  appendJsonl(SCANS_PATH, row);

  console.log(
    JSON.stringify(
      {
        ok: true,
        scanned: markets.length,
        candidates: candidates.length,
        top: candidates.slice(0, 15),
        note: 'Paper identify only — no orders placed. Fence: do not organize pumps.',
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err.message || err) }));
  process.exit(1);
});
