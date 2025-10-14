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

// Database Init
async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT DEFAULT 'sales_coaching',
    status TEXT DEFAULT 'baseline',
    baseline_commission NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  
  await pool.query(`CREATE TABLE IF NOT EXISTS build_metrics (
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
  )`);
}

initDb().then(() => console.log("✅ Database ready")).catch(console.error);

// Budget Check
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

// Auth Middleware
function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers['x-command-key'];
  if (key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// OpenAI Helper
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
        { role: "system", content: "You are a skilled software engineer. Generate clean, working code." },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    tokensIn: data.usage?.prompt_tokens || 0,
    tokensOut: data.usage?.completion_tokens || 0,
    cost: (data.usage?.prompt_tokens * 0.00015 + data.usage?.completion_tokens * 0.0006) / 1000
  };
}

// GitHub Helpers
async function getFileContent(path) {
  if (!octokit) throw new Error("GitHub not configured");
  const [owner, repo] = GITHUB_REPO.split('/');
  try {
    const { data } = await octokit.repos.getContent({
      owner, repo, path, ref: GITHUB_DEFAULT_BRANCH
    });
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
  
  const { data: refData } = await octokit.git.getRef({
    owner, repo, ref: `heads/${GITHUB_DEFAULT_BRANCH}`
  });
  const baseSha = refData.object.sha;
  
  await octokit.git.createRef({
    owner, repo, ref: `refs/heads/${branchName}`, sha: baseSha
  });
  
  for (const file of files) {
    const { data: blobData } = await octokit.git.createBlob({
      owner, repo,
      content: Buffer.from(file.content).toString('base64'),
      encoding: 'base64'
    });
    
    const { data: baseTree } = await octokit.git.getTree({
      owner, repo, tree_sha: baseSha
    });
    
    const { data: newTree } = await octokit.git.createTree({
      owner, repo, base_tree: baseTree.sha,
      tree: [{ path: file.path, mode: '100644', type: 'blob', sha: blobData.sha }]
    });
    
    const { data: commit } = await octokit.git.createCommit({
      owner, repo, message: `chore: ${file.path}`, tree: newTree.sha, parents: [baseSha]
    });
    
    await octokit.git.updateRef({
      owner, repo, ref: `heads/${branchName}`, sha: commit.sha
    });
  }
  
  const { data: pr } = await octokit.pulls.create({
    owner, repo, title, body, head: branchName, base: GITHUB_DEFAULT_BRANCH
  });
  
  return pr;
}

// Autonomous Build
async function executeAutonomousBuild() {
  console.log('[autonomous] Starting...');
  
  const budget = await checkBudget();
  if (budget.exceeded) {
    return { skipped: true, reason: 'Budget exceeded' };
  }
  
  const todoFiles = await listTodoFiles();
  if (todoFiles.length === 0) {
    return { skipped: true, reason: 'No TODO files' };
  }
  
  const firstTodo = todoFiles[0];
  const todoContent = await getFileContent(`todos/${firstTodo.name}`);
  
  const prompt = `
You are an autonomous coding assistant. Read this TODO and generate code fixes.

TODO:
${todoContent}

Respond with JSON:
{
  "summary": "What you're doing",
  "files": [{"path": "file.js", "content": "complete code"}],
  "report": "What was done"
}
`;

  const ai = await callOpenAI(prompt, 4000);
  
  await pool.query(
    `INSERT INTO build_metrics (model, tokens_in, tokens_out, cost, summary, outcome)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['gpt-4o-mini', ai.tokensIn, ai.tokensOut, ai.cost, firstTodo.name, 'generated']
  );
  
  const jsonMatch = ai.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in AI response');
  const plan = JSON.parse(jsonMatch[0]);
  
  const pr = await createPullRequest(
    `[Autopilot] ${plan.summary}`,
    `## Autonomous Build\n\n${plan.report}`,
    plan.files
  );
  
  await pool.query(
    `UPDATE build_metrics SET pr_number = $1, pr_url = $2, outcome = $3
     WHERE id = (SELECT id FROM build_metrics ORDER BY timestamp DESC LIMIT 1)`,
    [pr.number, pr.html_url, 'pr_created']
  );
  
  return { success: true, pr_number: pr.number, pr_url: pr.html_url, cost: ai.cost };
}

// ROUTES

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: "healthy",
      version: "v8-autonomous",
      autonomous: !!OPENAI_API_KEY && !!GITHUB_TOKEN
    });
  } catch (e) {
    res.status(500).json({ status: "unhealthy", error: e.message });
  }
});

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
    
    res.json({ ok: true, success: true, message: 'Baseline started' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/internal/autopilot/build-now", requireCommandKey, async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.json({ ok: false, error: 'OpenAI not configured' });
    if (!GITHUB_TOKEN) return res.json({ ok: false, error: 'GitHub not configured' });
    
    executeAutonomousBuild()
      .then(r => console.log('[build] Done:', r))
      .catch(e => console.error('[build] Error:', e));
    
    res.json({ ok: true, message: 'Build started - check GitHub PRs in 2-3 minutes' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║  🚀 LIFEOS AUTONOMOUS SYSTEM        ║
║  Port: ${PORT}                          ║
║  Version: v8-autonomous             ║
║  Autonomous: ${!!OPENAI_API_KEY && !!GITHUB_TOKEN ? 'YES ✓' : 'NO ✗'}                 ║
╚══════════════════════════════════════╝
  `);
});
