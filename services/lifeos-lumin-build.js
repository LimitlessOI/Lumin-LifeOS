/**
 * Lumin programming bridge — plan/draft via AI Council + queue work on Adam / builder rails.
 *
 * Outputs are advisory (council text). Applying patches to the repo still flows through
 * human + builder / governance (`pending_adam`, project segments, verify scripts).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getModelForTask, getCandidateModelsForTask } from '../config/task-model-routing.js';
import { createMemoryIntelligenceService } from './memory-intelligence-service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');

const METADATA_SEP = '\n---METADATA---\n';

function splitBuilderOutput(raw) {
  const text = String(raw || '');
  const i = text.lastIndexOf(METADATA_SEP);
  if (i === -1) return { output: text.trim(), placement: null };
  const main = text.slice(0, i).trim();
  try {
    const placement = JSON.parse(text.slice(i + METADATA_SEP.length).trim());
    return { output: main, placement: typeof placement === 'object' && placement ? placement : null };
  } catch {
    return { output: text.trim(), placement: null };
  }
}

async function loadDomain(domain) {
  if (!domain || !/^[\w-]+$/.test(domain)) return '';
  try {
    return await readFile(join(PROMPTS_DIR, `${domain}.md`), 'utf8');
  } catch {
    return '';
  }
}

/**
 * @param {{ pool: import('pg').Pool, callCouncilMember: Function, logger?: Console }} deps
 */
