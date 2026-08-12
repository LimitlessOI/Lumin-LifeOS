/**
 * SYNOPSIS: Looks up real market pricing for a Magic: The Gathering card via
 * Scryfall's free public API (no key required) and classifies it into a
 * sell-venue tier. Deliberately not using the browser-overlay/drive channel
 * for pricing -- that system has a known, live-confirmed reliability gap
 * (repeat-click loop found 2026-08-10) and a real pricing API is both more
 * reliable and faster for hundreds of lookups than driving a browser per card.
 *
 * Rewritten 2026-08-11 after a real, live-confirmed mispricing bug (see
 * pickPrinting below): the old implementation called
 * /cards/named?fuzzy=<name>&set=<set> and used whatever single card came
 * back. Two independent failures compounded there, both reproduced against
 * the live API before this rewrite:
 *   1. Scryfall's `set` filter takes a set CODE ("drk"), not a set name
 *      ("The Dark") -- which is what the vision model actually returns. Every
 *      such lookup 404'd and silently fell back to name-only.
 *   2. Name-only fuzzy returns an arbitrary default printing, which for older
 *      cards is routinely an MTGO digital-only set (Masters Edition IV,
 *      Vintage Masters) that has no paper price at all -- so real, sellable
 *      cards came back `usd: null` and were tiered `unknown`/`manual_review`.
 * This version resolves set names to codes against /sets, searches paper
 * printings only, and reports the real price range across printings so an
 * unresolvable set degrades into an honest range + review flag rather than a
 * confidently wrong number.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const SCRYFALL_BASE = 'https://api.scryfall.com';
// Scryfall asks integrators to keep requests to roughly 10/sec with a real
// User-Agent and Accept header -- https://scryfall.com/docs/api. A single
// card lookup now costs 2-3 requests, so the throttle lives here (applied to
// every outbound call) rather than relying on the caller's per-card delay.
const HEADERS = { 'User-Agent': 'LifeOS-MTG-Cataloger/1.0', Accept: 'application/json' };
// Found live 2026-08-11 repricing 368 real rows from production: the first 15
// lookups succeeded and the next 353 all failed within ~45 seconds -- roughly
// one request each, i.e. every first call was being rejected outright. Scryfall
// sits behind Cloudflare and a datacenter IP issuing ~9 req/sec trips it, even
// though that is nominally inside their stated ~10/sec guidance. Backed off to
// a slower floor with real retry/backoff rather than pretending the failures
// were the cards' fault.
const MIN_REQUEST_GAP_MS = 175;
const MAX_PRINT_PAGES = 3;
const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
// Found live 2026-08-11: a reprice run stalled permanently at 249/368 with
// zero errors recorded. `fetch` has no default timeout, and because every
// Scryfall call is serialized through one chain, a single hung request blocks
// every later card forever -- the job just sat there looking busy.
const REQUEST_TIMEOUT_MS = 15000;
const CACHE_LIMIT = 10000;

let lastRequestAt = 0;
let requestChain = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serializes every Scryfall call, spaces them >= MIN_REQUEST_GAP_MS apart, and
 * retries the statuses that mean "slow down" rather than "no such card".
 */
function scryfallFetch(url, { logger } = {}) {
  const run = requestChain.then(async () => {
    let res = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();
      try {
        res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      } catch (err) {
        // A timed-out or dropped connection is exactly the "try again" case;
        // let it fall through to the same backoff as a 429 rather than
        // killing the chain.
        if (attempt === MAX_RETRIES) throw err;
        logger?.warn?.({ err: err.message, url }, 'scryfall request failed, retrying');
        await sleep(1000 * 2 ** attempt);
        lastRequestAt = Date.now();
        continue;
      }
      if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_RETRIES) return res;

      const retryAfter = Number(res.headers.get('retry-after'));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * 2 ** attempt;
      logger?.warn?.({ status: res.status, backoff, url }, 'scryfall throttled, backing off');
      await sleep(backoff);
      lastRequestAt = Date.now();
    }
    return res;
  });
  requestChain = run.then(() => undefined, () => undefined);
  return run;
}

