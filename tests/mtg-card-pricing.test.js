/**
 * SYNOPSIS: Covers the MTG cataloger's money decisions -- which printing's
 * price is used, and whether a card gets individually listed or thrown in a
 * bulk lot. Written after a real, live-confirmed mispricing bug (2026-08-11):
 * Scryfall's fuzzy name lookup returned MTGO digital-only printings with no
 * paper price, so genuinely sellable cards were stored as `unknown` /
 * `manual_review` with a null price. All assertions here are pure -- no
 * network -- against the exact printing payload shapes the live API returns.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pickPrinting, resolveSetCodeFrom, classifyValueTier, eraFromReleaseDate } from '../services/mtg-card-pricing.js';
import { parseCardsFromModelText, MAX_CARDS_PER_PHOTO } from '../services/mtg-card-vision.js';
import { applyPriceToRow, buildCollectionStats, collectionToCsv, parseManaBoxCsv, photoCardSlotName } from '../routes/mtg-cards-routes.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const print = (set, usd, usdFoil = null) => ({
  id: `id-${set}`,
  set,
  set_name: set.toUpperCase(),
  prices: { usd: usd == null ? null : String(usd), usd_foil: usdFoil == null ? null : String(usdFoil) },
});

// Real /sets shape, trimmed to the fields resolveSetCodeFrom reads.
const setIndex = {
  codes: new Set(['drk', '5ed', '4ed', '3ed', 'lea', 'tmp', 'hml']),
  byName: new Map([
    ['the dark', 'drk'],
    ['fifth edition', '5ed'],
    ['fourth edition', '4ed'],
    ['revised edition', '3ed'],
    ['limited edition alpha', 'lea'],
    ['tempest', 'tmp'],
    ['homelands', 'hml'],
  ]),
};

test('resolveSetCodeFrom maps what a vision model actually reads off a card', () => {
  assert.equal(resolveSetCodeFrom(setIndex, 'The Dark'), 'drk');
  assert.equal(resolveSetCodeFrom(setIndex, 'tempest'), 'tmp');

  // The card is printed "4th Edition"; Scryfall calls it "Fourth Edition".
  assert.equal(resolveSetCodeFrom(setIndex, '4th Edition'), '4ed');
  assert.equal(resolveSetCodeFrom(setIndex, '5th edition'), '5ed');

  // Collectors say "Alpha"; Scryfall says "Limited Edition Alpha".
  assert.equal(resolveSetCodeFrom(setIndex, 'Alpha'), 'lea');
  assert.equal(resolveSetCodeFrom(setIndex, 'Revised'), '3ed');

  // A set code straight through, and an unknown set staying honest.
  assert.equal(resolveSetCodeFrom(setIndex, 'drk'), 'drk');
  assert.equal(resolveSetCodeFrom(setIndex, 'Not A Real Set'), null);
  assert.equal(resolveSetCodeFrom(setIndex, null), null);
});

test('pickPrinting uses the identified set when that printing has a real price', () => {
  const prints = [print('lea', null), print('3ed', 5.46), print('5ed', 3.8), print('drc', 0.49)];
  const picked = pickPrinting(prints, '5ed');

  assert.equal(picked.price_match, 'set_exact');
  assert.equal(picked.chosen.usd, 3.8);
  assert.equal(picked.needs_review, false);
  assert.equal(picked.price_min_usd, 0.49);
  assert.equal(picked.price_max_usd, 5.46);
});

test('pickPrinting flags a valuable card for review rather than guessing it into a bulk lot', () => {
  // The real Zombie Master case: vision read "The Dark", but the card has no
  // Dark printing. Printings range $0.49 to $149.97 -- picking the low end
  // silently would mean bulk-lotting a potentially $150 card.
  const prints = [
    print('lea', null), print('leb', 149.97), print('2ed', 33.85),
    print('3ed', 5.46), print('4ed', 3.36), print('drc', 0.49),
  ];
  const picked = pickPrinting(prints, 'drk');

  assert.equal(picked.price_match, 'set_unmatched');
  assert.equal(picked.needs_review, true, 'a $149.97 possible printing must be reviewed, not assumed away');
  assert.equal(picked.price_max_usd, 149.97);
  // Central estimate, not the cheapest and not the most expensive.
  assert.ok(picked.chosen.usd > 0.49 && picked.chosen.usd < 149.97);
});

test('pickPrinting does not flag review when nothing in the spread is worth much', () => {
  const picked = pickPrinting([print('tmp', 0.23), print('wth', 0.37), print('5ed', 0.53)], 'xyz');
  assert.equal(picked.needs_review, false);
  assert.equal(picked.price_match, 'set_unmatched');
});

test('pickPrinting distinguishes "not in that set" from "in that set but unpriced"', () => {
  const prints = [print('hml', null), print('5ed', 0.39)];
  assert.equal(pickPrinting(prints, 'hml').price_match, 'set_exact_unpriced');
  assert.equal(pickPrinting(prints, 'drk').price_match, 'set_unmatched');
});

test('pickPrinting reports no usable price instead of inventing one', () => {
  const picked = pickPrinting([print('lea', null), print('sum', null)], 'lea');
  assert.equal(picked.chosen, null);
  assert.equal(picked.needs_review, true);
  assert.equal(picked.price_min_usd, null);
  assert.equal(pickPrinting([], 'lea'), null);
});

test('classifyValueTier routes to the documented sell venues', () => {
  assert.deepEqual(classifyValueTier(20), { tier: 'high', venue: 'tcgplayer_individual_listing' });
  assert.deepEqual(classifyValueTier(3), { tier: 'mid', venue: 'buylist_card_kingdom_or_similar' });
  assert.deepEqual(classifyValueTier(2.99), { tier: 'low', venue: 'bulk_lot' });
  assert.deepEqual(classifyValueTier(null), { tier: 'unknown', venue: 'manual_review' });
});

test('applyPriceToRow keeps an ambiguous card out of the bulk lot', () => {
  const row = applyPriceToRow(
    { is_foil: false, quantity: 1 },
    { price_usd: 5.46, price_usd_foil: null, price_min_usd: 0.49, price_max_usd: 149.97, printing_count: 6, price_match: 'set_unmatched', needs_review: true },
  );
  assert.equal(row.value_tier, 'mid');
  assert.equal(row.recommended_venue, 'manual_review', 'review flag must override the bulk/buylist routing');
  assert.equal(row.status, 'done');
  assert.equal(row.price_max_usd, 149.97);
});

test('applyPriceToRow prices foils off the foil price and totals a stack by quantity', () => {
  const foil = applyPriceToRow({ is_foil: true, quantity: 1 }, { price_usd: 2, price_usd_foil: 25, needs_review: false });
  assert.equal(foil.price_used, 25);
  assert.equal(foil.value_tier, 'high');

  // ManaBox rows carry real duplicate copies: tier on the single card, total
  // the stack.
  const stack = applyPriceToRow({ is_foil: false, quantity: 4 }, { price_usd: 5, price_usd_foil: null, needs_review: false });
  assert.equal(stack.price_used, 20);
  assert.equal(stack.value_tier, 'mid', 'four $5 cards is not a $20 card');

  // A foil with no foil price falls back to the normal price rather than null.
  const fallback = applyPriceToRow({ is_foil: true, quantity: 1 }, { price_usd: 4, price_usd_foil: null, needs_review: false });
  assert.equal(fallback.price_used, 4);
});

test('applyPriceToRow leaves an unpriced card unpriced', () => {
  const row = applyPriceToRow({ is_foil: false, quantity: 1 }, { price_usd: null, price_usd_foil: null, needs_review: true });
  assert.equal(row.price_used, null);
  assert.equal(row.value_tier, 'unknown');
  assert.equal(row.recommended_venue, 'manual_review');
});

test('eraFromReleaseDate buckets sets into generations Adam can scan', () => {
  assert.equal(eraFromReleaseDate('1993-08-05'), '1993 — Alpha / Beta / Unlimited / Arabian');
  assert.equal(eraFromReleaseDate('1995-06-01'), '1994–95 — early expansions');
  assert.equal(eraFromReleaseDate('1997-10-14'), '1996–97 — mid-90s / Mirage–Tempest');
  assert.equal(eraFromReleaseDate('1999-06-01'), '1998–99 — late 90s / Urza–Masques');
  assert.equal(eraFromReleaseDate('2002-05-01'), '2000–03 — early 2000s');
  assert.equal(eraFromReleaseDate('2015-01-01'), '2004+ — modern');
  assert.equal(eraFromReleaseDate(null), 'unknown');
});

test('buildCollectionStats counts by era, year, set, rarity, foil, and sell status', () => {
  const stats = buildCollectionStats([
    { era: '1993 — Alpha / Beta / Unlimited / Arabian', set_name: 'Limited Edition Alpha', set_released_at: '1993-08-05', rarity: 'rare', is_foil: false, value_tier: 'high', sell_status: 'ready_to_list', status: 'done', price_used: 100 },
    { era: '1996–97 — mid-90s / Mirage–Tempest', set_name: 'Tempest', set_released_at: '1997-10-14', rarity: 'common', is_foil: true, value_tier: 'low', sell_status: 'catalogued', status: 'done', price_used: 1.5 },
    { era: '1996–97 — mid-90s / Mirage–Tempest', set_name: 'Tempest', set_released_at: '1997-10-14', rarity: 'uncommon', is_foil: false, value_tier: 'mid', sell_status: 'catalogued', status: 'done', price_used: 5 },
  ]);
  assert.equal(stats.by_era.find((r) => r.key.startsWith('1996')).count, 2);
  assert.equal(stats.by_year.find((r) => r.key === '1993').count, 1);
  assert.equal(stats.by_set.find((r) => r.key === 'Tempest').count, 2);
  assert.equal(stats.by_rarity.find((r) => r.key === 'rare').subtotal_usd, 100);
  assert.equal(stats.by_foil.find((r) => r.key === 'foil').count, 1);
  assert.equal(stats.by_sell_status.find((r) => r.key === 'ready_to_list').count, 1);
});

test('collectionToCsv escapes card names that contain commas and quotes', () => {
  const csv = collectionToCsv([
    { identified_name: 'Jace, the Mind Sculptor', identified_set: 'Worldwake', set_name: 'Worldwake', set_released_at: '2010-02-05', era: '2004+ — modern', rarity: 'mythic', is_foil: false, price_used: 89.5, value_tier: 'high', recommended_venue: 'tcgplayer_individual_listing', needs_review: false, quantity: 1 },
    { identified_name: 'Say "Hello"', identified_set: null, price_used: null, value_tier: 'unknown', needs_review: true, quantity: 2 },
  ]);
  const lines = csv.split('\n');
  assert.match(lines[0], /^Card,Set,Set Code,Set Year,Era,Rarity,Foil,/);
  assert.ok(lines[1].includes('"Jace, the Mind Sculptor"'), 'comma in a card name must not split the column');
  assert.ok(lines[1].includes(',2010,'), 'set year must reach the sell sheet');
  assert.ok(lines[2].includes('"Say ""Hello"""'), 'quotes must be doubled per RFC 4180');
  assert.ok(lines[2].includes(',yes,'), 'review flag must reach the sell sheet');
});

test('parseCardsFromModelText accepts multi-card, bare array, and legacy single-card JSON', () => {
  const multi = parseCardsFromModelText('{"cards":[{"name":"Lightning Bolt","set":"Alpha","foil":false,"condition_guess":"lightly played","confidence":"high","box":{"x":0.1,"y":0.2,"w":0.25,"h":0.4}},{"name":"Counterspell","set":"Tempest","foil":false,"condition_guess":"near mint","confidence":"medium"}]}');
  assert.equal(multi.length, 2);
  assert.equal(multi[0].name, 'Lightning Bolt');
  assert.equal(multi[1].set, 'Tempest');
  assert.deepEqual(multi[0].box, { x: 0.1, y: 0.2, w: 0.25, h: 0.4 });

  const bare = parseCardsFromModelText('[{"name":"Darkness","set":"The Dark"}]');
  assert.equal(bare.length, 1);
  assert.equal(bare[0].name, 'Darkness');

  const legacy = parseCardsFromModelText('{"name":"Natural Order","set":"Visions","foil":false,"condition_guess":"near mint","confidence":"high"}');
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].name, 'Natural Order');

  assert.deepEqual(parseCardsFromModelText('{"cards":[]}'), []);
  assert.equal(parseCardsFromModelText('not json'), null);

  const overflow = parseCardsFromModelText(JSON.stringify({
    cards: Array.from({ length: MAX_CARDS_PER_PHOTO + 5 }, (_, i) => ({ name: `Card ${i + 1}`, set: 'Tempest' })),
  }));
  assert.equal(overflow.length, MAX_CARDS_PER_PHOTO);
});

test('photoCardSlotName keeps single-card names stable and indexes multi-card slots', () => {
  assert.equal(photoCardSlotName('a.jpg', 0, 1), 'a.jpg');
  assert.equal(photoCardSlotName('a.jpg', 0, 10), 'a.jpg#1');
  assert.equal(photoCardSlotName('a.jpg', 9, 10), 'a.jpg#10');
});

test('parseManaBoxCsv reads a real ManaBox export shape', () => {
  const parsed = parseManaBoxCsv(
    'Name,Set code,Foil,Quantity,Condition,Scryfall ID\n' +
    'Lightning Bolt,lea,normal,3,near_mint,abc-123\n' +
    '"Jace, the Mind Sculptor",wwk,foil,1,lightly_played,def-456\n',
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.rows.length, 2);
  assert.deepEqual(parsed.rows[0], { name: 'Lightning Bolt', set: 'lea', foil: false, quantity: 3, condition: 'near_mint', scryfallId: 'abc-123' });
  assert.equal(parsed.rows[1].name, 'Jace, the Mind Sculptor');
  assert.equal(parsed.rows[1].foil, true);
  assert.equal(parseManaBoxCsv('Set code,Foil\nlea,normal\n').ok, false);
});

// Per CLAUDE.md's reachability rule: a module that passes its own unit tests
// while nothing calls it is not a shipped capability. These assert the real
// live call paths, not just that the exports work in isolation.
test('the pricing rewrite is actually reachable from the live routes and UI', () => {
  const routes = fs.readFileSync(path.join(repoRoot, 'routes/mtg-cards-routes.js'), 'utf8');
  assert.match(routes, /import \{[^}]*lookupMtgCardPrice[^}]*\} from '\.\.\/services\/mtg-card-pricing\.js'/);
  assert.match(routes, /identifyMtgCardsFromPhoto/, 'multi-card photos must call the multi-card vision export');
  assert.match(routes, /saveSourcePhoto/, 'uploads must persist photos instead of discarding buffers');
  assert.match(routes, /saveCroppedListingPhoto/, 'listing crops must be generated when boxes are present');
  assert.match(routes, /applyPriceToRow\(row, price\)/, 'photo + csv intake must route through the shared pricing rule');
  assert.match(routes, /router\.post\('\/reprice'/, 'already-catalogued cards need a no-vision repricing path');
  assert.match(routes, /router\.get\('\/collection'/);
  assert.match(routes, /router\.get\('\/collection\.csv'/);
  assert.match(routes, /router\.get\('\/collection\/stats'/);
  assert.match(routes, /buildCollectionStats/);

  const vision = fs.readFileSync(path.join(repoRoot, 'services/mtg-card-vision.js'), 'utf8');
  assert.match(vision, /MAX_CARDS_PER_PHOTO = 30/);
  assert.match(vision, /export async function identifyMtgCardsFromPhoto/);

  const pricing = fs.readFileSync(path.join(repoRoot, 'services/mtg-card-pricing.js'), 'utf8');
  assert.match(pricing, /export function eraFromReleaseDate/);
  assert.match(pricing, /catalogFieldsFromCard/);

  const page = fs.readFileSync(path.join(repoRoot, 'public/mtg-cards-upload.html'), 'utf8');
  assert.ok(page.includes('/api/v1/mtg-cards/collection'), 'the collection view must be reachable from the real page');
  assert.ok(page.includes('/api/v1/mtg-cards/collection/stats'), 'stats breakdowns must be reachable from the real page');
  assert.ok(page.includes('/api/v1/mtg-cards/reprice'), 'the reprice action must be reachable from the real page');
  assert.ok(/10, 15, 20\+|as many cards as you want/i.test(page), 'UI must tell the founder multi-card photos are allowed');
  assert.ok(page.includes('By generation / era'), 'UI must show generation/era breakdown');
  assert.ok(page.includes('Your collection'), 'collection must be the persistent surface');
  assert.ok(/CHUNK_SIZE = 150/.test(page), 'uploads must allow 150 per group (founder: not throttled to 20)');
  assert.ok(page.includes('x-command-key'), 'page must send command key as well as bearer token');
  assert.ok(page.includes('updating as cards finish'), 'collection must refresh live during uploads');

  for (const lane of ['startup/register-runtime-routes.js', 'startup/register-founder-runtime-routes.js']) {
    const src = fs.readFileSync(path.join(repoRoot, lane), 'utf8');
    assert.ok(src.includes('createMtgCardsRoutes'), `${lane} must still mount the cataloger`);
  }
});
