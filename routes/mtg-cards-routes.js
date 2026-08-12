/**
 * SYNOPSIS: Magic: The Gathering card cataloging, two intake paths sharing one
 * pipeline (price via Scryfall, services/mtg-card-pricing.js -> classify into
 * a sell-venue tier -> store to mtg_card_collection):
 *   1. Photo batch: identify each card via vision (services/mtg-card-vision.js).
 *      Real cost/scale limit -- needs a paid vision provider per card.
 *   2. CSV import (ManaBox export, or any CSV with the same columns): the
 *      scanning/identification is already done by ManaBox's own app, so this
 *      path skips vision entirely and goes straight to pricing -- free, fast,
 *      and works for a whole collection of hundreds/thousands of cards
 *      regardless of AI-provider billing state (added 2026-08-10 after both
 *      configured vision providers were confirmed out of credits on a real
 *      live test -- founder has "hundreds even thousands" of cards and direct
 *      photo upload does not scale to that; ManaBox recommended as the real
 *      scan step, this endpoint ingests its export).
 * Processing runs in the background after the upload request returns (a
 * 100+ card batch at a few seconds per vision call, or hundreds of Scryfall
 * lookups, would otherwise hold the HTTP request open for minutes) -- same
 * async-session shape as routes/extension-drive-routes.js's POST /start + GET /status.
 * Mounted at /api/v1/mtg-cards
 *   POST   /batch-upload  (multipart, field name "cards", up to 150 files) -> { ok, batch_id, file_count }
 *   POST   /import-csv    (multipart, field name "csv", one file) -> { ok, batch_id, row_count }
 *   GET    /batch/:batchId -> { ok, batch_id, total, done, rows[] }
 *   GET    /batch/:batchId/summary -> { ok, by_tier: { high, mid, low, unknown }, total_estimated_usd }
 *   DELETE /batch/:batchId -> { ok, deleted } (removes a duplicate re-upload)
 *   GET    /recent-activity -> per-batch progress, for "is it actually running?"
 *   GET    /collection -> whole deduped collection + totals + review queue
 *   GET    /collection.csv -> the same list as a real sell sheet
 *   GET    /collection/stats -> counts by era/year/set/rarity/foil/sell status
 *   GET    /duplicates -> batches that re-processed photos already catalogued
 *   POST   /reprice -> re-run Scryfall pricing over stored rows (no vision cost)
 *   GET    /reprice/status -> progress of the running reprice job
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { identifyMtgCardsFromPhoto } from '../services/mtg-card-vision.js';
import { lookupMtgCardPrice, lookupMtgCardById, classifyValueTier } from '../services/mtg-card-pricing.js';
import {
  ensurePhotoSchema,
  saveSourcePhoto,
  saveCroppedListingPhoto,
  loadPhotoBuffer,
} from '../services/mtg-card-photo-store.js';
import { isR2Configured } from '../services/marketing-r2-upload.js';

const MAX_FILES = 150;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_CSV_ROWS = 5000;
const DEFAULT_USER_ID = 1;
const STALE_REPRICE_MS = 3 * 60 * 1000;

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mtg_card_collection (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL,
      batch_id UUID NOT NULL,
      photo_name TEXT,
      identified_name TEXT,
      identified_set TEXT,
      is_foil BOOLEAN,
      condition_guess TEXT,
      identify_confidence TEXT,
      identify_error TEXT,
      scryfall_id TEXT,
      price_usd NUMERIC,
      price_usd_foil NUMERIC,
      price_used NUMERIC,
      price_source TEXT,
      value_tier TEXT,
      recommended_venue TEXT,
      status TEXT NOT NULL DEFAULT 'identified',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Added for CSV import (2026-08-10): a ManaBox row can represent multiple
  // physical copies of the same card, and `source` distinguishes rows that
  // were never run through (paid) vision at all -- both real, honest gaps in
  // the original photo-only schema, not decoration.
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'photo_vision'`);
  // Pricing provenance (2026-08-11) -- see db/migrations/20260811_mtg_card_pricing_provenance.sql.
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS price_min_usd NUMERIC`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS price_max_usd NUMERIC`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS printing_count INTEGER`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS price_match TEXT`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS priced_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS rarity TEXT`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS set_code TEXT`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS set_name TEXT`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS set_released_at DATE`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS era TEXT`);
  await ensurePhotoSchema(pool);
}

/**
 * Minimal RFC-4180-enough CSV parser -- handles quoted fields, commas and
 * double-quotes inside quotes ("" escape), and both \n and \r\n line endings.
 * No dependency added: checked package.json first, nothing already installed
 * (csv-parse/papaparse absent) and this format is simple enough not to need one.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => String(f).trim().length));
}

const HEADER_ALIASES = {
  name: ['name', 'card name', 'card_name'],
  set: ['set code', 'set_code', 'set', 'edition'],
  foil: ['foil', 'printing', 'finish'],
  quantity: ['quantity', 'qty', 'count'],
  condition: ['condition'],
  scryfall_id: ['scryfall id', 'scryfall_id', 'scryfallid'],
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase();
}

function findColumn(headers, aliases) {
  const idx = headers.findIndex((h) => aliases.includes(normalizeHeader(h)));
  return idx;
}

/**
 * @returns {{ ok: boolean, rows?: Array<{name:string, set:string|null, foil:boolean, quantity:number, condition:string|null, scryfallId:string|null}>, error?: string }}
 */
