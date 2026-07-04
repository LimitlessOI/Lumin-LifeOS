import crypto from 'node:crypto';

/**
 * SYNOPSIS: Store and manage creator channel performance and brand memory.
 * WIRED: partial — service factory only; route wiring follows existing factory pattern.
 * INTEGRATE: CMOS-P1-008 channel memory blueprint
 * @ssot docs/products/CREATOR_MEDIA_OS/CREATOR_MEDIA_OS_HOME.md
 */

function toJson(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizeLimit(limit, defaultLimit = 50, maxLimit = 200) {
  const n = parseInt(limit, 10);
  if (!Number.isFinite(n)) return defaultLimit;
  return Math.min(Math.max(n, 1), maxLimit);
}

function createNotFoundError(message = 'channel_not_found') {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function createValidationError(message, detail) {
  const err = new Error(message);
  err.status = 400;
  if (detail !== undefined) err.detail = detail;
  return err;
}

function buildSearchClause(term, paramIndexStart = 1) {
  const t = String(term || '').trim();
  if (!t) return { clause: '', params: [] };

  const like = `%${t}%`;
  return {
    clause: ` AND (
      c.name ILIKE $${paramIndexStart}
      OR COALESCE(c.niche, '') ILIKE $${paramIndexStart}
      OR COALESCE(c.brand_profile_json::text, '') ILIKE $${paramIndexStart}
      OR COALESCE(c.seo_profile_json::text, '') ILIKE $${paramIndexStart}
    )`,
    params: [like],
  };
}

export function createChannelMemoryService({ pool }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_required');
  }

  async function createChannel({ ownerId, name, niche = null, brandProfile = {}, seoProfile = {} }) {
    const cleanName = String(name || '').trim();
    if (!ownerId) throw createValidationError('owner_id_required');
    if (!cleanName) throw createValidationError('name_required');

    const { rows } = await pool.query(
      `INSERT INTO creator_channels
         (owner_id, name, niche, brand_profile_json, seo_profile_json)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING *`,
      [
        ownerId,
        cleanName,
        niche ? String(niche).trim() : null,
        JSON.stringify(toJson(brandProfile, {})),
        JSON.stringify(toJson(seoProfile, {})),
      ],
    );

    return rows[0];
  }

  async function getChannel(channelId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM creator_channels WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [channelId, ownerId],
    );
    if (!rows[0]) throw createNotFoundError('channel_not_found');
    return rows[0];
  }

  async function listChannels(ownerId, { limit = 50, search = null } = {}) {
    if (!ownerId) throw createValidationError('owner_id_required');

    const lim = normalizeLimit(limit);
    const searchClause = buildSearchClause(search, 2);

    const { rows } = await pool.query(
      `SELECT *
         FROM creator_channels c
        WHERE c.owner_id = $1
        ${searchClause.clause}
        ORDER BY c.name ASC, c.id DESC
        LIMIT $${searchClause.params.length + 2}`,
      [ownerId, ...searchClause.params, lim],
    );

    return rows;
  }

  async function updateChannel(channelId, ownerId, { name, niche, brandProfileJson, seoProfileJson } = {}) {
    const existing = await getChannel(channelId, ownerId);

    const nextName = name === undefined ? existing.name : String(name || '').trim();
    if (!nextName) throw createValidationError('name_required');

    const nextNiche = niche === undefined ? existing.niche : (niche ? String(niche).trim() : null);
    const nextBrandProfile = brandProfileJson === undefined
      ? toJson(existing.brand_profile_json, {})
      : toJson(brandProfileJson, {});
    const nextSeoProfile = seoProfileJson === undefined
      ? toJson(existing.seo_profile_json, {})
      : toJson(seoProfileJson, {});

    const { rows } = await pool.query(
      `UPDATE creator_channels
          SET name = $3,
              niche = $4,
              brand_profile_json = $5::jsonb,
              seo_profile_json = $6::jsonb
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        channelId,
        ownerId,
        nextName,
        nextNiche,
        JSON.stringify(nextBrandProfile),
        JSON.stringify(nextSeoProfile),
      ],
    );

    return rows[0];
  }

  async function deleteChannel(channelId, ownerId) {
    const { rows } = await pool.query(
      `DELETE FROM creator_channels
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [channelId, ownerId],
    );
    if (!rows[0]) throw createNotFoundError('channel_not_found');
    return rows[0];
  }

  async function upsertBrandMemory(channelId, ownerId, memory = {}) {
    const channel = await getChannel(channelId, ownerId);
    const current = toJson(channel.brand_profile_json, {});
    const next = {
      ...current,
      ...toJson(memory, {}),
      updated_at: new Date().toISOString(),
      memory_id: current.memory_id || crypto.randomUUID(),
    };

    const { rows } = await pool.query(
      `UPDATE creator_channels
          SET brand_profile_json = $3::jsonb
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [channelId, ownerId, JSON.stringify(next)],
    );

    return rows[0];
  }

  async function upsertSeoMemory(channelId, ownerId, memory = {}) {
    const channel = await getChannel(channelId, ownerId);
    const current = toJson(channel.seo_profile_json, {});
    const next = {
      ...current,
      ...toJson(memory, {}),
      updated_at: new Date().toISOString(),
      memory_id: current.memory_id || crypto.randomUUID(),
    };

    const { rows } = await pool.query(
      `UPDATE creator_channels
          SET seo_profile_json = $3::jsonb
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [channelId, ownerId, JSON.stringify(next)],
    );

    return rows[0];
  }

  return {
    createChannel,
    getChannel,
    listChannels,
    updateChannel,
    deleteChannel,
    upsertBrandMemory,
    upsertSeoMemory,
  };
}