// server.js - Complete Production System with Billing
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

// Import integrations
import { createLead, appendTranscript, tagLead } from "./src/integrations/boldtrail.js";
import { adminRouter } from "./src/routes/admin.js";
import { billingRouter } from "./src/routes/billing.js";
import { buildSmartContext } from "./src/utils/context.js";
import { pruneLogContext } from "./src/utils/prune-context.js";
import { debugWithEscalation, shouldEscalate } from "./src/utils/tiered-debug.js";
import { councilDebate } from "./src/services/council.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CRITICAL: Raw body for Stripe webhook BEFORE json parser
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));

// Then normal parsers for everything else
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, "public")));
app.use("/reports", express.static(path.join(__dirname, "reports")));

// Data directory
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, "autopilot.log");
const STAMP_FILE = path.join(DATA_DIR, "last-build.txt");
const SPEND_FILE = path.join(DATA_DIR, "spend.json");

// Environment
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  WEBHOOK_SECRET,
  PUBLIC_BASE_URL,
  OPENAI_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "owner/repo",
  GITHUB_DEFAULT_BRANCH = "main",
  PORT = 8080,
} = process.env;

const MIN_BUILD_INTERVAL_MINUTES = Number(process.env.MIN_BUILD_INTERVAL_MINUTES || 30);
const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || 5.0);

// PostgreSQL Pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 30,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

// Initialize Database
async function initDb() {
  console.log('[db] Initializing tables...');
  
  // Existing tables
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      pr_number INT,
      pr_url TEXT,
      model TEXT,
      tokens_in INT DEFAULT 0,
      tokens_out INT DEFAULT 0,
      cost NUMERIC(10,4) DEFAULT 0,
      outcome TEXT DEFAULT 'pending',
      summary TEXT,
      tokens_saved INT DEFAULT 0,
      pod_id INT
    );
  `);
  
  // Pod system tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pods (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      focus TEXT NOT NULL,
      llm_provider TEXT NOT NULL DEFAULT 'openai',
      credits_balance NUMERIC DEFAULT 100,
      daily_budget NUMERIC DEFAULT 3.0,
      total_revenue NUMERIC DEFAULT 0,
      total_costs NUMERIC DEFAULT 0,
      total_builds INT DEFAULT 0,
      successful_merges INT DEFAULT 0,
      ethics_score NUMERIC DEFAULT 10.0,
      last_nudge TEXT,
      status TEXT DEFAULT 'active',
      context_memory JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS capsule_ideas (
      id SERIAL PRIMARY KEY,
      pod_id INT REFERENCES pods(id),
      title TEXT NOT NULL,
      content JSONB NOT NULL,
      code TEXT,
      metrics JSONB,
      ethics_score NUMERIC DEFAULT 10.0,
      exclusive_until TIMESTAMPTZ,
      adoption_count INT DEFAULT 0,
      shared_to_capsule BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debug_metrics (
      id SERIAL PRIMARY KEY,
      tier TEXT NOT NULL,
      time_ms INT NOT NULL,
      fixed BOOLEAN DEFAULT FALSE,
      error_type TEXT,
      context JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  // Revenue tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT,
      email TEXT NOT NULL,
      plan TEXT NOT NULL,
      status TEXT DEFAULT 'trialing',
      phone_number TEXT,
      baseline_commission NUMERIC DEFAULT 0,
      current_commission NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      customer_id INT REFERENCES customers(id),
      name TEXT,
      personality_type TEXT,
      conviction_score NUMERIC DEFAULT 5.0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS performance_baselines (
      id SERIAL PRIMARY KEY,
      customer_id INT REFERENCES customers(id),
      baseline_commission NUMERIC NOT NULL,
      source TEXT NOT NULL,
      confidence NUMERIC DEFAULT 0.8,
      growth_adjusted BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  
  // Indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_build_pod ON build_metrics(pod_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_debug_tier ON debug_metrics(tier);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_capsule_exclusive ON capsule_ideas(exclusive_until);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_customers_stripe ON customers(stripe_customer_id);`);
  
  // Seed 2 pods if none exist
  const podCount = await pool.query('SELECT COUNT(*) FROM pods');
  if (Number(podCount.rows[0].count) === 0) {
    console.log('[db] Seeding 2 competitive pods...');
    await pool.query(`
      INSERT INTO pods (name, focus, llm_provider, daily_budget)
      VALUES 
        ('Alpha', 'system_building', 'openai', 3.0),
        ('Bravo', 'revenue_generation', 'openai', 2.0)
    `);
  }
  
  console.log('[db] ✅ Database ready');
}