export function parseManaBoxCsv(text) {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return { ok: false, error: 'empty_or_no_data_rows' };
  const headers = parsed[0];
  const nameIdx = findColumn(headers, HEADER_ALIASES.name);
  if (nameIdx === -1) return { ok: false, error: 'missing_name_column' };
  const setIdx = findColumn(headers, HEADER_ALIASES.set);
  const foilIdx = findColumn(headers, HEADER_ALIASES.foil);
  const qtyIdx = findColumn(headers, HEADER_ALIASES.quantity);
  const condIdx = findColumn(headers, HEADER_ALIASES.condition);
  const scryfallIdx = findColumn(headers, HEADER_ALIASES.scryfall_id);

  const rows = [];
  for (const r of parsed.slice(1, 1 + MAX_CSV_ROWS)) {
    const name = String(r[nameIdx] || '').trim();
    if (!name) continue;
    const foilRaw = foilIdx > -1 ? String(r[foilIdx] || '').trim().toLowerCase() : '';
    rows.push({
      name,
      set: setIdx > -1 ? (String(r[setIdx] || '').trim() || null) : null,
      foil: foilRaw === 'foil' || foilRaw === 'true' || foilRaw === 'yes' || foilRaw === 'etched',
      quantity: qtyIdx > -1 ? (Math.max(1, parseInt(r[qtyIdx], 10) || 1)) : 1,
      condition: condIdx > -1 ? (String(r[condIdx] || '').trim() || null) : null,
      scryfallId: scryfallIdx > -1 ? (String(r[scryfallIdx] || '').trim() || null) : null,
    });
  }
  return { ok: true, rows };
}

/**
 * Single place where a Scryfall result becomes a stored, tiered, sell-routable
 * row -- shared by photo intake, CSV intake, and repricing so all three can
 * never drift apart on what a price means.
 *
 * Exported for tests: this decides whether a card gets individually listed or
 * thrown in a bulk lot, which is the whole point of the system.
 */
export function applyPriceToRow(row, price) {
  row.scryfall_id = price.scryfall_id || row.scryfall_id || null;
  row.price_usd = price.price_usd;
  row.price_usd_foil = price.price_usd_foil;
  row.price_min_usd = price.price_min_usd ?? null;
  row.price_max_usd = price.price_max_usd ?? null;
  row.printing_count = price.printing_count ?? null;
  row.price_match = price.price_match ?? null;
  row.needs_review = Boolean(price.needs_review);
  row.price_source = 'scryfall';
  row.rarity = price.rarity ?? row.rarity ?? null;
  row.set_code = price.set_code ?? row.set_code ?? null;
  row.set_name = price.set_name ?? row.set_name ?? null;
  row.set_released_at = price.set_released_at ?? row.set_released_at ?? null;
  row.era = price.era ?? row.era ?? null;

  const perCard = row.is_foil ? (price.price_usd_foil ?? price.price_usd) : price.price_usd;
  const quantity = Math.max(1, Number(row.quantity) || 1);
  row.price_used = perCard != null ? perCard * quantity : null;

  const tier = classifyValueTier(perCard);
  row.value_tier = tier.tier;
  // A card whose set could not be pinned down but whose most expensive
  // printing is worth real money must never be routed to a bulk lot on the
  // strength of a median guess -- send it to manual review instead. Cards
  // already tiered `high` are being looked at individually anyway.
  row.recommended_venue = row.needs_review && tier.tier !== 'high' ? 'manual_review' : tier.venue;
  row.status = 'done';
  return row;
}

