/**
 * SYNOPSIS: Exports createFaithStudioService — services/faith-studio-service.js.
 */
import { callCouncilMember as defaultCallCouncilMember } from '../core/council.js';

const PROJECT_STATUSES = new Set(['draft', 'active', 'paused', 'completed', 'archived']);
const OPERATION_STATUSES = new Set(['planned', 'active', 'paused', 'done', 'failed']);

function nowIso() {
  return new Date().toISOString();
}

function asJsonb(value) {
  return JSON.stringify(value ?? {});
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function parseLimit(limit, fallback = 50) {
  return Math.min(Math.max(parseInt(limit, 10) || fallback, 1), 200);
}

function projectNotFound() {
  const err = new Error('project_not_found');
  err.status = 404;
  return err;
}

function operationNotFound() {
  const err = new Error('operation_not_found');
  err.status = 404;
  return err;
}

function invalidTransition(current, requested) {
  const err = new Error('invalid_status_transition');
  err.status = 400;
  err.detail = { current, requested };
  return err;
}

function validateStatus(value, allowed, label) {
  if (!allowed.has(value)) {
    const err = new Error(`invalid_${label}_status`);
    err.status = 400;
    err.detail = { value, allowed: Array.from(allowed) };
    throw err;
  }
}

function canTransitionProject(from, to) {
  const transitions = {
    draft: new Set(['active', 'archived']),
    active: new Set(['paused', 'completed', 'archived']),
    paused: new Set(['active', 'completed', 'archived']),
    completed: new Set(['archived']),
    archived: new Set([]),
  };
  return Boolean(transitions[from]?.has(to));
}

function canTransitionOperation(from, to) {
  const transitions = {
    planned: new Set(['active', 'paused', 'failed']),
    active: new Set(['paused', 'done', 'failed']),
    paused: new Set(['active', 'done', 'failed']),
    done: new Set(['failed']),
    failed: new Set([]),
  };
  return Boolean(transitions[from]?.has(to));
}

export function createFaithStudioService({ pool, callCouncilMember = defaultCallCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }

  async function resolveUserId(userRef) {
    const ref = normalizeText(userRef) || 'adam';
    const { rows } = await pool.query(
      `SELECT id
         FROM lifeos_users
        WHERE user_handle = $1
           OR display_name ILIKE $1
        LIMIT 1`,
      [ref.toLowerCase()],
    );
    return rows[0]?.id || null;
  }

  async function createProject({
    ownerId,
    title,
    description = null,
    status = 'draft',
    metadata = {},
  }) {
    const cleanTitle = normalizeText(title);
    if (!cleanTitle) {
      const err = new Error('title_required');
      err.status = 400;
      throw err;
    }

    validateStatus(status, PROJECT_STATUSES, 'project');

    const { rows } = await pool.query(
      `INSERT INTO faith_projects
         (owner_id, title, description, status, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [ownerId, cleanTitle, description, status, asJsonb(metadata)],
    );

    return rows[0];
  }

  async function updateProject(projectId, ownerId, patch = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM faith_projects WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [projectId, ownerId],
    );
    const current = rows[0];
    if (!current) throw projectNotFound();

    const next = {
      title: patch.title != null ? normalizeText(patch.title) : current.title,
      description: patch.description !== undefined ? patch.description : current.description,
      status: patch.status != null ? normalizeText(patch.status) : current.status,
      metadata: patch.metadata !== undefined ? patch.metadata : current.metadata,
    };

    if (next.title === '') {
      const err = new Error('title_required');
      err.status = 400;
      throw err;
    }

    if (next.status !== current.status) {
      validateStatus(next.status, PROJECT_STATUSES, 'project');
      if (!canTransitionProject(current.status, next.status)) {
        throw invalidTransition(current.status, next.status);
      }
    }

    const { rows: updated } = await pool.query(
      `UPDATE faith_projects
          SET title = $3,
              description = $4,
              status = $5,
              metadata = $6::jsonb,
              updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [projectId, ownerId, next.title, next.description, next.status, asJsonb(next.metadata)],
    );

    return updated[0];
  }

  async function getProject(projectId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM faith_projects WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [projectId, ownerId],
    );
    if (!rows[0]) throw projectNotFound();
    return rows[0];
  }

  async function listProjects(ownerId, { status, limit = 50 } = {}) {
    const lim = parseLimit(limit, 50);
    if (status != null && status !== '') {
      validateStatus(status, PROJECT_STATUSES, 'project');
      const { rows } = await pool.query(
        `SELECT * FROM faith_projects
          WHERE owner_id = $1 AND status = $2
          ORDER BY updated_at DESC, created_at DESC
          LIMIT $3`,
        [ownerId, status, lim],
      );
      return rows;
    }

    const { rows } = await pool.query(
      `SELECT * FROM faith_projects
        WHERE owner_id = $1
        ORDER BY updated_at DESC, created_at DESC
        LIMIT $2`,
      [ownerId, lim],
    );
    return rows;
  }

  async function archiveProject(projectId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM faith_projects WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [projectId, ownerId],
    );
    const current = rows[0];
    if (!current) throw projectNotFound();
    if (current.status === 'archived') return current;
    if (!canTransitionProject(current.status, 'archived')) throw invalidTransition(current.status, 'archived');

    const { rows: updated } = await pool.query(
      `UPDATE faith_projects
          SET status = 'archived', updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [projectId, ownerId],
    );
    return updated[0];
  }

  async function createOperation({
    projectId,
    ownerId,
    title,
    description = null,
    status = 'planned',
    metadata = {},
    dueAt = null,
  }) {
    const cleanTitle = normalizeText(title);
    if (!cleanTitle) {
      const err = new Error('title_required');
      err.status = 400;
      throw err;
    }

    validateStatus(status, OPERATION_STATUSES, 'operation');

    const { rows: projectRows } = await pool.query(
      `SELECT * FROM faith_projects WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [projectId, ownerId],
    );
    const project = projectRows[0];
    if (!project) throw projectNotFound();

    const { rows } = await pool.query(
      `INSERT INTO faith_operations
         (project_id, owner_id, title, description, status, metadata, due_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING *`,
      [projectId, ownerId, cleanTitle, description, status, asJsonb(metadata), dueAt],
    );

    return rows[0];
  }

  async function updateOperation(operationId, ownerId, patch = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM faith_operations WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [operationId, ownerId],
    );
    const current = rows[0];
    if (!current) throw operationNotFound();

    const next = {
      title: patch.title != null ? normalizeText(patch.title) : current.title,
      description: patch.description !== undefined ? patch.description : current.description,
      status: patch.status != null ? normalizeText(patch.status) : current.status,
      metadata: patch.metadata !== undefined ? patch.metadata : current.metadata,
      due_at: patch.dueAt !== undefined ? patch.dueAt : current.due_at,
    };

    if (next.title === '') {
      const err = new Error('title_required');
      err.status = 400;
      throw err;
    }

    if (next.status !== current.status) {
      validateStatus(next.status, OPERATION_STATUSES, 'operation');
      if (!canTransitionOperation(current.status, next.status)) {
        throw invalidTransition(current.status, next.status);
      }
    }

    const { rows: updated } = await pool.query(
      `UPDATE faith_operations
          SET title = $3,
              description = $4,
              status = $5,
              metadata = $6::jsonb,
              due_at = $7,
              updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [operationId, ownerId, next.title, next.description, next.status, asJsonb(next.metadata), next.due_at],
    );

    return updated[0];
  }

  async function getOperation(operationId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM faith_operations WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [operationId, ownerId],
    );
    if (!rows[0]) throw operationNotFound();
    return rows[0];
  }

  async function listOperations(ownerId, { projectId = null, status, limit = 50 } = {}) {
    const lim = parseLimit(limit, 50);

    if (status != null && status !== '') {
      validateStatus(status, OPERATION_STATUSES, 'operation');
    }

    if (projectId != null && projectId !== '') {
      const params = [ownerId, projectId];
      let sql = `SELECT * FROM faith_operations WHERE owner_id = $1 AND project_id = $2`;
      if (status != null && status !== '') {
        params.push(status);
        sql += ` AND status = $3`;
      }
      params.push(lim);
      sql += ` ORDER BY updated_at DESC, created_at DESC LIMIT $${params.length}`;
      const { rows } = await pool.query(sql, params);
      return rows;
    }

    const params = [ownerId];
    let sql = `SELECT * FROM faith_operations WHERE owner_id = $1`;
    if (status != null && status !== '') {
      params.push(status);
      sql += ` AND status = $2`;
    }
    params.push(lim);
    sql += ` ORDER BY updated_at DESC, created_at DESC LIMIT $${params.length}`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async function progressOperation(operationId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM faith_operations WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [operationId, ownerId],
    );
    const current = rows[0];
    if (!current) throw operationNotFound();

    const next = current.status === 'planned' ? 'active' : current.status === 'paused' ? 'active' : 'done';
    if (next === current.status) return current;
    if (!canTransitionOperation(current.status, next)) throw invalidTransition(current.status, next);

    const { rows: updated } = await pool.query(
      `UPDATE faith_operations
          SET status = $3, updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [operationId, ownerId, next],
    );
    return updated[0];
  }

  async function pauseOperation(operationId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM faith_operations WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [operationId, ownerId],
    );
    const current = rows[0];
    if (!current) throw operationNotFound();
    if (current.status === 'paused') return current;
    if (!canTransitionOperation(current.status, 'paused')) throw invalidTransition(current.status, 'paused');

    const { rows: updated } = await pool.query(
      `UPDATE faith_operations
          SET status = 'paused', updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [operationId, ownerId],
    );
    return updated[0];
  }

  async function callCouncilOnProject(projectId, ownerId, prompt, metadata = {}) {
    const project = await getProject(projectId, ownerId);
    return callCouncilMember({
      topic: 'faith_studio_project',
      prompt: normalizeText(prompt),
      context: {
        project,
        metadata,
      },
    });
  }

  return {
    resolveUserId,
    createProject,
    updateProject,
    getProject,
    listProjects,
    archiveProject,
    createOperation,
    updateOperation,
    getOperation,
    listOperations,
    progressOperation,
    pauseOperation,
    callCouncilOnProject,
  };
}