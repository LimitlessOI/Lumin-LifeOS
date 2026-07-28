/**
 * SYNOPSIS: Segment E: unused 2020-10..2020-12 pumps (exclude A/B/C/D).
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Segment E: unused 2020-10..2020-12 pumps (exclude A/B/C/D).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

const RAW = path.join(LIP_DATA, 'blind_raw_e');
const CSV_URL =
  'https://raw.githubusercontent.com/SystemsLab-Sapienza/pump-and-dump-dataset/master/pump_telegram.csv';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function dayOffset(dateStr, days) {
  return new Date(Date.parse(`${dateStr}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

async function downloadZip(symbol, dateStr, outDir) {
  for (const quote of ['USDT', 'BTC', 'ETH']) {
    const pair = `${symbol}${quote}`;
    const url = `https://data.binance.vision/data/spot/daily/klines/${pair}/1m/${pair}-1m-${dateStr}.zip`;
    const zipPath = path.join(outDir, `${pair}-${dateStr}.zip`);
    const csvPath = path.join(outDir, `${pair}-1m-${dateStr}.csv`);
    if (fs.existsSync(csvPath)) return { csvPath, quote };
    const res = await fetch(url);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) continue;
    fs.writeFileSync(zipPath, buf);
    try {
      execSync(`unzip -o -q "${zipPath}" -d "${outDir}"`, { stdio: 'pipe' });
    } catch {
      continue;
    }
    if (fs.existsSync(csvPath)) return { csvPath, quote };
  }
  return null;
}

function parseKlines(csvPath, symbol) {
  const text = fs.readFileSync(csvPath, 'utf8').trim();
  if (!text) return [];
  return text.split('\n').map((line) => {
    const p = line.split(',');
    return { type: 'candle', symbol, ts: Number(p[0]), close: Number(p[4]), volume: Number(p[5]) };
  });
}

function parsePumpCsv(text) {
  return text
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [symbol, group, date, hour, exchange] = line.split(',');
      if ((exchange || '').toLowerCase() !== 'binance') return null;
      const [hh, mm] = (hour || '16:00').split(':').map(Number);
      const ts = Date.parse(`${date}T${String(hh).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}:00Z`);
      if (!Number.isFinite(ts)) return null;
      return { symbol: symbol.toUpperCase(), group, date, hour, exchange, ts };
    })
    .filter(Boolean);
}

function loadExclude() {
  const exclude = new Set();
  for (const f of ['blind_timeline_meta.json', 'blind_b_meta.json', 'blind_c_meta.json', 'blind_d_meta.json']) {
    const p = path.join(LIP_DATA, f);
    if (!fs.existsSync(p)) continue;
    for (const u of JSON.parse(fs.readFileSync(p, 'utf8')).used || []) {
      exclude.add(`${u.symbol}|${u.date}`);
    }
  }
  return exclude;
}

export async function buildSegmentETimeline(opts = {}) {
  ensureLipDataDir();
  fs.mkdirSync(RAW, { recursive: true });
  const exclude = loadExclude();
  const csvPath = path.join(LIP_DATA, 'blind_raw', 'pump_telegram.csv');
  if (!fs.existsSync(csvPath)) {
    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, await (await fetch(CSV_URL)).text());
  }

  const pumps = parsePumpCsv(fs.readFileSync(csvPath, 'utf8'))
    .filter((p) => p.date >= '2020-10-01' && p.date <= '2020-12-31')
    .filter((p) => !exclude.has(`${p.symbol}|${p.date}`))
    .sort((a, b) => a.ts - b.ts);

  const maxPumps = opts.maxPumps ?? 30;
  const timeline = [];
  const used = [];

  for (const p of pumps) {
    if (used.length >= maxPumps) break;
    const days = [dayOffset(p.date, -1), p.date];
    const paths = [];
    let quote = null;
    for (const d of days) {
      const got = await downloadZip(p.symbol, d, RAW);
      await sleep(90);
      if (got) {
        paths.push(got.csvPath);
        quote = got.quote;
      }
    }
    if (!paths.length) continue;
    for (const cp of paths) timeline.push(...parseKlines(cp, p.symbol));
    timeline.push({
      type: 'post',
      symbol: p.symbol,
      ts: p.ts,
      source: 'sapienza_telegram_pump',
      group: p.group,
      text: `TELEGRAM PUMP ${p.symbol} ${p.date} ${p.hour}`,
    });
    used.push({ symbol: p.symbol, date: p.date, hour: p.hour, group: p.group, quote });
  }

  const seen = new Set();
  const deduped = [];
  for (const ev of timeline.sort((a, b) => a.ts - b.ts || (a.type === 'candle' ? -1 : 1))) {
    if (ev.type === 'candle') {
      const k = `${ev.symbol}:${ev.ts}`;
      if (seen.has(k)) continue;
      seen.add(k);
    }
    deduped.push(ev);
  }

  const meta = {
    segment: 'E',
    at: new Date().toISOString(),
    date_range: '2020-10-01..2020-12-31',
    excluded_prior_keys: exclude.size,
    pumps_loaded: used.length,
    timeline_events: deduped.length,
    posts_telegram: deduped.filter((e) => e.type === 'post').length,
    candles: deduped.filter((e) => e.type === 'candle').length,
    used,
    note: 'Fresh slice for solve-reader (fade-primary). Unused vs A–D.',
  };
  fs.writeFileSync(path.join(LIP_DATA, 'blind_e_meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(LIP_DATA, 'blind_e_timeline.jsonl'), deduped.map((e) => JSON.stringify(e)).join('\n'));
  return { timeline: deduped, meta };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSegmentETimeline({ maxPumps: 30 }).then((r) => console.log(JSON.stringify(r.meta, null, 2)));
}