function blankRow({ userId, batchId, photoName = null, source = 'photo_vision' }) {
  return {
    user_id: userId,
    batch_id: batchId,
    photo_name: photoName,
    identified_name: null,
    identified_set: null,
    is_foil: null,
    condition_guess: null,
    identify_confidence: null,
    identify_error: null,
    scryfall_id: null,
    price_usd: null,
    price_usd_foil: null,
    price_used: null,
    price_source: null,
    price_min_usd: null,
    price_max_usd: null,
    printing_count: null,
    price_match: null,
    needs_review: false,
    value_tier: 'unknown',
    recommended_venue: 'manual_review',
    status: 'error',
    quantity: 1,
    source,
    source_photo_id: null,
    listing_photo_id: null,
    sell_status: 'catalogued',
    rarity: null,
    set_code: null,
    set_name: null,
    set_released_at: null,
    era: null,
  };
}

const INSERT_SQL = `
  INSERT INTO mtg_card_collection
    (user_id, batch_id, photo_name, identified_name, identified_set, is_foil, condition_guess,
     identify_confidence, identify_error, scryfall_id, price_usd, price_usd_foil, price_used,
     price_source, value_tier, recommended_venue, status, quantity, source,
     price_min_usd, price_max_usd, printing_count, price_match, needs_review, priced_at,
     source_photo_id, listing_photo_id, sell_status,
     rarity, set_code, set_name, set_released_at, era)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
          CASE WHEN $14::text IS NULL THEN NULL ELSE NOW() END,
          $25,$26,$27,$28,$29,$30,$31,$32)
`;

function insertParams(row) {
  return [
    row.user_id, row.batch_id, row.photo_name, row.identified_name, row.identified_set, row.is_foil,
    row.condition_guess, row.identify_confidence, row.identify_error, row.scryfall_id, row.price_usd,
    row.price_usd_foil, row.price_used, row.price_source, row.value_tier, row.recommended_venue,
    row.status, row.quantity, row.source, row.price_min_usd, row.price_max_usd, row.printing_count,
    row.price_match, row.needs_review, row.source_photo_id, row.listing_photo_id, row.sell_status,
    row.rarity, row.set_code, row.set_name, row.set_released_at, row.era,
  ];
}

/**
 * One photo can yield many cards (grid of 10+). Store each as its own row with
 * photo_name "file.jpg#1", "file.jpg#2", ... so collection dedupe by photo_name
 * does not collapse a whole grid into a single card.
 */
export function photoCardSlotName(originalName, index, total) {
  const base = originalName || 'unknown';
  if (total <= 1) return base;
  return `${base}#${index + 1}`;
}

function boxLooksNormalized(box) {
  return box && box.x <= 1.5 && box.y <= 1.5 && box.w <= 1.5 && box.h <= 1.5;
}

async function processBatch({ pool, logger, userId, batchId, files }) {
  for (const file of files) {
    const baseName = file.originalname || 'unknown';
    let sourcePhoto = null;

    try {
      // ALWAYS persist the upload first -- founder law 2026-08-12: photos are
      // inventory assets for selling, not disposable vision inputs.
      sourcePhoto = await saveSourcePhoto({
        pool,
        userId,
        batchId,
        photoName: baseName,
        mime: file.mimetype || 'image/jpeg',
        buffer: file.buffer,
        logger,
      });

      const photo = { name: baseName, mime: file.mimetype, data: file.buffer.toString('base64') };
      const id = await identifyMtgCardsFromPhoto(photo, { logger });

      if (!id.ok) {
        const row = blankRow({ userId, batchId, photoName: baseName });
        row.source_photo_id = sourcePhoto.id;
        row.identify_error = id.error;
        row.status = 'identify_failed';
        await pool.query(INSERT_SQL, insertParams(row));
        continue;
      }

      if (!id.cards.length) {
        const row = blankRow({ userId, batchId, photoName: baseName });
        row.source_photo_id = sourcePhoto.id;
        row.identify_error = 'no_card_clearly_identified_in_photo';
        row.status = 'identify_failed';
        await pool.query(INSERT_SQL, insertParams(row));
        continue;
      }

      const preparedSource = { buffer: file.buffer };

      for (let i = 0; i < id.cards.length; i++) {
        const card = id.cards[i];
        const row = blankRow({
          userId,
          batchId,
          photoName: photoCardSlotName(baseName, i, id.cards.length),
        });
        row.source_photo_id = sourcePhoto.id;
        row.identified_name = card.name;
        row.identified_set = card.set;
        row.is_foil = card.foil;
        row.condition_guess = card.condition_guess;
        row.identify_confidence = card.confidence;

        // Crop from the ORIGINAL upload buffer so vision boxes (measured on
        // that image) line up. The durable source copy may be resized.
        if (card.box && preparedSource?.buffer) {
          try {
            const absolute = !boxLooksNormalized(card.box);
            const crop = await saveCroppedListingPhoto({
              pool,
              userId,
              batchId,
              parentPhotoId: sourcePhoto.id,
              cardSlot: i + 1,
              photoName: photoCardSlotName(baseName, i, id.cards.length),
              sourceBuffer: preparedSource.buffer,
              box: card.box,
              absolute,
              logger,
            });
            row.listing_photo_id = crop.id;
            row.sell_status = 'ready_to_list';
          } catch (err) {
            logger?.warn?.({ err: err.message, file: baseName, slot: i + 1 }, 'mtg listing crop failed');
          }
        }

        try {
          const price = await lookupMtgCardPrice(card.name, card.set, { logger });
          if (price.ok) {
            applyPriceToRow(row, price);
          } else {
            row.identify_error = `price_lookup_failed:${price.error}`;
            row.status = 'priced_failed';
          }
        } catch (err) {
          row.identify_error = err.message;
          row.status = 'priced_failed';
          logger?.error?.({ err: err.message, file: row.photo_name }, 'mtg card price step failed');
        }

        await pool.query(INSERT_SQL, insertParams(row));
      }
    } catch (err) {
      const row = blankRow({ userId, batchId, photoName: baseName });
      if (sourcePhoto?.id) row.source_photo_id = sourcePhoto.id;
      row.identify_error = err.message;
      row.status = 'error';
      logger?.error?.({ err: err.message, file: baseName }, 'mtg card batch item failed');
      await pool.query(INSERT_SQL, insertParams(row));
    }
  }
}

