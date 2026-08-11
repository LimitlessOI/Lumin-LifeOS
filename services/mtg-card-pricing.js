/**
 * SYNOPSIS: Looks up real market pricing for a Magic: The Gathering card via
 * Scryfall's free public API (no key required) and classifies it into a
 * sell-venue tier. Deliberately not using the browser-overlay/drive channel
 * for pricing -- that system has a known, live-confirmed reliability gap
 * (repeat-click loop found 2026-08-10) and a real pricing API is both more
 * reliable and faster for hundreds of lookups than driving a browser per card.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const SCRYFALL_BASE = 'https://api.scryfall.com';
// Scryfall asks integrators to keep requests to roughly 10/sec with a real
// User-Agent and Accept header -- https://scryfall.com/docs/api -- respected
// here with a small delay between calls in the batch loop (mtg-cards-routes.js),
// not inside this single-lookup function.
const HEADERS = { 'User-Agent': 'LifeOS-MTG-Cataloger/1.0', Accept: 'application/json' };

/**
 * @returns {Promise<{ ok: boolean, scryfall_id?: string, price_usd: number|null, price_usd_foil: number|null, error?: string }>}
 */
export async function lookupMtgCardPrice(name, set, { logger } = {}) {
  if (!name) return { ok: false, error: 'no_name', price_usd: null, price_usd_foil: null };

  const params = new URLSearchParams({ fuzzy: name });
  if (set) params.set('set', String(set).toLowerCase());

  try {
    const res = await fetch(`${SCRYFALL_BASE}/cards/named?${params.toString()}`, { headers: HEADERS });
    if (res.status === 404) {
      // Retry once without the set filter -- a misread/garbled set guess
      // shouldn't sink an otherwise-correct name match.
      if (set) return lookupMtgCardPrice(name, null, { logger });
      return { ok: false, error: 'not_found', price_usd: null, price_usd_foil: null };
    }
    if (!res.ok) {
      return { ok: false, error: `scryfall_${res.status}`, price_usd: null, price_usd_foil: null };
    }
    const card = await res.json();
    return {
      ok: true,
      scryfall_id: card.id,
      price_usd: card.prices?.usd ? Number(card.prices.usd) : null,
      price_usd_foil: card.prices?.usd_foil ? Number(card.prices.usd_foil) : null,
    };
  } catch (err) {
    logger?.warn?.({ err: err.message, name, set }, 'scryfall price lookup failed');
    return { ok: false, error: err.message, price_usd: null, price_usd_foil: null };
  }
}

/**
 * Exact-match price lookup by Scryfall's own card ID -- more reliable than
 * fuzzy name matching when the caller already has it (e.g. a ManaBox CSV
 * export already includes a Scryfall ID per row; see routes/mtg-cards-routes.js
 * POST /import-csv).
 * @returns {Promise<{ ok: boolean, scryfall_id?: string, price_usd: number|null, price_usd_foil: number|null, error?: string }>}
 */
export async function lookupMtgCardById(scryfallId, { logger } = {}) {
  if (!scryfallId) return { ok: false, error: 'no_id', price_usd: null, price_usd_foil: null };
  try {
    const res = await fetch(`${SCRYFALL_BASE}/cards/${encodeURIComponent(scryfallId)}`, { headers: HEADERS });
    if (!res.ok) {
      return { ok: false, error: `scryfall_${res.status}`, price_usd: null, price_usd_foil: null };
    }
    const card = await res.json();
    return {
      ok: true,
      scryfall_id: card.id,
      price_usd: card.prices?.usd ? Number(card.prices.usd) : null,
      price_usd_foil: card.prices?.usd_foil ? Number(card.prices.usd_foil) : null,
    };
  } catch (err) {
    logger?.warn?.({ err: err.message, scryfallId }, 'scryfall id lookup failed');
    return { ok: false, error: err.message, price_usd: null, price_usd_foil: null };
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
