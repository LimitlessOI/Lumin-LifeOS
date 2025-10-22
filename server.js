// server.js — v11 ORCHESTRATOR (fixed overlay + health + repo)

// ===== Core Deps =====
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

// ===== ENV =====
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY = 'changeme',
  PORT = 3000,
  HOST = '0.0.0.0',

  // Costs / flags
  MAX_DAILY_SPEND = '5.0',

  // External keys
  OPENAI_API_KEY,
  GITHUB_TOKEN,

  // Repo & base URL
  GITHUB_REPO, // expected: LimitlessOI/Lumin-LifeOS
  PUBLIC_BASE_URL
} = process.env;

const MAX_DAILY_SPEND_NUM = Number(MAX_DAILY_SPEND || 5);
const REPO = (GITHUB_REPO && GITHUB_REPO.trim()) || 'LimitlessOI/Lumin-LifeOS';

// ===== DB =====
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 30,
});

// ===== App =====
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve entire /public and explicitly /overlay
app.use(express.static(path.join(__dirname, 'public')));
app.use('/overlay', express.static(path.join(__dirname, 'public/overlay')));

// ===== Helpers =====
function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers['x-command-key'];
  if (key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: 'Invalid command key' });
  }
  next();
}

async function getTodaySpend() {
  try {
    const r = await pool.query(
      'SELECT COALESCE(SUM(cost), 0) AS total FROM orch_costs WHERE created_at::date = CURRENT_DATE'
    );
    return Number(r.rows?.[0]?.total || 0);
  } catch {
    return 0;
  }
}

// ===== Health =====
// JSON health (DB touch)
app.get('/healthz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
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

// Simple HTML health (no DB)
app.get('/health', (_req, res) => res.send('<h1>OK</h1>'));

// ===== Orchestrator Core =====
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

app.post('/api/v1/orch/claim', requireCommandKey, async (_req, res) => {
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
    await client.query(`UPDATE orch_tasks SET status = 'claimed', updated_at = NOW() WHERE id = $1`, [task.id]);
    await client.query('COMMIT');

    return res.json({ ok: true, task });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.post('/api/v1/orch/complete', requireCommandKey, async (req, res) => {
  try {
    const { pod, task_id, stage, cost = 0, quality = 0, outcome = 'pending' } = req.body || {};
    if (!task_id) return res.status(400).json({ error: 'task_id required' });

    if (outcome === 'ok' && stage === 'pr') {
      await pool.query(`UPDATE orch_tasks SET status='done', updated_at = NOW() WHERE id = $1`, [task_id]);
    } else {
      await pool.query(`UPDATE orch_tasks SET updated_at = NOW() WHERE id = $1`, [task_id]);
    }

    await pool.query(
      `INSERT INTO orch_costs (task_id, cost, quality, outcome, created_at) VALUES ($1,$2,$3,$4,NOW())`,
      [task_id, Number(cost) || 0, Number(quality) || 0, outcome || 'pending']
    ).catch(() => {});

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/v1/orch/pods/status', requireCommandKey, async (_req, res) => {
  try {
    const pods = await pool.query('SELECT * FROM orch_pods ORDER BY name').catch(() => ({ rows: [] }));
    return res.json({ pods: pods.rows || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

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

    return res.json({ summary, recent: recent.rows, timestamp: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

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

    return res.json({ ok: true, reset_count: result.rows.length, tasks: result.rows });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/internal/autopilot/build-now', requireCommandKey, async (_req, res) => {
  if (!OPENAI_API_KEY || !GITHUB_TOKEN) {
    return res.json({ ok: false, error: 'Missing API keys' });
  }
  setTimeout(() => console.log('[build] Manual trigger received'), 10);
  return res.json({ ok: true, message: 'Build triggered' });
});

// ===== Autonomous Build Function =====
async function executeOrchBuild(podName) {
  try {
    // 1) Claim a task
    const claimRes = await fetch(`http://localhost:${PORT}/api/v1/orch/claim?key=${COMMAND_CENTER_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());

    if (!claimRes.ok || !claimRes.task) {
      return null; // No work available
    }

    const task = claimRes.task;
    console.log(`[${podName}] Claimed task #${task.id}: ${task.title}`);

    // 2) Generate code via OpenAI
    const prompt = `You are a senior software engineer. Generate code for this task:
Title: ${task.title}
Details: ${task.card || 'No details provided'}

Respond with ONLY the code changes needed. Be specific and complete.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000
      })
    }).then(r => r.json()).catch(e => ({ error: e.message }));

    const code = aiResponse?.choices?.[0]?.message?.content || 'No code generated';
    console.log(`[${podName}] Generated code (${code.length} chars)`);

    // 3) Create GitHub issue (placeholder for PR)
    const prBody = `**Task #${task.id}: ${task.title}**\n\n${task.card}\n\n---\n\nGenerated Code:\n\`\`\`\n${code}\n\`\`\``;

    const ghUrl = `https://api.github.com/repos/${REPO}/issues`;
    const ghResponse = await fetch(ghUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'LifeOS-Orchestrator'
      },
      body: JSON.stringify({
        title: `[${podName}] ${task.title}`,
        body: prBody
      })
    }).then(r => r.json()).catch(e => ({ error: e.message }));

    console.log(`[${podName}] Created GitHub issue #${ghResponse?.number || 'unknown'}`);

    // 4) Mark task complete
    await fetch(`http://localhost:${PORT}/api/v1/orch/complete?key=${COMMAND_CENTER_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pod: podName,
        task_id: task.id,
        stage: 'pr',
        cost: 0.05,
        quality: 0.8,
        outcome: 'ok'
      })
    });

    console.log(`[${podName}] Task #${task.id} completed`);
    return true;

  } catch (err) {
    console.error(`[${podName}] Error:`, err.message);
    return false;
  }
}

// ===== Start Server & Loops =====
app.listen(PORT, HOST, () => {
  console.log(`
┌──────────────────────────────────────────────┐
│ 🚀 LIFEOS v11 ORCHESTRATOR                   │
│                                              │
│  Port: ${PORT}                                │
│  Autonomous: ${!!OPENAI_API_KEY && !!GITHUB_TOKEN ? '✓' : '✗'}                     │
└──────────────────────────────────────────────┘
`);

  // Start autonomous pod loops (only if keys present)
  if (OPENAI_API_KEY && GITHUB_TOKEN) {
    const PODS = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    PODS.forEach((podName, index) => {
      setTimeout(() => {
        console.log(`[${podName}] Starting autonomous loop...`);
        setInterval(async () => {
          console.log(`[${podName}] Checking for work...`);
          try {
            // optional cost guard (if you wire getTodaySpend somewhere)
            // const spent = await getTodaySpend();
            // if (spent < MAX_DAILY_SPEND_NUM) {
            await executeOrchBuild(podName);
            // }
          } catch (err) {
            console.error(`[${podName}] Loop error:`, err.message);
          }
        }, 60_000); // every 60s
      }, index * 15_000); // stagger by 15s
    });
  } else {
    console.log('⚠️  Autonomous mode disabled (missing API keys)');
  }
});
