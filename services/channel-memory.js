import crypto from 'crypto';

/**
 * SYNOPSIS: Store and manage creator channel performance and brand memory.
 * WIRED: service-only; intended for route/factory integration via existing patterns.
 * @ssot docs/products/CREATOR_MEDIA_OS/CREATOR_MEDIA_OS_HOME.md
 */

function toJson(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value == null ? '' : value).trim();
}

function requireOwnerId(ownerId) {
  const id = normalizeText(ownerId);
  if (!id) {
    const err = new Error('owner_id_required');
    err.status = 401;
    throw err;
  }
  return id;
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function createChannelMemoryService({ pool }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }

  async function getChannel(channelId, ownerId) {
    const id = normalizeText(channelId);
    const owner = requireOwnerId(ownerId);
    if (!id) {
      const err = new Error('channel_id_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `SELECT * FROM creator_channels WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [id, owner],
    );

    if (!rows[0]) {
      const err = new Error('channel_not_found');
      err.status = 404;
      throw err;
    }

    return rows[0];
  }

  async function listChannels(ownerId, { limit = 50 } = {}) {
    const owner = requireOwnerId(ownerId);
    const lim = Math.min(Math.max(toInt(limit, 50), 1), 200);
    const { rows } = await pool.query(
      `SELECT * FROM creator_channels WHERE owner_id = $1 ORDER BY name ASC LIMIT $2`,
      [owner, lim],
    );
    return rows;
  }

  async function createChannel(ownerId, { name, niche = null, brandProfileJson = {}, seoProfileJson = {} } = {}) {
    const owner = requireOwnerId(ownerId);
    const channelName = normalizeText(name);
    if (!channelName) {
      const err = new Error('name_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO creator_channels
         (owner_id, name, niche, brand_profile_json, seo_profile_json)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING *`,
      [
        owner,
        channelName,
        niche == null ? null : normalizeText(niche) || null,
        JSON.stringify(toJson(brandProfileJson, {})),
        JSON.stringify(toJson(seoProfileJson, {})),
      ],
    );

    return rows[0];
  }

  async function updateChannel(channelId, ownerId, patch = {}) {
    const owner = requireOwnerId(ownerId);
    const current = await getChannel(channelId, owner);

    const nextName =
      Object.prototype.hasOwnProperty.call(patch, 'name') ? normalizeText(patch.name) : current.name;
    const nextNiche = Object.prototype.hasOwnProperty.call(patch, 'niche')
      ? (normalizeText(patch.niche) || null)
      : current.niche;

    const nextBrandProfile = Object.prototype.hasOwnProperty.call(patch, 'brandProfileJson')
      ? toJson(patch.brandProfileJson, {})
      : toJson(current.brand_profile_json, {});
    const nextSeoProfile = Object.prototype.hasOwnProperty.call(patch, 'seoProfileJson')
      ? toJson(patch.seoProfileJson, {})
      : toJson(current.seo_profile_json, {});

    if (!nextName) {
      const err = new Error('name_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `UPDATE creator_channels
          SET name = $3,
              niche = $4,
              brand_profile_json = $5::jsonb,
              seo_profile_json = $6::jsonb
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        normalizeText(channelId),
        owner,
        nextName,
        nextNiche,
        JSON.stringify(nextBrandProfile),
        JSON.stringify(nextSeoProfile),
      ],
    );

    return rows[0];
  }

  async function deleteChannel(channelId, ownerId) {
    const owner = requireOwnerId(ownerId);
    const id = normalizeText(channelId);
    if (!id) {
      const err = new Error('channel_id_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `DELETE FROM creator_channels WHERE id = $1 AND owner_id = $2 RETURNING *`,
      [id, owner],
    );

    if (!rows[0]) {
      const err = new Error('channel_not_found');
      err.status = 404;
      throw err;
    }

    return rows[0];
  }

  async function setBrandMemory(channelId, ownerId, brandProfileJson) {
    const owner = requireOwnerId(ownerId);
    const id = normalizeText(channelId);
    if (!id) {
      const err = new Error('channel_id_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `UPDATE creator_channels
          SET brand_profile_json = $3::jsonb
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [id, owner, JSON.stringify(toJson(brandProfileJson, {}))],
    );

    if (!rows[0]) {
      const err = new Error('channel_not_found');
      err.status = 404;
      throw err;
    }

    return rows[0];
  }

  async function setSeoProfile(channelId, ownerId, seoProfileJson) {
    const owner = requireOwnerId(ownerId);
    const id = normalizeText(channelId);
    if (!id) {
      const err = new Error('channel_id_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `UPDATE creator_channels
          SET seo_profile_json = $3::jsonb
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [id, owner, JSON.stringify(toJson(seoProfileJson, {}))],
    );

    if (!rows[0]) {
      const err = new Error('channel_not_found');
      err.status = 404;
      throw err;
    }

    return rows[0];
  }

  async function recordPerformance(channelId, ownerId, performance = {}) {
    const owner = requireOwnerId(ownerId);
    const id = normalizeText(channelId);
    if (!id) {
      const err = new Error('channel_id_required');
      err.status = 400;
      throw err;
    }

    const payload = toJson(performance, {});
    const summary = {
      ...payload,
      recorded_at: payload.recorded_at || new Date().toISOString(),
      record_id: payload.record_id || crypto.randomUUID(),
    };

    const { rows } = await pool.query(
      `UPDATE creator_channels
          SET brand_profile_json = COALESCE(brand_profile_json, '{}'::jsonb) || $3::jsonb
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [id, owner, JSON.stringify({ performance_memory: summary })],
    );

    if (!rows[0]) {
      const err = new Error('channel_not_found');
      err.status = 404;
      throw err;
    }

    return { channel: rows[0], performance: summary };
  }

  async function getMemory(channelId, ownerId) {
    const channel = await getChannel(channelId, ownerId);
    return {
      channel,
      brand_memory: toJson(channel.brand_profile_json, {}),
      seo_profile: toJson(channel.seo_profile_json, {}),
    };
  }

  return {
    getChannel,
    listChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    setBrandMemory,
    setSeoProfile,
    recordPerformance,
    getMemory,
  };
}