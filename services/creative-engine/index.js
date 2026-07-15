// SYNOPSIS: Creative Engine — estimate/render/jobs for footage, photo, script, b-roll modes
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import path from 'node:path';
import { createMediaStorage } from './media-storage.js';
import { createFfmpegProvider } from './providers/ffmpeg-local.js';
import { runFootageEdit } from './modes/footage-edit.js';
import { runPhotoPolish } from './modes/photo-polish.js';
import { runScriptCompose } from './modes/script-compose.js';
import { runGenerativeBroll, estimateGenerativeBrollCost } from './modes/generative-broll.js';
import { getReplicateApiToken } from './modes/graphic-design.js';

const MODES = ['footage_edit', 'photo_polish', 'script_compose', 'generative_broll', 'graphic_design'];

export function createCreativeEngine({
  pool,
  logger = console,
  baseUrl = '',
  addJob = null,
  registerProcessor = null,
} = {}) {
  const storage = createMediaStorage({
    publicBaseUrl: baseUrl,
    logger,
  });
  const ffmpeg = createFfmpegProvider({ logger });
  let workerStarted = false;

  function estimate(request = {}) {
    const mode = request.mode || 'footage_edit';
    const requirements = ['ffmpeg'];
    let costEstimateCents = 0;
    let etaSeconds = 30;
    let gated = false;
    let notes = [];

    if (mode === 'footage_edit') {
      costEstimateCents = 0;
      etaSeconds = 45;
      notes.push('Local FFmpeg trim + captions + crop');
    } else if (mode === 'photo_polish') {
      costEstimateCents = 0;
      etaSeconds = 10;
      notes.push('Local FFmpeg photo scale/overlay');
    } else if (mode === 'script_compose') {
      requirements.push('REPLICATE_API_TOKEN');
      gated = !process.env.REPLICATE_API_TOKEN;
      const scenes = Math.min(10, Math.max(1, Number(request.sceneCount) || 5));
      costEstimateCents = Math.round(scenes * 0.3); // ~$0.003/image → 0.3 cents
      etaSeconds = 90 + scenes * 15;
      notes.push('Flux Schnell stills + FFmpeg compose via video-pipeline');
    } else if (mode === 'generative_broll') {
      requirements.push('REPLICATE_API_TOKEN');
      gated = true;
      const est = estimateGenerativeBrollCost(request.sceneCount || 1);
      costEstimateCents = est.cents;
      etaSeconds = 120 * (est.sceneCount || 1);
      notes.push('Scaffold only in v1 — Wan/Kling not enabled yet');
    } else {
      return { ok: false, error: 'unknown_mode', modes: MODES };
    }

    return {
      ok: true,
      mode,
      costEstimateCents,
      etaSeconds,
      requirements,
      gated,
      notes,
      replicateConfigured: Boolean(process.env.REPLICATE_API_TOKEN),
    };
  }

  async function getHealth() {
    const ffmpegOk = await ffmpeg.probeAvailable();
    let storageWritable = false;
    try {
      await storage.ensureDirs();
      storageWritable = true;
    } catch {
      storageWritable = false;
    }
    return {
      ok: ffmpegOk && storageWritable,
      ffmpeg: ffmpegOk,
      storageWritable,
      r2Configured: Boolean(storage?.r2Configured),
      replicateConfigured: Boolean(getReplicateApiToken()),
      modes: MODES,
      graphicDesignRoute: '/api/v1/creative/graphic-design/render',
      workerStarted,
    };
  }

  async function insertAsset({ ownerId, jobId, kind, storageKey, publicUrl, metadata }) {
    if (!pool) return null;
    const r = await pool.query(
      `INSERT INTO creative_assets (owner_id, job_id, kind, storage_key, public_url, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *`,
      [ownerId, jobId || null, kind, storageKey, publicUrl || null, JSON.stringify(metadata || {})],
    );
    return r.rows[0];
  }

  async function processJob(jobId) {
    if (!pool) throw new Error('pool_required');
    const loaded = await pool.query(`SELECT * FROM creative_jobs WHERE id = $1`, [jobId]);
    if (!loaded.rows.length) throw new Error('job_not_found');
    const job = loaded.rows[0];

    await pool.query(`UPDATE creative_jobs SET status = 'running' WHERE id = $1`, [jobId]);

    try {
      let result;
      if (job.mode === 'footage_edit') {
        result = await runFootageEdit({ ffmpeg, storage, job, logger });
      } else if (job.mode === 'photo_polish') {
        result = await runPhotoPolish({ ffmpeg, storage, job, logger });
      } else if (job.mode === 'script_compose') {
        result = await runScriptCompose({ job, logger, storage });
      } else if (job.mode === 'generative_broll') {
        result = await runGenerativeBroll({ job, logger });
      } else {
        throw new Error(`unsupported_mode:${job.mode}`);
      }

      if (result?.ok === false) {
        await pool.query(
          `UPDATE creative_jobs SET status = 'failed', error = $2, result_json = $3::jsonb, completed_at = NOW() WHERE id = $1`,
          [jobId, result.error || 'mode_failed', JSON.stringify(result)],
        );
        return { ...result, jobId, status: 'failed' };
      }

      if (result?.outputKey) {
        await insertAsset({
          ownerId: job.owner_id,
          jobId,
          kind: job.mode === 'photo_polish' ? 'photo' : 'output',
          storageKey: result.outputKey,
          publicUrl: result.publicUrl,
          metadata: { mode: job.mode, aspect: result.aspect || null },
        });
      }

      await pool.query(
        `UPDATE creative_jobs SET status = 'completed', result_json = $2::jsonb, error = NULL, completed_at = NOW() WHERE id = $1`,
        [jobId, JSON.stringify(result)],
      );
      return { ok: true, jobId, status: 'completed', result };
    } catch (err) {
      logger?.error?.('[CREATIVE] processJob failed', { jobId, error: err.message });
      await pool.query(
        `UPDATE creative_jobs SET status = 'failed', error = $2, completed_at = NOW() WHERE id = $1`,
        [jobId, String(err.message || err).slice(0, 1000)],
      );
      return { ok: false, jobId, status: 'failed', error: err.message };
    }
  }

  async function render({ ownerId, mode, request = {}, consentRecordId = null, sync = false } = {}) {
    if (!pool) throw new Error('pool_required');
    if (!ownerId) throw new Error('owner_id_required');
    if (!MODES.includes(mode)) throw new Error('unknown_mode');

    const est = estimate({ mode, ...request });
    const insert = await pool.query(
      `INSERT INTO creative_jobs (owner_id, mode, status, cost_estimate_cents, consent_record_id, request_json)
       VALUES ($1, $2, 'queued', $3, $4, $5::jsonb) RETURNING *`,
      [ownerId, mode, est.costEstimateCents ?? 0, consentRecordId, JSON.stringify(request || {})],
    );
    const job = insert.rows[0];

    const runInline = sync || mode === 'generative_broll' || !addJob;
    if (runInline) {
      const processed = await processJob(job.id);
      const fresh = await pool.query(`SELECT * FROM creative_jobs WHERE id = $1`, [job.id]);
      return { ok: processed.ok !== false || fresh.rows[0]?.status === 'completed', job: fresh.rows[0], processed };
    }

    await addJob('creative-render', { jobId: job.id, ownerId }, { jobId: `creative_${job.id}` });
    return { ok: true, job, queued: true };
  }

  async function getJob(jobId, ownerId) {
    const r = await pool.query(
      `SELECT * FROM creative_jobs WHERE id = $1 AND owner_id = $2`,
      [jobId, ownerId],
    );
    return r.rows[0] || null;
  }

  async function listOutputs(jobId, ownerId) {
    const r = await pool.query(
      `SELECT * FROM creative_assets WHERE job_id = $1 AND owner_id = $2 ORDER BY created_at ASC`,
      [jobId, ownerId],
    );
    return r.rows;
  }

  async function startWorker() {
    if (workerStarted) return { started: false, reason: 'already_started' };
    if (!registerProcessor) return { started: false, reason: 'no_registerProcessor' };
    await registerProcessor('creative-render', async (qJob) => {
      const jobId = qJob?.data?.jobId || qJob?.data?.id;
      if (!jobId) throw new Error('jobId_missing_in_queue_payload');
      return processJob(jobId);
    }, { concurrency: 1 });
    workerStarted = true;
    logger?.info?.('[CREATIVE] worker registered for creative-render');
    return { started: true };
  }

  return {
    MODES,
    storage,
    ffmpeg,
    estimate,
    getHealth,
    render,
    processJob,
    getJob,
    listOutputs,
    insertAsset,
    startWorker,
  };
}

export default createCreativeEngine;
