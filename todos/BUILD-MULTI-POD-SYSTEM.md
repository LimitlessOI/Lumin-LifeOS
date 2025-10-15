// server.js - COMPLETE AUTONOMOUS PROGRAMMING SYSTEM
import express from "express";
import { Octokit } from "@octokit/rest";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CRITICAL: Raw body for Stripe webhook BEFORE json parser
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));

// Then normal parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, "public")));

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
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 30,
  ssl: DATABASE_URL?.includes("neon") || DATABASE_URL?.includes("railway") 
    ? { rejectUnauthorized: false } 
    : undefined,
});

// GitHub Client
const octokit = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;

// ===== DATABASE INIT =====
async function initDb() {
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
    )
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
    )
  `);
}

initDb().then(() => console.log("✅ Database ready")).catch(console.error);

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
  const spent = await getTodaySpend();
  return {
    total: MAX_DAILY_SPEND,
    spent,
    remaining: Math.max(0, MAX_DAILY_SPEND - spent),
    exceeded: spent >= MAX_DAILY_SPEND
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

// ===== OPENAI HELPER =====
async function callOpenAI(prompt, maxTokens = 2000) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a skilled software engineer. Generate clean, working code. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    tokensIn: data.usage?.prompt_tokens || 0,
    tokensOut: data.usage?.completion_tokens || 0,
    cost: ((data.usage?.prompt_tokens || 0) * 0.00015 + (data.usage?.completion_tokens || 0) * 0.0006) / 1000
  };
}

// ===== GITHUB HELPERS =====
async function getFileContent(filepath) {
  if (!octokit) throw new Error("GitHub not configured");
  const [owner, repo] = GITHUB_REPO.split('/');
  try {
    const { data } = await octokit.repos.getContent({
      owner, repo, path: filepath, ref: GITHUB_DEFAULT_BRANCH
    });
    if (data.type !== 'file') throw new Error(`${filepath} is not a file`);
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

async function listTodoFiles() {
  if (!octokit) throw new Error("GitHub not configured");
  const [owner, repo] = GITHUB_REPO.split('/');
  try {
    const { data } = await octokit.repos.getContent({
      owner, repo, path: 'todos', ref: GITHUB_DEFAULT_BRANCH
    });
    return data.filter(item => item.type === 'file' && item.name.endsWith('.md'));
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

async function createPullRequest(title, body, files) {
  if (!octokit) throw new Error("GitHub not configured");
  const [owner, repo] = GITHUB_REPO.split('/');
  const branchName = `autopilot/${Date.now()}`;
  
  // Get base branch SHA
  const { data: refData } = await octokit.git.getRef({
    owner, repo, ref: `heads/${GITHUB_DEFAULT_BRANCH}`
  });
  const baseSha = refData.object.sha;
  
  // Create new branch
  await octokit.git.createRef({
    owner, repo, ref: `refs/heads/${branchName}`, sha: baseSha
  });
  
  // Get base tree
  const { data: baseCommit } = await octokit.git.getCommit({
    owner, repo, commit_sha: baseSha
  });
  const baseTreeSha = baseCommit.tree.sha;
  
  // Create blobs for all files
  const tree = [];
  for (const file of files) {
    const { data: blob } = await octokit.git.createBlob({
      owner, repo,
      content: Buffer.from(file.content).toString('base64'),
      encoding: 'base64'
    });
    tree.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });
  }
  
  // Create tree
  const { data: newTree } = await octokit.git.createTree({
    owner, repo,
    base_tree: baseTreeSha,
    tree
  });
  
  // Create commit
  const { data: commit } = await octokit.git.createCommit({
    owner, repo,
    message: title,
    tree: newTree.sha,
    parents: [baseSha]
  });
  
  // Update branch
  await octokit.git.updateRef({
    owner, repo,
    ref: `heads/${branchName}`,
    sha: commit.sha
  });
  
  // Create PR
  const { data: pr } = await octokit.pulls.create({
    owner, repo,
    title,
    body,
    head: branchName,
    base: GITHUB_DEFAULT_BRANCH
  });
  
  return pr;
}

// ===== AUTONOMOUS BUILD =====
async function executeAutonomousBuild() {
  console.log('[autonomous] Starting build...');
  
  const budget = await checkBudget();
  if (budget.exceeded) {
    console.log('[autonomous] Budget exceeded');
    return { skipped: true, reason: 'Budget exceeded' };
  }
  
  const todoFiles = await listTodoFiles();
  if (todoFiles.length === 0) {
    console.log('[autonomous] No TODO files found');
    return { skipped: true, reason: 'No TODO files' };
  }
  
  console.log(`[autonomous] Found ${todoFiles.length} TODO files`);
  
  // Read first TODO
  const firstTodo = todoFiles[0];
  const todoContent = await getFileContent(`todos/${firstTodo.name}`);
  
  console.log(`[autonomous] Processing: ${firstTodo.name}`);
  
  const prompt = `