initDb().catch(console.error);

// Pod Personas
const POD_PERSONAS = {
  alpha: {
    style: "fast_iteration",
    focus: "system_building",
    domains: ["infrastructure", "features", "automation", "api", "database"],
    risk_tolerance: "medium",
    nudge_template: "Build core infrastructure. Ship working code. Focus on: {focus_area}"
  },
  bravo: {
    style: "revenue_velocity", 
    focus: "revenue_generation",
    domains: ["landing_pages", "stripe", "billing", "marketing", "conversion"],
    risk_tolerance: "high",
    nudge_template: "Generate revenue. Build: landing pages, Stripe checkout, sales funnels. Focus on: {focus_area}"
  }
};

// Budget tracking
async function getTodaySpend() {
  const r = await pool.query(`
    SELECT COALESCE(SUM(cost), 0) as total
    FROM build_metrics
    WHERE created_at::date = CURRENT_DATE
  `);
  return Number(r.rows[0].total);
}

async function checkBudget() {
  const dailySpend = await getTodaySpend();
  return {
    daily_spent: dailySpend,
    daily_limit: MAX_DAILY_SPEND,
    daily_remaining: MAX_DAILY_SPEND - dailySpend,
    daily_exceeded: dailySpend >= MAX_DAILY_SPEND
  };
}

function trackCost(usage, model = "gpt-4o-mini", podId = null) {
  const prices = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 }
  };
  const price = prices[model] || prices["gpt-4o-mini"];
  const cost = ((usage?.prompt_tokens || 0) * price.input / 1000) +
               ((usage?.completion_tokens || 0) * price.output / 1000);
  
  if (podId) {
    pool.query('UPDATE pods SET total_costs = total_costs + $1 WHERE id = $2', [cost, podId])
      .catch(e => console.error('[cost] Failed to update pod:', e));
  }
  
  return cost;
}

