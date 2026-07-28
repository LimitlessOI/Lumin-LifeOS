/**
 * SYNOPSIS: Fetch real Binance daily klines for liquid majors — multi-year segments.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Fetch real Binance daily klines for liquid majors — multi-year segments.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

const RAW = path.join(LIP_DATA, 'breakout_raw');
const SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'DOTUSDT',
  'LTCUSDT',
  'ATOMUSDT',
  'NEARUSDT',
  'UNIUSDT',
  'AAVEUSDT',
  'FILUSDT',
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function monthsBetween(startYm, endYm) {
  const out = [];
  let [y, m] = startYm.split('-').map(Number);
  const [ey, em] = endYm.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

async function downloadMonth(pair, ym, outDir) {
  const url = `https://data.binance.vision/data/spot/monthly/klines/${pair}/1d/${pair}-1d-${ym}.zip`;
  const zipPath = path.join(outDir, `${pair}-1d-${ym}.zip`);
  const csvName = `${pair}-1d-${ym}.csv`;
  const csvPath = path.join(outDir, csvName);
  if (fs.existsSync(csvPath)) return csvPath;

  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50) return null;
  fs.writeFileSync(zipPath, buf);
  try {
    execSync(`unzip -o -q "${zipPath}" -d "${outDir}"`, { stdio: 'pipe' });
  } catch {
    return null;
  }
  return fs.existsSync(csvPath) ? csvPath : null;
}

function parseDailyCsv(csvPath, symbol) {
  const text = fs.readFileSync(csvPath, 'utf8').trim();
  if (!text) return [];
  return text.split('\n').map((line) => {
    const p = line.split(',');
    let ts = Number(p[0]);
    // Binance Vision: older files = ms; newer (2025+) often microseconds
    if (ts > 1e15) ts = Math.floor(ts / 1000);
    if (ts > 1e14) ts = Math.floor(ts / 1000);
    return {
      type: 'candle',
      symbol,
      ts,
      open: Number(p[1]),
      high: Number(p[2]),
      low: Number(p[3]),
      close: Number(p[4]),
      volume: Number(p[5]),
    };
  });
}

export async function buildBreakoutUniverse(opts = {}) {
  ensureLipDataDir();
  fs.mkdirSync(RAW, { recursive: true });
  const startYm = opts.startYm ?? '2024-01';
  const endYm = opts.endYm ?? '2026-06';
  const months = monthsBetween(startYm, endYm);
  const bySym = new Map();

  for (const pair of SYMBOLS) {
    const sym = pair.replace('USDT', '');
    const bars = [];
    for (const ym of months) {
      const csv = await downloadMonth(pair, ym, RAW);
      await sleep(80);
      if (!csv) continue;
      bars.push(...parseDailyCsv(csv, sym));
    }
    bars.sort((a, b) => a.ts - b.ts);
    // dedupe ts
    const seen = new Set();
    const deduped = [];
    for (const b of bars) {
      if (seen.has(b.ts)) continue;
      seen.add(b.ts);
      deduped.push(b);
    }
    bySym.set(sym, deduped);
  }

  const meta = {
    at: new Date().toISOString(),
    startYm,
    endYm,
    symbols: [...bySym.keys()],
    bars_per_symbol: Object.fromEntries([...bySym].map(([k, v]) => [k, v.length])),
    note: 'Binance Vision 1d USDT pairs — real data for breakout blind segments',
  };
  fs.writeFileSync(path.join(LIP_DATA, 'breakout_universe_meta.json'), JSON.stringify(meta, null, 2));
  // store as jsonl per symbol too heavy; one combined sorted timeline file per segment built at run
  const all = [];
  for (const [, bars] of bySym) all.push(...bars);
  all.sort((a, b) => a.ts - b.ts || a.symbol.localeCompare(b.symbol));
  fs.writeFileSync(path.join(LIP_DATA, 'breakout_universe.jsonl'), all.map((e) => JSON.stringify(e)).join('\n'));
  return { bySym, all, meta };
}

export function sliceSegment(all, startDate, endDate) {
  const a = Date.parse(`${startDate}T00:00:00Z`);
  const b = Date.parse(`${endDate}T23:59:59Z`);
  return all.filter((e) => e.ts >= a && e.ts <= b);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildBreakoutUniverse({}).then((r) => console.log(JSON.stringify(r.meta, null, 2)));
}
