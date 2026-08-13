/**
 * SYNOPSIS: Durable MTG photo storage. Founder correction 2026-08-12: the
 * cataloger was discarding upload buffers after vision ID -- unusable for
 * listing/selling. Prefer R2 when configured (same helper as MarketingOS);
 * otherwise store compressed JPEG bytes in Postgres so photos survive even
 * when R2 is off (production creative health currently reports r2Configured:false).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import sharp from 'sharp';
import { isR2Configured, uploadBufferToR2 } from './marketing-r2-upload.js';

const MAX_EDGE_PX = 2000;
const JPEG_QUALITY = 85;

export async function ensurePhotoSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mtg_card_photos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL,
      batch_id UUID NOT NULL,
      photo_name TEXT NOT NULL,
      mime TEXT NOT NULL DEFAULT 'image/jpeg',
      byte_size INTEGER NOT NULL,
      data BYTEA,
      r2_key TEXT,
      r2_url TEXT,
      kind TEXT NOT NULL DEFAULT 'source',
      parent_photo_id UUID,
      card_slot INTEGER,
      width INTEGER,
      height INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS source_photo_id UUID`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS listing_photo_id UUID`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS sell_status TEXT NOT NULL DEFAULT 'catalogued'`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS sell_venue_target TEXT`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS sale_price_usd NUMERIC`);
}

/**
 * Compress/normalize for durable storage + later listing use.
 * Keeps faces readable without storing raw multi‑MB phone dumps forever.
 */
export async function prepareListingOrientedJpeg(buffer) {
  const image = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  const width = meta.width || null;
  const height = meta.height || null;
  const out = await image
    .resize({
      width: MAX_EDGE_PX,
      height: MAX_EDGE_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  return { buffer: out, mime: 'image/jpeg', width, height };
}

/**
 * @returns {Promise<{ id: string, photo_name: string, mime: string, byte_size: number, r2_url: string|null, storage: 'r2'|'db' }>}
 */
export async function saveSourcePhoto({
  pool,
  userId,
  batchId,
  photoName,
  mime,
  buffer,
  logger,
}) {
  const prepared = await prepareListingOrientedJpeg(buffer);
  let r2Key = null;
  let r2Url = null;
  let data = prepared.buffer;
  let storage = 'db';

  if (isR2Configured()) {
    try {
      const key = `mtg-cards/${userId}/${batchId}/${Date.now()}-${String(photoName).replace(/[^a-zA-Z0-9._-]/g, '_')}.jpg`;
      const uploaded = await uploadBufferToR2({
        objectKey: key,
        buffer: prepared.buffer,
        contentType: 'image/jpeg',
      });
      r2Key = uploaded.r2Key;
      r2Url = uploaded.r2Url;
      data = null; // durable in R2 — don't also bloat Postgres
      storage = 'r2';
    } catch (err) {
      logger?.warn?.({ err: err.message, photoName }, 'mtg photo R2 upload failed; falling back to DB storage');
      data = prepared.buffer;
      storage = 'db';
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO mtg_card_photos
       (user_id, batch_id, photo_name, mime, byte_size, data, r2_key, r2_url, kind, width, height)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'source',$9,$10)
     RETURNING id, photo_name, mime, byte_size, r2_url`,
    [
      userId,
      batchId,
      photoName,
      prepared.mime,
      prepared.buffer.length,
      data,
      r2Key,
      r2Url,
      prepared.width,
      prepared.height,
    ],
  );

  return { ...rows[0], storage };
}

/**
 * Crop a region from a stored source photo and save as a listing image.
 * box: { x, y, w, h } in 0..1 fractions of the source image, or pixel ints if absolute=true.
 */
export async function saveCroppedListingPhoto({
  pool,
  userId,
  batchId,
  parentPhotoId,
  cardSlot,
  photoName,
  sourceBuffer,
  box,
  absolute = false,
  logger,
}) {
  const meta = await sharp(sourceBuffer, { failOn: 'none' }).metadata();
  const imgW = meta.width || 0;
  const imgH = meta.height || 0;
  if (!imgW || !imgH) throw new Error('crop_source_has_no_dimensions');

  let left, top, width, height;
  if (absolute) {
    left = Math.max(0, Math.floor(box.x));
    top = Math.max(0, Math.floor(box.y));
    width = Math.min(imgW - left, Math.floor(box.w));
    height = Math.min(imgH - top, Math.floor(box.h));
  } else {
    left = Math.max(0, Math.floor(box.x * imgW));
    top = Math.max(0, Math.floor(box.y * imgH));
    width = Math.min(imgW - left, Math.floor(box.w * imgW));
    height = Math.min(imgH - top, Math.floor(box.h * imgH));
  }
  if (width < 20 || height < 20) throw new Error('crop_box_too_small');

  // Founder correction 2026-08-13: leave real background margin, not a tight
  // crop -- a listing photo that shows surrounding background reads as an
  // actual photo of the physical card (not a stock scan), and the card's
  // full border must stay uncut since border color (black vs white) is
  // itself identifying information buyers check.
  const padX = Math.floor(width * 0.18);
  const padY = Math.floor(height * 0.18);
  left = Math.max(0, left - padX);
  top = Math.max(0, top - padY);
  width = Math.min(imgW - left, width + padX * 2);
  height = Math.min(imgH - top, height + padY * 2);

  const cropped = await sharp(sourceBuffer, { failOn: 'none' })
    .extract({ left, top, width, height })
    .resize({ width: 1000, height: 1400, fit: 'inside', withoutEnlargement: false })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  let r2Key = null;
  let r2Url = null;
  let data = cropped;
  if (isR2Configured()) {
    try {
      const key = `mtg-cards/${userId}/${batchId}/crops/${Date.now()}-slot${cardSlot}.jpg`;
      const uploaded = await uploadBufferToR2({ objectKey: key, buffer: cropped, contentType: 'image/jpeg' });
      r2Key = uploaded.r2Key;
      r2Url = uploaded.r2Url;
      data = null;
    } catch (err) {
      logger?.warn?.({ err: err.message }, 'mtg crop R2 upload failed; storing in DB');
      data = cropped;
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO mtg_card_photos
       (user_id, batch_id, photo_name, mime, byte_size, data, r2_key, r2_url, kind, parent_photo_id, card_slot, width, height)
     VALUES ($1,$2,$3,'image/jpeg',$4,$5,$6,$7,'crop',$8,$9,$10,$11)
     RETURNING id, r2_url`,
    [
      userId,
      batchId,
      photoName,
      cropped.length,
      data,
      r2Key,
      r2Url,
      parentPhotoId,
      cardSlot,
      width,
      height,
    ],
  );
  return rows[0];
}

export async function loadPhotoBuffer(pool, photoId) {
  const { rows } = await pool.query(
    `SELECT id, mime, data, r2_url, r2_key FROM mtg_card_photos WHERE id = $1`,
    [photoId],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.data) return { mime: row.mime, buffer: row.data, r2_url: row.r2_url };
  if (row.r2_url) {
    const res = await fetch(row.r2_url);
    if (!res.ok) throw new Error(`r2_fetch_${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { mime: row.mime || 'image/jpeg', buffer: buf, r2_url: row.r2_url };
  }
  return null;
}