// Helpers
function requireCommandKey(req, res, next) {
  const key = req.header("X-Command-Key") || req.query.key;
  if (!COMMAND_CENTER_KEY || key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function safeFetch(url, init = {}, retries = 3) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, init);
      if (r.ok) return r;
      const body = await r.text().catch(() => "");
      throw new Error(`HTTP ${r.status} ${url} ${body.slice(0, 200)}`);
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await sleep(300 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

// Critical operation wrapper with debug escalation
async function safeBuildOperation(operation, context, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`[safe-op] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (attempt === maxRetries || shouldEscalate(error, context)) {
        console.log('[safe-op] Escalating to tiered debug...');
        
        const debugResult = await debugWithEscalation(error, {
          ...context,
          attempt,
          during_build: true
        });
        
        if (debugResult.fixed && debugResult.retry) {
          console.log('[safe-op] Auto-healed, retrying...');
          continue;
        }
        
        if (debugResult.needs_human) {
          console.log('[safe-op] ⚠️ Human review needed');
          break;
        }
      }
      
      if (attempt < maxRetries) {
        await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 10000));
      }
    }
  }
  
  throw lastError;
}

// Debounce helpers
function readStampMs() {
  try { return Number(fs.readFileSync(STAMP_FILE, "utf8").trim() || "0"); } catch { return 0; }
}
function writeStampNow() {
  try { fs.writeFileSync(STAMP_FILE, String(Date.now()), "utf8"); } catch {}
}
function shouldBuild(minWindow = MIN_BUILD_INTERVAL_MINUTES) {
  const last = readStampMs();
  if (!last) return { allowed: true };
  const elapsed = (Date.now() - last) / 60000;
  if (elapsed < minWindow) return { 
    allowed: false, 
    waitMinutes: Math.max(0, Math.ceil(minWindow - elapsed)) 
  };
  return { allowed: true };
}

// ===== POD API ROUTES =====

app.get("/api/v1/pods", requireCommandKey, async (_req, res) => {
  try {
    const pods = await pool.query(`
      SELECT * FROM pods 
      ORDER BY total_revenue DESC, successful_merges DESC
    `);
    res.json({ ok: true, pods: pods.rows });
  } catch (e) {
    console.error('[pods]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/v1/pods/:id", requireCommandKey, async (req, res) => {
  try {
    const pod = await pool.query('SELECT * FROM pods WHERE id = $1', [req.params.id]);
    if (!pod.rows[0]) {
      return res.status(404).json({ ok: false, error: 'Pod not found' });
    }
    res.json({ ok: true, pod: pod.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/v1/pods/:id/nudge", requireCommandKey, async (req, res) => {
  try {
    const { directive } = req.body;
    if (!directive) {
      return res.status(400).json({ ok: false, error: 'Directive required' });
    }
    await pool.query('UPDATE pods SET last_nudge = $1 WHERE id = $2', [directive, req.params.id]);
    console.log(`[nudge] Pod ${req.params.id}: ${directive.slice(0, 60)}...`);
    res.json({ ok: true, directive_set: directive });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== CAPSULE API =====

app.post("/api/v1/capsule/ideas", requireCommandKey, async (req, res) => {
  try {
    const { pod_id, title, content, code, ethics_score = 10 } = req.body;
    
    if (!pod_id || !title || !content) {
      return res.status(400).json({ ok: false, error: 'pod_id, title, content required' });
    }
    
    if (ethics_score < 7.0) {
      return res.status(403).json({ ok: false, error: 'Ethics score too low' });
    }
    
    const exclusive_until = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await pool.query(`
      INSERT INTO capsule_ideas (pod_id, title, content, code, ethics_score, exclusive_until)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [pod_id, title, content, code || null, ethics_score, exclusive_until]);
    
    console.log(`[capsule] Pod ${pod_id} uploaded: ${title}`);
    res.json({ ok: true, exclusive_until });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/v1/capsule/ideas", requireCommandKey, async (req, res) => {
  try {
    const ideas = await pool.query(`
      SELECT * FROM capsule_ideas 
      WHERE exclusive_until < NOW()
      ORDER BY adoption_count DESC, created_at DESC 
      LIMIT 20
    `);
    res.json({ ok: true, ideas: ideas.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== DEBUG STATS =====

app.get("/api/v1/debug/stats", requireCommandKey, async (_req, res) => {
  try {
    const stats = await pool.query(`
      WITH tier_stats AS (
        SELECT 
          tier,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE fixed = true) as fixed_count,
          AVG(time_ms) as avg_time
        FROM debug_metrics
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY tier
      )
      SELECT * FROM tier_stats
    `);
    
    const result = {
      tier0_count: 0, tier0_success_rate: 0,
      tier1_count: 0, tier1_success_rate: 0,
      tier2_count: 0, tier2_success_rate: 0,
      tier3_count: 0, tier3_success_rate: 0,
      total_resolved: 0, avg_fix_time: 0
    };
    
    stats.rows.forEach(row => {
      const rate = row.total > 0 ? Math.round((row.fixed_count / row.total) * 100) : 0;
      if (row.tier === 'auto_heal') { result.tier0_count = row.total; result.tier0_success_rate = rate; }
      else if (row.tier === 'quick_debug') { result.tier1_count = row.total; result.tier1_success_rate = rate; }
      else if (row.tier === 'smart_debug') { result.tier2_count = row.total; result.tier2_success_rate = rate; }
      else if (row.tier === 'council_debug') { result.tier3_count = row.total; result.tier3_success_rate = rate; }
      result.total_resolved += row.fixed_count;
    });
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== BILLING ROUTES (INTEGRATED) =====

app.use("/api/v1/billing", billingRouter(pool));

// ===== CORE AUTOPILOT ROUTES =====

// Planner with ROI gating + Pod support
app.post("/api/v1/repair-self", async (req, res) => {
  if (!COMMAND_CENTER_KEY || req.query.key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ ok: false, error: "OPENAI_API_KEY missing" });
  }

  try {
    // Check budget
    const budget = await checkBudget();
    if (budget.daily_exceeded) {
      return res.json({
        ok: true,
        skip: true,
        reason: `Daily budget exceeded ($${budget.daily_spent.toFixed(2)} / $${budget.daily_limit})`
      });
    }

    // Get pod
    const podId = req.body.pod_id || req.query.pod_id || 1;
    const podRes = await pool.query('SELECT * FROM pods WHERE id = $1', [podId]);
    const pod = podRes.rows[0];
    
    if (!pod) {
      return res.status(404).json({ ok: false, error: 'Pod not found' });
    }

    const persona = POD_PERSONAS[pod.name.toLowerCase()] || POD_PERSONAS.alpha;
    const nudge = pod.last_nudge || persona.nudge_template.replace('{focus_area}', persona.domains[0]);

    console.log(`[repair-self] Pod ${pod.name} (${persona.focus}) building...`);

    // Build context
    let logs = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8") : "";
    if (logs.length > 8000) logs = await pruneLogContext(logs, 2000);

    const smartCtx = await buildSmartContext(__dirname, 2000);
    
    // Check Capsule for reusable solutions
    const capsuleSearch = await pool.query(`
      SELECT id, pod_id, title, content, code 
      FROM capsule_ideas 
      WHERE exclusive_until < NOW() 
      ORDER BY adoption_count DESC 
      LIMIT 5
    `);
    
    const capsuleContext = capsuleSearch.rows.length > 0
      ? `\n\n--- Capsule (Reusable Solutions) ---\n${capsuleSearch.rows.map(idea => 
          `[ID: ${idea.id}] ${idea.title} (adopted ${idea.adoption_count || 0}x)`
        ).join('\n')}`
      : '';

    const combinedContext = `${smartCtx.context}${capsuleContext}\n\n--- Recent Logs ---\n${logs.slice(-4000)}`;
    
    // ROI estimation
    const estimatorPrompt = `Analyze for next build:
${combinedContext.slice(0, 4000)}

Pod: ${pod.name}
Focus: ${persona.focus}
Domains: ${persona.domains.join(', ')}
Nudge: ${nudge}

CHECK CAPSULE FIRST: ${capsuleSearch.rows.length} reusable solutions available.

Return JSON:
{
  "should_build": true/false,
  "reuse_capsule_id": null or number,
  "estimated_value_usd": 0-10,
  "risk": "low|med|high",
  "reasoning": "1-2 sentences"
}`;

    const estimatorRes = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [{ role: "user", content: estimatorPrompt }],
        response_format: { type: "json_object" }
      })
    });

    const estimatorJson = await estimatorRes.json();
    const estimate = JSON.parse(estimatorJson.choices?.[0]?.message?.content || "{}");
    
    trackCost(estimatorJson.usage, "gpt-4o-mini", podId);

    console.log(`[ROI] ${pod.name} estimate:`, estimate);

    // Check reuse
    if (estimate.reuse_capsule_id) {
      const idea = capsuleSearch.rows.find(i => i.id === estimate.reuse_capsule_id);
      if (idea) {
        return res.json({
          ok: true,
          reuse: true,
          capsule_idea: idea,
          message: `Reuse Capsule idea #${idea.id}: "${idea.title}"`
        });
      }
    }

    // ROI gate
    const threshold = 0.30;
    if (!estimate.should_build || (estimate.estimated_value_usd || 0) < threshold) {
      return res.json({
        ok: true,
        skip: true,
        reason: `Low ROI (threshold: $${threshold})`,
        estimate
      });
    }

    // Full planning
    const useModel = estimate.risk === 'high' || persona.risk_tolerance === 'high' ? "gpt-4o" : "gpt-4o-mini";
    
    const system = `You are a senior engineer for Pod ${pod.name}.

Focus: ${persona.focus}
Domains: ${persona.domains.join(', ')}
Style: ${persona.style}

Propose 1-2 NEXT ACTIONS that advance ${persona.focus}.

CRITICAL: Write COMPLETE, production-ready code (no TODOs).

Return strict JSON:
{
  "summary": "one line description",
  "actions": [
    {
      "title": "feature name",
      "rationale": "why this helps ${persona.focus}",
      "risk": "low|med|high",
      "files": [
        {
          "path": "src/example.js",
          "type": "create|modify",
          "content": "COMPLETE FILE CONTENTS"
        }
      ]
    }
  ]
}`;

    const user = `Context:\n${combinedContext}\n\nNudge: ${nudge}\n\nBuild for: ${persona.focus}`;

    const planRes = await safeBuildOperation(
      async () => await safeFetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: useModel,
          temperature: 0.2,
          messages: [
            { role: "system", content: system }, 
            { role: "user", content: user }
          ],
          response_format: { type: "json_object" }
        })
      }),
      { action: 'planning', pod_id: podId, critical: true }
    );

    const planJson = await planRes.json();
    const plan = JSON.parse(planJson.choices?.[0]?.message?.content || "{}");

    trackCost(planJson.usage, useModel, podId);

    // Track build attempt
    await pool.query('UPDATE pods SET total_builds = total_builds + 1 WHERE id = $1', [podId]);

    res.json({ 
      ok: true, 
      plan, 
      estimate, 
      model_used: useModel,
      pod: pod.name
    });
  } catch (e) {
    console.error('[repair-self]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Apply plan
app.post("/api/v1/build/apply-plan", async (req, res) => {
  if (!COMMAND_CENTER_KEY || req.query.key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ ok: false, error: "GITHUB_TOKEN missing" });
  }

  try {
    const plan = req.body?.plan;
    const podId = req.body?.pod_id || 1;
    
    if (!plan?.actions?.length) {
      return res.status(400).json({ ok: false, error: "no_actions" });
    }

    const [owner, repo] = GITHUB_REPO.split("/");
    const main = GITHUB_DEFAULT_BRANCH;

    const gh = async (apiPath, init = {}) => {
      const r = await safeFetch(`https://api.github.com${apiPath}`, {
        ...init,
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "lifeos-builder",
          "Accept": "application/vnd.github+json",
          ...(init.headers || {})
        }
      });
      return r.json();
    };

    // Get main SHA
    const ref = await gh(`/repos/${owner}/${repo}/git/refs/heads/${main}`);
    const sha = ref.object.sha;

    // Create branch
    const branch = `auto/pod${podId}/${Date.now()}`;
    await gh(`/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha })
    });

    // Upload files
    for (const action of plan.actions) {
      for (const file of action.files || []) {
        if (!file.content) continue;
        
        const payload = {
          message: `auto: ${file.path} (pod ${podId})`,
          content: Buffer.from(file.content).toString("base64"),
          branch
        };

        await gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path)}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      }
    }

    // Create PR
    const pr = await gh(`/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: `auto/pod${podId}: ${plan.summary}`,
        head: branch,
        base: main,
        body: `## Pod ${podId} Build\n\n${plan.summary}\n\nActions:\n${plan.actions.map(a => `- ${a.title}`).join('\n')}`
      })
    });

    // Track successful PR
    await pool.query('UPDATE pods SET successful_merges = successful_merges + 1 WHERE id = $1', [podId]);

    console.log(`[apply-plan] Pod ${podId} created PR #${pr.number}`);

    res.json({ ok: true, pr });

  } catch (e) {
    console.error('[apply-plan]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Build trigger
app.post("/internal/autopilot/build-now", async (req, res) => {
  if (!COMMAND_CENTER_KEY || req.query.key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const force = req.query.force === "1";
    const podId = req.query.pod_id || req.body?.pod_id || 1;

    if (!force) {
      const check = shouldBuild();
      if (!check.allowed) {
        return res.json({ ok: true, skip: true, reason: `Wait ${check.waitMinutes} min` });
      }
    }

    writeStampNow();

    // Plan
    const planRes = await safeFetch(`${PUBLIC_BASE_URL}/api/v1/repair-self?key=${COMMAND_CENTER_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pod_id: podId })
    });

    const planData = await planRes.json();
    
    if (planData.skip || planData.reuse || !planData.plan) {
      return res.json({ ok: true, skip: true, reason: planData.reason || 'No plan' });
    }

    // Apply
    const applyRes = await safeFetch(`${PUBLIC_BASE_URL}/api/v1/build/apply-plan?key=${COMMAND_CENTER_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: planData.plan,
        pod_id: podId
      })
    });

    const applyData = await applyRes.json();

    res.json({
      ok: true,
      plan: planData.plan,
      pr: applyData.pr,
      pod: planData.pod
    });

  } catch (e) {
    console.error('[build-now]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ===== HEALTH & METRICS =====

app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json({ 
      status: "healthy", 
      database: "connected", 
      timestamp: r.rows[0].now,
      version: "v7-billing-integrated"
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

app.get("/api/v1/budget/status", requireCommandKey, async (_req, res) => {
  const budget = await checkBudget();
  res.json(budget);
});

app.get("/api/v1/metrics/summary", requireCommandKey, async (_req, res) => {
  try {
    const total = await pool.query(`
      SELECT 
        COALESCE(SUM(cost), 0) as total_cost,
        COUNT(*)::int as build_count
      FROM build_metrics
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);

    res.json({
      total_cost: total.rows[0].total_cost,
      build_count: total.rows[0].build_count
    });
  } catch (e) {
    res.status(500).json({ error: "metrics_failed" });
  }
});

// ===== ADMIN & EXISTING ROUTES =====

app.use("/api/v1/admin", requireCommandKey, adminRouter);

app.get("/overlay/:sid", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/index.html"));
});

app.get("/pods-dashboard", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/pods-dashboard.html"));
});

// ===== SERVER START =====

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 LIFEOS - 2-POD AUTONOMOUS SYSTEM + REVENUE           ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                               ║
║  Version: v7-billing-integrated                           ║
║  Pods: 2 (Alpha: System, Bravo: Revenue)                 ║
║  Budget: ${MAX_DAILY_SPEND}/day                                        ║
║  Dashboard: /pods-dashboard?key=YOUR_KEY                  ║
║  Revenue: /sales-coaching.html (LIVE!)                    ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default server;