You are an autonomous software engineer. Read this TODO file and complete ONE specific task.

TODO FILE:
${todoContent}

INSTRUCTIONS:
1. Pick ONE specific task from the TODO
2. Generate complete, working code
3. Respond with valid JSON only

JSON FORMAT:
{
  "summary": "Brief task description",
  "files": [
    {
      "path": "relative/path/to/file.js",
      "content": "complete file content here"
    }
  ],
  "report": "What you built and why"
}

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanation outside JSON.
`;

  const ai = await callOpenAI(prompt, 4000);
  
  // Log cost
  await pool.query(
    `INSERT INTO build_metrics (model, tokens_in, tokens_out, cost, summary, outcome)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['gpt-4o-mini', ai.tokensIn, ai.tokensOut, ai.cost, firstTodo.name, 'generated']
  );
  
  // Parse AI response
  let plan;
  try {
    const jsonMatch = ai.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    plan = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[autonomous] Failed to parse AI response:', e);
    console.error('[autonomous] Raw response:', ai.text);
    return { error: 'Failed to parse AI response', raw: ai.text.substring(0, 500) };
  }
  
  console.log(`[autonomous] Plan: ${plan.summary}`);
  
  // Create PR
  const pr = await createPullRequest(
    `[Autopilot] ${plan.summary}`,
    `## Autonomous Build

${plan.report}

---
**TODO:** ${firstTodo.name}  
**Cost:** $${ai.cost.toFixed(4)}  
**Auto-generated by autonomous system**
`,
    plan.files
  );
  
  console.log(`[autonomous] Created PR #${pr.number}: ${pr.html_url}`);
  
  // Update metrics
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
    summary: plan.summary,
    cost: ai.cost
  };
}

// ===== ROUTES =====

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: "healthy",
      version: "v9-complete-autonomous",
      autonomous: !!OPENAI_API_KEY && !!GITHUB_TOKEN,
      timestamp: new Date().toISOString()
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
    res.status(500).json({ error: "metrics_failed", details: e.message });
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
    if (!email) return res.status(400).json({ ok: false, error: 'Email required' });
    
    const existing = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.json({ ok: true, existing: true, customer: existing.rows[0] });
    }
    
    await pool.query(
      `INSERT INTO customers (email, baseline_commission, plan, status)
       VALUES ($1, $2, 'sales_coaching', 'baseline')`,
      [email, baseline_commission || 0]
    );
    
    res.json({ ok: true, success: true, message: 'Baseline started. We will track your sales for 90 days at zero cost.' });
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
        await pool.query(
          `UPDATE customers 
           SET stripe_customer_id = $1, stripe_subscription_id = $2, status = 'active', updated_at = NOW()
           WHERE email = $3`,
          [session.customer, session.subscription, session.customer_email]
        );
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await pool.query(
          `UPDATE customers SET status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2`,
          [subscription.status, subscription.id]
        );
        break;
    }
    
    res.json({ received: true });
  } catch (e) {
    console.error('[webhook]', e);
    res.status(500).json({ error: e.message });
  }
});

// ===== AUTONOMOUS BUILD ENDPOINT =====
app.post("/internal/autopilot/build-now", requireCommandKey, async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.json({ ok: false, error: 'OPENAI_API_KEY not configured' });
    }
    
    if (!GITHUB_TOKEN) {
      return res.json({ ok: false, error: 'GITHUB_TOKEN not configured' });
    }
    
    // Run in background
    executeAutonomousBuild()
      .then(result => {
        console.log('[build-now] Completed:', result);
      })
      .catch(error => {
        console.error('[build-now] Error:', error);
      });
    
    res.json({ 
      ok: true, 
      message: 'Autonomous build started. Check GitHub PRs in 2-3 minutes.',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('[build-now]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ===== SERVER START =====
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║  🚀 LIFEOS AUTONOMOUS SYSTEM                     ║
╠════════════════════════════════════════════════════╣
║  Port: ${PORT}                                       ║
║  Version: v9-complete-autonomous                  ║
║  OpenAI: ${OPENAI_API_KEY ? '✓ Configured' : '✗ Missing'}                       ║
║  GitHub: ${GITHUB_TOKEN ? '✓ Configured' : '✗ Missing'}                       ║
║  Autonomous: ${!!OPENAI_API_KEY && !!GITHUB_TOKEN ? 'ENABLED ✓' : 'DISABLED ✗'}                     ║
║  Budget: $${MAX_DAILY_SPEND}/day                              ║
╚════════════════════════════════════════════════════╝
  `);
});
