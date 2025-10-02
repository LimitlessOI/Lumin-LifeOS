const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

// Get environment variables
const COMMAND_KEY = process.env.COMMAND_CENTER_KEY || 'temp';
const VAPI_API_KEY = process.env.VAPI_API_KEY || '';
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '';
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || '';

// Parse database URL
let dbConfig;
try {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    port: url.port || 5432,
    database: url.pathname.split('/')[1],
    user: url.username,
    password: url.password,
    ssl: { rejectUnauthorized: false }
  };
} catch (error) {
  console.error('❌ DATABASE_URL parse failed:', error.message);
  process.exit(1);
}

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

async function bootstrap() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS self_tasks (
        id SERIAL PRIMARY KEY,
        kind TEXT,
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
    
    console.log('✓ Database tables ready');
  } catch (error) {
    console.error('❌ Database bootstrap failed:', error.message);
    throw error;
  }
}

app.use(express.json());

// In-memory call event storage
const CALL_EVENTS = [];

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    service: 'LifeOS',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/healthz', async (req, res) => {
  try {
    await query('SELECT NOW()');
    res.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

// Vapi webhook endpoint
app.post('/api/v1/vapi/webhook', async (req, res) => {
  const event = {
    ts: new Date().toISOString(),
    data: req.body
  };
  
  CALL_EVENTS.unshift(event);
  if (CALL_EVENTS.length > 100) CALL_EVENTS.pop();
  
  try {
    await query(
      'INSERT INTO execution_log (endpoint, status, details) VALUES ($1, $2, $3)',
      ['vapi_webhook', 'received', JSON.stringify(req.body).slice(0, 4000)]
    );
  } catch (error) {
    console.error('Failed to log webhook:', error.message);
  }
  
  res.json({ ok: true });
});

// Get call statistics
app.get('/api/v1/calls/stats', (req, res) => {
  const key = req.header('X-Command-Key') || req.query.key;
  
  if (key !== COMMAND_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  
  res.json({
    count: CALL_EVENTS.length,
    last_10: CALL_EVENTS.slice(0, 10)
  });
});

// Make outbound call via Vapi
app.post('/api/v1/vapi/call', async (req, res) => {
  const key = req.header('X-Command-Key');
  
  if (key !== COMMAND_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  
  if (!VAPI_API_KEY) {
    return res.status(400).json({ error: 'VAPI_API_KEY not configured' });
  }
  
  const { phone_number, customer_name } = req.body;
  
  if (!phone_number) {
    return res.status(400).json({ error: 'phone_number required' });
  }
  
  try {
    const response = await fetch('https://api.vapi.ai/call', {
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
          name: customer_name || 'Customer'
        }
      })
    });
    
    const data = await response.json();
    
    await query(
      'INSERT INTO execution_log (endpoint, status, details) VALUES ($1, $2, $3)',
      ['vapi_call', response.ok ? 'success' : 'failed', JSON.stringify(data).slice(0, 4000)]
    );
    
    res.json({ 
      ok: response.ok,
      status: response.status,
      data 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  try {
    await bootstrap();
    console.log('✅ LifeOS ready');
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
});