// A collection legitimately contains the same card many times over (and the
// duplicate-batch problem means the same photo can appear twice), so the same
// name+set is looked up repeatedly within one reprice run. Caching turns that
// into one real request instead of hundreds.
const priceCache = new Map();

function cacheKey(name, set) {
  return `${String(name).toLowerCase()}|${String(set || '').toLowerCase()}`;
}

function rememberPrice(key, value) {
  if (priceCache.size >= CACHE_LIMIT) priceCache.clear();
  priceCache.set(key, value);
  return value;
}

/** Exported for tests and for callers that want a fresh read of live prices. */
export function clearPriceCache() {
  priceCache.clear();
  setIndexPromise = null;
}

function normalizeSetKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// The vision model reads what is printed on the card ("4th Edition", "Alpha"),
// which is frequently not Scryfall's canonical set name ("Fourth Edition",
// "Limited Edition Alpha"). Confirmed against the real /sets payload.
const ORDINALS = {
  '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth',
  '6th': 'sixth', '7th': 'seventh', '8th': 'eighth', '9th': 'ninth', '10th': 'tenth',
};

const SET_NAME_ALIASES = {
  alpha: 'limited edition alpha',
  beta: 'limited edition beta',
  unlimited: 'unlimited edition',
  revised: 'revised edition',
  'sixth edition': 'classic sixth edition',
  'core set 2019': 'core set 2019',
  arabian: 'arabian nights',
};

function expandOrdinals(key) {
  return key
    .split(' ')
    .map((word) => ORDINALS[word] || word)
    .join(' ');
}

let setIndexPromise = null;

async function loadSetIndex() {
  const res = await scryfallFetch(`${SCRYFALL_BASE}/sets`);
  if (!res.ok) throw new Error(`scryfall_sets_${res.status}`);
  const json = await res.json();
  const byName = new Map();
  const codes = new Set();
  for (const set of json?.data || []) {
    const code = String(set.code || '').toLowerCase();
    if (!code) continue;
    codes.add(code);
    byName.set(expandOrdinals(normalizeSetKey(set.name)), code);
  }
  return { byName, codes };
}

async function getSetIndex({ logger } = {}) {
  if (!setIndexPromise) {
    setIndexPromise = loadSetIndex().catch((err) => {
      // A failed set-index load must not poison every later lookup -- clear
      // the cached rejection so the next card retries it.
      setIndexPromise = null;
      logger?.warn?.({ err: err.message }, 'scryfall set index load failed');
      return null;
    });
  }
  return setIndexPromise;
}

