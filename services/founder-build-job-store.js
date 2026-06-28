/**
 * SYNOPSIS: In-process founder build job store — avoids Railway proxy 502 on long CSS verify loops.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import crypto from 'node:crypto';
import { hydrateFounderBuildResultTruth } from './founder-build-result-truth.js';

const jobs = new Map();
const TTL_MS = 30 * 60 * 1000;
const PROOF_PENDING_TRANSPORT = new Set([
  'COMMIT_ONLY_NOT_LIVE',
  'DEPLOY_NOT_SYNCED',
  'LIVE_BEHAVIOR_NOT_VERIFIED',
]);

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
  const normalized = hydrateFounderBuildResultTruth(result, job.task);
  job.status = deriveFounderBuildJobStatus(normalized);
  job.result = normalized;
  job.updated_at = Date.now();
  return true;
}

export function getFounderBuildJob(id) {
  prune();
  return jobs.get(id) || null;
}

export function isFounderBuildProofPending(result = {}) {
  return result?.pass_fail === 'PASS'
    && result?.committed === true
    && PROOF_PENDING_TRANSPORT.has(result?.transport_status);
}

export function deriveFounderBuildJobStatus(result = {}) {
  if (result?.pass_fail !== 'PASS') return 'failed';
  if (isFounderBuildProofPending(result)) return 'waiting_for_proof';
  return 'completed';
}
