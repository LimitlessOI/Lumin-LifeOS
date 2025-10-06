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
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 8080;

// Environment variables
const COMMAND_KEY = process.env.COMMAND_CENTER_KEY || 'temp';
const VAPI_API_KEY = process.env.VAPI_API_KEY || '';
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || '';
const DATABASE_URL = process.env.DATABASE_URL;
const STRIPE_LINK = process.env.STRIPE_LINK || '';
const CALENDLY_LINK = process.env.CALENDLY_LINK || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''; // <-- used for webhook auth

// Database configuration
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

// LCTP Delta Compression (Grok's contribution)
function generateLctpDelta({ base, delta }) {
  const capsule = {
    version: '1.3',
    base,
    delta,
    checksum: crypto.createHash('md5').update(JSON.stringify({ base, delta })).digest('hex')
  };
  return JSON.stringify(capsule);
}

// Input trimming for token savings
function trimInput(input) {
  return String(input || '').trim().replace(/\s+/g, ' ');
}

// Task normalization for caching
function normalizeTask(task) {
  return task.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200);
}

async function bootstrap() {
  await query("CREATE TABLE IF NOT EXISTS self_tasks (id SERIAL PRIMARY KEY, kind TEXT, payload JSONB DEFAULT '{}'::jsonb, status TEXT DEFAULT 'queued', created_at TIMESTAMP DEFAULT NOW(), run_after TIMESTAMP DEFAULT NOW(), result JSONB)");
  await query("CREATE TABLE IF NOT EXISTS execution_log (id SERIAL PRIMARY KEY, timestamp TIMESTAMP DEFAULT NOW(), endpoint TEXT, status TEXT, details TEXT)");
  await query("CREATE TABLE IF NOT EXISTS build_requests (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, category TEXT DEFAULT 'feature', priority INTEGER DEFAULT 5, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW(), approved_at TIMESTAMP)");
  await query("CREATE TABLE IF NOT EXISTS build_steps (id SERIAL PRIMARY KEY, build_request_id INTEGER REFERENCES build_requests(id), step_number INTEGER, description TEXT, status TEXT DEFAULT 'pending', result JSONB, created_at TIMESTAMP DEFAULT NOW())");
  await query("CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, business_name TEXT NOT NULL, contact_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, boldtrail_key TEXT, hours TEXT, greeting TEXT, vapi_assistant_id TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW())");
  await query("CREATE TABLE IF NOT EXISTS leads (id SERIAL PRIMARY KEY, source TEXT, user_id TEXT, name TEXT, email TEXT, phone TEXT, sentiment_score INTEGER, status TEXT DEFAULT 'new', created_at TIMESTAMP DEFAULT NOW(), last_contact TIMESTAMP DEFAULT NOW())");
  await query("CREATE TABLE IF NOT EXISTS agent_decisions (id SERIAL PRIMARY KEY, task TEXT, task_hash TEXT, advocate_response TEXT, skeptic_response TEXT, systems_response TEXT, final_decision TEXT, executed BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW())");
  await query("CREATE TABLE IF NOT EXISTS token_usage (id SERIAL PRIMARY KEY, endpoint TEXT, tokens_used INTEGER, cost_estimate DECIMAL(10,4), created_at TIMESTAMP DEFAULT NOW())");
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
        Body: trimInput(message)
      })
    }
  );
  return response.json();
}

async function createVapiAssistant(clientData) {
  try {
    // Trim and compress greeting (Grok's optimization)
    const greeting = trimInput(clientData.greeting).slice(0, 500);

    // Generate compressed system prompt
    const systemPrompt = 'You are a receptionist for ' + clientData.business_name + '. Ask: 1) Buy or sell? 2) What area? 3) Timeline - 30 days, 90 days, or exploring?';

    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + VAPI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: clientData.business_name + ' Receptionist',
        firstMessage: greeting,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: systemPrompt
          }]
        },
        voice: {
          provider: 'elevenlabs',
          voiceId: 'rachel'
        },
        serverUrl: (process.env.PUBLIC_BASE_URL || 'https://robust-magic-production.up.railway.app') + '/api/v1/vapi/qualification-complete'
      })
    });

    const assistant = await response.json();

    // Log token usage estimate
    await query(
      'INSERT INTO token_usage (endpoint, tokens_used, cost_estimate) VALUES ($1, $2, $3)',
      ['vapi_create_assistant', 150, 0.0015]
    );

    return assistant.id;
  } catch (error) {
    console.error('Vapi assistant creation failed:', error);
    return null;
  }
}

/** ---------- SECURITY: WEBHOOK VERIFICATION ---------- */
// Verify webhook requests (added as a ship-blocker fix)
function verifyWebhook(req) {
  const secret = req.header('X-Webhook-Secret');
  return secret && secret === WEBHOOK_SECRET;
}

app.use(express.json());
app.use('/static', express.static('public'));

