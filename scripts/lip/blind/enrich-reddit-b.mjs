/**
 * SYNOPSIS: Time-matched Reddit enrichment for Segment B (cached; rate-limit aware).
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Time-matched Reddit enrichment for Segment B (cached; rate-limit aware).
 * Reuses existing blind_b_timeline.jsonl candles/TG posts; injects reddit events.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIP_DATA } from '../lib/paths.mjs';
import { ensureLipDataDir } from '../lib/accounts.mjs';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pullpushSearch({ q, after, before, size = 25 }) {
  const url = `https://api.pullpush.io/reddit/search/submission/?q=${encodeURIComponent(q)}&after=${after}&before=${before}&size=${size}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Lumin-LIP-blind/1.0 (research)' } });
    if (res.status === 429) {
      await sleep(8000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return { ok: false, status: res.status, data: [] };
    const json = await res.json();
    if (json.error) {
      await sleep(8000 * (attempt + 1));
      continue;
    }
    return { ok: true, data: json.data || [] };
  }
  return { ok: false, status: 429, data: [] };
}

function toRedditEvents(symbol, submissions) {
  return submissions.map((s) => {
    const created = (s.created_utc || 0) * 1000;
    const sub = s.subreddit || 'unknown';
    const title = s.title || '';
    const selftext = (s.selftext || '').slice(0, 240);
    return {
      type: 'reddit',
      symbol,
      ts: created,
      source: `reddit:r/${sub}`,
      author: s.author || 'unknown',
      text: `[r/${sub}] u/${s.author || '?'}: ${title} ${selftext}`.trim(),
      permalink: s.full_link || s.url || null,
      score: s.score ?? null,
    };
  }).filter((e) => e.ts > 0);
}

export async function enrichSegmentBWithReddit(opts = {}) {
  ensureLipDataDir();
  const tlPath = path.join(LIP_DATA, 'blind_b_timeline.jsonl');
  const metaPath = path.join(LIP_DATA, 'blind_b_meta.json');
  const cachePath = path.join(LIP_DATA, 'blind_b_reddit_cache.json');
  if (!fs.existsSync(tlPath) || !fs.existsSync(metaPath)) {
    throw new Error('Run lip:blind:b once first to build Segment B timeline');
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
  const maxPumps = opts.maxPumps ?? meta.used?.length ?? 20;
  const unique = [];
  const seenKey = new Set();
  for (const u of meta.used || []) {
    const k = `${u.symbol}|${u.date}`;
    if (seenKey.has(k)) continue;
    seenKey.add(k);
    unique.push(u);
    if (unique.length >= maxPumps) break;
  }

  let fetched = 0;
  let fromCache = 0;
  const allReddit = [];

  for (const u of unique) {
    const ck = `${u.symbol}|${u.date}`;
    if (cache[ck]?.posts) {
      fromCache += 1;
      allReddit.push(...cache[ck].posts.map((p) => ({ ...p, symbol: u.symbol })));
      continue;
    }
    const dayTs = Date.parse(`${u.date}T12:00:00Z`);
    const after = Math.floor(dayTs / 1000) - 18 * 3600;
    const before = Math.floor(dayTs / 1000) + 18 * 3600;
    // Broader queries — ticker alone is sparse; include pump language
    // Global q=SYMBOL works better than subreddit-scoped (many tickers only in niche subs)
    const queries = [u.symbol, `${u.symbol} pump`, `${u.symbol} binance`];
    const found = [];
    const seenId = new Set();
    for (const q of queries) {
      const r = await pullpushSearch({ q, after, before, size: 25 });
      await sleep(3000);
      for (const s of r.data) {
        const id = s.id || s.full_link;
        if (!id || seenId.has(id)) continue;
        // Keep crypto-ish posts; drop pure noise when title has no ticker/crypto cue
        const blob = `${s.title || ''} ${s.selftext || ''} ${s.subreddit || ''}`.toLowerCase();
        const ticker = u.symbol.toLowerCase();
        if (!blob.includes(ticker) && !/crypto|binance|pump|coin|token/.test(blob)) continue;
        seenId.add(id);
        found.push(s);
      }
      if (found.length >= 10) break;
    }
    const posts = toRedditEvents(u.symbol, found);
    cache[ck] = { at: new Date().toISOString(), count: posts.length, posts };
    fetched += 1;
    allReddit.push(...posts);
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  }

  // Rebuild timeline: drop old reddit, keep candles+post, add fresh reddit
  const existing = fs
    .readFileSync(tlPath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((e) => e.type !== 'reddit');

  const merged = [...existing, ...allReddit].sort(
    (a, b) => a.ts - b.ts || (a.type === 'candle' ? -1 : 1)
  );

  meta.posts_reddit = allReddit.length;
  meta.reddit_enrichment = {
    at: new Date().toISOString(),
    unique_pump_days: unique.length,
    fetched_live: fetched,
    from_cache: fromCache,
    reddit_events: allReddit.length,
  };
  meta.used = (meta.used || []).map((u) => ({
    ...u,
    reddit_posts: (cache[`${u.symbol}|${u.date}`]?.count) ?? u.reddit_posts ?? 0,
  }));

  fs.writeFileSync(tlPath, merged.map((e) => JSON.stringify(e)).join('\n'));
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  return { meta, reddit_events: allReddit.length, timeline_events: merged.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  enrichSegmentBWithReddit({}).then((r) => console.log(JSON.stringify(r, null, 2)));
}
