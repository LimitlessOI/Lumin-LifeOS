// server.js - COMPLETE WITH AUTONOMOUS PROGRAMMING
import express from "express";
import { Octokit } from "@octokit/rest";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CRITICAL: Raw body for Stripe webhook BEFORE json parser
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));

// Then normal parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static assets - MUST be before routes
app.use(express.static(path.join(__dirname, "public")));
app.use("/reports", express.static(path.join(__dirname, "reports")));

// Data directory
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Environment
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY = "changeme",
  PUBLIC_BASE_URL = "http://localhost:8080",
  PORT = 8080,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  OPENAI_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "LimitlessOI/Lumin-LifeOS",
  GITHUB_DEFAULT_BRANCH = "main"
} = process.env;

const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || 5.0);

// PostgreSQL Pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 30,
  ssl: DATABASE_URL?.includes("neon") || DATABASE_URL?.includes("railway") 
    ? { rejectUnauthorized: false } 
    : undefined,
});

// GitHub Client
const octokit = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;

// ===== DATABASE INITIALIZATION =====
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      phone TEXT,
      intent TEXT,
      area TEXT,
      timeline TEXT,
      duration INT,
      transcript TEXT,
      score TEXT,
      boldtrail_lead_id TEXT
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS missed_calls (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      from_number TEXT,
      to_number TEXT,
      status TEXT DEFAULT 'new'
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS overlay_states (
      id SERIAL PRIMARY KEY,
      sid TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      data JSONB NOT NULL
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS build_metrics (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      model TEXT NOT NULL,
      tokens_in INT DEFAULT 0,
      tokens_out INT DEFAULT 0,
      cost NUMERIC(10,4) DEFAULT 0,
      pr_number INT,
      pr_url TEXT,
      summary TEXT,
      outcome TEXT DEFAULT 'pending',
      context_size INT DEFAULT 0
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      plan TEXT DEFAULT 'sales_coaching',
      status TEXT DEFAULT 'baseline',
      baseline_commission NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

initDb()
  .then(() => console.log("✅ Database tables ready"))
  .catch(console.error);

// ===== BUDGET HELPERS =====
async function getTodaySpend() {
  const r = await pool.query(`
    SELECT COALESCE(SUM(cost), 0) as total
    FROM build_metrics
    WHERE timestamp::date = CURRENT_DATE
  `);
  return Number(r.rows[0].total);
}

async function checkBudget() {
  const todaySpend = await getTodaySpend();
  const remaining = MAX_DAILY_SPEND - todaySpend;
  
  return {
    total: MAX_DAILY_SPEND,
    spent: todaySpend,
    remaining: Math.max(0, remaining),
    exceeded: todaySpend >= MAX_DAILY_SPEND
  };
}

// ===== AUTH MIDDLEWARE =====
function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers['x-command-key'];
  if (key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// ===== AI HELPER - CALL OPENAI =====
async function callOpenAI(prompt, maxTokens = 2000) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a skilled software engineer. Generate clean, working code. When asked to fix something, provide the complete fixed code."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const tokensIn = data.usage?.prompt_tokens || 0;
  const tokensOut = data.usage?.completion_tokens || 0;
  const cost = (tokensIn * 0.00015 + tokensOut * 0.0006) / 1000;

  return {
    text: data.choices[0].message.content,
    tokensIn,
    tokensOut,
    cost
  };
}

// ===== GITHUB HELPERS =====
async function getFileContent(path) {
  if (!octokit) throw new Error("GitHub not configured");
  
  const [owner, repo] = GITHUB_REPO.split('/');
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: GITHUB_DEFAULT_BRANCH
    });
    
    if (data.type !== 'file') {
      throw new Error(`${path} is not a file`);
    }
    
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (e) {
    if (e.status === 404) {
      return null; // File doesn't exist
    }
    throw e;
  }
}

async function listTodoFiles() {
  if (!octokit) throw new Error("GitHub not configured");
  
  const [owner, repo] = GITHUB_REPO.split('/');
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'todos',
      ref: GITHUB_DEFAULT_BRANCH
    });
    
    return data.filter(item => item.type === 'file' && item.name.endsWith('.md'));
  } catch (e) {
    if (e.status === 404) {
      return []; // todos directory doesn't exist
    }
    throw e;
  }
}

