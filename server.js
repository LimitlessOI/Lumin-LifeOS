// Crash visibility
process.on('uncaughtException', (err) => {
  console.error('FATAL uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('FATAL unhandledRejection:', err);
  process.exit(1);
});const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 8080;

const COMMAND_KEY = process.env.COMMAND_CENTER_KEY || 'temp';
const VAPI_API_KEY = process.env.VAPI_API_KEY || '';
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '';
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || '';
const DATABASE_URL = process.env.DATABASE_URL;

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
} catch (error) {
  console.error('DB parse failed:', error);
  process.exit(1);
}

const pool = new Pool(dbConfig);

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return (await client.query(sql, params)).rows;
  } finally {
    client.release();
  }
}

async function bootstrap() {
  await query('CREATE TABLE IF NOT EXISTS self_tasks (id SERIAL PRIMARY KEY, kind TEXT, payload JSONB DEFAULT \'{}\', status TEXT DEFAULT \'queued\', created_at TIMESTAMP DEFAULT NOW(), run_after TIMESTAMP DEFAULT NOW(), result JSONB)');
  await query('CREATE TABLE IF NOT EXISTS execution_log (id SERIAL PRIMARY KEY, timestamp TIMESTAMP DEFAULT NOW(), endpoint TEXT, status TEXT, details TEXT)');
  console.log('Database tables ready');
}

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'LifeOS', status: 'ok' });
});

app.get('/healthz', async (req, res) => {
  try {
    await query('SELECT NOW()');
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const CALL_EVENTS = [];

app.post('/api/v1/vapi/webhook', async (req, res) => {
  CALL_EVENTS.unshift({ ts: new Date().toISOString(), data: req.body });
  if (CALL_EVENTS.length > 100) CALL_EVENTS.pop();
  try {
    await query('INSERT INTO execution_log (endpoint, status, details) VALUES ($1, $2, $3)',
      ['vapi_webhook', 'received', JSON.stringify(req.body).slice(0, 4000)]);
  } catch (e) {}
  res.json({ ok: true });
});

app.get('/api/v1/calls/stats', (req, res) => {
  const key = req.header('X-Command-Key') || req.query.key;
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  res.json({ count: CALL_EVENTS.length, last_10: CALL_EVENTS.slice(0, 10) });
});

app.post('/api/v1/vapi/call', async (req, res) => {
  const key = req.header('X-Command-Key');
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  if (!VAPI_API_KEY) return res.status(400).json({ error: 'VAPI_API_KEY not set' });
  
  const { phone_number, customer_name } = req.body;
  if (!phone_number) return res.status(400).json({ error: 'phone_number required' });
  
  try {
    const resp = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + VAPI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: { number: phone_number, name: customer_name }
      })
    });
    const data = await resp.json();
    res.json({ ok: resp.ok, status: resp.status, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// BUILD BUILDER ENDPOINTS
app.post('/api/v1/builder/request', async (req, res) => {
  const key = req.header('X-Command-Key');
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  
  const { title, description, category, priority } = req.body;
  
  const result = await query(
    `INSERT INTO build_requests (title, description, category, priority, status)
     VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
    [title, description, category || 'feature', priority || 5]
  );
  
  res.json({ ok: true, build_request_id: result[0].id });
});

app.get('/api/v1/builder/pending', async (req, res) => {
  const key = req.query.key;
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  
  const pending = await query(`
    SELECT id, title, description, category, priority, created_at
    FROM build_requests
    WHERE status = 'pending'
    ORDER BY priority ASC, created_at ASC
  `);
  
  res.json({ pending_requests: pending });
});

app.post('/api/v1/builder/approve/:id', async (req, res) => {
  const key = req.header('X-Command-Key');
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  
  const { id } = req.params;
  
  await query(
    `UPDATE build_requests SET status = 'approved', approved_at = NOW() WHERE id = $1`,
    [id]
  );
  
  res.json({ ok: true, message: 'Build request approved. Builder starting...' });
});

app.get('/api/v1/builder/status/:id', async (req, res) => {
  const key = req.query.key;
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  
  const { id } = req.params;
  
  const request = await query('SELECT * FROM build_requests WHERE id = $1', [id]);
  const steps = await query(
    'SELECT * FROM build_steps WHERE build_request_id = $1 ORDER BY step_number',
    [id]
  );
  
  res.json({ 
    request: request[0] || null,
    steps: steps,
    progress: steps.length > 0 ? steps.filter(s => s.status === 'completed').length / steps.length : 0
  });
});

app.get('/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Builder Dashboard</title>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 40px auto; padding: 0 20px; background: #f5f5f5; }
    h1 { color: #1d1d1f; }
    .request { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .request h3 { margin-top: 0; }
    .meta { color: #666; font-size: 14px; margin: 10px 0; }
    button { background: #007aff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    button:hover { background: #0051d5; }
    .empty { text-align: center; padding: 60px; color: #999; }
  </style>
</head>
<body>
  <h1>Build Builder Dashboard</h1>
  <div id="requests" class="empty">Loading...</div>
  
  <script>
    const KEY = '${COMMAND_KEY}';
    
    async function load() {
      const res = await fetch('/api/v1/builder/pending?key=' + KEY);
      const data = await res.json();
      
      if (data.pending_requests && data.pending_requests.length > 0) {
        document.getElementById('requests').innerHTML = data.pending_requests.map(r => \`
          <div class="request">
            <h3>\${r.title}</h3>
            <p>\${r.description || ''}</p>
            <div class="meta">Priority: \${r.priority} | Category: \${r.category}</div>
            <button onclick="approve(\${r.id})">Approve & Build</button>
          </div>
        \`).join('');
      } else {
        document.getElementById('requests').innerHTML = '<div class="empty">No pending requests</div>';
      }
    }
    
    async function approve(id) {
      if (!confirm('Start building?')) return;
      await fetch('/api/v1/builder/approve/' + id, {
        method: 'POST',
        headers: { 'X-Command-Key': KEY }
      });
      alert('Build started');
      load();
    }
    
    load();
    setInterval(load, 30000);
  </script>
</body>
</html>`);
});

app.listen(port, async () => {
  console.log('Server listening on port ' + port);
  try {
    await bootstrap();
    console.log('LifeOS ready');
  } catch (error) {
    console.error('Bootstrap failed but server staying up:', error);
    // Removed process.exit(1) - let server run even if bootstrap fails
  }
});
