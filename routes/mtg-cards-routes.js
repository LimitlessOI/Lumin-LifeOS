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
 *   POST /batch-upload  (multipart, field name "cards", up to 150 files) -> { ok, batch_id, file_count }
 *   POST /import-csv    (multipart, field name "csv", one file) -> { ok, batch_id, row_count }
 *   GET  /batch/:batchId -> { ok, batch_id, total, done, rows[] }
 *   GET  /batch/:batchId/summary -> { ok, by_tier: { high, mid, low, unknown }, total_estimated_usd }
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { identifyMtgCardFromPhoto } from '../services/mtg-card-vision.js';
import { lookupMtgCardPrice, lookupMtgCardById, classifyValueTier } from '../services/mtg-card-pricing.js';

const MAX_FILES = 150;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_CSV_ROWS = 5000;
const SCRYFALL_DELAY_MS = 120; // keeps batch lookups well under Scryfall's requested ~10 req/sec

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function processBatch({ pool, logger, userId, batchId, files }) {
  for (const file of files) {
    let row = {
      user_id: userId,
      batch_id: batchId,
      photo_name: file.originalname || 'unknown',
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
      value_tier: 'unknown',
      recommended_venue: 'manual_review',
      status: 'error',
    };

    try {
      const photo = { name: row.photo_name, mime: file.mimetype, data: file.buffer.toString('base64') };
      const id = await identifyMtgCardFromPhoto(photo, { logger });
      row.identified_name = id.name;
      row.identified_set = id.set;
      row.is_foil = id.foil;
      row.condition_guess = id.condition_guess;
      row.identify_confidence = id.confidence;
      if (!id.ok) row.identify_error = id.error;

      if (id.ok && id.name) {
        await sleep(SCRYFALL_DELAY_MS);
        const price = await lookupMtgCardPrice(id.name, id.set, { logger });
        if (price.ok) {
          row.scryfall_id = price.scryfall_id;
          row.price_usd = price.price_usd;
          row.price_usd_foil = price.price_usd_foil;
          row.price_used = id.foil ? (price.price_usd_foil ?? price.price_usd) : price.price_usd;
          row.price_source = 'scryfall';
          const tier = classifyValueTier(row.price_used);
          row.value_tier = tier.tier;
          row.recommended_venue = tier.venue;
          row.status = 'done';
        } else {
          row.identify_error = row.identify_error || `price_lookup_failed:${price.error}`;
          row.status = 'priced_failed';
        }
      } else {
        row.status = 'identify_failed';
      }
    } catch (err) {
      row.identify_error = err.message;
      logger?.error?.({ err: err.message, file: row.photo_name }, 'mtg card batch item failed');
    }

    await pool.query(
      `INSERT INTO mtg_card_collection
        (user_id, batch_id, photo_name, identified_name, identified_set, is_foil, condition_guess,
         identify_confidence, identify_error, scryfall_id, price_usd, price_usd_foil, price_used,
         price_source, value_tier, recommended_venue, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [row.user_id, row.batch_id, row.photo_name, row.identified_name, row.identified_set, row.is_foil,
       row.condition_guess, row.identify_confidence, row.identify_error, row.scryfall_id, row.price_usd,
       row.price_usd_foil, row.price_used, row.price_source, row.value_tier, row.recommended_venue, row.status]
    );
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
    let row = {
      user_id: userId,
      batch_id: batchId,
      photo_name: null,
      identified_name: r.name,
      identified_set: r.set,
      is_foil: r.foil,
      condition_guess: r.condition,
      identify_confidence: 'high', // ManaBox already scanned/identified this card
      identify_error: null,
      scryfall_id: null,
      price_usd: null,
      price_usd_foil: null,
      price_used: null,
      price_source: null,
      value_tier: 'unknown',
      recommended_venue: 'manual_review',
      status: 'error',
      quantity: r.quantity,
      source: 'csv_import',
    };

    try {
      await sleep(SCRYFALL_DELAY_MS);
      const price = r.scryfallId
        ? await lookupMtgCardById(r.scryfallId, { logger })
        : await lookupMtgCardPrice(r.name, r.set, { logger });

      if (price.ok) {
        row.scryfall_id = price.scryfall_id;
        row.price_usd = price.price_usd;
        row.price_usd_foil = price.price_usd_foil;
        const perCard = r.foil ? (price.price_usd_foil ?? price.price_usd) : price.price_usd;
        // Store the STACK's total value (per-card price x quantity) so batch
        // summary totals reflect the founder's real collection value, not
        // just one copy of each unique card -- a real ManaBox CSV routinely
        // has quantity > 1 per row for commons/staples.
        row.price_used = perCard != null ? perCard * r.quantity : null;
        row.price_source = 'scryfall';
        const tier = classifyValueTier(perCard);
        row.value_tier = tier.tier;
        row.recommended_venue = tier.venue;
        row.status = 'done';
      } else {
        row.identify_error = `price_lookup_failed:${price.error}`;
        row.status = 'priced_failed';
      }
    } catch (err) {
      row.identify_error = err.message;
      logger?.error?.({ err: err.message, name: r.name }, 'mtg card csv import row failed');
    }

    await pool.query(
      `INSERT INTO mtg_card_collection
        (user_id, batch_id, photo_name, identified_name, identified_set, is_foil, condition_guess,
         identify_confidence, identify_error, scryfall_id, price_usd, price_usd_foil, price_used,
         price_source, value_tier, recommended_venue, status, quantity, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [row.user_id, row.batch_id, row.photo_name, row.identified_name, row.identified_set, row.is_foil,
       row.condition_guess, row.identify_confidence, row.identify_error, row.scryfall_id, row.price_usd,
       row.price_usd_foil, row.price_used, row.price_source, row.value_tier, row.recommended_venue, row.status,
       row.quantity, row.source]
    );
  }
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

  router.post('/import-csv', requireKey, csvUpload.single('csv'), async (req, res) => {
    try {
      await ready();
      if (!req.file) return res.status(400).json({ ok: false, error: 'no_file' });

      const parsed = parseManaBoxCsv(req.file.buffer.toString('utf8'));
      if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.error });
      if (!parsed.rows.length) return res.status(400).json({ ok: false, error: 'no_data_rows' });

      const userId = Number(req.body?.user_id) || 1;
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

      const userId = Number(req.body?.user_id) || 1;
      const batchId = crypto.randomUUID();

      processBatch({ pool, logger, userId, batchId, files }).catch((err) => {
        logger.error({ err: err.message, batchId }, 'mtg card batch processing crashed');
      });

      res.json({ ok: true, batch_id: batchId, file_count: files.length });
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

  return router;
}

export default { createMtgCardsRoutes };
