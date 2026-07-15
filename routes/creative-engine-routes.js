// SYNOPSIS: Creative Engine JSON API — health, estimate, assets, render, jobs
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import { createHash } from 'node:crypto';
import { createCreativeEngine } from '../services/creative-engine/index.js';
import { addJob, registerProcessor } from '../services/queue.js';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { isR2Configured } from '../services/marketing-r2-upload.js';

function toOwnerUuid(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return s.toLowerCase();
  }
  const hex = createHash('sha256').update(`creative-owner:${s}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function getOwnerId(req) {
  return toOwnerUuid(
    req.lifeosUser?.sub
    || req.user?.id
    || req.user?.sub
    || req.body?.owner_id
    || req.query?.owner_id
    || null,
  );
}

export function registerCreativeEngineRoutes(app, deps = {}) {
  const { pool, requireKey, logger, baseUrl } = deps;
  if (!pool || !requireKey) {
    throw new Error('registerCreativeEngineRoutes requires pool and requireKey');
  }

  const engine = createCreativeEngine({
    pool,
    logger,
    baseUrl: baseUrl || '',
    addJob,
    registerProcessor,
  });

  // Fire-and-forget worker registration (in-memory or BullMQ)
  engine.startWorker().catch((err) => {
    logger?.warn?.('[CREATIVE] worker start failed', { error: err.message });
  });

  app.get('/api/v1/creative/health', requireKey, async (_req, res) => {
    try {
      const health = await engine.getHealth();
      res.status(health.ok ? 200 : 503).json({ ok: health.ok, ...health });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/v1/creative/estimate', requireKey, async (req, res) => {
    try {
      const result = engine.estimate(req.body || {});
      res.status(result.ok === false ? 400 : 200).json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/v1/creative/assets', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(400).json({ ok: false, error: 'owner_id is required' });

      const { filename, content_base64, contentBase64, kind, source_url, sourceUrl } = req.body || {};
      let saved;

      if (source_url || sourceUrl) {
        const url = source_url || sourceUrl;
        const fetched = await fetch(url);
        if (!fetched.ok) throw new Error(`fetch_failed_${fetched.status}`);
        const buf = Buffer.from(await fetched.arrayBuffer());
        const name = filename || url.split('/').pop() || 'download.bin';
        saved = await engine.storage.saveUpload(buf, { ownerId, filename: name, kind: kind || 'upload' });
      } else {
        const b64 = content_base64 || contentBase64;
        if (!b64) return res.status(400).json({ ok: false, error: 'content_base64 or source_url required' });
        const buf = Buffer.from(String(b64).replace(/^data:[^;]+;base64,/, ''), 'base64');
        saved = await engine.storage.saveUpload(buf, {
          ownerId,
          filename: filename || 'upload.bin',
          kind: kind || 'upload',
        });
      }

      const asset = await engine.insertAsset({
        ownerId,
        jobId: null,
        kind: kind || 'upload',
        storageKey: saved.key,
        publicUrl: saved.publicUrl,
        metadata: { filename: filename || null },
      });

      res.status(201).json({ ok: true, asset, key: saved.key, publicUrl: saved.publicUrl });
    } catch (error) {
      logger?.error?.('[CREATIVE] assets upload failed', { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/v1/creative/render', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(400).json({ ok: false, error: 'owner_id is required' });

      const mode = req.body?.mode || 'footage_edit';
      const request = req.body?.request || req.body || {};
      const consentRecordId = req.body?.consent_record_id || req.body?.consentRecordId || null;
      const sync = req.body?.sync === true || (mode === 'photo_polish' && req.body?.sync !== false);

      // Fail closed if ffmpeg missing for local modes
      if (mode === 'footage_edit' || mode === 'photo_polish') {
        const health = await engine.getHealth();
        if (!health.ffmpeg) {
          return res.status(503).json({ ok: false, error: 'ffmpeg_unavailable', health });
        }
      }

      const result = await engine.render({
        ownerId,
        mode,
        request,
        consentRecordId,
        sync,
      });
      res.status(202).json(result);
    } catch (error) {
      logger?.error?.('[CREATIVE] render failed', { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get('/api/v1/creative/jobs/:id', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(400).json({ ok: false, error: 'owner_id is required' });
      const job = await engine.getJob(req.params.id, ownerId);
      if (!job) return res.status(404).json({ ok: false, error: 'job_not_found' });
      res.json({ ok: true, job });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get('/api/v1/creative/jobs/:id/outputs', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(400).json({ ok: false, error: 'owner_id is required' });
      const outputs = await engine.listOutputs(req.params.id, ownerId);
      res.json({ ok: true, outputs });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Stream local output when still on this instance; otherwise redirect to durable publicUrl (R2).
  app.get('/api/v1/creative/jobs/:id/download', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(400).json({ ok: false, error: 'owner_id is required' });
      const job = await engine.getJob(req.params.id, ownerId);
      if (!job) return res.status(404).json({ ok: false, error: 'job_not_found' });
      const result = job.result_json || {};
      const publicUrl = result.publicUrl || null;
      const absolutePath = result.absolutePath || null;

      if (absolutePath) {
        try {
          await access(absolutePath, fsConstants.R_OK);
          const name = path.basename(absolutePath) || 'creative-output.bin';
          res.setHeader('Content-Type', name.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
          return createReadStream(absolutePath).pipe(res);
        } catch {
          // fall through to publicUrl
        }
      }

      if (publicUrl && /^https?:\/\//i.test(publicUrl)) {
        return res.redirect(302, publicUrl);
      }

      return res.status(404).json({
        ok: false,
        error: 'output_not_available',
        hint: isR2Configured()
          ? 'Output missing on this instance and no durable URL was stored — re-run render.'
          : 'Set R2_* (+ R2_BUCKET_URL) so creative outputs survive multi-instance deploys.',
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  logger?.info?.('Creative Engine routes registered at /api/v1/creative/*');
}

export default registerCreativeEngineRoutes;