const overlayStates = new Map();
const CALL_EVENTS = [];

// Health + root
app.get('/', (req, res) => {
  res.json({ service: 'LifeOS', status: 'ok', version: '1.0' });
});

app.get('/healthz', async (req, res) => {
  try {
    await query('SELECT NOW()');
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** ---------- PUBLIC ONBOARDING (NO ADMIN KEY IN BROWSER) ---------- */
app.post('/public/onboarding', async (req, res) => {
  const { business_name, contact_name, phone, email, boldtrail_key, hours, greeting } = req.body || {};
  if (!business_name || !phone || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const assistantId = await createVapiAssistant({
      business_name,
      greeting: greeting || `Hi! Thanks for calling ${business_name}. How can I help you today?`
    });
    if (!assistantId) {
      return res.status(500).json({ error: 'Failed to create assistant' });
    }

    const result = await query(
      `INSERT INTO clients (business_name, contact_name, phone, email, boldtrail_key, hours, greeting, vapi_assistant_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING id`,
      [business_name, contact_name || '', phone, email, boldtrail_key || null, hours || '', greeting || '', assistantId]
    );

    await sendSMS(phone, `Welcome to LifeOS AI Receptionist! Your system is active. Test it by calling ${process.env.VAPI_PHONE_NUMBER || 'your assigned number'}.`);

    res.json({
      ok: true,
      client_id: result[0].id,
      assistant_id: assistantId,
      test_number: process.env.VAPI_PHONE_NUMBER || null
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Setup failed. Please contact support.' });
  }
});

/** ---------- WEBHOOKS (NOW AUTHENTICATED) ---------- */
app.post('/api/v1/vapi/webhook', async (req, res) => {
  if (!verifyWebhook(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
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
        assistantId: process.env.VAPI_ASSISTANT_ID,
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
  if (!verifyWebhook(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
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
  if (!verifyWebhook(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
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

/** ---------- ADMIN (keep, now safe because not exposed in browser) ---------- */
app.post('/api/v1/admin/setup-client', async (req, res) => {
  const key = req.header('X-Command-Key');
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });

  const { business_name, contact_name, phone, email, boldtrail_key, hours, greeting } = req.body;

  try {
    const assistantId = await createVapiAssistant(req.body);

    if (!assistantId) {
      return res.status(500).json({ error: 'Failed to create Vapi assistant' });
    }

    const result = await query(
      'INSERT INTO clients (business_name, contact_name, phone, email, boldtrail_key, hours, greeting, vapi_assistant_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, \'active\') RETURNING id',
      [business_name, contact_name, phone, email, boldtrail_key, hours, greeting, assistantId]
    );

    await sendSMS(phone, 'Welcome to LifeOS AI Receptionist! Your system is active. Test it by calling ' + process.env.VAPI_PHONE_NUMBER);

    res.json({
      ok: true,
      client_id: result[0].id,
      assistant_id: assistantId,
      test_number: process.env.VAPI_PHONE_NUMBER
    });
  } catch (error) {
    console.error('Client setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/admin/clients', async (req, res) => {
  const key = req.query.key;
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });

  const clients = await query('SELECT * FROM clients ORDER BY created_at DESC');
  res.json({ clients });
});

/** ---------- SOCIAL / LEAD CAPTURE ---------- */
app.post('/api/v1/social/comment-webhook', async (req, res) => {
  const { comment, user, name, platform } = req.body;

  try {
    const commentText = trimInput(comment);

    if (commentText.toLowerCase().includes('interested')) {
      // Estimate sentiment (0-10 scale, simple keyword matching for now)
      const sentiment = commentText.toLowerCase().includes('need') || commentText.toLowerCase().includes('urgent') ? 9 :
                        commentText.toLowerCase().includes('soon') ? 7 : 5;

      await query(
        'INSERT INTO leads (source, user_id, name, sentiment_score, status) VALUES ($1, $2, $3, $4, $5)',
        [platform || 'facebook', user, name || 'Unknown', sentiment, 'demo_sent']
      );

      const message = 'Hey ' + (name || 'there') + '! Here is a 60-sec demo: [DEMO_URL]\n\nIf you like it, sign up here: ' + STRIPE_LINK + '\n\nQuestions? Book a quick call: ' + CALENDLY_LINK;

      console.log('Would send DM to', user, '(sentiment:', sentiment + '):', message);

      // High sentiment gets priority
      if (sentiment > 7) {
        console.log('HIGH PRIORITY LEAD - manual follow-up recommended');
      }
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Comment webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/** ---------- OVERLAY (viewer + controller) ---------- */
app.get('/overlay/:sid', (req, res) => {
  const sid = req.params.sid;
  if (!overlayStates.has(sid)) {
    overlayStates.set(sid, { bullets: [], lowerThird: null });
  }
  res.sendFile(path.join(__dirname, 'public/overlay/index.html'));
});

app.get('/overlay/:sid/control', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/overlay/control.html'));
});

app.post('/api/overlay/:sid/state', (req, res) => {
  const sid = req.params.sid;
  const state = req.body || {};
  overlayStates.set(sid, state);
  res.json({ ok: true });
});

app.get('/api/overlay/:sid/state', (req, res) => {
  const sid = req.params.sid;
  res.json(overlayStates.get(sid) || { bullets: [], lowerThird: null });
});

/** ---------- ANALYTICS ---------- */
app.get('/analytics', async (req, res) => {
  const key = req.query.key;
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });

  const stats = await query("SELECT COUNT(*) FILTER (WHERE endpoint = 'vapi_webhook') as total_calls, COUNT(*) FILTER (WHERE details LIKE '%qualified%') as qualified_leads, COUNT(*) FILTER (WHERE details LIKE '%hot%') as hot_leads, COUNT(*) FILTER (WHERE endpoint = 'missed_call') as missed_calls FROM execution_log WHERE timestamp > NOW() - INTERVAL '30 days'");

  const tokenStats = await query("SELECT COALESCE(SUM(cost_estimate),0) as total_cost FROM token_usage WHERE created_at > NOW() - INTERVAL '30 days'");

  res.send('<!DOCTYPE html><html><head><title>Call Analytics</title><meta charset="utf-8"><style>body { font-family: system-ui; padding: 40px; background: #f5f5f5; } h1 { color: #1d1d1f; } .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; } .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); } .card h2 { margin: 0; font-size: 48px; color: #007aff; } .card p { margin: 10px 0 0; color: #666; } .cost { color: #34c759; }</style></head><body><h1>Last 30 Days</h1><div class="grid"><div class="card"><h2>' + stats[0].total_calls + '</h2><p>Total Calls</p></div><div class="card"><h2>' + stats[0].qualified_leads + '</h2><p>Qualified Leads</p></div><div class="card"><h2>' + stats[0].hot_leads + '</h2><p>Hot Leads</p></div><div class="card"><h2>' + stats[0].missed_calls + '</h2><p>Missed Calls</p></div><div class="card"><h2 class="cost">$' + Number(tokenStats[0].total_cost || 0).toFixed(2) + '</h2><p>API Costs</p></div></div></body></html>');
});

/** ---------- BUILDER (server-rendered dashboard: NO KEY IN BROWSER) ---------- */
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

// Server-rendered dashboard (no client-side key leakage)
app.get('/dashboard', async (req, res) => {
  const pending = await query("SELECT id, title, description, category, priority, created_at FROM build_requests WHERE status = 'pending' ORDER BY priority ASC, created_at ASC");
  const style = `
    body { font-family: system-ui; max-width: 1200px; margin: 40px auto; padding: 0 20px; background: #f5f5f5; }
    h1 { color: #1d1d1f; }
    .request { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .request h3 { margin-top: 0; }
    .meta { color: #666; font-size: 14px; margin: 10px 0; }
    button { background: #007aff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    button:hover { background: #0051d5; }
    .empty { text-align: center; padding: 60px; color: #999; }
    form { display: inline-block; margin-right: 8px; }
  `;
  const cards = (pending.length ? pending.map(r => `
    <div class="request">
      <h3>${r.title}</h3>
      <p>${r.description || ""}</p>
      <div class="meta">Priority: ${r.priority} | Category: ${r.category}</div>
      <form method="post" action="/dashboard/approve/${r.id}">
        <button type="submit">Approve</button>
      </form>
    </div>
  `).join('') : '<div class="empty">No pending requests</div>');
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Build Dashboard</title><style>${style}</style></head><body><h1>Build Dashboard</h1>${cards}</body></html>`);
});

app.post('/dashboard/approve/:id', async (req, res) => {
  try {
    await query('UPDATE build_requests SET status = \'approved\', approved_at = NOW() WHERE id = $1', [req.params.id]);
  } catch (e) {
    console.error('Approve error:', e);
  }
  res.redirect('/dashboard');
});

/** ---------- FOLLOW-UP CRON ---------- */
setInterval(async () => {
  try {
    const staleLeads = await query(
      "SELECT * FROM leads WHERE status = 'demo_sent' AND last_contact < NOW() - INTERVAL '24 hours'"
    );

    for (const lead of staleLeads) {
      console.log('Would follow up with lead:', lead.user_id, '(sentiment:', lead.sentiment_score + ')');
      await query('UPDATE leads SET status = \'followup_sent\', last_contact = NOW() WHERE id = $1', [lead.id]);
    }
  } catch (error) {
    console.error('Follow-up cron error:', error);
  }
}, 3600000);

app.listen(port, async () => {
  console.log('Server listening on port ' + port);
  try {
    await bootstrap();
    console.log('LifeOS ready - Revenue System Active');
  } catch (error) {
    console.error('Bootstrap failed but server staying up:', error);
  }
});