async function createPullRequest(title, body, files) {
  if (!octokit) throw new Error("GitHub not configured");
  
  const [owner, repo] = GITHUB_REPO.split('/');
  const branchName = `autopilot/${Date.now()}`;
  
  // Get the base branch SHA
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${GITHUB_DEFAULT_BRANCH}`
  });
  
  const baseSha = refData.object.sha;
  
  // Create a new branch
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha
  });
  
  // Create commits for each file
  for (const file of files) {
    const { data: blobData } = await octokit.git.createBlob({
      owner,
      repo,
      content: Buffer.from(file.content).toString('base64'),
      encoding: 'base64'
    });
    
    const { data: baseTree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: baseSha
    });
    
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTree.sha,
      tree: [{
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      }]
    });
    
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `chore: ${file.path}`,
      tree: newTree.sha,
      parents: [baseSha]
    });
    
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: commit.sha
    });
  }
  
  // Create pull request
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head: branchName,
    base: GITHUB_DEFAULT_BRANCH
  });
  
  return pr;
}

// ===== AUTONOMOUS BUILD LOGIC =====
async function executeAutonomousBuild() {
  console.log('[autonomous-build] Starting...');
  
  // Check budget first
  const budget = await checkBudget();
  if (budget.exceeded) {
    console.log('[autonomous-build] Budget exceeded, skipping');
    return { skipped: true, reason: 'Budget exceeded' };
  }
  
  // Get TODO files
  const todoFiles = await listTodoFiles();
  if (todoFiles.length === 0) {
    console.log('[autonomous-build] No TODO files found');
    return { skipped: true, reason: 'No TODO files' };
  }
  
  console.log(`[autonomous-build] Found ${todoFiles.length} TODO files`);
  
  // Read the first TODO file
  const firstTodo = todoFiles[0];
  const todoContent = await getFileContent(`todos/${firstTodo.name}`);
  
  console.log(`[autonomous-build] Processing: ${firstTodo.name}`);
  
  // Ask AI to analyze the TODO and generate code
  const prompt = `
You are an autonomous coding assistant. Read this TODO file and generate the necessary code changes.

TODO FILE:
${todoContent}

INSTRUCTIONS:
1. Analyze what needs to be done
2. Generate the complete code for any files that need to be created or modified
3. Format your response as JSON with this structure:
{
  "summary": "Brief description of what you're doing",
  "files": [
    {
      "path": "path/to/file.js",
      "content": "complete file content here"
    }
  ],
  "report": "Detailed report of what was done and test results"
}

Be specific and thorough. Generate working, production-ready code.
`;

  const aiResponse = await callOpenAI(prompt, 4000);
  
  // Log cost
  await pool.query(
    `INSERT INTO build_metrics (model, tokens_in, tokens_out, cost, summary, outcome)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['gpt-4o-mini', aiResponse.tokensIn, aiResponse.tokensOut, aiResponse.cost, firstTodo.name, 'generated']
  );
  
  // Parse AI response
  let buildPlan;
  try {
    const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    buildPlan = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[autonomous-build] Failed to parse AI response:', e);
    return { error: 'Failed to parse AI response', raw: aiResponse.text };
  }
  
  console.log(`[autonomous-build] AI plan: ${buildPlan.summary}`);
  
  // Create PR with the changes
  const pr = await createPullRequest(
    `[Autopilot] ${buildPlan.summary}`,
    `## Autonomous Build\n\n${buildPlan.report}\n\n---\nGenerated by autopilot system.\nTODO: ${firstTodo.name}`,
    buildPlan.files
  );
  
  console.log(`[autonomous-build] Created PR #${pr.number}: ${pr.html_url}`);
  
  // Update metrics with PR info
  await pool.query(
    `UPDATE build_metrics 
     SET pr_number = $1, pr_url = $2, outcome = $3
     WHERE id = (SELECT id FROM build_metrics ORDER BY timestamp DESC LIMIT 1)`,
    [pr.number, pr.html_url, 'pr_created']
  );
  
  return {
    success: true,
    pr_number: pr.number,
    pr_url: pr.html_url,
    summary: buildPlan.summary,
    cost: aiResponse.cost
  };
}

// ===== ROUTES =====

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: "healthy",
      version: "v8-autonomous-programming",
      timestamp: new Date().toISOString(),
      autonomous: !!OPENAI_API_KEY && !!GITHUB_TOKEN
    });
  } catch (e) {
    res.status(500).json({ status: "unhealthy", error: e.message });
  }
});

app.get("/api/v1/metrics/summary", requireCommandKey, async (_req, res) => {
  try {
    const totalRes = await pool.query(`
      SELECT 
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(AVG(cost), 0) as avg_cost,
        COUNT(*)::int as build_count,
        COUNT(*) FILTER (WHERE outcome = 'pr_created')::int as prs_created
      FROM build_metrics
      WHERE timestamp > NOW() - INTERVAL '7 days'
    `);
    
    const recentRes = await pool.query(`
      SELECT timestamp, model, cost, summary, outcome, pr_url
      FROM build_metrics
      ORDER BY timestamp DESC
      LIMIT 20
    `);
    
    res.json({
      ...totalRes.rows[0],
      recent_builds: recentRes.rows
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "metrics_failed" });
  }
});

