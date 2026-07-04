/**
 * SYNOPSIS: Exports createStoryCanonEngine — services/story-canon-engine.js.
 */
const STORY_CONSISTENCY_TASK_TYPE = 'general';

function toText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeText(value) {
  return toText(value).replace(/\s+/g, ' ').trim();
}

function safeJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function buildCanonPrompt({ project, canonText, issue, revisionRequest }) {
  const lines = [
    'You are the story canon and consistency engine for Story Studio.',
    'Ensure story consistency using the project canon and the issue description.',
    'Return concise structured guidance.',
    '',
    `Project title: ${project?.title || 'Untitled'}`,
    `Canon mode: ${project?.canon_mode || 'unknown'}`,
    `Privacy mode: ${project?.privacy_mode || 'unknown'}`,
    `Rights mode: ${project?.rights_mode || 'unknown'}`,
    '',
    'Story canon:',
    canonText || '(none provided)',
    '',
    'Consistency issue:',
    issue,
  ];

  if (revisionRequest) {
    lines.push('', 'Revision request:', revisionRequest);
  }

  return lines.join('\n');
}

export function createStoryCanonEngine({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  async function getProject(projectId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM story_projects WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [projectId, ownerId],
    );
    return rows[0] || null;
  }

  async function listProjects(ownerId, { status = null, limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    if (status) {
      const { rows } = await pool.query(
        `SELECT * FROM story_projects
          WHERE owner_id = $1 AND status = $2
          ORDER BY created_at DESC
          LIMIT $3`,
        [ownerId, status, lim],
      );
      return rows;
    }
    const { rows } = await pool.query(
      `SELECT * FROM story_projects
        WHERE owner_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [ownerId, lim],
    );
    return rows;
  }

  async function analyzeConsistency(projectId, ownerId, { canonText = '', issue = '', revisionRequest = '' } = {}) {
    const project = await getProject(projectId, ownerId);
    if (!project) {
      const err = new Error('project_not_found');
      err.status = 404;
      throw err;
    }

    const canon = normalizeText(canonText);
    const issueText = normalizeText(issue);
    if (!issueText) {
      const err = new Error('issue_required');
      err.status = 400;
      throw err;
    }

    const prompt = buildCanonPrompt({
      project,
      canonText: canon,
      issue: issueText,
      revisionRequest: normalizeText(revisionRequest),
    });

    const aiResult = await callCouncilMember('gemini', prompt, { taskType: STORY_CONSISTENCY_TASK_TYPE });

    return {
      project,
      result: aiResult,
      input: {
        canon_text: canon || null,
        issue: issueText,
        revision_request: normalizeText(revisionRequest) || null,
      },
    };
  }

  async function reconcileCanon(projectId, ownerId, { canonText = '', issue = '', revisionRequest = '' } = {}) {
    const outcome = await analyzeConsistency(projectId, ownerId, { canonText, issue, revisionRequest });
    return {
      project: outcome.project,
      guidance: outcome.result,
      input: outcome.input,
    };
  }

  async function getCanonProject(projectId, ownerId) {
    const project = await getProject(projectId, ownerId);
    if (!project) {
      const err = new Error('project_not_found');
      err.status = 404;
      throw err;
    }
    return project;
  }

  return {
    getProject: getCanonProject,
    listProjects,
    analyzeConsistency,
    reconcileCanon,
  };
}