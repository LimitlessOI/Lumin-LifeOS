/**
 * SYNOPSIS: Exports createStoryStudioService — services/story-studio-service.js.
 */
const STORY_PROJECT_STATUSES = new Set(['draft', 'active', 'archived']);

function normalizeText(value, fallback = '') {
  const s = String(value ?? '').trim();
  return s || fallback;
}

function jsonb(value) {
  return JSON.stringify(value ?? {});
}

function buildError(code, status, detail) {
  const err = new Error(code);
  err.status = status;
  if (detail !== undefined) err.detail = detail;
  return err;
}

function validateProjectId(projectId) {
  const id = normalizeText(projectId);
  if (!id) throw buildError('project_id_required', 400);
  return id;
}

function validateOwnerId(ownerId) {
  const id = normalizeText(ownerId);
  if (!id) throw buildError('owner_id_required', 400);
  return id;
}

function clampLimit(limit, min = 1, max = 100) {
  const parsed = parseInt(limit, 10);
  if (!Number.isFinite(parsed)) return Math.min(Math.max(50, min), max);
  return Math.min(Math.max(parsed, min), max);
}

function mapProjectRow(row) {
  if (!row) return null;
  return row;
}

export function createStoryStudioService({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }

  async function createProject({
    ownerId,
    title,
    logline = null,
    rightsMode,
    privacyMode,
    canonMode,
    status = 'draft',
  }) {
    const owner = validateOwnerId(ownerId);
    const projectTitle = normalizeText(title);
    if (!projectTitle) throw buildError('title_required', 400);
    const rights = normalizeText(rightsMode);
    const privacy = normalizeText(privacyMode);
    const canon = normalizeText(canonMode);
    const projectStatus = normalizeText(status, 'draft');

    if (!rights) throw buildError('rights_mode_required', 400);
    if (!privacy) throw buildError('privacy_mode_required', 400);
    if (!canon) throw buildError('canon_mode_required', 400);
    if (!STORY_PROJECT_STATUSES.has(projectStatus)) {
      throw buildError('invalid_status', 400, { allowed: [...STORY_PROJECT_STATUSES] });
    }

    const { rows } = await pool.query(
      `INSERT INTO story_projects
         (owner_id, title, logline, rights_mode, privacy_mode, canon_mode, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        owner,
        projectTitle,
        logline == null ? null : normalizeText(logline),
        rights,
        privacy,
        canon,
        projectStatus,
      ],
    );

    return mapProjectRow(rows[0]);
  }

  async function getProject(projectId, ownerId) {
    const id = validateProjectId(projectId);
    const owner = validateOwnerId(ownerId);
    const { rows } = await pool.query(
      `SELECT * FROM story_projects WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [id, owner],
    );
    if (!rows[0]) throw buildError('project_not_found', 404);
    return mapProjectRow(rows[0]);
  }

  async function listProjects(ownerId, { status, limit = 50 } = {}) {
    const owner = validateOwnerId(ownerId);
    const lim = clampLimit(limit);
    if (status && !STORY_PROJECT_STATUSES.has(status)) {
      throw buildError('invalid_status', 400, { allowed: [...STORY_PROJECT_STATUSES] });
    }

    const params = [owner];
    let sql = `SELECT * FROM story_projects WHERE owner_id = $1`;
    if (status) {
      params.push(status);
      sql += ` AND status = $2`;
    }
    params.push(lim);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const { rows } = await pool.query(sql, params);
    return rows.map(mapProjectRow);
  }

  async function updateProject(projectId, ownerId, patch = {}) {
    const id = validateProjectId(projectId);
    const owner = validateOwnerId(ownerId);

    const existing = await getProject(id, owner);
    const next = {
      title: patch.title !== undefined ? normalizeText(patch.title) : existing.title,
      logline: patch.logline !== undefined ? (patch.logline == null ? null : normalizeText(patch.logline)) : existing.logline,
      rightsMode: patch.rightsMode !== undefined ? normalizeText(patch.rightsMode) : existing.rights_mode,
      privacyMode: patch.privacyMode !== undefined ? normalizeText(patch.privacyMode) : existing.privacy_mode,
      canonMode: patch.canonMode !== undefined ? normalizeText(patch.canonMode) : existing.canon_mode,
      status: patch.status !== undefined ? normalizeText(patch.status) : existing.status,
    };

    if (!next.title) throw buildError('title_required', 400);
    if (!next.rightsMode) throw buildError('rights_mode_required', 400);
    if (!next.privacyMode) throw buildError('privacy_mode_required', 400);
    if (!next.canonMode) throw buildError('canon_mode_required', 400);
    if (!STORY_PROJECT_STATUSES.has(next.status)) {
      throw buildError('invalid_status', 400, { allowed: [...STORY_PROJECT_STATUSES] });
    }

    const { rows } = await pool.query(
      `UPDATE story_projects
          SET title = $3,
              logline = $4,
              rights_mode = $5,
              privacy_mode = $6,
              canon_mode = $7,
              status = $8
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        id,
        owner,
        next.title,
        next.logline,
        next.rightsMode,
        next.privacyMode,
        next.canonMode,
        next.status,
      ],
    );

    if (!rows[0]) throw buildError('project_not_found', 404);
    return mapProjectRow(rows[0]);
  }

  async function archiveProject(projectId, ownerId) {
    return updateProject(projectId, ownerId, { status: 'archived' });
  }

  async function generateSceneBreakdown(projectId, ownerId, input = {}) {
    const project = await getProject(projectId, ownerId);
    if (typeof callCouncilMember !== 'function') {
      throw buildError('council_member_unavailable', 503);
    }

    const prompt = {
      taskType: 'general',
      product: 'Story Studio',
      operation: 'Generate scene breakdown',
      project: {
        id: project.id,
        title: project.title,
        logline: project.logline,
        rights_mode: project.rights_mode,
        privacy_mode: project.privacy_mode,
        canon_mode: project.canon_mode,
        status: project.status,
      },
      input: {
        sceneCount: input.sceneCount ?? null,
        notes: input.notes ?? null,
        format: input.format ?? null,
      },
    };

    return await callCouncilMember('openai', prompt, { taskType: 'general' });
  }

  return {
    createProject,
    getProject,
    listProjects,
    updateProject,
    archiveProject,
    generateSceneBreakdown,
  };
}