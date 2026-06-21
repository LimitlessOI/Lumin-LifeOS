/**
 * SYNOPSIS: In-process founder build job store — avoids Railway proxy 502 on long CSS verify loops.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import crypto from 'node:crypto';

const jobs = new Map();
const TTL_MS = 30 * 60 * 1000;

function prune() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, job] of jobs.entries()) {
    if (job.updated_at < cutoff) jobs.delete(id);
  }
}

export function createFounderBuildJob({ task, userId = null } = {}) {
  prune();
  const id = crypto.randomUUID();
  const now = Date.now();
  jobs.set(id, {
    id,
    task: String(task || ''),
    user_id: userId,
    status: 'running',
    result: null,
    created_at: now,
    updated_at: now,
  });
  return id;
}

export function setFounderBuildJobResult(id, result) {
  const job = jobs.get(id);
  if (!job) return false;
  job.status = result?.pass_fail === 'PASS' ? 'completed' : 'failed';
  job.result = result;
  job.updated_at = Date.now();
  return true;
}

export function getFounderBuildJob(id) {
  prune();
  return jobs.get(id) || null;
}