/** Exported for tests: set name/code (as a vision model reports it) -> Scryfall set code. */
export function resolveSetCodeFrom(index, set) {
  if (!index || !set) return null;
  const raw = String(set).trim().toLowerCase();
  if (index.codes.has(raw)) return raw;
  const key = expandOrdinals(normalizeSetKey(set));
  if (!key) return null;
  if (index.byName.has(key)) return index.byName.get(key);
  const alias = SET_NAME_ALIASES[key];
  if (alias && index.byName.has(alias)) return index.byName.get(alias);
  if (alias && index.codes.has(alias)) return alias;
  return null;
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Chooses which real paper printing's price to report.
 *
 * Exported and pure so the selection rule -- the part that actually decides
 * what a card is "worth" and therefore whether it gets individually listed or
 * thrown in a bulk lot -- is testable without network access.
 *
 * @param {Array<{set:string, prices:{usd?:string|null, usd_foil?:string|null}, id?:string, set_name?:string}>} prints
 * @param {string|null} setCode resolved Scryfall set code, or null if unresolvable
 */
export function pickPrinting(prints, setCode) {
  const paper = (prints || []).filter(Boolean);
  if (!paper.length) return null;

  const priced = paper
    .map((p) => ({ print: p, usd: toNumber(p.prices?.usd), foil: toNumber(p.prices?.usd_foil) }))
    .filter((p) => p.usd != null || p.foil != null);

  const usdValues = priced.map((p) => p.usd).filter((v) => v != null);
  const range = {
    price_min_usd: usdValues.length ? Math.min(...usdValues) : null,
    price_max_usd: usdValues.length ? Math.max(...usdValues) : null,
    printing_count: paper.length,
  };

  const inSet = setCode
    ? priced.find((p) => String(p.print.set).toLowerCase() === setCode)
    : null;
  if (inSet && inSet.usd != null) {
    return { ...range, chosen: inSet, price_match: 'set_exact', needs_review: false };
  }

  // Distinguish "the card isn't printed in the set the photo suggested" (a
  // vision misread) from "that printing exists but Scryfall has no price for
  // it" -- they need different follow-up and the old code conflated them.
  const setExistsUnpriced = Boolean(
    setCode && paper.some((p) => String(p.set).toLowerCase() === setCode),
  );
  const matchLabel = setExistsUnpriced ? 'set_exact_unpriced' : setCode ? 'set_unmatched' : 'name_only';

  if (!priced.length) {
    return { ...range, chosen: null, price_match: matchLabel, needs_review: true };
  }

  // Set unknown or the named printing has no price of its own. A single
  // confident number would be a guess, so report the median as the central
  // estimate and flag the card for review when any printing is worth enough
  // that guessing low would mean bulk-lotting something valuable.
  const target = median(usdValues);
  const chosen = target == null
    ? priced[0]
    : priced.reduce((best, p) => {
      if (p.usd == null) return best;
      if (best?.usd == null) return p;
      return Math.abs(p.usd - target) < Math.abs(best.usd - target) ? p : best;
    }, null) || priced[0];

  return {
    ...range,
    chosen,
    price_match: matchLabel,
    needs_review: (range.price_max_usd ?? 0) >= 20,
  };
}

async function fetchPaperPrints(cardName, { logger } = {}) {
  const safeName = String(cardName).replace(/"/g, '');
  const query = `!"${safeName}" game:paper`;
  let url = `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released&dir=asc`;
  const prints = [];

  for (let page = 0; page < MAX_PRINT_PAGES && url; page++) {
    const res = await scryfallFetch(url, { logger });
    if (res.status === 404) break; // no paper printings at all (MTGO-only card)
    if (!res.ok) {
      logger?.warn?.({ status: res.status, cardName }, 'scryfall prints search failed');
      break;
    }
    const json = await res.json();
    prints.push(...(json?.data || []));
    url = json?.has_more ? json.next_page : null;
  }
  return prints;
}

const EMPTY_PRICE = {
  price_usd: null,
  price_usd_foil: null,
  price_min_usd: null,
  price_max_usd: null,
  printing_count: 0,
  price_match: null,
  needs_review: false,
};

/**
 * @returns {Promise<{ ok: boolean, scryfall_id?: string, canonical_name?: string, set_code?: string|null,
 *   price_usd: number|null, price_usd_foil: number|null, price_min_usd: number|null,
 *   price_max_usd: number|null, printing_count: number, price_match: string|null,
 *   needs_review: boolean, error?: string }>}
 */
export async function lookupMtgCardPrice(name, set, { logger } = {}) {
  if (!name) return { ok: false, error: 'no_name', ...EMPTY_PRICE };

  const key = cacheKey(name, set);
  if (priceCache.has(key)) return priceCache.get(key);

  try {
    // Step 1: canonicalize the name. The vision model's spelling can be
    // slightly off, and the exact-name print search below needs the real one.
    const namedRes = await scryfallFetch(`${SCRYFALL_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`, { logger });
    if (namedRes.status === 404) return rememberPrice(key, { ok: false, error: 'not_found', ...EMPTY_PRICE });
    if (!namedRes.ok) return { ok: false, error: `scryfall_${namedRes.status}`, ...EMPTY_PRICE };
    const namedCard = await namedRes.json();
    const canonicalName = namedCard?.name || name;

    // Step 2: every real paper printing, so pricing never lands on an
    // MTGO-only set that has no paper market price.
    const prints = await fetchPaperPrints(canonicalName, { logger });
    if (!prints.length) {
      return rememberPrice(key, {
        ok: true,
        scryfall_id: namedCard.id,
        canonical_name: canonicalName,
        set_code: null,
        price_usd: toNumber(namedCard.prices?.usd),
        price_usd_foil: toNumber(namedCard.prices?.usd_foil),
        price_min_usd: toNumber(namedCard.prices?.usd),
        price_max_usd: toNumber(namedCard.prices?.usd),
        printing_count: 0,
        price_match: 'no_paper_printing',
        needs_review: true,
      });
    }

    // Step 3: pick the printing the founder most likely physically holds.
    const index = await getSetIndex({ logger });
    const setCode = resolveSetCodeFrom(index, set);
    const picked = pickPrinting(prints, setCode);

    return rememberPrice(key, {
      ok: true,
      scryfall_id: picked?.chosen?.print?.id || namedCard.id,
      canonical_name: canonicalName,
      set_code: picked?.chosen?.print?.set || setCode || null,
      price_usd: picked?.chosen?.usd ?? null,
      price_usd_foil: picked?.chosen?.foil ?? null,
      price_min_usd: picked?.price_min_usd ?? null,
      price_max_usd: picked?.price_max_usd ?? null,
      printing_count: picked?.printing_count ?? prints.length,
      price_match: picked?.price_match ?? null,
      needs_review: picked?.needs_review ?? false,
    });
  } catch (err) {
    logger?.warn?.({ err: err.message, name, set }, 'scryfall price lookup failed');
    return { ok: false, error: err.message, ...EMPTY_PRICE };
  }
}

/**
 * Exact-match price lookup by Scryfall's own card ID -- more reliable than
 * fuzzy name matching when the caller already has it (e.g. a ManaBox CSV
 * export already includes a Scryfall ID per row; see routes/mtg-cards-routes.js
 * POST /import-csv).
 */
export async function lookupMtgCardById(scryfallId, { logger } = {}) {
  if (!scryfallId) return { ok: false, error: 'no_id', ...EMPTY_PRICE };
  try {
    const res = await scryfallFetch(`${SCRYFALL_BASE}/cards/${encodeURIComponent(scryfallId)}`, { logger });
    if (!res.ok) return { ok: false, error: `scryfall_${res.status}`, ...EMPTY_PRICE };
    const card = await res.json();
    const usd = toNumber(card.prices?.usd);
    return {
      ok: true,
      scryfall_id: card.id,
      canonical_name: card.name,
      set_code: card.set || null,
      price_usd: usd,
      price_usd_foil: toNumber(card.prices?.usd_foil),
      price_min_usd: usd,
      price_max_usd: usd,
      printing_count: 1,
      price_match: 'scryfall_id',
      needs_review: false,
    };
  } catch (err) {
    logger?.warn?.({ err: err.message, scryfallId }, 'scryfall id lookup failed');
    return { ok: false, error: err.message, ...EMPTY_PRICE };
  }
}

/**
 * Value-tier -> venue routing, matching the tiers already documented in
 * ~/Documents/MTG-Card-Sale/README.md from the manual-triage pass earlier.
 */
export function classifyValueTier(priceUsd) {
  if (priceUsd == null) return { tier: 'unknown', venue: 'manual_review' };
  if (priceUsd >= 20) return { tier: 'high', venue: 'tcgplayer_individual_listing' };
  if (priceUsd >= 3) return { tier: 'mid', venue: 'buylist_card_kingdom_or_similar' };
  return { tier: 'low', venue: 'bulk_lot' };
}
