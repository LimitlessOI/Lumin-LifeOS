// Helper function for BoldTrail API
async function boldtrailRequest(endpoint, method = 'GET', data = null) {
  const BOLDTRAIL_API_KEY = process.env.BOLDTRAIL_API_KEY;
  
  const response = await fetch(`https://api.boldtrail.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${BOLDTRAIL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : null
  });
  return response.json();
}

// Helper function to send SMS via Twilio
async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
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

// Lead qualification webhook
app.post('/api/v1/vapi/qualification-complete', async (req, res) => {
  const { phoneNumber, buyOrSell, area, timeline, duration, transcript } = req.body;
  
  const score = timeline === '30_days' ? 'hot' : 
                timeline === '90_days' ? 'warm' : 'cold';
  
  try {
    // Log to BoldTrail
    await boldtrailRequest('/activities', 'POST', {
      type: 'phone_call',
      contact_phone: phoneNumber,
      duration_seconds: duration,
      outcome: 'qualified',
      notes: `${buyOrSell} in ${area}, timeline: ${timeline}, score: ${score}\n\nTranscript: ${transcript}`
    });
    
    // Log locally
    await query(
      'INSERT INTO execution_log (endpoint, status, details) VALUES ($1, $2, $3)',
      ['qualification', score, JSON.stringify(req.body)]
    );
    
    // Alert agent if hot lead
    if (score === 'hot') {
      await sendSMS(
        process.env.AGENT_PHONE,
        `🔥 HOT LEAD: ${phoneNumber} wants to ${buyOrSell} in ${area} within 30 days!`
      );
    }
    
    res.json({ ok: true, score });
  } catch (error) {
    console.error('Qualification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Missed call handler
app.post('/api/v1/vapi/call-ended', async (req, res) => {
  const { phoneNumber, duration, answered } = req.body;
  
  try {
    if (!answered || duration < 5) {
      await sendSMS(
        phoneNumber,
        `Hi! I missed your call. I'm with a client right now. What can I help you with? Text me here and I'll respond ASAP.`
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

// Analytics dashboard
app.get('/analytics', async (req, res) => {
  const key = req.query.key;
  if (key !== COMMAND_KEY) return res.status(401).json({ error: 'unauthorized' });
  
  const stats = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE endpoint = 'vapi_webhook') as total_calls,
      COUNT(*) FILTER (WHERE details LIKE '%qualified%') as qualified_leads,
      COUNT(*) FILTER (WHERE details LIKE '%hot%') as hot_leads,
      COUNT(*) FILTER (WHERE endpoint = 'missed_call') as missed_calls
    FROM execution_log
    WHERE timestamp > NOW() - INTERVAL '30 days'
  `);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Call Analytics</title>
      <meta charset="utf-8">
      <style>
        body { font-family: system-ui; padding: 40px; background: #f5f5f5; }
        h1 { color: #1d1d1f; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .card h2 { margin: 0; font-size: 48px; color: #007aff; }
        .card p { margin: 10px 0 0; color: #666; }
      </style>
    </head>
    <body>
      <h1>Last 30 Days</h1>
      <div class="grid">
        <div class="card">
          <h2>${stats[0].total_calls}</h2>
          <p>Total Calls</p>
        </div>
        <div class="card">
          <h2>${stats[0].qualified_leads}</h2>
          <p>Qualified Leads</p>
        </div>
        <div class="card">
          <h2>${stats[0].hot_leads}</h2>
          <p>Hot Leads 🔥</p>
        </div>
        <div class="card">
          <h2>${stats[0].missed_calls}</h2>
          <p>Missed Calls</p>
        </div>
      </div>
    </body>
    </html>
  `);
});