/**
 * Same pipeline as processBatch's post-identification half (price -> tier ->
 * store), but the "identification" is already done -- it came from the CSV
 * row, not a paid vision call. Prefers an exact Scryfall-ID lookup when the
 * CSV provided one (ManaBox always does); falls back to fuzzy name+set.
 */
async function processCsvImport({ pool, logger, userId, batchId, rows }) {
  for (const r of rows) {
    const row = blankRow({ userId, batchId, source: 'csv_import' });
    row.identified_name = r.name;
    row.identified_set = r.set;
    row.is_foil = r.foil;
    row.condition_guess = r.condition;
    row.identify_confidence = 'high'; // ManaBox already scanned/identified this card
    row.quantity = r.quantity;

    try {
      const price = r.scryfallId
        ? await lookupMtgCardById(r.scryfallId, { logger })
        : await lookupMtgCardPrice(r.name, r.set, { logger });

      if (price.ok) {
        // price_used holds the STACK's total value (per-card price x quantity)
        // so batch summary totals reflect the founder's real collection value,
        // not just one copy of each unique card -- a real ManaBox CSV routinely
        // has quantity > 1 per row for commons/staples. applyPriceToRow does
        // that multiplication while tiering on the per-card price.
        applyPriceToRow(row, price);
      } else {
        row.identify_error = `price_lookup_failed:${price.error}`;
        row.status = 'priced_failed';
      }
    } catch (err) {
      row.identify_error = err.message;
      logger?.error?.({ err: err.message, name: r.name }, 'mtg card csv import row failed');
    }

    await pool.query(INSERT_SQL, insertParams(row));
  }
}

/**
 * One row per physical card. The same photo can legitimately exist in two
 * batches (confirmed live 2026-08-11: 110 identical filenames re-uploaded five
 * minutes apart, because the page's progress counter made the first attempt
 * look stalled) -- counting both would double the collection's reported value.
 * CSV rows are never deduped this way: their `quantity` column already carries
 * real duplicate copies.
 */
const DEDUPED_COLLECTION_CTE = `
  WITH deduped AS (
    SELECT DISTINCT ON (
      CASE WHEN source = 'photo_vision' AND photo_name IS NOT NULL
           THEN photo_name ELSE id::text END
    ) *
    FROM mtg_card_collection
    WHERE user_id = $1
    ORDER BY
      CASE WHEN source = 'photo_vision' AND photo_name IS NOT NULL
           THEN photo_name ELSE id::text END,
      created_at DESC
  )
`;

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function collectionToCsv(rows) {
  const headers = [
    'Card', 'Set', 'Set Code', 'Set Year', 'Era', 'Rarity', 'Foil', 'Condition',
    'Price USD', 'Price Low', 'Price High',
    'Tier', 'Venue', 'Needs Review', 'Sell Status', 'Price Basis', 'Quantity', 'Photo', 'Scryfall ID',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const year = r.set_released_at ? String(r.set_released_at).slice(0, 4) : '';
    lines.push([
      r.identified_name, r.set_name || r.identified_set, r.set_code, year, r.era, r.rarity,
      r.is_foil ? 'foil' : '', r.condition_guess,
      r.price_used != null ? Number(r.price_used).toFixed(2) : '',
      r.price_min_usd != null ? Number(r.price_min_usd).toFixed(2) : '',
      r.price_max_usd != null ? Number(r.price_max_usd).toFixed(2) : '',
      r.value_tier, r.recommended_venue, r.needs_review ? 'yes' : '',
      r.sell_status, r.price_match, r.quantity, r.photo_name, r.scryfall_id,
    ].map(csvEscape).join(','));
  }
  return lines.join('\n');
}

