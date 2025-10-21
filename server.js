// server.js — v11 ORCHESTRATOR (stabilized)
// Minimal, safe baseline that restores all core orchestration routes you lost.

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

// ---- ENV ----
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY = 'changeme',
  PORT = 3000,
  MAX_DAILY_SPEND = '5.0',
  OPENAI_API_KEY,
  GITHUB_TOKEN,
  PUBLIC_BASE_URL, // optional, used by build trigger logs
} = process.env;

const MAX_DAILY_SPEND_NUM = Number(MAX_DAILY_SPEND || 5);

// ---- DB ----
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 30,
});

// ---- APP ----
const app = express();

// Stripe/webhook note (kept simple): if you later re-enable Stripe raw body, put it BEFORE json()
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- HELPERS ----
function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers['x-command-key'];
  if (key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: 'Invalid command key' });
  }
  next();
}

async function getTodaySpend() {
  // If you track spend in a table, sum it here. This fallback is 0 to keep things safe.
  const r = await pool.query('SELECT COALESCE(SUM(cost), 0) AS total FROM orch_costs WHERE created_at::date = CURRENT_DATE')
    .catch(() => ({ rows: [{ total: 0 }] }));
  return Number(r.rows?.[0]?.total || 0);
}

// ---- HEALTH ----
app.get('/healthz', async (_req, res) => {
  try {
    await pool.query('SELECT 1'); // DB ping
    return res.json({
      status: 'healthy',
      version: 'v11',
      autonomous: !!OPENAI_API_KEY && !!GITHUB_TOKEN,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ status: 'unhealthy', error: e.message });
  }
});

// ===== ORCHESTRATOR CORE =====

// Enqueue a task
app.post('/api/v1/orch/enqueue', requireCommandKey, async (req, res) => {
  try {
    const { title, card, roi_guess = 0, complexity = 'medium', revenue_critical = false } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });

    const q = `
      INSERT INTO orch_tasks (title, card, roi_guess, complexity, revenue_critical, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'queued', NOW(), NOW())
      RETURNING id, title, status, roi_guess
    `;
    const r = await pool.query(q, [title, card || '', roi_guess, complexity, !!revenue_critical]);
    return res.json({ ok: true, task: r.rows[0] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Claim a task (transaction-safe; deterministic by ROI then created_at)
app.post('/api/v1/orch/claim', requireCommandKey, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pick = await client.query(`
      SELECT *
      FROM orch_tasks
      WHERE status = 'queued'
      ORDER BY roi_guess DESC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);

    if (pick.rows.length === 0) {
      await client.query('COMMIT');
      return res.json({ ok: true, task: null });
    }

    const task = pick.rows[0];
    await client.query(
      `UPDATE orch_tasks SET status = 'claimed', updated_at = NOW() WHERE id = $1`,
      [task.id]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, task });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch(_) {}
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Complete a task
app.post('/api/v1/orch/complete', requireCommandKey, async (req, res) => {
  try {
    const { pod, task_id, stage, cost = 0, quality = 0, outcome = 'pending' } = req.body || {};
    if (!task_id) return res.status(400).json({ error: 'task_id required' });

    // (Optional) verify the pod exists if you keep a pods table
    // const podCheck = await pool.query('SELECT 1 FROM orch_pods WHERE name = $1', [pod || 'system']);

    // Mark done if fully complete (outcome==='ok' && stage==='pr'), else just update audit fields
    if (outcome === 'ok' && stage === 'pr') {
      await pool.query(`UPDATE orch_tasks SET status='done', updated_at = NOW() WHERE id = $1`, [task_id]);
    } else {
      await pool.query(`UPDATE orch_tasks SET updated_at = NOW() WHERE id = $1`, [task_id]);
    }

    // Optionally log cost/quality in a costs table
    await pool.query(
      `INSERT INTO orch_costs (task_id, cost, quality, outcome, created_at) VALUES ($1,$2,$3,$4,NOW())`,
      [task_id, Number(cost) || 0, Number(quality) || 0, outcome || 'pending']
    ).catch(() => { /* no-op if table missing */ });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Pods status (safe if table exists)
app.get('/api/v1/orch/pods/status', requireCommandKey, async (_req, res) => {
  try {
    const pods = await pool.query('SELECT * FROM orch_pods ORDER BY name')
      .catch(() => ({ rows: [] }));
    return res.json({ pods: pods.rows || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Queue summary + recent
app.get('/api/v1/orch/queue', requireCommandKey, async (_req, res) => {
  try {
    const counts = await pool.query(`
      SELECT status, COUNT(*)::int AS count
      FROM orch_tasks
      GROUP BY status
    `);

    const recent = await pool.query(`
      SELECT id, title, status, created_at, updated_at
      FROM orch_tasks
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const summary = counts.rows.reduce((acc, r) => {
      acc[r.status] = r.count;
      return acc;
    }, {});

    return res.json({
      summary,
      recent: recent.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Reset “stuck” claimed tasks older than N minutes (default 10)
app.post('/internal/autopilot/reset-stuck', requireCommandKey, async (req, res) => {
  try {
    const staleMinutes = parseInt(req.query.minutes, 10) || 10;
    const result = await pool.query(`
      UPDATE orch_tasks
      SET status = 'queued', updated_at = NOW()
      WHERE status = 'claimed'
        AND updated_at < NOW() - INTERVAL '${staleMinutes} minutes'
      RETURNING id, title, updated_at
    `);

    return res.json({
      ok: true,
      reset_count: result.rows.length,
      tasks: result.rows,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Trigger a build (async stub — safe no-op if you haven’t wired generation yet)
app.post('/internal/autopilot/build-now', requireCommandKey, async (_req, res) => {
  if (!OPENAI_API_KEY || !GITHUB_TOKEN) {
    return res.json({ ok: false, error: 'Missing API keys' });
  }
  // Fire-and-forget async — keep simple and safe
  setTimeout(() => {
    console.log('[build] Triggered (stub). PUBLIC_BASE_URL=', PUBLIC_BASE_URL || '');
  }, 10);
  return res.json({ ok: true, message: 'Build triggered' });
});

// ---- START ----
app.listen(PORT, () => {
  console.log(`
┌──────────────────────────────────────────────┐
│ 🚀 LIFEOS v11 ORCHESTRATOR                   │
│                                              │
│  Port: ${PORT}                                │
│  Autonomous: ${!!OPENAI_API_KEY && !!GITHUB_TOKEN ? '✓' : '✗'}                     │
└──────────────────────────────────────────────┘
`);
});
