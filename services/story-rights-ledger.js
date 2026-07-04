/**
 * SYNOPSIS: Exports createStoryRightsLedger — services/story-rights-ledger.js.
 */
export function createStoryRightsLedger({ pool }) {
  const RIGHTS_MODES = new Set(['all_rights_reserved', 'shared', 'public_domain']);
  const PRIVACY_MODES = new Set(['private', 'unlisted', 'public']);
  const CANON_MODES = new Set(['canonical', 'draft', 'archive']);

  function normalizeText(v) {
    return String(v ?? '').trim();
  }

  function assertOwnerId(ownerId) {
    const v = normalizeText(ownerId);
    if (!v) {
      const err = new Error('owner_id_required');
      err.status = 400;
      throw err;
    }
    return v;
  }

  function assertProjectId(projectId) {
    const v = normalizeText(projectId);
    if (!v) {
      const err = new Error('project_id_required');
      err.status = 400;
      throw err;
    }
    return v;
  }

  function validateModes({ rightsMode, privacyMode, canonMode } = {}) {
    const rights = normalizeText(rightsMode);
    const privacy = normalizeText(privacyMode);
    const canon = normalizeText(canonMode);

    if (!RIGHTS_MODES.has(rights)) {
      const err = new Error('invalid_rights_mode');
      err.status = 400;
      err.detail = { allowed: [...RIGHTS_MODES] };
      throw err;
    }
    if (!PRIVACY_MODES.has(privacy)) {
      const err = new Error('invalid_privacy_mode');
      err.status = 400;
      err.detail = { allowed: [...PRIVACY_MODES] };
      throw err;
    }
    if (!CANON_MODES.has(canon)) {
      const err = new Error('invalid_canon_mode');
      err.status = 400;
      err.detail = { allowed: [...CANON_MODES] };
      throw err;
    }

    return { rightsMode: rights, privacyMode: privacy, canonMode: canon };
  }

  async function createProject({
    ownerId,
    title,
    logline = null,
    rightsMode,
    privacyMode,
    canonMode,
    status = 'active',
  } = {}) {
    const owner = assertOwnerId(ownerId);
    const projectTitle = normalizeText(title);
    if (!projectTitle) {
      const err = new Error('title_required');
      err.status = 400;
      throw err;
    }

    const modes = validateModes({ rightsMode, privacyMode, canonMode });
    const projectStatus = normalizeText(status) || 'active';

    const { rows } = await pool.query(
      `INSERT INTO story_projects
         (owner_id, title, logline, rights_mode, privacy_mode, canon_mode, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        owner,
        projectTitle,
        logline == null ? null : normalizeText(logline) || null,
        modes.rightsMode,
        modes.privacyMode,
        modes.canonMode,
        projectStatus,
      ],
    );
    return rows[0];
  }

  async function getProject(projectId, ownerId = null) {
    const id = assertProjectId(projectId);
    const params = [id];
    let sql = `SELECT * FROM story_projects WHERE id = $1 LIMIT 1`;
    if (ownerId) {
      params.push(assertOwnerId(ownerId));
      sql = `SELECT * FROM story_projects WHERE id = $1 AND owner_id = $2 LIMIT 1`;
    }
    const { rows } = await pool.query(sql, params);
    if (!rows[0]) {
      const err = new Error('story_project_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function listProjects(ownerId, { status = null, limit = 50 } = {}) {
    const owner = assertOwnerId(ownerId);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    let sql = `SELECT * FROM story_projects WHERE owner_id = $1`;
    const params = [owner];

    if (status) {
      sql += ` AND status = $2`;
      params.push(normalizeText(status));
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(lim);

    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async function updateProject(projectId, ownerId, patch = {}) {
    const existing = await getProject(projectId, ownerId);
    const fields = [];
    const params = [];
    let idx = 1;

    if (Object.prototype.hasOwnProperty.call(patch, 'title')) {
      const title = normalizeText(patch.title);
      if (!title) {
        const err = new Error('title_required');
        err.status = 400;
        throw err;
      }
      fields.push(`title = $${idx++}`);
      params.push(title);
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'logline')) {
      fields.push(`logline = $${idx++}`);
      params.push(patch.logline == null ? null : normalizeText(patch.logline) || null);
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'rightsMode')) {
      const modes = validateModes({
        rightsMode: patch.rightsMode,
        privacyMode: existing.privacy_mode,
        canonMode: existing.canon_mode,
      });
      fields.push(`rights_mode = $${idx++}`);
      params.push(modes.rightsMode);
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'privacyMode')) {
      const modes = validateModes({
        rightsMode: existing.rights_mode,
        privacyMode: patch.privacyMode,
        canonMode: existing.canon_mode,
      });
      fields.push(`privacy_mode = $${idx++}`);
      params.push(modes.privacyMode);
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'canonMode')) {
      const modes = validateModes({
        rightsMode: existing.rights_mode,
        privacyMode: existing.privacy_mode,
        canonMode: patch.canonMode,
      });
      fields.push(`canon_mode = $${idx++}`);
      params.push(modes.canonMode);
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
      const status = normalizeText(patch.status);
      if (!status) {
        const err = new Error('status_required');
        err.status = 400;
        throw err;
      }
      fields.push(`status = $${idx++}`);
      params.push(status);
    }

    if (!fields.length) return existing;

    params.push(existing.id, existing.owner_id);
    const { rows } = await pool.query(
      `UPDATE story_projects
          SET ${fields.join(', ')}
        WHERE id = $${idx++} AND owner_id = $${idx++}
        RETURNING *`,
      params,
    );
    return rows[0];
  }

  async function setRightsMode(projectId, ownerId, rightsMode) {
    const modes = validateModes({
      rightsMode,
      privacyMode: 'private',
      canonMode: 'draft',
    });
    const project = await getProject(projectId, ownerId);
    const { rows } = await pool.query(
      `UPDATE story_projects
          SET rights_mode = $1
        WHERE id = $2 AND owner_id = $3
        RETURNING *`,
      [modes.rightsMode, project.id, project.owner_id],
    );
    return rows[0];
  }

  async function setPrivacyMode(projectId, ownerId, privacyMode) {
    const modes = validateModes({
      rightsMode: 'all_rights_reserved',
      privacyMode,
      canonMode: 'draft',
    });
    const project = await getProject(projectId, ownerId);
    const { rows } = await pool.query(
      `UPDATE story_projects
          SET privacy_mode = $1
        WHERE id = $2 AND owner_id = $3
        RETURNING *`,
      [modes.privacyMode, project.id, project.owner_id],
    );
    return rows[0];
  }

  async function setCanonMode(projectId, ownerId, canonMode) {
    const modes = validateModes({
      rightsMode: 'all_rights_reserved',
      privacyMode: 'private',
      canonMode,
    });
    const project = await getProject(projectId, ownerId);
    const { rows } = await pool.query(
      `UPDATE story_projects
          SET canon_mode = $1
        WHERE id = $2 AND owner_id = $3
        RETURNING *`,
      [modes.canonMode, project.id, project.owner_id],
    );
    return rows[0];
  }

  async function deleteProject(projectId, ownerId) {
    const project = await getProject(projectId, ownerId);
    const { rows } = await pool.query(
      `DELETE FROM story_projects WHERE id = $1 AND owner_id = $2 RETURNING *`,
      [project.id, project.owner_id],
    );
    return rows[0] || project;
  }

  return {
    RIGHTS_MODES: [...RIGHTS_MODES],
    PRIVACY_MODES: [...PRIVACY_MODES],
    CANON_MODES: [...CANON_MODES],
    validateModes,
    createProject,
    getProject,
    listProjects,
    updateProject,
    setRightsMode,
    setPrivacyMode,
    setCanonMode,
    deleteProject,
  };
}