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
const path = require('path');
const crypto = require('crypto');
const fetch = global.fetch || require('node-fetch');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8080;

// ---------- ENV
const COMMAND_KEY = process.env.COMMAND_CENTER_KEY || 'temp';
const DATABASE_URL = process.env.DATABASE_URL;
const VAPI_API_KEY = process.env.VAPI_API_KEY || '';
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const STRIPE_LINK = process.env.STRIPE_LINK || '';
const CALENDLY_LINK = process.env.CALENDLY_LINK || '';
const AGENT_PHONE = process.env.AGENT_PHONE || '';

// ---------- DB
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
} catch (e) {
  console.error('DB parse failed:', e);
  process.exit(1);
}
const pool = new Pool(dbConfig);
async function query(sql, params = []) {
  const c = await pool.connect();
  try { return (await c.query(sql, params)).rows; }
  finally { c.release(); }
}

// ---------- Helpers
function trimInput(s) { return String(s || '').trim().replace(/\s+/g, ' '); }

async function sendSMS(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.log('[SMS] Twilio not configured. Would send:', { to, message });
    return { error: 'Twilio not configured' };
  }
  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ To: to, From: from, Body: trimInput(message) })
  });
  return resp.json();
}

async function createVapiAssistant(clientData) {
  try {
    if (!VAPI_API_KEY) {
      console.log('[Vapi] No API key set. Skipping assistant creation.');
      return 'asst_dummy_' + crypto.randomBytes(4).toString('hex');
    }
    const greeting = trimInput(clientData.greeting).slice(0, 500);
    const systemPrompt = `You are a receptionist for ${clientData.business_name}. Ask: 1) Buy or sell? 2) What area? 3) Timeline - 30 days, 90 days, or exploring?`;

    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + VAPI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: clientData.business_name + ' Receptionist',
        firstMessage: greeting,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }]
        },
        voice: { provider: 'elevenlabs', voiceId: 'rachel' },
        serverUrl: process.env.SERVER_PUBLIC_URL
          ? `${process.env.SERVER_PUBLIC_URL}/api/v1/vapi/qualification-complete`
          : undefined
      })
    });

    const data = await response.json();
    return data.id || 'asst_dummy_' + crypto.randomBytes(4).toString('hex');
  } catch (err) {
    console.error('Vapi assistant creation failed:', err);
    return 'asst_dummy_' + crypto.randomBytes(4).toString('hex');
  }
}

// ---------- SECURITY: WEBHOOK VERIFICATION
function verifyWebhook(req) {
  const secret = req.header('X-Webhook-Secret');
  return !!WEBHOOK_SECRET && !!secret && secret === WEBHOOK_SECRET;
}

// ---------- MIDDLEWARE & STATIC
app.use(express.json());
app.use('/static', express.static('public'));

// Pretty path for onboarding page
app.get('/onboarding', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
});

// ---------- OVERLAY (in-memory state per SID)
const overlayStates = new Map();

app.get('/overlay/:sid', (req, res) => {
  // Serve viewer
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'index.html'));
});
app.get('/overlay/:sid/control', (req, res) => {
  // Serve controller
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'control.html'));
});
app.get('/api/overlay/:sid/state', (req, res) => {
  const sid = req.params.sid;
  res.json(overlayStates.get(sid) || { bullets: [], lowerThird: null });
});
app.post('/api/overlay/:sid/state', (req, res) => {
  const sid = req.params.sid;
  const state = req.body || {};
  overlayStates.set(sid, {
    bullets: Array.isArray(state.bullets) ? state.bullets.slice(0, 12).map(trimInput) : [],
    lowerThird: state.lowerThird ? trimInput(state.lowerThird).slice(0, 120) : null
  });
  res.json({ ok: true });
});

