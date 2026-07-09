/**
 * SYNOPSIS: In-process founder build job store — avoids Railway proxy 502 on long CSS verify loops.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import { hydrateFounderBuildResultTruth } from './founder-build-result-truth.js';

const jobs = new Map();
const TTL_MS = 30 * 60 * 1000;
const PROOF_PENDING_TRANSPORT = new Set([
  'COMMIT_ONLY_NOT_LIVE',
  'DEPLOY_NOT_SYNCED',
  'LIVE_BEHAVIOR_NOT_VERIFIED',
  'ORIGIN_MAIN_NOT_UPDATED',
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
    steps: [],
    created_at: now,
    updated_at: now,
  });
  return id;
}

const MAX_JOB_STEPS = 60;

export function appendFounderBuildJobStep(id, step) {
  const job = jobs.get(id);
  if (!job) return false;
  const label = String(step?.label || step || '').trim();
  if (!label) return false;
  if (!Array.isArray(job.steps)) job.steps = [];
  const last = job.steps[job.steps.length - 1];
  if (last && last.label === label) return false;
  job.steps.push({
    label: label.slice(0, 160),
    detail: String(step?.detail || '').slice(0, 400) || null,
    at: Date.now(),
  });
  if (job.steps.length > MAX_JOB_STEPS) job.steps.splice(0, job.steps.length - MAX_JOB_STEPS);
  job.updated_at = Date.now();
  return true;
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

/** Latest in-memory founder build for this user (same-instance recall before DB). */
export function getLatestFounderBuildJobForUser(userId = null) {
  prune();
  let best = null;
  for (const job of jobs.values()) {
    if (!job?.result) continue;
    if (userId != null && userId !== '' && job.user_id != null
      && String(job.user_id) !== String(userId)) {
      continue;
    }
    if (!best || (job.updated_at || 0) > (best.updated_at || 0)) best = job;
  }
  if (best) return best;
  if (userId == null || userId === '') return null;
  for (const job of jobs.values()) {
    if (!job?.result) continue;
    if (!best || (job.updated_at || 0) > (best.updated_at || 0)) best = job;
  }
  return best;
}

export function isFounderBuildProofPending(result = {}) {
  const founderRequired = result?.founder_verification_required === true
    || /^founder_(surgical_html_patch|css_patch)/.test(String(result?.execution_path || ''));
  return result?.pass_fail === 'PASS'
    && result?.committed === true
    && founderRequired
    && PROOF_PENDING_TRANSPORT.has(result?.transport_status);
}

export function deriveFounderBuildJobStatus(result = {}) {
  if (result?.pass_fail !== 'PASS') return 'failed';
  if (isFounderBuildProofPending(result)) return 'waiting_for_proof';
  return 'completed';
}
