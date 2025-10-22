// server.js - MINIMAL WORKING VERSION with multi-LLM council
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, "public")));
app.use("/reports", express.static(path.join(__dirname, "reports")));
app.use("/overlay", express.static(path.join(__dirname, "public/overlay")));

// Data dir
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, "autopilot.log");
const SPEND_FILE = path.join(DATA_DIR, "spend.json");

// Env
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  WEBHOOK_SECRET,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "owner/repo",
} = process.env;

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || 5.0);

// Postgres
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

async function initDb() {
  await pool.query(`
    create table if not exists calls (
      id serial primary key,
      created_at timestamptz default now(),
      phone text,
      intent text,
      area text,
      timeline text,
      duration int,
      transcript text,
      score text,
      boldtrail_lead_id text
    );
  `);
  
  await pool.query(`
    create table if not exists build_metrics (
      id serial primary key,
      created_at timestamptz default now(),
      pr_number int,
      model text,
      tokens_in int default 0,
      tokens_out int default 0,
      cost numeric(10,4) default 0,
      outcome text default 'pending',
      summary text
    );
  `);
  
  await pool.query(`
    create table if not exists council_reviews (
      id serial primary key,
      pr_number int not null,
      reviewer text not null,
      vote text not null,
      reasoning text,
      concerns jsonb,
      created_at timestamptz default now()
    );
  `);
  
  await pool.query(`
    create index if not exists idx_council_pr on council_reviews(pr_number);
  `);
}

initDb()
  .then(() => console.log("✅ Database ready"))
  .catch(console.error);

// Council config
const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude",
    role: "Strategic Oversight & Unintended Consequences",
    model: "claude-sonnet-4",
    focus: "long-term implications, system coherence, edge cases"
  },
  brock: {
    name: "Brock",
    role: "Execution & Blindspot Detection",
    model: "gpt-4o",
    focus: "implementation risks, technical debt, maintainability"
  },
  jayn: {
    name: "Jayn",
    role: "Ethics & Long-term Impact",
    model: "gpt-4o-mini",
    focus: "user impact, ethical considerations, sustainability"
  },
  r8: {
    name: "r8",
    role: "Quality & Standards",
    model: "gpt-4o-mini",
    focus: "code quality, best practices, consistency"
  }
};

// Budget helpers
function readSpend() {
  try {
    return JSON.parse(fs.readFileSync(SPEND_FILE, "utf8"));
  } catch {
    return { day: dayjs().format("YYYY-MM-DD"), usd: 0 };
  }
}

function writeSpend(s) {
  try {
    fs.writeFileSync(SPEND_FILE, JSON.stringify(s));
  } catch (e) {
    console.error("Failed to write spend:", e);
  }
}

function trackCost(usage, model = "gpt-4o-mini") {
  const prices = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "claude-sonnet-4": { input: 0.003, output: 0.015 }
  };
  const price = prices[model] || prices["gpt-4o-mini"];
  const cost = ((usage?.prompt_tokens || 0) * price.input / 1000) +
               ((usage?.completion_tokens || 0) * price.output / 1000);

  let spend = readSpend();
  const today = dayjs().format("YYYY-MM-DD");
  if (spend.day !== today) spend = { day: today, usd: 0 };
  spend.usd += cost;
  writeSpend(spend);
  
  return cost;
}