// ---------- PUBLIC ONBOARDING (safe, no admin key)
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

    // Ensure tables
    await query("CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, business_name TEXT, contact_name TEXT, phone TEXT, email TEXT, boldtrail_key TEXT, hours TEXT, greeting TEXT, vapi_assistant_id TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW())");

    const result = await query(
      `INSERT INTO clients (business_name, contact_name, phone, email, boldtrail_key, hours, greeting, vapi_assistant_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING id`,
      [business_name, contact_name || '', phone, email, boldtrail_key || null, hours || '', greeting || '', assistantId]
    );

    // Welcome SMS (best-effort)
    try {
      await sendSMS(phone, `Welcome to LifeOS AI Receptionist! Your system is active. Test it by calling ${process.env.VAPI_PHONE_NUMBER || 'your assigned number'}.`);
    } catch (_) {}

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

// ---------- VAPI WEBHOOKS (secured)
app.post('/api/v1/vapi/webhook', async (req, res) => {
  if (!verifyWebhook(req)) return res.status(401).json({ error: 'unauthorized' });
  try {
    await query("CREATE TABLE IF NOT EXISTS execution_log (id SERIAL PRIMARY KEY, timestamp TIMESTAMP DEFAULT NOW(), endpoint TEXT, status TEXT, details TEXT)");
    await query('INSERT INTO execution_log (endpoint, status, details) VALUES ($1,$2,$3)',
      ['vapi_webhook', 'received', JSON.stringify(req.body).slice(0, 4000)]);
  } catch (e) {}
  res.json({ ok: true });
});

app.post('/api/v1/vapi/qualification-complete', async (req, res) => {
  if (!verifyWebhook(req)) return res.status(401).json({ error: 'unauthorized' });

  const { phoneNumber, buyOrSell, area, timeline, duration, transcript } = req.body || {};
  const score = timeline === '30_days' ? 'hot' : (timeline === '90_days' ? 'warm' : 'cold');

  try {
    await query("CREATE TABLE IF NOT EXISTS execution_log (id SERIAL PRIMARY KEY, timestamp TIMESTAMP DEFAULT NOW(), endpoint TEXT, status TEXT, details TEXT)");
    await query('INSERT INTO execution_log (endpoint, status, details) VALUES ($1,$2,$3)',
      ['qualification', score, JSON.stringify(req.body).slice(0, 4000)]);

    if (score === 'hot' && AGENT_PHONE) {
      await sendSMS(AGENT_PHONE, `HOT LEAD: ${phoneNumber} wants to ${buyOrSell} in ${area} within 30 days!`);
    }
    res.json({ ok: true, score });
  } catch (err) {
    console.error('Qualification error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/vapi/call-ended', async (req, res) => {
  if (!verifyWebhook(req)) return res.status(401).json({ error: 'unauthorized' });

  const { phoneNumber, duration, answered } = req.body || {};
  try {
    if (!answered || (duration || 0) < 5) {
      await sendSMS(phoneNumber, `Hi! I missed your call. I'm with a client right now. What can I help you with? Text me here and I'll respond ASAP.`);
      await query("CREATE TABLE IF NOT EXISTS execution_log (id SERIAL PRIMARY KEY, timestamp TIMESTAMP DEFAULT NOW(), endpoint TEXT, status TEXT, details TEXT)");
      await query('INSERT INTO execution_log (endpoint, status, details) VALUES ($1,$2,$3)',
        ['missed_call', 'texted', String(phoneNumber || '')]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Missed call error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- HEALTH + ROOT
app.get('/', (req, res) => res.json({ service: 'LifeOS', status: 'ok', version: '1.0' }));
app.get('/healthz', async (req, res) => {
  try {
    const rows = await query('SELECT NOW() as now');
    res.json({ status: 'healthy', database: 'connected', timestamp: rows[0].now.toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

// ---------- START
app.listen(port, async () => {
  console.log('Server listening on port ' + port);
  try {
    await query("CREATE TABLE IF NOT EXISTS token_usage (id SERIAL PRIMARY KEY, endpoint TEXT, tokens_used INTEGER, cost_estimate DECIMAL(10,4), created_at TIMESTAMP DEFAULT NOW())");
    console.log('LifeOS ready - Revenue System Active');
  } catch (e) {
    console.error('Bootstrap failed but server staying up:', e);
  }
});
