/**
 * SYNOPSIS: Exports createServerFounderRuntimeService — services/server-founder-runtime.js.
 */
export function createServerFounderRuntimeService({ pool, logger }) {
  const log = logger || console;

  function normalizeText(value) {
    return String(value || '').trim();
  }

  async function createFounderRuntime({
    ownerId,
    name,
    metadata,
  } = {}) {
    if (!ownerId) {
      const err = new Error('owner_id_required');
      err.status = 401;
      throw err;
    }

    const runtimeName = normalizeText(name) || 'UNKNOWN';
    const runtimeMetadata = metadata && typeof metadata === 'object' ? metadata : {};

    const { rows } = await pool.query(
      `INSERT INTO projects (name)
       VALUES ($1)
       RETURNING *`,
      [runtimeName],
    );

    const runtime = rows[0];
    if (!runtime) {
      const err = new Error('runtime_create_failed');
      err.status = 500;
      throw err;
    }

    return {
      ...runtime,
      owner_id: ownerId,
      metadata: runtimeMetadata,
    };
  }

  async function listFounderRuntimes({ limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT * FROM projects
       ORDER BY created_at DESC
       LIMIT $1`,
      [lim],
    );
    return rows;
  }

  async function getFounderRuntime(runtimeId) {
    const { rows } = await pool.query(
      `SELECT * FROM projects WHERE id = $1 LIMIT 1`,
      [runtimeId],
    );
    if (!rows[0]) {
      const err = new Error('runtime_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function manageFounderRuntime(req, res) {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const action = normalizeText(req.body?.action || req.query?.action || 'list').toLowerCase();

      if (action === 'create') {
        const runtime = await createFounderRuntime({
          ownerId,
          name: req.body?.name,
          metadata: req.body?.metadata,
        });
        return res.status(201).json({ runtime });
      }

      if (action === 'get') {
        const runtimeId = req.params?.id || req.body?.id || req.query?.id || null;
        if (!runtimeId) {
          return res.status(400).json({ error: 'runtime_id_required' });
        }
        const runtime = await getFounderRuntime(runtimeId);
        return res.status(200).json({ runtime });
      }

      const runtimes = await listFounderRuntimes({ limit: req.query?.limit });
      return res.status(200).json({ runtimes });
    } catch (err) {
      log?.error?.('server_founder_runtime_service_error', {
        message: err?.message,
        status: err?.status || null,
      });

      const status = err?.status || 500;
      return res.status(status).json({ error: err?.message || 'server_founder_runtime_error' });
    }
  }

  return {
    createFounderRuntime,
    listFounderRuntimes,
    getFounderRuntime,
    manageFounderRuntime,
  };
}