/**
 * SYNOPSIS: Segment B: different real pumps than Segment A + time-matched Reddit posts (Pullpush).
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Segment B: different real pumps than Segment A + time-matched Reddit posts (Pullpush).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

const RAW = path.join(LIP_DATA, 'blind_raw_b');
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
    return {
      type: 'candle',
      symbol,
      ts: Number(p[0]),
      close: Number(p[4]),
      volume: Number(p[5]),
    };
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

async function fetchRedditAround(symbol, dayTs) {
  const after = Math.floor(dayTs / 1000) - 12 * 3600;
  const before = Math.floor(dayTs / 1000) + 12 * 3600;
  const subs = ['CryptoCurrency', 'CryptoMoonShots', 'SatoshiStreetBets', 'cryptomarkets'];
  const posts = [];
  for (const sub of subs) {
    const url = `https://api.pullpush.io/reddit/search/submission/?subreddit=${sub}&q=${encodeURIComponent(symbol)}&after=${after}&before=${before}&size=20`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Lumin-LIP-blind/1.0' } });
      if (!res.ok) continue;
      const json = await res.json();
      for (const s of json.data || []) {
        const created = (s.created_utc || 0) * 1000;
        if (!created) continue;
        const title = s.title || '';
        const selftext = (s.selftext || '').slice(0, 280);
        posts.push({
          type: 'reddit',
          symbol,
          ts: created,
          source: `reddit:r/${sub}`,
          author: s.author || 'unknown',
          text: `[r/${sub}] u/${s.author || '?'}: ${title} ${selftext}`.trim(),
          permalink: s.full_link || s.url || null,
        });
      }
    } catch {
      /* skip */
    }
    await sleep(350);
  }
  return posts;
}

/**
 * Segment B: 2020-03 → 2020-12, exclude Segment A (symbol+date) keys.
 */
export async function buildSegmentBTimeline(opts = {}) {
  ensureLipDataDir();
  fs.mkdirSync(RAW, { recursive: true });

  const excludePath = path.join(LIP_DATA, 'blind_timeline_meta.json');
  const exclude = new Set();
  if (fs.existsSync(excludePath)) {
    const metaA = JSON.parse(fs.readFileSync(excludePath, 'utf8'));
    for (const u of metaA.used || []) exclude.add(`${u.symbol}|${u.date}`);
  }

  const csvPath = path.join(LIP_DATA, 'blind_raw', 'pump_telegram.csv');
  if (!fs.existsSync(csvPath)) {
    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, await (await fetch(CSV_URL)).text());
  }
  const pumps = parsePumpCsv(fs.readFileSync(csvPath, 'utf8'))
    .filter((p) => p.date >= '2020-03-01' && p.date <= '2020-12-31')
    .filter((p) => !exclude.has(`${p.symbol}|${p.date}`))
    .sort((a, b) => a.ts - b.ts);

  const maxPumps = opts.maxPumps ?? 30;
  const timeline = [];
  const used = [];
  const redditCount = { fetched: 0 };

  for (const p of pumps) {
    if (used.length >= maxPumps) break;
    const d0 = p.date;
    const dPrev = new Date(p.ts - 86400000).toISOString().slice(0, 10);
    const paths = [];
    let quote = null;
    for (const d of [dPrev, d0]) {
      const got = await downloadZip(p.symbol, d, RAW);
      await sleep(120);
      if (got) {
        paths.push(got.csvPath);
        quote = got.quote;
      }
    }
    if (!paths.length) continue;

    for (const cp of paths) timeline.push(...parseKlines(cp, p.symbol));

    // Real Telegram pump timestamp (Sapienza)
    timeline.push({
      type: 'post',
      symbol: p.symbol,
      ts: p.ts,
      source: 'sapienza_telegram_pump',
      group: p.group,
      text: `TELEGRAM PUMP group=${p.group} binance ${p.symbol} ${p.date} ${p.hour}`,
    });

    // Real Reddit submissions same ±12h window (Pullpush historical)
    const reddit = await fetchRedditAround(p.symbol, p.ts);
    redditCount.fetched += reddit.length;
    timeline.push(...reddit);

    used.push({ symbol: p.symbol, date: p.date, hour: p.hour, group: p.group, quote, reddit_posts: reddit.length });
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
    segment: 'B',
    at: new Date().toISOString(),
    date_range: '2020-03-01..2020-12-31',
    excluded_segment_a_keys: exclude.size,
    pumps_loaded: used.length,
    timeline_events: deduped.length,
    posts_telegram: deduped.filter((e) => e.type === 'post').length,
    posts_reddit: deduped.filter((e) => e.type === 'reddit').length,
    candles: deduped.filter((e) => e.type === 'candle').length,
    reddit_total_fetched: redditCount.fetched,
    used,
    note: 'Different segment from A. Real Binance 1m + Sapienza TG times + Pullpush Reddit from same windows.',
  };

  fs.writeFileSync(path.join(LIP_DATA, 'blind_b_meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(LIP_DATA, 'blind_b_timeline.jsonl'), deduped.map((e) => JSON.stringify(e)).join('\n'));
  return { timeline: deduped, meta };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSegmentBTimeline({ maxPumps: 25 }).then((r) => console.log(JSON.stringify(r.meta, null, 2)));
}