/** Aggregate counts/values for the founder "what do I have?" breakdown. */
export function buildCollectionStats(rows) {
  function bucket(map, key, usd) {
    const k = key || 'unknown';
    map[k] = map[k] || { count: 0, subtotal_usd: 0 };
    map[k].count += 1;
    map[k].subtotal_usd += Number(usd || 0);
  }

  const by_era = {};
  const by_set = {};
  const by_year = {};
  const by_rarity = {};
  const by_foil = {};
  const by_tier = {};
  const by_sell_status = {};
  const by_status = {};

  for (const r of rows) {
    const usd = r.price_used;
    bucket(by_era, r.era, usd);
    const setLabel = r.set_name || r.identified_set || r.set_code || 'unknown';
    bucket(by_set, setLabel, usd);
    const year = r.set_released_at ? String(r.set_released_at).slice(0, 4) : 'unknown';
    bucket(by_year, year, usd);
    bucket(by_rarity, r.rarity, usd);
    bucket(by_foil, r.is_foil === true ? 'foil' : r.is_foil === false ? 'nonfoil' : 'unknown', usd);
    bucket(by_tier, r.value_tier, usd);
    bucket(by_sell_status, r.sell_status, usd);
    bucket(by_status, r.status, usd);
  }

  const sortBuckets = (map) => Object.entries(map)
    .map(([key, v]) => ({ key, count: v.count, subtotal_usd: Number(v.subtotal_usd.toFixed(2)) }))
    .sort((a, b) => b.count - a.count || b.subtotal_usd - a.subtotal_usd);

  return {
    by_era: sortBuckets(by_era),
    by_set: sortBuckets(by_set),
    by_year: sortBuckets(by_year).sort((a, b) => String(a.key).localeCompare(String(b.key))),
    by_rarity: sortBuckets(by_rarity),
    by_foil: sortBuckets(by_foil),
    by_tier: sortBuckets(by_tier),
    by_sell_status: sortBuckets(by_sell_status),
    by_status: sortBuckets(by_status),
  };
}

