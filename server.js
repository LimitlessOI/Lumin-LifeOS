// server.js - v11 ORCHESTRATOR-AWARE AUTONOMOUS SYSTEM
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
  GITHUB_DEFAULT_BRANCH = "main",
  ORCH_ENABLED = "true",
  ORCH_REVENUE_LOCK = "true"
} = process.env;

const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || 5.0);
const QUALITY_THRESHOLD = 0.7;
const AUTO_MERGE_THRESHOLD = 0.9;

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
  // Original tables
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

  // Orchestrator tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orch_tasks (
      id bigserial primary key,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      status text default 'queued',
      title text not null,
      card text not null,
      roi_guess numeric(10,2) default 0,
      complexity text default 'medium',
      revenue_critical boolean default false,
      meta jsonb default '{}'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orch_pods (
      id serial primary key,
      name text unique not null,
      kind text default 'builder',
      enabled boolean default true,
      budget_cents int default 1000,
      credits int default 0,
      success_rate numeric(4,3) default 0,
      last_seen timestamptz default now(),
      meta jsonb default '{}'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orch_claims (
      id bigserial primary key,
      task_id bigint references orch_tasks(id) on delete cascade,
      pod_id int references orch_pods(id) on delete cascade,
      started_at timestamptz default now(),
      lock_ttl int default 3600,
      files text[] default array[]::text[],
      idempotency_key text unique not null,
      status text default 'running'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orch_runs (
      id bigserial primary key,
      task_id bigint references orch_tasks(id),
      pod_id int references orch_pods(id),
      stage text not null,
      model text,
      tokens_in int default 0,
      tokens_out int default 0,
      cost numeric(10,4) default 0,
      quality numeric(4,3) default 0,
      outcome text default 'pending',
      notes text,
      created_at timestamptz default now()
    )
  `);

  // Seed pods
  await pool.query(`
    INSERT INTO orch_pods (name, kind, budget_cents) VALUES
      ('Alpha', 'builder', 1000),
      ('Bravo', 'money', 1000),
      ('Charlie', 'infra', 1000),
      ('Delta', 'security', 1000)
    ON CONFLICT (name) DO NOTHING
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
async function callAI(prompt, stage = 'generate', maxTokens = 2000) {
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
        { 
          role: "system", 
          content: stage === 'review' 
            ? "You are a senior code reviewer. Score quality 0-1." 
            : "You are an expert software engineer. Generate complete, production-ready code."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: stage === 'plan' ? 0.3 : 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
  }

  const data = await response.json();
  const usage = data.usage || {};
  const cost = (usage.prompt_tokens || 0) * 0.00015 / 1000 + 
               (usage.completion_tokens || 0) * 0.0006 / 1000;

  return {
    text: data.choices[0].message.content,
    tokensIn: usage.prompt_tokens || 0,
    tokensOut: usage.completion_tokens || 0,
    cost,
    model: "gpt-4o-mini"
  };
}

// ===== GITHUB HELPERS =====
async function createPullRequest(title, body, files, labels = []) {
  if (!octokit) throw new Error("GitHub not configured");
  const [owner, repo] = GITHUB_REPO.split('/');
  const branchName = `autopilot/${Date.now()}`;
  
  const { data: refData } = await octokit.git.getRef({
    owner, repo, ref: `heads/${GITHUB_DEFAULT_BRANCH}`
  });
  const baseSha = refData.object.sha;
  
  await octokit.git.createRef({
    owner, repo, ref: `refs/heads/${branchName}`, sha: baseSha
  });
  
  const { data: baseCommit } = await octokit.git.getCommit({
    owner, repo, commit_sha: baseSha
  });
  
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
  
  const { data: newTree } = await octokit.git.createTree({
    owner, repo,
    base_tree: baseCommit.tree.sha,
    tree
  });
  
  const { data: commit } = await octokit.git.createCommit({
    owner, repo,
    message: title,
    tree: newTree.sha,
    parents: [baseSha]
  });
  
  await octokit.git.updateRef({
    owner, repo,
    ref: `heads/${branchName}`,
    sha: commit.sha
  });
  
  const { data: pr } = await octokit.pulls.create({
    owner, repo,
    title,
    body,
    head: branchName,
    base: GITHUB_DEFAULT_BRANCH
  });

  if (labels.length > 0) {
    try {
      await octokit.issues.addLabels({
        owner, repo,
        issue_number: pr.number,
        labels
      });
    } catch (e) {
      console.log('[pr] Label add failed (non-critical):', e.message);
    }
  }
  
  return pr;
}

async function mergePullRequest(prNumber, commitMessage) {
  if (!octokit) throw new Error("GitHub not configured");
  const [owner, repo] = GITHUB_REPO.split('/');
  
  await octokit.pulls.merge({
    owner, repo,
    pull_number: prNumber,
    commit_title: commitMessage,
    merge_method: 'squash'
  });
}

// ===== ORCHESTRATOR-AWARE BUILD =====
async function executeOrchBuild() {
  console.log('[orch-build] 🚀 Starting orchestrator-aware build...');
  
  const budget = await checkBudget();
  if (budget.exceeded) {
    console.log('[orch-build] ⛔ Budget exceeded');
    return { skipped: true, reason: 'Budget exceeded' };
  }
  
  // Claim task from orchestrator
  console.log('[orch-build] 📋 Claiming task...');
  
  try {
    const claimResponse = await fetch(`${PUBLIC_BASE_URL}/api/v1/orch/claim?key=${COMMAND_CENTER_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod: 'Alpha' })
    });
    
    if (!claimResponse.ok) {
      console.log('[orch-build] ⚠️ Claim failed:', claimResponse.status);
      return { skipped: true, reason: 'Claim failed' };
    }
    
    const claimData = await claimResponse.json();
    
    if (!claimData.task) {
      console.log('[orch-build] ℹ️ No tasks in queue');
      return { skipped: true, reason: 'No tasks available' };
    }
    
    const task = claimData.task;
    console.log(`[orch-build] ✅ Claimed task #${task.id}: ${task.title}`);
    
    // ===== STAGE 1: PLAN =====
    console.log('[orch-build] 📊 STAGE 1: Planning...');
    
    const planPrompt = `You are planning a development task.

TASK: ${task.title}

DETAILS:
${task.card}

Create a plan. Respond with ONLY valid JSON:
{
  "title": "Brief title",
  "files_to_create": ["file1.js"],
  "key_requirements": ["requirement 1"]
}`;

    const planAI = await callAI(planPrompt, 'plan', 1000);
    
    // Record plan cost
    await fetch(`${PUBLIC_BASE_URL}/api/v1/orch/complete?key=${COMMAND_CENTER_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pod: 'Alpha',
        task_id: task.id,
        stage: 'plan',
        cost: planAI.cost,
        quality: 0.8,
        outcome: 'ok'
      })
    }).catch(e => console.error('[orch-build] Failed to record plan:', e));
    
    let plan;
    try {
      const jsonMatch = planAI.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      plan = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[orch-build] ❌ Failed to parse plan');
      return { error: 'Parse failed' };
    }
    
    console.log(`[orch-build] ✅ Plan: ${plan.title}`);
    
    // ===== STAGE 2: GENERATE =====
    console.log('[orch-build] 💻 STAGE 2: Generating...');
    
    const generatePrompt = `You are implementing a feature.

PLAN:
${JSON.stringify(plan, null, 2)}

TASK:
${task.card}

Build complete code. Respond with ONLY valid JSON:
{
  "summary": "What you built",
  "files": [{"path": "file.js", "content": "complete code"}],
  "report": "Explanation"
}`;

    const generateAI = await callAI(generatePrompt, 'generate', 4000);
    
    // Record generate cost
    await fetch(`${PUBLIC_BASE_URL}/api/v1/orch/complete?key=${COMMAND_CENTER_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pod: 'Alpha',
        task_id: task.id,
        stage: 'generate',
        cost: generateAI.cost,
        quality: 0.85,
        outcome: 'ok'
      })
    }).catch(e => console.error('[orch-build] Failed to record generate:', e));
    
    let generated;
    try {
      const jsonMatch = generateAI.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      generated = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[orch-build] ❌ Failed to parse generated');
      return { error: 'Parse failed' };
    }
    
    console.log(`[orch-build] ✅ Generated ${generated.files.length} files`);
    
    // ===== STAGE 3: REVIEW =====
    console.log('[orch-build] 🔍 STAGE 3: Review...');
    
    const reviewPrompt = `Review this code. Score 0-1.

OUTPUT:
${JSON.stringify(generated, null, 2).substring(0, 1000)}

Respond with ONLY valid JSON:
{
  "quality_score": 0.85,
  "issues": ["issue"],
  "strengths": ["strength"]
}`;

    const reviewAI = await callAI(reviewPrompt, 'review', 800);
    
    let review;
    try {
      const jsonMatch = reviewAI.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      review = JSON.parse(jsonMatch[0]);
    } catch (e) {
      review = { quality_score: 0.75 };
    }
    
    const finalScore = review.quality_score || 0.75;
    console.log(`[orch-build] 📊 Quality: ${(finalScore * 100).toFixed(0)}%`);
    
    // Record review
    await fetch(`${PUBLIC_BASE_URL}/api/v1/orch/complete?key=${COMMAND_CENTER_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pod: 'Alpha',
        task_id: task.id,
        stage: 'review',
        cost: reviewAI.cost,
        quality: finalScore,
        outcome: 'ok'
      })
    }).catch(e => console.error('[orch-build] Failed to record review:', e));
    
    // Quality gate
    if (finalScore < QUALITY_THRESHOLD) {
      console.log(`[orch-build] ⛔ Quality too low`);
      return { skipped: true, reason: 'Low quality', score: finalScore };
    }
    
    // ===== CREATE PR =====
    const totalCost = planAI.cost + generateAI.cost + reviewAI.cost;
    
    const prBody = `## 🤖 Task #${task.id}: ${task.title}

${generated.report}

### 📊 Metrics
- Quality: ${(finalScore * 100).toFixed(0)}%
- Cost: $${totalCost.toFixed(4)}
- ROI: $${task.roi_guess}

Pod: Alpha | Orchestrator Build`;

    const labels = [];
    if (finalScore >= AUTO_MERGE_THRESHOLD) labels.push('auto-merge');
    if (task.revenue_critical) labels.push('revenue');
    
    console.log('[orch-build] 📤 Creating PR...');
    
    const pr = await createPullRequest(
      `✨ ${generated.summary}`,
      prBody,
      generated.files,
      labels
    );
    
    console.log(`[orch-build] ✅ PR #${pr.number}: ${pr.html_url}`);
    
    // Record PR
    await fetch(`${PUBLIC_BASE_URL}/api/v1/orch/complete?key=${COMMAND_CENTER_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pod: 'Alpha',
        task_id: task.id,
        stage: 'pr',
        cost: 0,
        quality: finalScore,
        outcome: 'ok',
        pr_number: pr.number,
        pr_url: pr.html_url
      })
    }).catch(e => console.error('[orch-build] Failed to record PR:', e));
    
    // Auto-merge
    let autoMerged = false;
    if (finalScore >= AUTO_MERGE_THRESHOLD) {
      console.log(`[orch-build] 🎯 AUTO-MERGING!`);
      try {
        await mergePullRequest(pr.number, `Auto: ${generated.summary}`);
        autoMerged = true;
      } catch (e) {
        console.error('[orch-build] Merge failed:', e.message);
      }
    }
    
    return {
      success: true,
      task_id: task.id,
      pr_number: pr.number,
      pr_url: pr.html_url,
      quality_score: finalScore,
      auto_merged: autoMerged
    };
    
  } catch (e) {
    console.error('[orch-build] ❌ Error:', e);
    return { error: e.message };
  }
}

// ===== ORCHESTRATOR ROUTES =====

// 🆕 QUEUE STATUS ENDPOINT (FIXED - now at top level)
app.get("/api/v1/orch/queue", requireCommandKey, async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orch_tasks
      GROUP BY status
    `);
    
    const recentTasks = await pool.query(`
      SELECT id, title, status, created_at
      FROM orch_tasks
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    res.json({
      ok: true,
      summary: summary.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      recent: recentTasks.rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/v1/orch/enqueue", requireCommandKey, async (req, res) => {
  try {
    const { title, card, roi_guess = 0, complexity = 'medium', revenue_critical = false } = req.body;
    
    const result = await pool.query(
      `INSERT INTO orch_tasks (title, card, roi_guess, complexity, revenue_critical)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [title, card, roi_guess, complexity, revenue_critical]
    );
    
    res.json({ ok: true, task_id: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/v1/orch/claim", requireCommandKey, async (req, res) => {
  try {
    const { pod } = req.body;
    
    const podResult = await pool.query('SELECT * FROM orch_pods WHERE name = $1', [pod]);
    if (podResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pod not found' });
    }
    
    const podData = podResult.rows[0];
    const revenueLock = ORCH_REVENUE_LOCK === 'true';
    
    let task;
    if (revenueLock) {
      const revenueCheck = await pool.query(
        'SELECT COUNT(*) as cnt FROM orch_tasks WHERE status = $1 AND revenue_critical = true',
        ['queued']
      );
      
      if (parseInt(revenueCheck.rows[0].cnt) > 0) {
        task = await pool.query(
          `SELECT * FROM orch_tasks 
           WHERE status = 'queued' AND revenue_critical = true
           ORDER BY roi_guess DESC
           LIMIT 1 FOR UPDATE SKIP LOCKED`
        );
      } else {
        task = await pool.query(
          `SELECT * FROM orch_tasks 
           WHERE status = 'queued'
           ORDER BY roi_guess DESC
           LIMIT 1 FOR UPDATE SKIP LOCKED`
        );
      }
    } else {
      task = await pool.query(
        `SELECT * FROM orch_tasks 
         WHERE status = 'queued'
         ORDER BY roi_guess DESC
         LIMIT 1 FOR UPDATE SKIP LOCKED`
      );
    }
    
    if (task.rows.length === 0) {
      return res.json({ ok: true, task: null });
    }
    
    const taskData = task.rows[0];
    const idempotencyKey = `${pod}-${taskData.id}-${Date.now()}`;
    
    await pool.query(
      `INSERT INTO orch_claims (task_id, pod_id, idempotency_key)
       VALUES ($1, $2, $3)`,
      [taskData.id, podData.id, idempotencyKey]
    );
    
    await pool.query(
      'UPDATE orch_tasks SET status = $1 WHERE id = $2',
      ['claimed', taskData.id]
    );
    
    res.json({ ok: true, task: taskData, claim_key: idempotencyKey });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/v1/orch/complete", requireCommandKey, async (req, res) => {
  try {
    const { pod, task_id, stage, cost, quality, outcome } = req.body;
    
    const podResult = await pool.query('SELECT * FROM orch_pods WHERE name = $1', [pod]);
    if (podResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pod not found' });
    }
    
    const podData = podResult.rows[0];
    
    await pool.query(
      `INSERT INTO orch_runs (task_id, pod_id, stage, cost, quality, outcome)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [task_id, podData.id, stage, cost, quality, outcome]
    );
    
    if (outcome === 'ok' && stage === 'pr') {
      await pool.query('UPDATE orch_tasks SET status = $1 WHERE id = $2', ['done', task_id]);
      
      let credits = Math.floor(100 * (quality || 0.8));
      if (podData.kind === 'infra' || podData.kind === 'builder') credits = Math.floor(credits * 1.2);
      
      await pool.query('UPDATE orch_pods SET credits = credits + $1 WHERE id = $2', [credits, podData.id]);
    }
    
    const costCents = Math.floor((cost || 0) * 100);
    await pool.query('UPDATE orch_pods SET budget_cents = budget_cents - $1 WHERE id = $2', [costCents, podData.id]);
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/v1/orch/pods/status", requireCommandKey, async (req, res) => {
  try {
    const pods = await pool.query('SELECT * FROM orch_pods ORDER BY name');
    res.json({ ok: true, pods: pods.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== OTHER ROUTES =====
app.get("/healthz", async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: "healthy",
      version: "v11-orchestrator",
      autonomous: !!OPENAI_API_KEY && !!GITHUB_TOKEN,
      orch_enabled: ORCH_ENABLED === 'true'
    });
  } catch (e) {
    res.status(500).json({ status: "unhealthy" });
  }
});

app.post('/api/v1/billing/start-baseline', async (req, res) => {
  try {
    const { email, baseline_commission } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'Email required' });
    
    const existing = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.json({ ok: true, existing: true });
    }
    
    await pool.query(
      `INSERT INTO customers (email, baseline_commission) VALUES ($1, $2)`,
      [email, baseline_commission || 0]
    );
    
    res.json({ ok: true, success: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/internal/autopilot/build-now", requireCommandKey, async (req, res) => {
  try {
    if (!OPENAI_API_KEY || !GITHUB_TOKEN) {
      return res.json({ ok: false, error: 'Missing API keys' });
    }
    
    executeOrchBuild()
      .then(r => console.log('[build] Done:', r))
      .catch(e => console.error('[build] Error:', e));
    
    res.json({ ok: true, message: 'Orchestrator build started' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 LIFEOS v11 ORCHESTRATOR SYSTEM    ║
╠════════════════════════════════════════╣
║  Port: ${PORT}                            ║
║  Autonomous: ${!!OPENAI_API_KEY && !!GITHUB_TOKEN ? '✓' : '✗'}                        ║
║  Orchestrator: ${ORCH_ENABLED === 'true' ? '✓' : '✗'}                       ║
║  Revenue Lock: ${ORCH_REVENUE_LOCK === 'true' ? '✓' : '✗'}                       ║
╚════════════════════════════════════════╝
  `);
});
