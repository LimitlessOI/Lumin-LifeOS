// server.js - Railway Deployment with Sandbox and Task Processor
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 8080;

// ---------- Environment ----------
const SANDBOX_MODE = (process.env.SANDBOX_MODE || 'disabled').toLowerCase();
const COMMAND_KEY = process.env.COMMAND_CENTER_KEY || 'temp-key-change-me';

// Vapi env (required for outbound call endpoint)
const VAPI_API_KEY = process.env.VAPI_API_KEY || '';
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '';
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || '';

// ---------- Database URL (handles sandbox override) ----------
const DATABASE_URL = SANDBOX_MODE === 'enabled'
  ? (process.env.DATABASE_URL_SANDBOX || process.env.DATABASE_URL)
  : process.env.DATABASE_URL;

// ---------- Parse DB connection ----------
let dbConfig;
try {
  const url = new URL(DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    port: url.port || 5432,
    database: url.pathname.split('/')[1],
    user: url.username,
    password: url.password,
    ssl: { rejectUnauthorized: false }
  };
  console.log(`✓ Parsed database: ${dbConfig.database} at ${dbConfig.host}`);
} catch (error) {
  console.error('✗ Failed to parse DATABASE_URL:', error);
  process.exit(1);
}

// ---------- Database connection ----------
const pool = new Pool(dbConfig);

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// ---------- Bootstrap database ----------
async function bootstrap() {
  await query(`
    CREATE TABLE IF NOT EXISTS self_tasks (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      status TEXT DEFAULT 'queued',
      created_at TIMESTAMP DEFAULT NOW(),
      run_after TIMESTAMP DEFAULT NOW(),
      result JSONB
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS execution_log (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT NOW(),
      endpoint TEXT,
      status TEXT,
      details TEXT
    )
  `);

  // For Step 20 (seed_memory)
  await query(`
    CREATE TABLE IF NOT EXISTS memory_docs (
      id SERIAL PRIMARY KEY,
      title TEXT,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('✓ Database bootstrapped');
  console.log(`✓ Mode: ${SANDBOX_MODE === 'enabled' ? 'SANDBOX' : 'PRODUCTION'}`);
}

// ---------- Middleware ----------
app.use(express.json({ limit: '2mb' }));

// ---------- Routes ----------
app.get('/', (req, res) => {
  res.json({
    service: 'LifeOS Railway',
    status: 'operational',
    mode: SANDBOX_MODE === 'enabled' ? 'sandbox' : 'production',
    database: dbConfig.database,
    timestamp: new Date().toISOString()
  });
});

app.get('/healthz', async (req, res) => {
  try {
    await query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      mode: SANDBOX_MODE === 'enabled' ? 'sandbox' : 'production',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.post('/api/v1/task/enqueue', async (req, res) => {
  const key = req.header('X-Command-Key');
  if (key !== COMMAND_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { kind, payload = {}, run_after = null } = req.body;
  if (!kind) {
    return res.status(400).json({ error: 'kind required' });
  }

  try {
    await query(
      'INSERT INTO self_tasks (kind, payload, run_after) VALUES ($1, $2, $3)',
      [kind, payload, run_after || new Date()]
    );
    res.json({
      queued: true,
      kind,
      mode: SANDBOX_MODE === 'enabled' ? 'sandbox' : 'production'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/tasks', async (req, res) => {
  const key = req.query.key;
  if (key !== COMMAND_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const tasks = await query(
      'SELECT * FROM self_tasks ORDER BY created_at DESC LIMIT 50'
    );
    res.json({
      tasks,
      mode: SANDBOX_MODE === 'enabled' ? 'sandbox' : 'production'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ---------- REQUIRED ADDITIONS START (webhook + stats) ---------- */

// In-memory call event tracking (bounded list to avoid memory growth)
const CALL_EVENTS = [];

// Vapi webhook: point Vapi Assistant "Server URL" to
// https://<your-railway-domain>/api/v1/vapi/webhook
app.post('/api/v1/vapi/webhook', async (req, res) => {
  try {
    const ev = req.body || {};
    CALL_EVENTS.unshift({
      ts: new Date().toISOString(),
      type: ev?.type || 'unknown',
      callId: ev?.call?.id || ev?.id,
      from: ev?.call?.customer?.number,
      to: ev?.call?.assistant?.phoneNumber,
      status: ev?.call?.status || 'unknown',
      transcript: ev?.transcript || null
    });
    if (CALL_EVENTS.length > 100) CALL_EVENTS.pop();

    // Mirror to DB log (best-effort)
    try {
      await query(
        'INSERT INTO execution_log (endpoint, status, details) VALUES ($1, $2, $3)',
        ['vapi_webhook', 'received', JSON.stringify(ev).slice(0, 4000)]
      );
    } catch (_) { /* noop */ }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Quick stats (auth via existing COMMAND_CENTER_KEY)
app.get('/api/v1/calls/stats', (req, res) => {
  const key = req.header('X-Command-Key') || req.query.key;
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  res.json({
    count: CALL_EVENTS.length,
    last_10: CALL_EVENTS.slice(0, 10)
  });
});

/* ---------- REQUIRED ADDITIONS END ---------- */

/* ---------- NEW: Start an outbound call via Vapi ---------- */
/* Requires: VAPI_API_KEY, VAPI_ASSISTANT_ID, VAPI_PHONE_NUMBER_ID */
app.post('/api/v1/vapi/call', async (req, res) => {
  const key = req.header('X-Command-Key');
  if (key !== COMMAND_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) {
    return res.status(400).json({
      error: 'missing Vapi config',
      missing: {
        VAPI_API_KEY: !!VAPI_API_KEY,
        VAPI_ASSISTANT_ID: !!VAPI_ASSISTANT_ID,
        VAPI_PHONE_NUMBER_ID: !!VAPI_PHONE_NUMBER_ID
      }
    });
  }

  const { phone_number, customer_name } = req.body || {};
  if (!phone_number) {
    return res.status(400).json({ error: 'phone_number is required (E.164, e.g. +17025551234)' });
  }

  try {
    const resp = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: phone_number,
          name: customer_name || undefined
        }
      })
    });

    const data = await resp.json().catch(() => ({}));

    await query(
      'INSERT INTO execution_log (endpoint, status, details) VALUES ($1, $2, $3)',
      ['vapi_call', String(resp.status), JSON.stringify({ request: { phone_number, customer_name }, response: data }).slice(0, 4000)]
    );

    if (!resp.ok) {
      return res.status(resp.status).json({ ok: false, error: data?.error || 'vapi call failed', data });
    }

    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/* ---------- Task processor ---------- */
async function processTasks() {
  try {
    const tasks = await query(
      `SELECT * FROM self_tasks
       WHERE status = 'queued' AND run_after <= NOW()
       ORDER BY created_at ASC LIMIT 1`
    );

    if (tasks.length === 0) return;

    const task = tasks[0];

    await query(
      "UPDATE self_tasks SET status = 'processing' WHERE id = $1",
      [task.id]
    );

    let result = {};

    try {
      if (task.kind === 'verify_system') {
        result = {
          status: 'verified',
          endpoints: 5, // includes webhook, stats, vapi call, tasks, healthz
          database: dbConfig.database,
          mode: SANDBOX_MODE
        };
      } else if (task.kind === 'plan_revenue') {
        result = {
          targets: task.payload.targets || [],
          next_steps: ['Add Stripe integration', 'Create landing page', 'Build email templates']
        };
      } else if (task.kind === 'assess_architecture') {
        result = {
          current: 'Basic task queue operational',
          needed: ['OpenAI integration', 'GitHub auto-commit', 'Memory system'],
          priority: task.payload.focus || 'unknown'
        };
      } else if (task.kind === 'seed_memory') {
        const docs = Array.isArray(task.payload?.docs) ? task.payload.docs : [];
        let inserted = 0;
        for (const d of docs) {
          await query(
            'INSERT INTO memory_docs (title, content) VALUES ($1, $2)',
            [String(d.title || ''), String(d.content || '')]
          );
          inserted += 1;
        }
        result = { stored: inserted };
      } else {
        result = { message: `Task kind '${task.kind}' not implemented` };
      }

      await query(
        "UPDATE self_tasks SET status = 'completed', result = $1 WHERE id = $2",
        [result, task.id]
      );

      await query(
        "INSERT INTO execution_log (endpoint, status, details) VALUES ($1, $2, $3)",
        ['task_processor', 'completed', `Processed: ${task.kind}`]
      );

      console.log(`✓ Completed task: ${task.kind}`);

    } catch (error) {
      await query(
        "UPDATE self_tasks SET status = 'failed', result = $1 WHERE id = $2",
        [{ error: error.message }, task.id]
      );
      console.error(`✗ Task failed: ${task.kind} - ${error.message}`);
    }

  } catch (error) {
    console.error('Task processor error:', error.message);
  }
}

// ---------- Start server ----------
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  console.log(`Mode: ${SANDBOX_MODE === 'enabled' ? 'SANDBOX' : 'PRODUCTION'}`);

  try {
    await bootstrap();
    console.log('✓ System ready');

    // Start task processor (runs every 45 seconds)
    setInterval(processTasks, 45000);
    console.log('✓ Task processor started (45s interval)');

  } catch (error) {
    console.error('✗ Bootstrap failed:', error);
    process.exit(1);
  }
});
// redeploy trigger
