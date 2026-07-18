/**
 * SYNOPSIS: Exports registerMarketingSessionExportRoutes — routes/marketing-session-export-routes.js.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import busboy from 'busboy';
import { buildSessionExport } from '../services/marketing-session-export.js';
import { uploadAudioToR2 } from '../services/marketing-r2-upload.js';

function normalizeDb(deps) {
  return deps?.db || deps?.pool;
}

function jsonError(res, status, error, extra = {}) {
  return res.status(status).json({ error, ...extra });
}

function isR2MissingError(err) {
  const code = err?.code || err?.name;
  const msg = String(err?.message || '');
  return code === 'R2_CONFIG_MISSING' || msg.includes('R2_CONFIG_MISSING');
}

function parseMultipartAudio(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const chunks = [];
    let filename = null;
    let mimeType = null;

    bb.on('file', (name, file, info) => {
      if (name !== 'file' && name !== 'audio') {
        file.resume();
        return;
      }
      filename = info?.filename || 'audio';
      mimeType = info?.mimeType || 'application/octet-stream';
      file.on('data', (data) => chunks.push(data));
      file.on('limit', () => reject(new Error('File too large')));
    });

    bb.on('error', reject);
    bb.on('finish', () => {
      resolve({ buffer: Buffer.concat(chunks), filename, mimeType });
    });

    req.pipe(bb);
  });
}

export async function registerMarketingSessionExportRoutes(app, deps) {
  const db = normalizeDb(deps);
  const requireKey = deps?.requireKey;
  if (!db || typeof requireKey !== 'function') {
    throw new Error('registerMarketingSessionExportRoutes requires deps.pool (or deps.db) and deps.requireKey');
  }

  app.post('/marketing/session/:id/export', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const format = req.body?.format === 'markdown' ? 'markdown' : 'json';
      const result = await buildSessionExport(sessionId, format, db, deps?.callCouncilMember);
      return res.json(result);
    } catch (err) {
      const status = err?.statusCode || (String(err?.message || '').startsWith('Session not found') ? 404 : 500);
      return jsonError(res, status, err?.message || 'Failed to build session export');
    }
  });

  app.post('/marketing/session/:id/audio', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const upload = await parseMultipartAudio(req);
      if (!upload.buffer.length) {
        return jsonError(res, 400, 'No audio file provided');
      }
      const result = await uploadAudioToR2(sessionId, upload.buffer, upload.mimeType, db);
      return res.json({ r2Key: result.r2Key, r2Url: result.r2Url });
    } catch (err) {
      if (isR2MissingError(err)) {
        return jsonError(res, 503, 'R2 configuration missing', {
          hint: 'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_BUCKET_URL in Railway env vars',
        });
      }
      const status = err?.statusCode || 500;
      return jsonError(res, status, err?.message || 'Failed to upload audio');
    }
  });

  app.get('/marketing/session/:id/export/status', requireKey, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT *
         FROM marketing_session_exports
         WHERE session_id = $1
         ORDER BY COALESCE(exported_at, created_at) DESC, created_at DESC
         LIMIT 1`,
        [req.params.id]
      );

      return res.json(result.rows[0] || null);
    } catch (err) {
      return jsonError(res, 500, err?.message || 'Failed to load export status');
    }
  });
}

export default registerMarketingSessionExportRoutes;
