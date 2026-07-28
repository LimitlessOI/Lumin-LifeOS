/**
 * SYNOPSIS: Fetch REAL Binance Vision 1m klines + Sapienza Telegram pump post timestamps.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Fetch REAL Binance Vision 1m klines + Sapienza Telegram pump post timestamps.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(LIP_DATA, 'blind_raw');
const CSV_URL =
  'https://raw.githubusercontent.com/SystemsLab-Sapienza/pump-and-dump-dataset/master/pump_telegram.csv';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadZip(symbol, dateStr, outDir) {
  for (const quote of ['USDT', 'BTC', 'ETH']) {
    const pair = `${symbol}${quote}`;
    const url = `https://data.binance.vision/data/spot/daily/klines/${pair}/1m/${pair}-1m-${dateStr}.zip`;
    const zipPath = path.join(outDir, `${pair}-${dateStr}.zip`);
    const csvName = `${pair}-1m-${dateStr}.csv`;
    const csvPath = path.join(outDir, csvName);
    if (fs.existsSync(csvPath)) return { csvPath, pair, quote };

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
    if (fs.existsSync(csvPath)) return { csvPath, pair, quote };
  }
  return null;
}

function parseKlines(csvPath, symbol) {
  const text = fs.readFileSync(csvPath, 'utf8').trim();
  if (!text) return [];
  return text.split('\n').map((line) => {
    const p = line.split(',');
    return {
      type: 'candle',
      symbol,
      ts: Number(p[0]),
      open: Number(p[1]),
      high: Number(p[2]),
      low: Number(p[3]),
      close: Number(p[4]),
      volume: Number(p[5]),
    };
  });
}

function parsePumpCsv(text) {
  const lines = text.trim().split('\n').slice(1);
  const out = [];
  for (const line of lines) {
    const [symbol, group, date, hour, exchange] = line.split(',');
    if ((exchange || '').toLowerCase() !== 'binance') continue;
    const [hh, mm] = (hour || '16:00').split(':').map(Number);
    const ts = Date.parse(`${date}T${String(hh).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}:00Z`);
    if (!Number.isFinite(ts)) continue;
    out.push({ symbol: symbol.toUpperCase(), group, date, hour, exchange, ts });
  }
  return out;
}

export async function buildRealTimeline(opts = {}) {
  ensureLipDataDir();
  fs.mkdirSync(RAW, { recursive: true });

  const maxPumps = opts.maxPumps ?? 25;
  const csvPath = path.join(RAW, 'pump_telegram.csv');
  if (!fs.existsSync(csvPath)) {
    const res = await fetch(CSV_URL);
    fs.writeFileSync(csvPath, await res.text());
  }
  const pumps = parsePumpCsv(fs.readFileSync(csvPath, 'utf8'));
  // Prefer 2019–2021 Binance pumps (USDT era more complete on Vision)
  const filtered = pumps.filter((p) => p.date >= '2019-06-01' && p.date <= '2021-01-31');
  filtered.sort((a, b) => a.ts - b.ts);

  const timeline = [];
  const used = [];
  let tries = 0;
  for (const p of filtered) {
    if (used.length >= maxPumps) break;
    if (tries > maxPumps * 4) break;
    tries += 1;
    // also fetch day-before for lookback volume baseline
    const d0 = p.date;
    const dPrev = new Date(p.ts - 86400000).toISOString().slice(0, 10);
    const paths = [];
    let quoteUsed = null;
    for (const d of [dPrev, d0]) {
      const got = await downloadZip(p.symbol, d, RAW);
      await sleep(150);
      if (got) {
        paths.push(got.csvPath);
        quoteUsed = got.quote;
      }
    }
    if (!paths.length) continue;

    for (const cp of paths) {
      timeline.push(...parseKlines(cp, p.symbol));
    }
    timeline.push({
      type: 'post',
      symbol: p.symbol,
      ts: p.ts,
      source: 'sapienza_telegram_pump',
      group: p.group,
      quote: quoteUsed,
      text: `TELEGRAM PUMP ANNOUNCEMENT group=${p.group} exchange=binance coin=${p.symbol} (historical labeled)`,
    });
    used.push({ symbol: p.symbol, date: p.date, hour: p.hour, group: p.group, quote: quoteUsed });
  }

  // Dedupe candles by symbol+ts
  const seen = new Set();
  const deduped = [];
  for (const ev of timeline.sort((a, b) => a.ts - b.ts || (a.type === 'post' ? 1 : -1))) {
    if (ev.type === 'candle') {
      const k = `${ev.symbol}:${ev.ts}`;
      if (seen.has(k)) continue;
      seen.add(k);
    }
    deduped.push(ev);
  }

  const meta = {
    at: new Date().toISOString(),
    pumps_loaded: used.length,
    pumps_attempted: tries,
    timeline_events: deduped.length,
    posts: deduped.filter((e) => e.type === 'post').length,
    candles: deduped.filter((e) => e.type === 'candle').length,
    used,
    note: 'Real Binance Vision 1m klines + real Sapienza Telegram pump timestamps. Feeder streams in time order.',
  };

  fs.writeFileSync(path.join(LIP_DATA, 'blind_timeline_meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(LIP_DATA, 'blind_timeline.jsonl'), deduped.map((e) => JSON.stringify(e)).join('\n'));
  return { timeline: deduped, meta };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildRealTimeline({ maxPumps: 25 }).then((r) => {
    console.log(JSON.stringify(r.meta, null, 2));
  });
}
