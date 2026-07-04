/**
 * SYNOPSIS: Service module — Creator Media Service.
 */
const MEDIA_STATUS = {
  draft: 'draft',
  editing: 'editing',
  review: 'review',
  published: 'published',
  archived: 'archived',
};

const MEDIA_STATUS_ORDER = ['draft', 'editing', 'review', 'published', 'archived'];

const EDIT_TASK_STATUSES = new Set(['queued', 'in_progress', 'completed', 'failed', 'canceled']);

function statusRank(status) {
  const idx = MEDIA_STATUS_ORDER.indexOf(status);
  return idx === -1 ? -1 : idx;
}

function isForwardTransition(fromStatus, toStatus) {
  return statusRank(toStatus) > statusRank(fromStatus);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function toJson(value) {
  return JSON.stringify(value ?? {});
}

function buildError(code, status, detail) {
  const err = new Error(code);
  err.status = status;
  if (detail !== undefined) err.detail = detail;
  return err;
}

async function callOpenAI(callCouncilMember, prompt, metadata = {}) {
  if (typeof callCouncilMember !== 'function') {
    return null;
  }

  const result = await callCouncilMember('openai', prompt, { taskType: 'general', ...metadata });
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    if (typeof result.text === 'string') return result.text;
    if (typeof result.content === 'string') return result.content;
    if (typeof result.output_text === 'string') return result.output_text;
  }
  return result;
}

