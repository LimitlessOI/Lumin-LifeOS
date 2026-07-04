/**
 * SYNOPSIS: Exports createMediaService — services/creator-media-service.js.
 */
import { classifyIntent } from './voice-rail-v1.js';

const AI_TASK_TYPE = 'general';

const WORKFLOW_STATUSES = ['draft', 'editing', 'review', 'approved', 'published', 'archived'];

const WORKFLOW_TRANSITIONS = {
  draft: ['editing', 'review', 'archived'],
  editing: ['review', 'draft', 'archived'],
  review: ['approved', 'editing', 'archived'],
  approved: ['published', 'archived'],
  published: ['archived'],
  archived: [],
};

function normalizeText(value) {
  return String(value || '').trim();
}

function isForwardTransition(from, to) {
  const allowed = WORKFLOW_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

function inferContentType(rawText) {
  const t = normalizeText(rawText).toLowerCase();
  if (!t) return 'unknown';

  if (/\b(video|edit|editing|cut|trim|clip|reel|shorts|timeline|sequence|caption)\b/.test(t)) return 'video';
  if (/\b(script|storyboard|voice.?over|narration|scene|shot list)\b/.test(t)) return 'script';
  if (/\b(image|photo|thumbnail|graphic|banner|poster)\b/.test(t)) return 'image';

  const voiceIntent = classifyIntent(rawText, 'conversation');
  if (voiceIntent === 'command') return 'task';
  if (voiceIntent === 'commitment') return 'task';

  return 'general';
}

export function createMediaService({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  async function createMediaChannel({ ownerId, name, niche = null, brandProfile = null, seoProfile = null }) {
    const cleanName = normalizeText(name);
    if (!ownerId) {
      const err = new Error('owner_id_required');
      err.status = 400;
      throw err;
    }
    if (!cleanName) {
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
        ownerId,
        cleanName,
        niche ? normalizeText(niche) : null,
        JSON.stringify(brandProfile || {}),
        JSON.stringify(seoProfile || {}),
      ],
    );

    return rows[0];
  }

  async function getMediaChannel(channelId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM creator_channels WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [channelId, ownerId],
    );
    if (!rows[0]) {
      const err = new Error('channel_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function listMediaChannels(ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM creator_channels WHERE owner_id = $1 ORDER BY name ASC`,
      [ownerId],
    );
    return rows;
  }

  async function createMediaProject({
    ownerId,
    channelId = null,
    title,
    contentType = null,
    brief = null,
    metadata = {},
  }) {
    const cleanTitle = normalizeText(title);
    if (!ownerId) {
      const err = new Error('owner_id_required');
      err.status = 400;
      throw err;
    }
    if (!cleanTitle) {
      const err = new Error('title_required');
      err.status = 400;
      throw err;
    }

    if (channelId) {
      await getMediaChannel(channelId, ownerId);
    }

    const inferredType = contentType ? normalizeText(contentType) : inferContentType(brief || cleanTitle);

    const { rows } = await pool.query(
      `INSERT INTO media_projects
         (owner_id, channel_id, title, content_type, brief, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6::jsonb)
       RETURNING *`,
      [
        ownerId,
        channelId || null,
        cleanTitle,
        inferredType,
        brief ? normalizeText(brief) : null,
        JSON.stringify(metadata || {}),
      ],
    );

    return rows[0];
  }

  async function getMediaProject(projectId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM media_projects WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [projectId, ownerId],
    );
    if (!rows[0]) {
      const err = new Error('project_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function listMediaProjects(ownerId, { status = null, limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    if (status && WORKFLOW_STATUSES.includes(status)) {
      const { rows } = await pool.query(
        `SELECT * FROM media_projects WHERE owner_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3`,
        [ownerId, status, lim],
      );
      return rows;
    }

    const { rows } = await pool.query(
      `SELECT * FROM media_projects WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [ownerId, lim],
    );
    return rows;
  }

  async function updateMediaProject(projectId, ownerId, updates = {}) {
    const existing = await getMediaProject(projectId, ownerId);

    const nextStatus = updates.status ? normalizeText(updates.status) : existing.status;
    if (updates.status && !WORKFLOW_STATUSES.includes(nextStatus)) {
      const err = new Error('invalid_status');
      err.status = 400;
      throw err;
    }
    if (updates.status && !isForwardTransition(existing.status, nextStatus) && nextStatus !== existing.status) {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      err.detail = { current: existing.status, requested: nextStatus };
      throw err;
    }

    const nextTitle = Object.prototype.hasOwnProperty.call(updates, 'title') ? normalizeText(updates.title) : existing.title;
    const nextBrief = Object.prototype.hasOwnProperty.call(updates, 'brief') ? normalizeText(updates.brief) : existing.brief;
    const nextContentType = Object.prototype.hasOwnProperty.call(updates, 'contentType')
      ? normalizeText(updates.contentType)
      : existing.content_type;
    const nextMetadata = Object.prototype.hasOwnProperty.call(updates, 'metadata')
      ? updates.metadata || {}
      : existing.metadata || {};
    const nextChannelId = Object.prototype.hasOwnProperty.call(updates, 'channelId') ? updates.channelId || null : existing.channel_id;

    if (nextChannelId) {
      await getMediaChannel(nextChannelId, ownerId);
    }

    const { rows } = await pool.query(
      `UPDATE media_projects
          SET title = $3,
              brief = $4,
              content_type = $5,
              channel_id = $6,
              status = $7,
              metadata = $8::jsonb,
              updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        projectId,
        ownerId,
        nextTitle,
        nextBrief,
        nextContentType,
        nextChannelId,
        nextStatus,
        JSON.stringify(nextMetadata),
      ],
    );

    return rows[0];
  }

  async function createMediaAsset({
    ownerId,
    projectId = null,
    assetType,
    name,
    sourceUrl = null,
    metadata = {},
  }) {
    const cleanType = normalizeText(assetType);
    const cleanName = normalizeText(name);
    if (!ownerId) {
      const err = new Error('owner_id_required');
      err.status = 400;
      throw err;
    }
    if (!cleanType) {
      const err = new Error('asset_type_required');
      err.status = 400;
      throw err;
    }
    if (!cleanName) {
      const err = new Error('name_required');
      err.status = 400;
      throw err;
    }

    if (projectId) {
      await getMediaProject(projectId, ownerId);
    }

    const { rows } = await pool.query(
      `INSERT INTO media_assets
         (owner_id, project_id, asset_type, name, source_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [ownerId, projectId, cleanType, cleanName, sourceUrl || null, JSON.stringify(metadata || {})],
    );

    return rows[0];
  }

  async function listMediaAssets(ownerId, { projectId = null, limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    if (projectId) {
      const { rows } = await pool.query(
        `SELECT * FROM media_assets WHERE owner_id = $1 AND project_id = $2 ORDER BY created_at DESC LIMIT $3`,
        [ownerId, projectId, lim],
      );
      return rows;
    }

    const { rows } = await pool.query(
      `SELECT * FROM media_assets WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [ownerId, lim],
    );
    return rows;
  }

  async function generateMediaScript({ ownerId, projectId, prompt, format = 'script' }) {
    const project = await getMediaProject(projectId, ownerId);
    const taskPrompt = normalizeText(prompt) || project.brief || project.title;
    const response = await callCouncilMember('openai', taskPrompt, { taskType: AI_TASK_TYPE, format: normalizeText(format) || 'script' });
    return response;
  }

  async function generateVideoEdits({ ownerId, projectId, prompt, timeline = null }) {
    const project = await getMediaProject(projectId, ownerId);
    const taskPrompt = normalizeText(prompt) || project.brief || project.title;
    const response = await callCouncilMember('openai', taskPrompt, {
      taskType: AI_TASK_TYPE,
      format: 'video_edit',
      timeline: timeline || null,
    });
    return response;
  }

  async function publishMediaProject(projectId, ownerId) {
    const project = await getMediaProject(projectId, ownerId);
    if (!isForwardTransition(project.status, 'published') && project.status !== 'published') {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      err.detail = { current: project.status, requested: 'published' };
      throw err;
    }

    const { rows } = await pool.query(
      `UPDATE media_projects SET status = 'published', updated_at = NOW() WHERE id = $1 AND owner_id = $2 RETURNING *`,
      [projectId, ownerId],
    );
    return rows[0];
  }

  return {
    WORKFLOW_STATUSES,
    WORKFLOW_TRANSITIONS,
    inferContentType,
    createMediaChannel,
    getMediaChannel,
    listMediaChannels,
    createMediaProject,
    getMediaProject,
    listMediaProjects,
    updateMediaProject,
    createMediaAsset,
    listMediaAssets,
    generateMediaScript,
    generateVideoEdits,
    publishMediaProject,
  };
}