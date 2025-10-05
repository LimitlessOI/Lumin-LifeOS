// Crash visibility
process.on('uncaughtException', (err) => {
  console.error('FATAL uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('FATAL unhandledRejection:', err);
  process.exit(1);
});

const express = require('express');
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
  await query('CREATE TABLE IF NOT EXISTS build_requests (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, category TEXT DEFAULT \'feature\', priority INTEGER DEFAULT 5, status TEXT DEFAULT \'pending\', created_at TIMESTAMP DEFAULT NOW(), approved_at TIMESTAMP)');
  await query('CREATE TABLE IF NOT EXISTS build_steps (id SERIAL PRIMARY KEY, build_request_id INTEGER REFERENCES build_requests(id), step_number INTEGER, description TEXT, status TEXT DEFAULT \'pending\', result JSONB, created_at TIMESTAMP DEFAULT NOW())');
  console.log('Database tables ready');
}

async function boldtrailRequest(endpoint, method = 'GET', data = null) {
  const BOLDTRAIL_API_KEY = process.env.BOLDTRAIL_API_KEY;
  if (!BOLDTRAIL_API_KEY) return { error: 'No BoldTrail API key' };
  
  const response = await fetch('https://api.boldtrail.com/v1' + endpoint, {
    method,
    headers: {
      'Authorization': 'Bearer ' + BOLDTRAIL_API_KEY,
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : null
  });
  return response.json();
}

async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.log('SMS not configured, would send:', to, message);
    return { error: 'Twilio not configured' };
  }
  
  const response = await fetch(
    'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message
      })
    }
  );
  return response.json();
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

app.post('/api/v1/vapi/qualification-complete', async (req, res) => {
  const { phoneNumber, buyOrSell, area, timeline, duration, transcript } = req.body;
  
  const score = timeline === '30_days' ? 'hot' : 
                timeline === '90_days' ? 'warm' : 'cold';
  
  try {
    await boldtrailRequest('/activities', 'POST', {
      type: 'phone_call',
      contact_phone: phoneNumber,
      duration_seconds: duration,
      outcome: 'qualified',
      notes: buyOrSell + ' in ' + area + ', timeline: ' + timeline + ', score: ' + score + '\n\nTranscript: ' + transcript
    });
    
    await query(
      'INSERT INTO execution_log (endpoint, status, details) VALUES ($1, $2, $3)',
      ['qualification', score, JSON.stringify(req.body)]
    );
    
    if (score === 'hot') {
      await sendSMS(
        process.env.AGENT_PHONE,
        'HOT LEAD: ' + phoneNumber + ' wants to ' + buyOrSell + ' in ' + area + ' within 30 days!'
      );
    }
    
    res.json({ ok: true, score });
  } catch (error) {
    console.error('Qualification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/vapi/call-ended', async (req, res) => {
  const { phoneNumber, duration, answered } = req.body;
  
  try {
    if (!answered || duration < 5) {
      await sendSMS(
        phoneNumber,
        'Hi! I missed your call. I\'m with a client right now. What can I help you with? Text me here and I\'ll respond ASAP.'
      );
      
      await query(
        'INSERT INTO execution_log (endpoint, status, details) VALUES ($1, $2, $3)',
        ['missed_call', 'texted', phoneNumber]
      );
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Missed call error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/analytics', async (req, res) => {
  const key = req.query.key;
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  
  const stats = await query('SELECT COUNT(*) FILTER (WHERE endpoint = \'vapi_webhook\') as total_calls, COUNT(*) FILTER (WHERE details LIKE \'%qualified%\') as qualified_leads, COUNT(*) FILTER (WHERE details LIKE \'%hot%\') as hot_leads, COUNT(*) FILTER (WHERE endpoint = \'missed_call\') as missed_calls FROM execution_log WHERE timestamp > NOW() - INTERVAL \'30 days\'');
  
  res.send('<!DOCTYPE html><html><head><title>Call Analytics</title><meta charset="utf-8"><style>body { font-family: system-ui; padding: 40px; background: #f5f5f5; } h1 { color: #1d1d1f; } .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; } .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); } .card h2 { margin: 0; font-size: 48px; color: #007aff; } .card p { margin: 10px 0 0; color: #666; }</style></head><body><h1>Last 30 Days</h1><div class="grid"><div class="card"><h2>' + stats[0].total_calls + '</h2><p>Total Calls</p></div><div class="card"><h2>' + stats[0].qualified_leads + '</h2><p>Qualified Leads</p></div><div class="card"><h2>' + stats[0].hot_leads + '</h2><p>Hot Leads</p></div><div class="card"><h2>' + stats[0].missed_calls + '</h2><p>Missed Calls</p></div></div></body></html>');
});

app.post('/api/v1/builder/request', async (req, res) => {
  const key = req.header('X-Command-Key');
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  
  const { title, description, category, priority } = req.body;
  
  try {
    const result = await query(
      'INSERT INTO build_requests (title, description, category, priority, status) VALUES ($1, $2, $3, $4, \'pending\') RETURNING id',
      [title, description, category || 'feature', priority || 5]
    );
    
    res.json({ ok: true, build_request_id: result[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/builder/pending', async (req, res) => {
  const key = req.query.key;
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  
  try {
    const pending = await query('SELECT id, title, description, category, priority, created_at FROM build_requests WHERE status = \'pending\' ORDER BY priority ASC, created_at ASC');
    
    res.json({ pending_requests: pending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/builder/approve/:id', async (req, res) => {
  const key = req.header('X-Command-Key');
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  
  const { id } = req.params;
  
  try {
    await query('UPDATE build_requests SET status = \'approved\', approved_at = NOW() WHERE id = $1', [id]);
    
    res.json({ ok: true, message: 'Build request approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/dashboard', (req, res) => {
  res.send('<!DOCTYPE html><html><head><title>Builder Dashboard</title><meta charset="utf-8"><style>body { font-family: system-ui; max-width: 1200px; margin: 40px auto; padding: 0 20px; background: #f5f5f5; } h1 { color: #1d1d1f; } .request { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); } .request h3 { margin-top: 0; } .meta { color: #666; font-size: 14px; margin: 10px 0; } button { background: #007aff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; } button:hover { background: #0051d5; } .empty { text-align: center; padding: 60px; color: #999; }</style></head><body><h1>Build Dashboard</h1><div id="requests" class="empty">Loading...</div><script>const KEY = "' + COMMAND_KEY + '";async function load() {const res = await fetch("/api/v1/builder/pending?key=" + KEY);const data = await res.json();if (data.pending_requests && data.pending_requests.length > 0) {document.getElementById("requests").innerHTML = data.pending_requests.map(r => `<div class="request"><h3>${r.title}</h3><p>${r.description || ""}</p><div class="meta">Priority: ${r.priority} | Category: ${r.category}</div><button onclick="approve(${r.id})">Approve</button></div>`).join("");} else {document.getElementById("requests").innerHTML = "<div class=\\"empty\\">No pending requests</div>";}}async function approve(id) {if (!confirm("Approve?")) return;await fetch("/api/v1/builder/approve/" + id, {method: "POST",headers: { "X-Command-Key": KEY }});alert("Approved");load();}load();setInterval(load, 30000);</script></body></html>');
});

app.listen(port, async () => {
  console.log('Server listening on port ' + port);
  try {
    await bootstrap();
    console.log('LifeOS ready');
  } catch (error) {
    console.error('Bootstrap failed but server staying up:', error);
  }
});