export function createLifeOSLuminBuild({ pool, callCouncilMember, logger }) {
  const log = logger || console;
  const memorySvc = pool?.query ? createMemoryIntelligenceService(pool, log) : null;

  async function patchJob(jobId, userId, fields) {
    const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
    if (!keys.length) return null;
    const set = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
    const vals = keys.map((k) => fields[k]);
    const { rows: [row] } = await pool.query(
      `UPDATE lumin_programming_jobs SET ${set} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [jobId, userId, ...vals]
    );
    return row;
  }

  async function getJob(jobId, userId) {
    const { rows: [row] } = await pool.query(
      `SELECT * FROM lumin_programming_jobs WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );
    return row || null;
  }

  async function listJobs(userId, { limit = 20 } = {}) {
    const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const { rows } = await pool.query(
      `SELECT id, title, kind, status, step_detail, project_slug, created_at, updated_at
       FROM lumin_programming_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, lim]
    );
    return rows;
  }

  /**
   * Read-only build ops (no AI). Aggregates `lumin_programming_jobs` for monitoring.
   * @param {number} userId
   * @param {{ hours?: number }} [opts]
   */
  async function getBuildOps(userId, { hours = 24 } = {}) {
    const h = Math.min(168, Math.max(1, parseInt(String(hours), 10) || 24));
    const { rows: [counts] } = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'queued')::int  AS queued,
         COUNT(*) FILTER (WHERE status = 'running')::int AS running,
         COUNT(*) FILTER (WHERE status = 'done')::int     AS done,
         COUNT(*) FILTER (WHERE status = 'failed')::int  AS failed
       FROM lumin_programming_jobs
       WHERE user_id = $1
         AND created_at >= NOW() - ($2::int * INTERVAL '1 hour')`,
      [userId, h]
    );

    const { rows: stuck } = await pool.query(
      `SELECT id, kind, status, step_detail, created_at, updated_at
       FROM lumin_programming_jobs
       WHERE user_id = $1
         AND status = 'running'
         AND updated_at < NOW() - INTERVAL '10 minutes'
       ORDER BY updated_at ASC
       LIMIT 20`,
      [userId]
    );

    const { rows: topErrors } = await pool.query(
      `SELECT error_text, COUNT(*)::int AS n
       FROM lumin_programming_jobs
       WHERE user_id = $1
         AND status = 'failed'
         AND error_text IS NOT NULL
         AND btrim(error_text) <> ''
         AND created_at >= NOW() - ($2::int * INTERVAL '1 hour')
       GROUP BY error_text
       ORDER BY n DESC, error_text
       LIMIT 8`,
      [userId, h]
    );

    const { rows: [dur] } = await pool.query(
      `SELECT
         AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::float AS avg_duration_s,
         COALESCE(
           PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at))),
           0
         )::float AS p95_duration_s
       FROM lumin_programming_jobs
       WHERE user_id = $1
         AND status = 'done'
         AND created_at >= NOW() - ($2::int * INTERVAL '1 hour')`,
      [userId, h]
    );

    return {
      window_hours: h,
      counts: counts || { total: 0, queued: 0, running: 0, done: 0, failed: 0 },
      stuck_running: stuck,
      top_errors: topErrors,
      duration: {
        avg_seconds: dur?.avg_duration_s == null ? null : Number(dur.avg_duration_s),
        p95_seconds: dur?.p95_duration_s == null ? null : Number(dur.p95_duration_s),
      },
    };
  }

  /**
   * @param {{ userId: number, threadId?: number|null, goal: string, domain?: string|null, project_slug?: string|null }} p
   */
  async function planGoal(p) {
    if (!callCouncilMember) throw Object.assign(new Error('Council not available'), { status: 503 });
    const { userId, threadId = null, goal, domain = null, project_slug = null } = p;
    if (!goal?.trim()) throw Object.assign(new Error('goal is required'), { status: 400 });

    const { rows: [job] } = await pool.query(
      `INSERT INTO lumin_programming_jobs
        (user_id, thread_id, title, kind, status, step_detail, project_slug, domain, goal_text)
       VALUES ($1, $2, $3, 'plan', 'running', 'Calling council (plan mode)', $4, $5, $6)
       RETURNING *`,
      [
        userId,
        threadId,
        goal.trim().slice(0, 200),
        project_slug,
        domain,
        goal.trim(),
      ]
    );

    try {
      const domainContext = await loadDomain(domain);
      const preferredModel = getModelForTask('lifeos.lumin.program_plan') || 'gemini_flash';
      let routingRecommendation = { selectedModel: preferredModel };
      if (memorySvc) {
        try {
          routingRecommendation = await memorySvc.getRoutingRecommendation({
            taskType: 'lifeos.lumin.program_plan',
            proposedModel: preferredModel,
            candidateModels: getCandidateModelsForTask('lifeos.lumin.program_plan'),
          });
        } catch (memoryErr) {
          log.warn({ err: memoryErr.message }, '[LUMIN-BUILD] Memory routing unavailable — using static plan model');
          routingRecommendation = { selectedModel: preferredModel, reason: 'Memory routing unavailable; using static map' };
        }
      }
      const memberKey = routingRecommendation.selectedModel;
      if (!memberKey) {
        throw Object.assign(new Error('No authorized model is currently allowed for lifeos.lumin.program_plan'), { status: 409 });
      }

      const systemPrompt = [
        'You are a senior engineer on the LifeOS / Lumin-LifeOS monorepo.',
        'Produce an implementation plan only — no full file dumps unless tiny.',
        'Name concrete files, routes, migrations, and verification steps (`node scripts/verify-project.mjs`, `node scripts/lifeos-verify.mjs`).',
        'Respect North Star honesty: label shipped vs backlog; never claim tests passed without naming the command.',
        domainContext ? `\n--- DOMAIN PROMPT (${domain}) ---\n${domainContext.slice(0, 12000)}\n---` : '',
      ].filter(Boolean).join('\n');

      const userPrompt = [
        `USER GOAL:\n${goal.trim()}`,
        project_slug ? `\nPreferred project slug (governance): ${project_slug}` : '',
        '\nEnd with ---METADATA--- then a single JSON object: {"confidence":0.0-1,"suggested_files":[],"risk_notes":""}',
      ].join('\n');

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const raw = await callCouncilMember(memberKey, fullPrompt, {
        taskType: 'planning',
        useCache: false,
      });
      const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const { output, placement } = splitBuilderOutput(text);

      const { rows: [updated] } = await pool.query(
        `UPDATE lumin_programming_jobs
         SET status = 'done', step_detail = 'Plan complete', result_text = $1, result_meta = $2::jsonb
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [
          output,
          JSON.stringify({
            placement,
            model_used: memberKey,
            routing_reason: routingRecommendation.reason || null,
            blocked_candidates: routingRecommendation.blockedCandidates || [],
          }),
          job.id,
          userId,
        ]
      );

      return {
        job: updated,
        plan: output,
        placement,
        model_used: memberKey,
        routing_reason: routingRecommendation.reason || null,
        blocked_candidates: routingRecommendation.blockedCandidates || [],
      };
    } catch (err) {
      log.error({ err: err.message, jobId: job.id }, '[LUMIN-BUILD] planGoal failed');
      await pool.query(
        `UPDATE lumin_programming_jobs SET status = 'failed', error_text = $1, step_detail = 'Failed'
         WHERE id = $2 AND user_id = $3`,
        [err.message, job.id, userId]
      );
      throw err;
    }
  }

  /**
   * @param {{ userId: number, threadId?: number|null, goal: string, domain?: string|null, spec?: string|null, files?: string[]|null, project_slug?: string|null }} p
   */
  async function draftGoal(p) {
    if (!callCouncilMember) throw Object.assign(new Error('Council not available'), { status: 503 });
    const {
      userId,
      threadId = null,
      goal,
      domain = null,
      spec = null,
      files = null,
      project_slug = null,
    } = p;
    if (!goal?.trim()) throw Object.assign(new Error('goal is required'), { status: 400 });

    const { rows: [job] } = await pool.query(
      `INSERT INTO lumin_programming_jobs
        (user_id, thread_id, title, kind, status, step_detail, project_slug, domain, goal_text)
       VALUES ($1, $2, $3, 'draft', 'running', 'Calling council (draft mode)', $4, $5, $6)
       RETURNING *`,
      [
        userId,
        threadId,
        goal.trim().slice(0, 200),
        project_slug,
        domain,
        goal.trim(),
      ]
    );

    try {
      const domainContext = await loadDomain(domain);
      const preferredModel = getModelForTask('council.builder.task') || 'gemini_flash';
      let routingRecommendation = { selectedModel: preferredModel };
      if (memorySvc) {
        try {
          routingRecommendation = await memorySvc.getRoutingRecommendation({
            taskType: 'council.builder.task',
            proposedModel: preferredModel,
            candidateModels: getCandidateModelsForTask('council.builder.task'),
          });
        } catch (memoryErr) {
          log.warn({ err: memoryErr.message }, '[LUMIN-BUILD] Memory routing unavailable — using static draft model');
          routingRecommendation = { selectedModel: preferredModel, reason: 'Memory routing unavailable; using static map' };
        }
      }
      const memberKey = routingRecommendation.selectedModel;
      if (!memberKey) {
        throw Object.assign(new Error('No authorized model is currently allowed for council.builder.task'), { status: 409 });
      }

      const modeInstructions =
        'Generate the best-effort implementation or patch sketch. Output the main body first.\n' +
        'Then append a line containing exactly ---METADATA--- on its own line, followed by a single JSON object with keys: ' +
        '"target_file" (string or null), "insert_after_line" (number or null), "confidence" (0-1).';

      const systemPrompt = [
        'You are a senior engineer working on the LifeOS platform.',
        'You write clean, production-quality Node.js/ESM code that follows existing patterns.',
        'You never rebuild what already exists. You extend what is there.',
        'This output is for human review — prefer clarity and small scoped diffs.',
        domainContext ? `\n--- DOMAIN CONTEXT ---\n${domainContext.slice(0, 12000)}\n---` : '',
      ].filter(Boolean).join('\n');

      const userPrompt = [
        `TASK: ${goal.trim()}`,
        spec ? `\nSPECIFICATION:\n${spec}` : '',
        files?.length ? `\nRELEVANT FILES: ${files.join(', ')}` : '',
        `\nINSTRUCTION: ${modeInstructions}`,
      ].join('\n');

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const raw = await callCouncilMember(memberKey, fullPrompt, {
        taskType: 'codegen',
        useCache: false,
      });
      const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const { output, placement } = splitBuilderOutput(text);

      const { rows: [updated] } = await pool.query(
        `UPDATE lumin_programming_jobs
         SET status = 'done', step_detail = 'Draft complete', result_text = $1, result_meta = $2::jsonb
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [
          output,
          JSON.stringify({
            placement,
            model_used: memberKey,
            routing_reason: routingRecommendation.reason || null,
            blocked_candidates: routingRecommendation.blockedCandidates || [],
          }),
          job.id,
          userId,
        ]
      );

      return {
        job: updated,
        draft: output,
        placement,
        model_used: memberKey,
        routing_reason: routingRecommendation.reason || null,
        blocked_candidates: routingRecommendation.blockedCandidates || [],
      };
    } catch (err) {
      log.error({ err: err.message, jobId: job.id }, '[LUMIN-BUILD] draftGoal failed');
      await pool.query(
        `UPDATE lumin_programming_jobs SET status = 'failed', error_text = $1, step_detail = 'Failed'
         WHERE id = $2 AND user_id = $3`,
        [err.message, job.id, userId]
      );
      throw err;
    }
  }

  /**
   * Queue a governance item for Adam / builder (does not auto-merge code).
   */
  async function queuePendingAdam({
    userId,
    threadId = null,
    project_slug = null,
    title,
    description,
    type = 'approval',
    priority = 'normal',
    jobId = null,
  }) {
    if (!title?.trim()) throw Object.assign(new Error('title is required'), { status: 400 });

    let projectId = null;
    if (project_slug) {
      const { rows: [p] } = await pool.query(`SELECT id FROM projects WHERE slug = $1`, [project_slug]);
      projectId = p?.id || null;
    }

    const contextObj = {
      source: 'lumin_programming',
      job_id: jobId,
      thread_id: threadId,
      user_id: userId,
    };

    const { rows: [item] } = await pool.query(
      `INSERT INTO pending_adam (project_id, project_slug, title, description, type, priority, context)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [projectId, project_slug, title.trim(), description || null, type, priority, contextObj]
    );

    let job = null;
    if (jobId) {
      const { rows: [j] } = await pool.query(
        `UPDATE lumin_programming_jobs
         SET status = 'done', step_detail = 'Queued pending_adam', result_meta = COALESCE(result_meta, '{}'::jsonb) || $1::jsonb
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [JSON.stringify({ pending_adam_id: item.id }), jobId, userId]
      );
      job = j;
    } else {
      const { rows: [j] } = await pool.query(
        `INSERT INTO lumin_programming_jobs
          (user_id, thread_id, title, kind, status, step_detail, project_slug, goal_text, result_meta)
         VALUES ($1, $2, $3, 'pending_queue', 'done', 'Created pending_adam', $4, $5, $6::jsonb)
         RETURNING *`,
        [
          userId,
          threadId,
          title.trim().slice(0, 200),
          project_slug,
          (description || '').slice(0, 2000),
          JSON.stringify({ pending_adam_id: item.id }),
        ]
      );
      job = j;
    }

    return { pending_adam: item, job };
  }

  return {
    planGoal,
    draftGoal,
    queuePendingAdam,
    getJob,
    listJobs,
    patchJob,
    getBuildOps,
  };
}