app.get("/api/v1/budget/status", requireCommandKey, async (_req, res) => {
  const budget = await checkBudget();
  res.json(budget);
});

// ===== BILLING ROUTES =====

app.post('/api/v1/billing/start-baseline', async (req, res) => {
  try {
    const { email, baseline_commission } = req.body;
    
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    
    const existing = await pool.query(
      'SELECT * FROM customers WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ 
        ok: true, 
        existing: true,
        customer: existing.rows[0] 
      });
    }
    
    await pool.query(`
      INSERT INTO customers (email, baseline_commission, plan, status)
      VALUES ($1, $2, 'sales_coaching', 'baseline')
    `, [email, baseline_commission || 0]);
    
    console.log(`[baseline] Started for ${email}`);
    
    res.json({ 
      ok: true, 
      success: true,
      message: 'Baseline started. We will track your sales for 90 days at zero cost.' 
    });
    
  } catch (e) {
    console.error('[billing/start-baseline]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/v1/billing/create-checkout-session', async (req, res) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ ok: false, error: 'Stripe not configured' });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    
    const { email, price_id } = req.body || {};
    
    if (!price_id) {
      return res.status(400).json({ ok: false, error: 'price_id required' });
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      customer_email: email,
      success_url: `${PUBLIC_BASE_URL}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_BASE_URL}/sales-coaching.html?canceled=1`,
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 }
    });
    
    res.json({ ok: true, id: session.id, url: session.url });
    
  } catch (e) {
    console.error('[billing/checkout]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/v1/billing/webhook', async (req, res) => {
  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[webhook] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const email = session.customer_email;
        
        await pool.query(`
          UPDATE customers 
          SET stripe_customer_id = $1,
              stripe_subscription_id = $2,
              status = 'active',
              updated_at = NOW()
          WHERE email = $3
        `, [session.customer, session.subscription, email]);
        
        console.log(`[webhook] Subscription activated for ${email}`);
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        const newStatus = subscription.status;
        
        await pool.query(`
          UPDATE customers 
          SET status = $1,
              updated_at = NOW()
          WHERE stripe_subscription_id = $2
        `, [newStatus, subscription.id]);
        
        console.log(`[webhook] Subscription ${newStatus}: ${subscription.id}`);
        break;
    }
    
    res.json({ received: true });
  } catch (e) {
    console.error('[webhook] Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===== AUTONOMOUS BUILD ENDPOINT =====
app.post("/internal/autopilot/build-now", requireCommandKey, async (req, res) => {
  try {
    console.log('[build-now] Triggered');
    
    if (!OPENAI_API_KEY) {
      return res.json({ 
        ok: false, 
        error: 'OpenAI API key not configured' 
      });
    }
    
    if (!GITHUB_TOKEN) {
      return res.json({ 
        ok: false, 
        error: 'GitHub token not configured' 
      });
    }
    
    // Run autonomous build in background
    executeAutonomousBuild()
      .then(result => {
        console.log('[build-now] Completed:', result);
      })
      .catch(error => {
        console.error('[build-now] Error:', error);
      });
    
    res.json({ 
      ok: true, 
      message: 'Autonomous build started - check logs and GitHub PRs in a few minutes'
    });
    
  } catch (e) {
    console.error('[build-now]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ===== OVERLAY ROUTES =====
app.get("/overlay/:sid", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/index.html"));
});

app.get("/overlay/:sid/control", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/control.html"));
});

app.post("/api/overlay/:sid/state", async (req, res) => {
  try {
    const { sid } = req.params;
    const data = req.body;
    
    await pool.query(
      `INSERT INTO overlay_states (sid, data, updated_at) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (sid) DO UPDATE 
       SET data = $2, updated_at = NOW()`,
      [sid, JSON.stringify(data)]
    );
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/overlay/:sid/state", async (req, res) => {
  try {
    const { sid } = req.params;
    const result = await pool.query(
      'SELECT data FROM overlay_states WHERE sid = $1 ORDER BY updated_at DESC LIMIT 1',
      [sid]
    );
    
    if (result.rows.length === 0) {
      return res.json({ status: "waiting" });
    }
    
    res.json(result.rows[0].data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== SERVER START =====
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 LIFEOS - AUTONOMOUS PROGRAMMING SYSTEM               ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                               ║
║  Version: v8-autonomous-programming                       ║
║  Revenue: /sales-coaching.html                            ║
║  Autonomous: ${!!OPENAI_API_KEY && !!GITHUB_TOKEN ? 'ENABLED ✓' : 'DISABLED ✗'}                              ║
║  Budget: $${MAX_DAILY_SPEND}/day                                        ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default server;
