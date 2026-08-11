/**
 * SYNOPSIS: Batch Magic: The Gathering card cataloging -- upload up to 150
 * card photos at once, identify each via OpenAI vision
 * (services/mtg-card-vision.js), price via Scryfall (services/mtg-card-pricing.js),
 * classify into a sell-venue tier, and store to mtg_card_collection.
 * Processing runs in the background after the upload request returns (a
 * 100+ card batch at a few seconds per vision call would otherwise hold the
 * HTTP request open for minutes) -- same async-session shape as
 * routes/extension-drive-routes.js's POST /start + GET /status.
 * Mounted at /api/v1/mtg-cards
 *   POST /batch-upload  (multipart, field name "cards", up to 150 files) -> { ok, batch_id, file_count }
 *   GET  /batch/:batchId -> { ok, batch_id, total, done, rows[] }
 *   GET  /batch/:batchId/summary -> { ok, by_tier: { high, mid, low, unknown }, total_estimated_usd }
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { identifyMtgCardFromPhoto } from '../services/mtg-card-vision.js';
import { lookupMtgCardPrice, classifyValueTier } from '../services/mtg-card-pricing.js';

const MAX_FILES = 150;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
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

export function createMtgCardsRoutes({ pool, requireKey, logger = console }) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } });
  let schemaReady = null;
  async function ready() {
    if (!schemaReady) schemaReady = ensureSchema(pool);
    await schemaReady;
  }

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

  return router;
}

export default { createMtgCardsRoutes };