export function createMtgCardsRoutes({ pool, requireKey, logger = console }) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } });
  const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CSV_BYTES } });
  let schemaReady = null;
  async function ready() {
    if (!schemaReady) schemaReady = ensureSchema(pool);
    await schemaReady;
  }

  let repriceJob = null;

  router.post('/import-csv', requireKey, csvUpload.single('csv'), async (req, res) => {
    try {
      await ready();
      if (!req.file) return res.status(400).json({ ok: false, error: 'no_file' });

      const parsed = parseManaBoxCsv(req.file.buffer.toString('utf8'));
      if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.error });
      if (!parsed.rows.length) return res.status(400).json({ ok: false, error: 'no_data_rows' });

      const userId = Number(req.body?.user_id) || DEFAULT_USER_ID;
      const batchId = crypto.randomUUID();

      processCsvImport({ pool, logger, userId, batchId, rows: parsed.rows }).catch((err) => {
        logger.error({ err: err.message, batchId }, 'mtg card csv import crashed');
      });

      res.json({ ok: true, batch_id: batchId, row_count: parsed.rows.length });
    } catch (err) {
      logger.error({ err: err.message }, 'mtg cards import-csv failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/batch-upload', requireKey, upload.array('cards', MAX_FILES), async (req, res) => {
    try {
      await ready();
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ ok: false, error: 'no_files' });

      const userId = Number(req.body?.user_id) || DEFAULT_USER_ID;
      const batchId = crypto.randomUUID();

      // Tell the founder up front if this selection re-uploads photos already
      // catalogued -- the duplicate-batch problem was only discovered days
      // later by auditing the database, which is far too late to be useful.
      let alreadyCatalogued = 0;
      try {
        const names = files.map((f) => f.originalname).filter(Boolean);
        if (names.length) {
          const { rows } = await pool.query(
            `SELECT COUNT(DISTINCT photo_name)::int AS n FROM mtg_card_photos
             WHERE user_id = $1 AND kind = 'source' AND photo_name = ANY($2::text[])`,
            [userId, names],
          );
          alreadyCatalogued = rows[0]?.n || 0;
        }
      } catch (err) {
        logger.warn?.({ err: err.message }, 'mtg duplicate precheck failed (non-fatal)');
      }

      processBatch({ pool, logger, userId, batchId, files }).catch((err) => {
        logger.error({ err: err.message, batchId }, 'mtg card batch processing crashed');
      });

      res.json({
        ok: true,
        batch_id: batchId,
        file_count: files.length,
        already_catalogued: alreadyCatalogued,
        photos_will_be_saved: true,
        photo_storage: isR2Configured() ? 'r2' : 'database',
        message: `Received ${files.length} photo(s) — saving every image, then identifying/cropping/pricing each card.`,
      });
    } catch (err) {
      logger.error({ err: err.message }, 'mtg cards batch-upload failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/batch/:batchId', requireKey, async (req, res) => {
    try {
      await ready();
      const { rows } = await pool.query(
        `SELECT * FROM mtg_card_collection WHERE batch_id = $1 ORDER BY created_at ASC`,
        [req.params.batchId]
      );
      const done = rows.filter((r) => r.status !== 'identified').length;
      res.json({ ok: true, batch_id: req.params.batchId, total: rows.length, done, rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/batch/:batchId/summary', requireKey, async (req, res) => {
    try {
      await ready();
      const { rows } = await pool.query(
        `SELECT value_tier, COUNT(*)::int AS count, COALESCE(SUM(price_used), 0)::float AS subtotal_usd
         FROM mtg_card_collection WHERE batch_id = $1 GROUP BY value_tier`,
        [req.params.batchId]
      );
      const by_tier = {};
      let total_estimated_usd = 0;
      for (const r of rows) {
        by_tier[r.value_tier] = { count: r.count, subtotal_usd: r.subtotal_usd };
        total_estimated_usd += r.subtotal_usd;
      }
      res.json({ ok: true, batch_id: req.params.batchId, by_tier, total_estimated_usd });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.delete('/batch/:batchId', requireKey, async (req, res) => {
    try {
      await ready();
      const { rowCount } = await pool.query(
        `DELETE FROM mtg_card_collection WHERE batch_id = $1`,
        [req.params.batchId],
      );
      res.json({ ok: true, batch_id: req.params.batchId, deleted: rowCount });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Real diagnostic need found live 2026-08-11: "is it uploading?" asked
  // twice, and Railway's deploymentLogs GraphQL query only returns the most
  // recent ~101 lines (a hard cap on Railway's side, not something this repo
  // controls), which gets flooded out by extension-drive polling traffic
  // within about 2 minutes -- too short a window to reliably answer from
  // logs alone. This queries the real database directly instead, so "is
  // anything happening" has a fast, definitive answer without needing a
  // specific batch_id.
  router.get('/recent-activity', requireKey, async (req, res) => {
    try {
      await ready();
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const { rows } = await pool.query(
        `SELECT batch_id, COUNT(*)::int AS card_count,
                MIN(created_at) AS started_at, MAX(created_at) AS last_row_at,
                COUNT(*) FILTER (WHERE status = 'done')::int AS done_count,
                COUNT(*) FILTER (WHERE status LIKE '%failed%')::int AS failed_count
         FROM mtg_card_collection
         GROUP BY batch_id
         ORDER BY MAX(created_at) DESC
         LIMIT $1`,
        [limit]
      );
      res.json({ ok: true, batches: rows, server_now: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /** Batches whose photos were already catalogued by an earlier batch. */
  router.get('/duplicates', requireKey, async (req, res) => {
    try {
      await ready();
      const userId = Number(req.query.user_id) || DEFAULT_USER_ID;
      const { rows } = await pool.query(
        `WITH first_seen AS (
           SELECT photo_name, MIN(created_at) AS first_at
           FROM mtg_card_collection
           WHERE user_id = $1 AND photo_name IS NOT NULL AND source = 'photo_vision'
           GROUP BY photo_name
           HAVING COUNT(*) > 1
         )
         SELECT c.batch_id,
                COUNT(*)::int AS duplicate_rows,
                COALESCE(SUM(c.price_used), 0)::float AS duplicate_value_usd,
                MIN(c.created_at) AS batch_started_at
         FROM mtg_card_collection c
         JOIN first_seen f ON f.photo_name = c.photo_name
         WHERE c.user_id = $1 AND c.created_at > f.first_at
         GROUP BY c.batch_id
         ORDER BY MIN(c.created_at) DESC`,
        [userId],
      );
      res.json({
        ok: true,
        duplicate_batches: rows,
        total_duplicate_rows: rows.reduce((s, r) => s + r.duplicate_rows, 0),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  async function loadCollection(userId, { tier, review } = {}) {
    const params = [userId];
    const filters = [];
    if (tier) {
      params.push(String(tier));
      filters.push(`value_tier = $${params.length}`);
    }
    if (review) filters.push('needs_review = TRUE');
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `${DEDUPED_COLLECTION_CTE}
       SELECT * FROM deduped ${where}
       ORDER BY price_used DESC NULLS LAST, identified_name ASC`,
      params,
    );
    return rows;
  }

  router.get('/collection', requireKey, async (req, res) => {
    try {
      await ready();
      const userId = Number(req.query.user_id) || DEFAULT_USER_ID;
      const rows = await loadCollection(userId, {
        tier: req.query.tier || null,
        review: req.query.review === 'true',
      });

      const byTier = {};
      let totalUsd = 0;
      let reviewCount = 0;
      for (const r of rows) {
        const tier = r.value_tier || 'unknown';
        byTier[tier] = byTier[tier] || { count: 0, subtotal_usd: 0 };
        byTier[tier].count += 1;
        byTier[tier].subtotal_usd += Number(r.price_used || 0);
        totalUsd += Number(r.price_used || 0);
        if (r.needs_review) reviewCount += 1;
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 500, 5000);
      res.json({
        ok: true,
        card_count: rows.length,
        total_estimated_usd: Number(totalUsd.toFixed(2)),
        needs_review_count: reviewCount,
        by_tier: byTier,
        stats: buildCollectionStats(rows),
        rows: rows.slice(0, limit),
        truncated: rows.length > limit,
      });
    } catch (err) {
      logger.error({ err: err.message }, 'mtg collection query failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/collection/stats', requireKey, async (req, res) => {
    try {
      await ready();
      const userId = Number(req.query.user_id) || DEFAULT_USER_ID;
      const rows = await loadCollection(userId);
      const totalUsd = rows.reduce((s, r) => s + Number(r.price_used || 0), 0);
      res.json({
        ok: true,
        card_count: rows.length,
        total_estimated_usd: Number(totalUsd.toFixed(2)),
        foil_count: rows.filter((r) => r.is_foil === true).length,
        rare_plus_count: rows.filter((r) => ['rare', 'mythic', 'special', 'bonus'].includes(String(r.rarity || '').toLowerCase())).length,
        needs_review_count: rows.filter((r) => r.needs_review).length,
        ready_to_list_count: rows.filter((r) => r.sell_status === 'ready_to_list').length,
        ...buildCollectionStats(rows),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/collection.csv', requireKey, async (req, res) => {
    try {
      await ready();
      const userId = Number(req.query.user_id) || DEFAULT_USER_ID;
      const rows = await loadCollection(userId, {
        tier: req.query.tier || null,
        review: req.query.review === 'true',
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="mtg-collection.csv"');
      res.send(collectionToCsv(rows));
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * Re-runs Scryfall pricing over rows already in the database using their
   * stored name/set -- no vision call, so it costs nothing and can safely be
   * re-run whenever the pricing logic changes or market prices move. Added
   * 2026-08-11 because the pricing rewrite corrected values for cards that
   * were already catalogued, and re-photographing hundreds of cards to pick up
   * a backend fix would be an absurd thing to ask the founder to do.
   */
  function recordRepriceError(message) {
    const key = String(message).slice(0, 80);
    repriceJob.error_counts[key] = (repriceJob.error_counts[key] || 0) + 1;
    repriceJob.last_error = key;
  }

  async function runReprice({ userId, scope, batchId }) {
    const where = ['user_id = $1', "identified_name IS NOT NULL"];
    const params = [userId];
    if (scope === 'batch' && batchId) {
      params.push(batchId);
      where.push(`batch_id = $${params.length}`);
    } else if (scope === 'unpriced') {
      where.push("(price_used IS NULL OR value_tier = 'unknown')");
    }

    const { rows } = await pool.query(
      `SELECT id, identified_name, identified_set, is_foil, quantity, scryfall_id, source
       FROM mtg_card_collection WHERE ${where.join(' AND ')} ORDER BY created_at ASC`,
      params,
    );

    repriceJob.total = rows.length;
    for (const r of rows) {
      if (repriceJob.cancelled) break;
      try {
        const price = r.source === 'csv_import' && r.scryfall_id
          ? await lookupMtgCardById(r.scryfall_id, { logger })
          : await lookupMtgCardPrice(r.identified_name, r.identified_set, { logger });

        if (price.ok) {
          const updated = applyPriceToRow({ ...r }, price);
          await pool.query(
            `UPDATE mtg_card_collection SET
               scryfall_id = $2, price_usd = $3, price_usd_foil = $4, price_used = $5,
               price_source = $6, value_tier = $7, recommended_venue = $8, status = $9,
               price_min_usd = $10, price_max_usd = $11, printing_count = $12,
               price_match = $13, needs_review = $14, priced_at = NOW(),
               rarity = $15, set_code = $16, set_name = $17, set_released_at = $18, era = $19
             WHERE id = $1`,
            [r.id, updated.scryfall_id, updated.price_usd, updated.price_usd_foil, updated.price_used,
             updated.price_source, updated.value_tier, updated.recommended_venue, updated.status,
             updated.price_min_usd, updated.price_max_usd, updated.printing_count,
             updated.price_match, updated.needs_review,
             updated.rarity, updated.set_code, updated.set_name, updated.set_released_at, updated.era],
          );
          repriceJob.repriced += 1;
        } else {
          repriceJob.failed += 1;
          // A bare failure count is useless for diagnosis -- the first reprice
          // run reported 353 failures with no way to tell a rate-limited
          // request from a genuinely unrecognised card name.
          recordRepriceError(price.error || 'unknown');
        }
      } catch (err) {
        repriceJob.failed += 1;
        recordRepriceError(err.message);
        logger.warn?.({ err: err.message, id: r.id }, 'mtg reprice row failed');
      }
      repriceJob.processed += 1;
      repriceJob.updated_at = new Date().toISOString();
    }

    repriceJob.finished_at = new Date().toISOString();
    repriceJob.running = false;
  }

  router.post('/reprice', requireKey, async (req, res) => {
    try {
      await ready();
      // A job that has not advanced in STALE_REPRICE_MS is not "running", it
      // is wedged -- refusing to start a new one then leaves the founder with
      // no way to recover short of a redeploy.
      const stalledFor = repriceJob?.running ? Date.now() - new Date(repriceJob.updated_at).getTime() : 0;
      if (repriceJob?.running && stalledFor < STALE_REPRICE_MS) {
        return res.status(409).json({ ok: false, error: 'reprice_already_running', job: repriceJob });
      }
      if (repriceJob?.running) {
        repriceJob.cancelled = true;
        repriceJob.running = false;
        repriceJob.error = `superseded_after_stall_ms_${stalledFor}`;
      }
      const userId = Number(req.body?.user_id) || DEFAULT_USER_ID;
      const scope = ['all', 'unpriced', 'batch'].includes(req.body?.scope) ? req.body.scope : 'all';
      const batchId = req.body?.batch_id || null;

      repriceJob = {
        job_id: crypto.randomUUID(),
        running: true,
        cancelled: false,
        scope,
        batch_id: batchId,
        total: 0,
        processed: 0,
        repriced: 0,
        failed: 0,
        error_counts: {},
        last_error: null,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        finished_at: null,
      };

      runReprice({ userId, scope, batchId }).catch((err) => {
        logger.error({ err: err.message }, 'mtg reprice crashed');
        repriceJob.running = false;
        repriceJob.error = err.message;
      });

      res.json({ ok: true, job: repriceJob });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/reprice/status', requireKey, (req, res) => {
    if (!repriceJob) return res.json({ ok: true, job: null });
    res.json({ ok: true, job: repriceJob });
  });

  /** Serve a stored source or cropped listing photo. */
  router.get('/photos/:photoId', requireKey, async (req, res) => {
    try {
      await ready();
      const loaded = await loadPhotoBuffer(pool, req.params.photoId);
      if (!loaded) return res.status(404).json({ ok: false, error: 'photo_not_found' });
      if (loaded.r2_url && !loaded.buffer) return res.redirect(loaded.r2_url);
      res.setHeader('Content-Type', loaded.mime || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.send(loaded.buffer);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /** Sell queue: cards ready to list, sorted by value. */
  router.get('/sell-queue', requireKey, async (req, res) => {
    try {
      await ready();
      const userId = Number(req.query.user_id) || DEFAULT_USER_ID;
      const status = req.query.status || 'ready_to_list';
      const { rows } = await pool.query(
        `SELECT id, identified_name, identified_set, is_foil, price_used, value_tier,
                recommended_venue, sell_status, sell_venue_target, listing_photo_id,
                source_photo_id, needs_review, condition_guess
         FROM mtg_card_collection
         WHERE user_id = $1 AND sell_status = $2
         ORDER BY price_used DESC NULLS LAST
         LIMIT 500`,
        [userId, status],
      );
      res.json({
        ok: true,
        status,
        count: rows.length,
        total_estimated_usd: Number(rows.reduce((s, r) => s + Number(r.price_used || 0), 0).toFixed(2)),
        rows,
        photo_storage: isR2Configured() ? 'r2' : 'database',
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default { createMtgCardsRoutes };