function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers["x-command-key"];
  if (!COMMAND_CENTER_KEY || key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

function assertKey(req, res) {
  const k = process.env.COMMAND_CENTER_KEY;
  const got = req.query.key || req.headers["x-command-key"];
  if (!k || got !== k) { 
    res.status(401).json({ error: "unauthorized" }); 
    return false; 
  }
  return true;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function safeFetch(url, init = {}, retries = 3) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, init);
      const body = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { ...r, json: async () => JSON.parse(body), text: async () => body };
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await sleep(300 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

// Multi-LLM Council System
async function callCouncilMember(member, prompt) {
  const config = COUNCIL_MEMBERS[member];
  
  if (member === 'claude' && ANTHROPIC_API_KEY) {
    const res = await safeFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const json = await res.json();
    return {
      response: json.content[0].text,
      usage: { prompt_tokens: json.usage.input_tokens, completion_tokens: json.usage.output_tokens }
    };
  } else if (OPENAI_API_KEY) {
    const res = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    const json = await res.json();
    return {
      response: json.choices[0].message.content,
      usage: json.usage
    };
  }
  
  throw new Error(`No API key available for ${member}`);
}

async function getCouncilConsensus(prNumber, diff, summary) {
  console.log(`[council] Reviewing PR #${prNumber}...`);
  
  const reviews = [];
  const basePrompt = `You are reviewing a code change. Focus on: {{focus}}

PR Summary: ${summary}
Diff: ${diff.slice(0, 3000)}

Return JSON:
{
  "vote": "approve|concerns|reject",
  "confidence": 1-10,
  "reasoning": "2-3 sentences",
  "concerns": ["list of issues"],
  "blindspots": ["potential problems"]
}`;

  for (const [memberId, config] of Object.entries(COUNCIL_MEMBERS)) {
    try {
      const memberPrompt = basePrompt.replace('{{focus}}', config.focus);
      const result = await callCouncilMember(memberId, memberPrompt);
      const review = JSON.parse(result.response);
      
      const cost = trackCost(result.usage, config.model);
      
      await pool.query(`
        insert into council_reviews (pr_number, reviewer, vote, reasoning, concerns)
        values ($1, $2, $3, $4, $5)
      `, [prNumber, config.name, review.vote, review.reasoning, JSON.stringify(review.concerns || [])]);
      
      reviews.push({
        member: config.name,
        vote: review.vote,
        confidence: review.confidence || 5,
        reasoning: review.reasoning,
        concerns: review.concerns || [],
        blindspots: review.blindspots || []
      });
      
      console.log(`[council] ${config.name}: ${review.vote} (${review.confidence}/10)`);
    } catch (e) {
      console.error(`[council] ${config.name} failed:`, e.message);
      reviews.push({ member: config.name, vote: "error" });
    }
  }
  
  const votes = reviews.filter(r => r.vote !== 'error');
  const approvals = votes.filter(r => r.vote === 'approve').length;
  const rejections = votes.filter(r => r.vote === 'reject').length;
  
  const consensus = {
    approved: approvals >= 3 || (approvals >= 2 && rejections === 0),
    auto_merge: approvals === 4,
    votes: { approve: approvals, reject: rejections },
    reviews,
    all_concerns: reviews.flatMap(r => r.concerns || [])
  };
  
  console.log(`[council] Result: ${consensus.approved ? 'APPROVED' : 'REJECTED'} (${approvals}/4)`);
  return consensus;
}

// Routes
app.get("/health", (_req, res) => {
  res.send("OK");
});

app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("select now()");
    res.json({ 
      status: "healthy", 
      database: "connected", 
      timestamp: r.rows[0].now,
      version: "v6-council-minimal"
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

app.post("/internal/autopilot/reset-stuck", (req, res) => {
  if (!assertKey(req, res)) return;
  console.log(`[autopilot] Reset triggered`);
  res.json({ ok: true });
});

app.get("/internal/cron/autopilot", (req, res) => {
  if (!assertKey(req, res)) return;
  const line = `[${new Date().toISOString()}] tick\n`;
  try { 
    fs.appendFileSync(LOG_FILE, line); 
    res.json({ ok: true }); 
  } catch(e) { 
    res.status(500).json({ error: String(e) }); 
  }
});

// Council critique endpoint
app.post("/api/v1/build/critique-pr", requireCommandKey, async (req, res) => {
  try {
    const { pr_number, diff, summary } = req.body;
    if (!diff) return res.status(400).json({ ok: false, error: "diff required" });

    const consensus = await getCouncilConsensus(pr_number, diff, summary);
    
    const recommendation = consensus.auto_merge ? "auto_merge" :
                          consensus.approved ? "review_required" : "reject";
    
    const score = consensus.votes.approve >= 3 ? 5 :
                  consensus.votes.approve === 2 ? 4 : 3;

    res.json({ 
      ok: true, 
      critique: {
        score,
        recommendation,
        reasoning: `Council: ${consensus.votes.approve}/4 approve`,
        council_reviews: consensus.reviews,
        all_concerns: consensus.all_concerns
      }
    });
  } catch (e) {
    console.error('[critique]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/council/reviews/:pr_number", requireCommandKey, async (req, res) => {
  try {
    const reviews = await pool.query(
      'select * from council_reviews where pr_number = $1 order by created_at desc',
      [req.params.pr_number]
    );
    res.json({ ok: true, reviews: reviews.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/v1/calls/stats", requireCommandKey, async (_req, res) => {
  try {
    const r = await pool.query("select count(*)::int as count from calls where created_at > now() - interval '30 days'");
    const last10 = await pool.query("select id, created_at, phone, intent, score from calls order by id desc limit 10");
    res.json({ count: r.rows[0].count, last_10: last10.rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Work queue storage (in-memory for now, will persist to DB)
const workQueue = [];
let taskIdCounter = 1;

// Architect command endpoint
app.post("/api/v1/architect/command", requireCommandKey, async (req, res) => {
  try {
    const { intent, command } = req.body;
    console.log(`[architect] Command received: ${command}`);
    
    // Generate tasks based on intent
    let newTasks = [];
    
    if (intent === 'build') {
      newTasks = [
        { id: taskIdCounter++, description: 'Analyze codebase for improvement opportunities', status: 'queued' },
        { id: taskIdCounter++, description: 'Create PR for identified improvements', status: 'queued' },
        { id: taskIdCounter++, description: 'Get council approval', status: 'queued' }
      ];
    } else if (intent === 'outreach' || intent === 'recruit') {
      newTasks = [
        { id: taskIdCounter++, description: 'Generate EXP recruitment call scripts', status: 'queued' },
        { id: taskIdCounter++, description: 'Identify high-value leads from call data', status: 'queued' },
        { id: taskIdCounter++, description: 'Schedule outbound calls', status: 'queued' },
        { id: taskIdCounter++, description: 'Create follow-up sequences', status: 'queued' }
      ];
    } else if (intent === 'revenue') {
      newTasks = [
        { id: taskIdCounter++, description: 'Analyze revenue opportunities', status: 'queued' },
        { id: taskIdCounter++, description: 'Optimize lead conversion funnel', status: 'queued' },
        { id: taskIdCounter++, description: 'Generate pricing strategy proposals', status: 'queued' }
      ];
    } else if (intent === 'analyze') {
      newTasks = [
        { id: taskIdCounter++, description: 'Generate performance analytics report', status: 'queued' },
        { id: taskIdCounter++, description: 'Identify bottlenecks and optimization targets', status: 'queued' }
      ];
    } else {
      // Default: generate 5 random improvement tasks
      newTasks = [
        { id: taskIdCounter++, description: 'Scan logs for recurring errors', status: 'queued' },
        { id: taskIdCounter++, description: 'Optimize database queries', status: 'queued' },
        { id: taskIdCounter++, description: 'Update documentation', status: 'queued' },
        { id: taskIdCounter++, description: 'Run security audit', status: 'queued' },
        { id: taskIdCounter++, description: 'Performance profiling', status: 'queued' }
      ];
    }
    
    // Add to queue
    workQueue.push(...newTasks);
    
    res.json({
      ok: true,
      message: `Generated ${newTasks.length} tasks for: ${intent}`,
      new_tasks: newTasks
    });
    
    // Start processing queue
    processWorkQueue();
  } catch (e) {
    console.error('[architect]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Auto-generate work endpoint (called by cron)
app.post("/api/v1/autopilot/generate-work", async (req, res) => {
  if (!assertKey(req, res)) return;
  
  try {
    // Always keep 10-20 tasks in the queue
    const currentTasks = workQueue.filter(t => t.status !== 'complete').length;
    const tasksNeeded = Math.max(0, 15 - currentTasks);
    
    if (tasksNeeded > 0) {
      const newTasks = [];
      for (let i = 0; i < tasksNeeded; i++) {
        newTasks.push({
          id: taskIdCounter++,
          description: `Auto-generated improvement task #${taskIdCounter}`,
          status: 'queued',
          created: new Date()
        });
      }
      workQueue.push(...newTasks);
      console.log(`[autopilot] Generated ${tasksNeeded} new tasks`);
    }
    
    res.json({ 
      ok: true, 
      queue_size: workQueue.length,
      tasks_added: tasksNeeded 
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Get current work queue
app.get("/api/v1/tasks", requireCommandKey, async (_req, res) => {
  res.json({ 
    ok: true, 
    tasks: workQueue.slice(-50) // Last 50 tasks
  });
});

// Cancel task
app.post("/api/v1/tasks/:id/cancel", requireCommandKey, async (req, res) => {
  const taskId = Number(req.params.id);
  const task = workQueue.find(t => t.id === taskId);
  if (task) {
    task.status = 'cancelled';
    res.json({ ok: true });
  } else {
    res.status(404).json({ ok: false, error: 'Task not found' });
  }
});

// Process work queue (runs continuously)
async function processWorkQueue() {
  while (true) {
    const task = workQueue.find(t => t.status === 'queued');
    if (!task) {
      await sleep(5000); // Wait 5 seconds if no tasks
      continue;
    }
    
    task.status = 'in-progress';
    console.log(`[worker] Processing: ${task.description}`);
    
    try {
      // Simulate work (replace with actual AI processing)
      await sleep(Math.random() * 10000 + 5000); // 5-15 seconds
      
      task.status = 'complete';
      task.completed = new Date();
      console.log(`[worker] Completed: ${task.description}`);
    } catch (e) {
      task.status = 'failed';
      task.error = String(e);
      console.error(`[worker] Failed: ${task.description}`, e);
    }
  }
}

// Start work processor in background
setTimeout(() => processWorkQueue(), 5000);

// Start server
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`✅ Health: http://${HOST}:${PORT}/health`);
  console.log(`✅ Overlay: http://${HOST}:${PORT}/overlay/index.html`);
  console.log(`✅ Architect: http://${HOST}:${PORT}/overlay/architect.html`);
  console.log(`✅ Council: Multi-LLM consensus active`);
  console.log(`✅ Work Queue: Auto-generating 10-20 tasks continuously`);
});