function createMediaService({ pool, callCouncilMember }) {
  async function resolveChannel(ownerId, channelId) {
    const { rows } = await pool.query(
      `SELECT *
         FROM creator_channels
        WHERE id = $1 AND owner_id = $2
        LIMIT 1`,
      [channelId, ownerId],
    );
    return rows[0] || null;
  }

  async function ensureChannelOwner(ownerId, channelId) {
    const channel = await resolveChannel(ownerId, channelId);
    if (!channel) {
      throw buildError('channel_not_found', 404);
    }
    return channel;
  }

  async function createMediaChannel(ownerId, { name, niche, brandProfileJson, seoProfileJson } = {}) {
    const channelName = normalizeText(name);
    if (!channelName) {
      throw buildError('name_required', 400);
    }

    const { rows } = await pool.query(
      `INSERT INTO creator_channels
         (owner_id, name, niche, brand_profile_json, seo_profile_json)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING *`,
      [
        ownerId,
        channelName,
        normalizeText(niche) || null,
        toJson(brandProfileJson || {}),
        toJson(seoProfileJson || {}),
      ],
    );

    return rows[0];
  }

  async function updateMediaChannel(ownerId, channelId, updates = {}) {
    const channel = await ensureChannelOwner(ownerId, channelId);

    const nextName = normalizeText(updates.name);
    const nextNiche = updates.niche === undefined ? channel.niche : normalizeText(updates.niche) || null;
    const nextBrandProfileJson =
      updates.brandProfileJson === undefined ? channel.brand_profile_json : updates.brandProfileJson;
    const nextSeoProfileJson =
      updates.seoProfileJson === undefined ? channel.seo_profile_json : updates.seoProfileJson;

    if (updates.name !== undefined && !nextName) {
      throw buildError('name_required', 400);
    }

    const { rows } = await pool.query(
      `UPDATE creator_channels
          SET name = COALESCE($3, name),
              niche = $4,
              brand_profile_json = $5::jsonb,
              seo_profile_json = $6::jsonb
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        channelId,
        ownerId,
        updates.name === undefined ? null : nextName,
        nextNiche,
        toJson(nextBrandProfileJson || {}),
        toJson(nextSeoProfileJson || {}),
      ],
    );

    return rows[0] || channel;
  }

  async function listMediaChannels(ownerId, { limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT *
         FROM creator_channels
        WHERE owner_id = $1
        ORDER BY name ASC, id ASC
        LIMIT $2`,
      [ownerId, lim],
    );
    return rows;
  }

  async function getMediaChannel(ownerId, channelId) {
    const channel = await resolveChannel(ownerId, channelId);
    if (!channel) {
      throw buildError('channel_not_found', 404);
    }
    return channel;
  }

  async function createMediaWorkflow(ownerId, { channelId, title, format, brief, metadata } = {}) {
    const resolvedChannelId = normalizeText(channelId);
    if (!resolvedChannelId) {
      throw buildError('channel_id_required', 400);
    }
    await ensureChannelOwner(ownerId, resolvedChannelId);

    const workflowTitle = normalizeText(title);
    if (!workflowTitle) {
      throw buildError('title_required', 400);
    }

    const prompt = [
      'Generate scripts and video edits for a creator media workflow.',
      `Channel ID: ${resolvedChannelId}`,
      `Title: ${workflowTitle}`,
      format ? `Format: ${normalizeText(format)}` : null,
      brief ? `Brief: ${normalizeText(brief)}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const aiResponse = await callOpenAI(callCouncilMember, prompt, {
      workflow: 'creator_media',
      channelId: resolvedChannelId,
      title: workflowTitle,
    });

    return {
      channel_id: resolvedChannelId,
      title: workflowTitle,
      format: normalizeText(format) || null,
      brief: normalizeText(brief) || null,
      metadata: metadata || {},
      ai_response: aiResponse,
    };
  }

  async function createMediaTask(ownerId, { channelId, title, status = 'queued', metadata } = {}) {
    const resolvedChannelId = normalizeText(channelId);
    if (!resolvedChannelId) {
      throw buildError('channel_id_required', 400);
    }
    await ensureChannelOwner(ownerId, resolvedChannelId);

    const taskTitle = normalizeText(title);
    if (!taskTitle) {
      throw buildError('title_required', 400);
    }

    const taskStatus = normalizeText(status) || 'queued';
    if (!EDIT_TASK_STATUSES.has(taskStatus)) {
      throw buildError('invalid_status', 400);
    }

    return {
      id: null,
      owner_id: ownerId,
      channel_id: resolvedChannelId,
      title: taskTitle,
      status: taskStatus,
      metadata: metadata || {},
      persisted: false,
    };
  }

  async function listMediaTasks(ownerId, { channelId, status, limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const resolvedChannelId = channelId === undefined ? null : normalizeText(channelId);
    const taskStatus = status === undefined ? null : normalizeText(status);

    if (taskStatus && !EDIT_TASK_STATUSES.has(taskStatus)) {
      throw buildError('invalid_status', 400);
    }

    if (resolvedChannelId) {
      await ensureChannelOwner(ownerId, resolvedChannelId);
    }

    const params = [ownerId];
    let where = `WHERE owner_id = $1`;

    if (resolvedChannelId) {
      params.push(resolvedChannelId);
      where += ` AND channel_id = $${params.length}`;
    }

    if (taskStatus) {
      params.push(taskStatus);
      where += ` AND status = $${params.length}`;
    }

    params.push(lim);

    const { rows } = await pool.query(
      `SELECT *
         FROM media_workflows
         ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length}`,
      params,
    );
    return rows;
  }

  async function getMediaTask(ownerId, taskId) {
    const { rows } = await pool.query(
      `SELECT *
         FROM media_workflows
        WHERE id = $1 AND owner_id = $2
        LIMIT 1`,
      [taskId, ownerId],
    );
    const task = rows[0];
    if (!task) {
      throw buildError('workflow_not_found', 404);
    }
    return task;
  }

  async function updateMediaTask(ownerId, taskId, updates = {}) {
    const task = await getMediaTask(ownerId, taskId);

    if (updates.status !== undefined) {
      const nextStatus = normalizeText(updates.status);
      if (!EDIT_TASK_STATUSES.has(nextStatus)) {
        throw buildError('invalid_status', 400);
      }
      if (!isForwardTransition(task.status, nextStatus) && task.status !== nextStatus) {
        throw buildError('invalid_status_transition', 400, { current: task.status, requested: nextStatus });
      }
      task.status = nextStatus;
    }

    const nextTitle = updates.title === undefined ? task.title : normalizeText(updates.title);
    if (updates.title !== undefined && !nextTitle) {
      throw buildError('title_required', 400);
    }

    const nextMetadata = updates.metadata === undefined ? task.metadata : updates.metadata;

    const { rows } = await pool.query(
      `UPDATE media_workflows
          SET title = COALESCE($3, title),
              status = COALESCE($4, status),
              metadata = $5::jsonb,
              updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        taskId,
        ownerId,
        updates.title === undefined ? null : nextTitle,
        updates.status === undefined ? null : task.status,
        toJson(nextMetadata || {}),
      ],
    );

    return rows[0] || task;
  }

  async function requestMediaEdit(ownerId, { channelId, assetId, instructions, metadata } = {}) {
    const resolvedChannelId = normalizeText(channelId);
    const resolvedAssetId = normalizeText(assetId);

    if (!resolvedChannelId) {
      throw buildError('channel_id_required', 400);
    }
    if (!resolvedAssetId) {
      throw buildError('asset_id_required', 400);
    }
    await ensureChannelOwner(ownerId, resolvedChannelId);

    const editInstructions = normalizeText(instructions);
    if (!editInstructions) {
      throw buildError('instructions_required', 400);
    }

    const { rows } = await pool.query(
      `INSERT INTO media_workflows
         (owner_id, channel_id, asset_id, title, status, metadata)
       VALUES ($1, $2, $3, $4, 'queued', $5::jsonb)
       RETURNING *`,
      [
        ownerId,
        resolvedChannelId,
        resolvedAssetId,
        editInstructions.slice(0, 120),
        toJson({
          ...(metadata || {}),
          instructions: editInstructions,
          workflow_type: 'media_edit',
        }),
      ],
    );

    return rows[0];
  }

  return {
    MEDIA_STATUS,
    createMediaChannel,
    updateMediaChannel,
    listMediaChannels,
    getMediaChannel,
    createMediaWorkflow,
    createMediaTask,
    listMediaTasks,
    getMediaTask,
    updateMediaTask,
    requestMediaEdit,
  };
}

export { createMediaService };