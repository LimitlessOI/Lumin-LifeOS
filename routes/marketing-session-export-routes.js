/**
 * SYNOPSIS: Exports registerMarketingSessionExportRoutes — routes/marketing-session-export-routes.js.
 */
import busboy from 'busboy';

function normalizeDb(deps) {
  return deps?.db || deps?.pool;
}

function jsonError(res, status, error, extra = {}) {
  return res.status(status).json({ error, ...extra });
}

function getUserId(req) {
  return req?.session?.userId ?? null;
}

function isR2MissingError(err) {
  const code = err?.code || err?.name;
  const msg = String(err?.message || '');
  return code === 'R2_CONFIG_MISSING' || msg.includes('R2_CONFIG_MISSING');
}

async function buildSessionExport(sessionId, deps) {
  const db = normalizeDb(deps);
  if (!db) throw new Error('DB client unavailable');

  const sessionResult = await db.query(
    'SELECT * FROM marketing_sessions WHERE id = $1 LIMIT 1',
    [sessionId]
  );

  const session = sessionResult.rows[0];
  if (!session) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }

  const exportPayload = {
    session,
  };

  const exportUrl = `${deps.baseUrl || ''}/marketing/session/${sessionId}/export`;

  const inserted = await db.query(
    `INSERT INTO marketing_session_exports (session_id, exported_at, export_format, export_url)
     VALUES ($1, NOW(), $2, $3)
     RETURNING *`,
    [sessionId, 'json', exportUrl]
  );

  return {
    exportRow: inserted.rows[0],
    exportPayload,
  };
}

async function uploadAudioToR2(req, sessionId, deps) {
  const db = normalizeDb(deps);
  if (!db) throw new Error('DB client unavailable');

  const upload = await new Promise((resolve, reject) => {
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
      resolve({
        buffer: Buffer.concat(chunks),
        filename,
        mimeType,
      });
    });

    req.pipe(bb);
  });

  if (!upload.buffer.length) {
    const err = new Error('No audio file provided');
    err.statusCode = 400;
    throw err;
  }

  const key = `marketing-sessions/${sessionId}/${Date.now()}-${upload.filename || 'audio'}`;

  if (!deps?.callCouncilMember) {
    const err = new Error('R2_CONFIG_MISSING');
    err.code = 'R2_CONFIG_MISSING';
    throw err;
  }

  const resultText = await deps.callCouncilMember(
    'ops',
    JSON.stringify({
      action: 'uploadAudioToR2',
      sessionId,
      key,
      mimeType: upload.mimeType,
      size: upload.buffer.length,
      note: 'Return a JSON object with r2Url only if upload is handled externally; otherwise confirm configuration missing.',
    })
  );

  let r2Url = null;
  try {
    const parsed = JSON.parse(resultText);
    r2Url = parsed?.r2Url || null;
  } catch {
    r2Url = null;
  }

  if (!r2Url) {
    const err = new Error('R2_CONFIG_MISSING');
    err.code = 'R2_CONFIG_MISSING';
    throw err;
  }

  const inserted = await db.query(
    `INSERT INTO marketing_audio_uploads (session_id, r2_key, r2_url, upload_status, error_text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [sessionId, key, r2Url, 'uploaded', null]
  );

  return {
    uploadRow: inserted.rows[0],
    r2Key: key,
    r2Url,
  };
}

export async function registerMarketingSessionExportRoutes(app, deps) {
  app.post('/marketing/session/:id/export', async (req, res) => {
    if (!getUserId(req)) return jsonError(res, 401, 'Unauthorized');

    try {
      const sessionId = req.params.id;
      const result = await buildSessionExport(sessionId, deps);
      return res.json(result);
    } catch (err) {
      const status = err?.statusCode || 500;
      return jsonError(res, status, err?.message || 'Failed to build session export');
    }
  });

  app.post('/marketing/session/:id/audio', async (req, res) => {
    if (!getUserId(req)) return jsonError(res, 401, 'Unauthorized');

    try {
      const sessionId = req.params.id;
      const result = await uploadAudioToR2(req, sessionId, deps);
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

  app.get('/marketing/session/:id/export/status', async (req, res) => {
    if (!getUserId(req)) return jsonError(res, 401, 'Unauthorized');

    try {
      const db = normalizeDb(deps);
      if (!db) return jsonError(res, 500, 'DB client unavailable');

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