/**
 * AUTO-BUILDER - Anti-Hallucination Edition
 * ONE product at a time. Validate everything. Never deploy garbage.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { routeTask } from './model-router.js';
import { validateResponse, extractCode } from './validators.js';
import { createDbPool } from '../services/db.js';
import { loadRuntimeEnv } from '../config/runtime-env.js';
import { createDeploymentService } from '../services/deployment-service.js';
import { createWebSearchService } from '../services/web-search-service.js';
import { createDesignQualityGate } from '../services/design-quality-gate.js';
import { createBuildCritic } from '../services/build-critic.js';

const BRAND_PATH = path.join(process.cwd(), 'docs', 'brand.md');
const PREFS_PATH = path.join(process.cwd(), 'data', 'adam-preferences.json');

async function loadBrandContext() {
  try {
    const brand = await fs.readFile(BRAND_PATH, 'utf-8');
    const prefs = JSON.parse(await fs.readFile(PREFS_PATH, 'utf-8'));
    return { brand, prefs };
  } catch {
    return { brand: '', prefs: {} };
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_ROOT = path.join(process.cwd(), 'docs', 'THREAD_REALITY', 'outputs');
const LATEST_RUN_DOC = path.join(process.cwd(), 'docs', 'THREAD_REALITY', 'latest-run.json');
const LATEST_RUN_ROOT = path.join(process.cwd(), 'latest-run.json');
const PROTECTED_COMPOSITION_ROOT = 'server.js';
const ROUTE_REGISTRAR_FILE = 'startup/register-routes.js';
const BOOT_DOMAINS_FILE = 'startup/boot-domains.js';
const SCHEDULER_REGISTRAR_FILE = 'startup/register-schedulers.js';

let validatedDatabaseUrl;
let DB_SSL_REJECT_UNAUTHORIZED;
let STRIPE_SECRET_KEY;
let GITHUB_TOKEN;
let GITHUB_REPO;
try {
  const RUNTIME_ENV = loadRuntimeEnv();
  validatedDatabaseUrl = RUNTIME_ENV.validatedDatabaseUrl;
  DB_SSL_REJECT_UNAUTHORIZED = RUNTIME_ENV.DB_SSL_REJECT_UNAUTHORIZED;
  STRIPE_SECRET_KEY = RUNTIME_ENV.STRIPE_SECRET_KEY;
} catch (error) {
  validatedDatabaseUrl = null;
  DB_SSL_REJECT_UNAUTHORIZED = undefined;
  console.warn(`[AUTO-BUILDER] Runtime env unavailable (receipts disabled): ${error.message}`);
}
GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
GITHUB_REPO = process.env.GITHUB_REPO || null;
let receiptPool;
const DEFAULT_ROUTE_TASK = routeTask;
const DEFAULT_VALIDATE_RESPONSE = validateResponse;
const DEFAULT_EXTRACT_CODE = extractCode;
let routeTaskImpl = DEFAULT_ROUTE_TASK;
let validateResponseImpl = DEFAULT_VALIDATE_RESPONSE;
let extractCodeImpl = DEFAULT_EXTRACT_CODE;

function getReceiptPool() {
  if (!validatedDatabaseUrl) return null;
  if (receiptPool) return receiptPool;
  try {
    receiptPool = createDbPool({
      validatedDatabaseUrl,
      DB_SSL_REJECT_UNAUTHORIZED,
    });
    return receiptPool;
  } catch (error) {
    console.warn(`[AUTO-BUILDER] Unable to create receipt pool: ${error.message}`);
    receiptPool = null;
    return null;
  }
}

async function recordBuildArtifact(product, component) {
  const pool = getReceiptPool();
  if (!pool) {
    console.warn('[AUTO-BUILDER] Receipts disabled: no DB pool');
    return;
  }

  const timestamp = new Date();
  const payload = {
    product_id: product.id,
    product_name: product.name,
    component_id: component.id,
    component_name: component.name,
    file: component.file,
    type: component.type,
    success: component.status === 'complete',
    timestamp: timestamp.toISOString(),
  };

  try {
    await pool.query(
      `INSERT INTO build_artifacts (opportunity_id, build_type, files, status, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        product.id,
        'auto_builder',
        JSON.stringify(payload),
        'generated',
        timestamp.toISOString(),
      ]
    );
  } catch (error) {
    console.warn(`[AUTO-BUILDER] Build receipt insert failed: ${error.message}`);
  }
}

const PRODUCT_DEFINITIONS = [
  {
    id: 'api_cost_savings',
    name: 'API Cost Savings Service',
    description: 'OpenAI-compatible API routing through free local models',
    components: [
      {
        id: 'landing',
        name: 'Landing Page',
        file: 'products/api-service/index.html',
        type: 'html',
        status: 'pending',
        prompt: `Create a complete HTML landing page for an API Cost Savings Service.

REQUIREMENTS:
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Hero section with headline "Cut Your AI API Costs by 90%"
- Three-step "How it works" section
- Pricing cards: Starter $49/mo (10K requests), Pro $99/mo (50K requests), Enterprise $299/mo (unlimited)
- Each pricing card has a button linking to /api/checkout?plan=starter (or pro/enterprise)
- Professional dark theme
- Mobile responsive

OUTPUT ONLY VALID HTML. No explanation. Start with <!DOCTYPE html>`
      },
      {
        id: 'chat_endpoint',
        name: 'Chat Completions API',
        file: 'products/api-service/routes/chat.js',
        type: 'js',
        status: 'pending',
        prompt: `Create an Express.js router for OpenAI-compatible chat completions.

REQUIREMENTS:
- Export an Express router
- POST /v1/chat/completions endpoint
- Extract Bearer token from Authorization header
- Accept body: { model, messages, temperature, max_tokens }
- Call Ollama at http://localhost:11434/api/generate
- Convert Ollama response to OpenAI format with id, object, created, model, choices array
- Handle errors with proper status codes

OUTPUT ONLY VALID JAVASCRIPT. No explanation. No markdown.

Start the file with:
import express from 'express';
const router = express.Router();`
      },
      {
        id: 'checkout',
        name: 'Stripe Checkout',
        file: 'products/api-service/routes/checkout.js',
        type: 'js',
        status: 'pending',
        prompt: `Create an Express.js router for Stripe checkout.

REQUIREMENTS:
- Export an Express router
- GET /checkout endpoint
- Read plan from query param: req.query.plan (starter, pro, or enterprise)
- Use stripe from import('stripe')(process.env.STRIPE_SECRET_KEY)
- Create checkout session with mode: 'subscription'
- Price IDs from env: STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_ENTERPRISE
- Success URL: process.env.BASE_URL + '/success'
- Cancel URL: process.env.BASE_URL + '/'
- Redirect to session.url

OUTPUT ONLY VALID JAVASCRIPT. No explanation. No markdown.

Start the file with:
import express from 'express';
const router = express.Router();`
      }
    ]
  }
];

function slugifyFeatureName(...inputs) {
  const cleaned = inputs
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const tokens = cleaned
    .split('-')
    .filter(Boolean)
    .filter((token) => ![
      'add', 'create', 'build', 'new', 'feature', 'endpoint', 'route', 'api',
      'service', 'for', 'the', 'a', 'an', 'to', 'of', 'and', 'with', 'called',
    ].includes(token));

  return tokens.slice(0, 4).join('-') || 'generated-feature';
}

function normalizeGeneratedPath(filePath = '') {
  return String(filePath || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

function inferComponentTargetPath(component, product) {
  const currentPath = normalizeGeneratedPath(component.file);
  if (currentPath && currentPath !== PROTECTED_COMPOSITION_ROOT) {
    return currentPath;
  }

  const slug = slugifyFeatureName(
    component.name,
    product?.name,
    product?.id,
    component.prompt,
  );
  const promptText = `${component.name || ''} ${component.prompt || ''}`.toLowerCase();

  if (/(cron|scheduler|interval|background job|reminder)/.test(promptText)) {
    return SCHEDULER_REGISTRAR_FILE;
  }

  if (/(boot|startup|initialize|initialise|on startup)/.test(promptText)) {
    return BOOT_DOMAINS_FILE;
  }

  if (/(endpoint|api|route)/.test(promptText)) {
    return `routes/${slug}-routes.js`;
  }

  return `services/${slug}.js`;
}

function normalizeComponent(component, product) {
  const targetPath = inferComponentTargetPath(component, product);
  if (targetPath !== normalizeGeneratedPath(component.file)) {
    console.log(`⚠️ [AUTO-BUILDER] Rerouting protected target ${component.file} -> ${targetPath}`);
  }

  return {
    ...component,
    file: targetPath,
  };
}

function normalizeProductDefinition(definition) {
  return {
    ...definition,
    components: definition.components.map((component) => normalizeComponent(component, definition)),
  };
}

function buildArchitecturePrompt(component) {
  return `\n\nARCHITECTURE RULES:
- NEVER write to ${PROTECTED_COMPOSITION_ROOT}.
- New HTTP endpoints must go in routes/<feature>-routes.js.
- New service logic must go in services/<feature>.js.
- New boot/startup logic must go in ${BOOT_DOMAINS_FILE}.
- New cron/scheduler logic must go in ${SCHEDULER_REGISTRAR_FILE}.
- If a route must be mounted, update ${ROUTE_REGISTRAR_FILE} instead of ${PROTECTED_COMPOSITION_ROOT}.
- Target file for this component: ${normalizeGeneratedPath(component.file)}\n`;
}

function cloneProductDefinitions() {
  return PRODUCT_DEFINITIONS.map((product) => ({
    ...normalizeProductDefinition(product),
  }));
}

let PRODUCT_QUEUE = cloneProductDefinitions();

let currentProductIndex = 0;
let cycleLock = false;

// ─── DB Persistence ──────────────────────────────────────────────────────────
let _persistPool = null;

/**
 * Call this once at server startup with the pg pool.
 * Enables queue persistence so in-flight products survive restarts.
 */
export function initPersistence(pool) {
  _persistPool = pool;
}

async function persistQueuedProduct(product) {
  if (!_persistPool) return;
  try {
    await _persistPool.query(
      `INSERT INTO builder_queue (id, product_name, definition, status, idea_id)
       VALUES ($1, $2, $3, 'queued', $4)
       ON CONFLICT (id) DO UPDATE
         SET definition = EXCLUDED.definition,
             status = 'queued',
             updated_at = NOW()`,
      [product.id, product.name, JSON.stringify(product), product.ideaId || null]
    );
  } catch (err) {
    console.warn(`[AUTO-BUILDER] Could not persist product ${product.id}: ${err.message}`);
  }
}

async function updatePersistedStatus(productId, status) {
  if (!_persistPool) return;
  try {
    await _persistPool.query(
      `UPDATE builder_queue SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, productId]
    );
  } catch (err) {
    console.warn(`[AUTO-BUILDER] Could not update builder_queue status for ${productId}: ${err.message}`);
  }
}

/**
 * On startup: load all queued/in_progress products from DB back into PRODUCT_QUEUE.
 * Resets all component statuses to 'pending' so the cycle will retry them.
 */
export async function loadPersistedQueue(pool) {
  const p = pool || _persistPool;
  if (!p) return 0;
  try {
    const result = await p.query(
      `SELECT definition FROM builder_queue
       WHERE status IN ('queued', 'in_progress')
       ORDER BY created_at ASC`
    );
    let loaded = 0;
    for (const row of result.rows) {
      const def = typeof row.definition === 'string'
        ? JSON.parse(row.definition)
        : row.definition;

      // Reset all components to pending for retry
      def.components = def.components.map(c => ({
        ...c,
        status: 'pending',
        lastError: null,
      }));

      const normalizedDefinition = normalizeProductDefinition(def);
      const alreadyQueued = PRODUCT_QUEUE.some(p => p.id === normalizedDefinition.id);
      if (!alreadyQueued) {
        PRODUCT_QUEUE.push(normalizedDefinition);
        loaded++;
      }
    }
    if (loaded > 0) {
      console.log(`✅ [AUTO-BUILDER] Recovered ${loaded} product(s) from DB queue`);
    }
    return loaded;
  } catch (err) {
    console.warn(`[AUTO-BUILDER] Could not load persisted queue: ${err.message}`);
    return 0;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Dynamic queue injection ─────────────────────────────────────────────────
/**
 * Add a new product definition to the build queue at runtime.
 * Called by the idea-queue route when Adam triggers a build.
 *
 * @param {object} definition  Same shape as PRODUCT_DEFINITIONS entries:
 *   { id, name, description, components: [{id, name, file, type, prompt, ssotSpec?}] }
 *
 * ssotSpec (optional per component): paste the relevant SSOT Amendment section.
 * The build critic will validate the generated code against it before shipping.
 */
export function addProductToQueue(definition) {
  if (!definition || !definition.id || !Array.isArray(definition.components)) {
    throw new Error('addProductToQueue: definition must have id and components[]');
  }

  // Prevent duplicate queuing
  const alreadyQueued = PRODUCT_QUEUE.some(p => p.id === definition.id);
  if (alreadyQueued) {
    console.log(`⚠️ [AUTO-BUILDER] Product already in queue: ${definition.id}`);
    return false;
  }

  const product = normalizeProductDefinition({
    ...definition,
    components: definition.components.map(c => ({
      ...c,
      status: c.status || 'pending',
      lastError: null,
    })),
  });

  PRODUCT_QUEUE.push(product);
  console.log(`✅ [AUTO-BUILDER] Queued product: ${product.name} (${product.components.length} components)`);

  // Persist so the queue survives restarts (fire-and-forget)
  persistQueuedProduct(product).catch(err =>
    console.warn(`[AUTO-BUILDER] Queue persist warning: ${err.message}`)
  );

  return true;
}
// ─────────────────────────────────────────────────────────────────────────────
let lastCycleFailureAt = 0;
let schedulerTimeoutHandle = null;
let schedulerIntervalHandle = null;
const DEFAULT_SCHEDULER_INTERVAL = 60000;
const DEFAULT_INITIAL_DELAY = 15000;
const BACKOFF_WINDOW_MS = 60000;

function resetProductQueue() {
  PRODUCT_QUEUE = cloneProductDefinitions();
  currentProductIndex = 0;
}

function getCurrentProduct() {
  return PRODUCT_QUEUE[currentProductIndex] || null;
}

function hasOutstandingWork(product) {
  if (!product) return false;
  return product.components.some((component) => component.status !== 'complete');
}

function getPendingComponent(product) {
  return product?.components.find((component) => component.status === 'pending') || null;
}

function getBlockedComponents(product) {
  if (!product) return [];
  return product.components
    .filter((component) => component.status === 'blocked')
    .map((component) => ({
      name: component.name,
      file: component.file,
      reason: component.lastError || 'blocked',
    }));
}

function isInBackoff() {
  if (!lastCycleFailureAt) return false;
  return Date.now() - lastCycleFailureAt < BACKOFF_WINDOW_MS;
}

function applyStripeGate(product) {
  if (STRIPE_SECRET_KEY) return;
  const checkout = product.components.find((component) => component.id === 'checkout');
  if (checkout && checkout.status === 'pending') {
    checkout.status = 'blocked';
    checkout.lastError = 'Missing STRIPE_SECRET_KEY';
    console.log('⚠️ [AUTO-BUILDER] Stripe checkout blocked: STRIPE_SECRET_KEY not configured');
  }
}

async function buildComponentResult(product, component) {
  console.log(`\n📦 Building: ${component.name}`);
  console.log(`📄 File: ${component.file}`);
  const result = await buildComponent(component, 3, product);
  if (result.success) {
    component.status = 'complete';
    component.lastError = null;
    console.log(`✅ ${component.name} COMPLETE`);
    await recordBuildArtifact(product, component);
    lastCycleFailureAt = 0;
    return { success: true, componentName: component.name, productName: product.name };
  }
  component.status = 'failed';
  component.lastError = result.error || 'unknown error';
  lastCycleFailureAt = Date.now();
  console.log(`❌ ${component.name} FAILED: ${component.lastError}`);
  return {
    success: false,
    error: component.lastError,
    componentName: component.name,
    productName: product.name,
  };
}

export async function runBuildCycle() {
  const product = getCurrentProduct();
  if (!product) {
    console.log('🎉 [AUTO-BUILDER] All products complete!');
    return { success: true, productComplete: true };
  }

  if (cycleLock) {
    console.log('⏳ [AUTO-BUILDER] Cycle already running');
    return { skipped: true };
  }

  let pendingComponent;
  try {
    cycleLock = true;
    console.log('\n' + '='.repeat(60));
    console.log('🔨 [AUTO-BUILDER] Starting build cycle');
    console.log('='.repeat(60));
    console.log(`\n🎯 Product: ${product.name}`);
    for (const comp of product.components) {
      const icon = comp.status === 'complete' ? '✅' : comp.status === 'failed' ? '❌' : '⏳';
      console.log(`   ${icon} ${comp.name}`);
    }

    applyStripeGate(product);
    pendingComponent = getPendingComponent(product);

    if (!pendingComponent) {
      if (!hasOutstandingWork(product)) {
        console.log(`\n✅ ${product.name} complete!`);
        currentProductIndex++;
        updatePersistedStatus(product.id, 'complete').catch(() => {});
        return { success: true, productComplete: true };
      }

      // Detect fully stuck: every component is failed or blocked — nothing left to try
      const allStuck = product.components.every(c =>
        ['failed', 'blocked', 'complete'].includes(c.status)
      );
      if (allStuck) {
        const failedNames = product.components
          .filter(c => c.status !== 'complete')
          .map(c => `${c.name} (${c.lastError || c.status})`)
          .join(', ');
        console.log(`\n🚨 [AUTO-BUILDER] Product STUCK — all components failed/blocked`);
        console.log(`   Product: ${product.name}`);
        console.log(`   Stuck components: ${failedNames}`);
        currentProductIndex++;
        updatePersistedStatus(product.id, 'stuck').catch(() => {});
        return { success: false, stuck: true, productName: product.name, reason: failedNames };
      }

      console.log(`\n⚠️ No pending components for ${product.name}; waiting on blocked components`);
      return { success: true, blocked: true, productName: product.name };
    }

    updatePersistedStatus(product.id, 'in_progress').catch(() => {});
    return await buildComponentResult(product, pendingComponent);
  } finally {
    cycleLock = false;
  }
}

async function buildComponent(component, maxRetries = 3, product = null) {
  let lastError = null;

  // ── Load brand context + run research before first attempt ─────────────────
  const { brand, prefs } = await loadBrandContext();

  // Build AI helper for search/quality (uses the overridden routeTaskImpl)
  const callAI = async (prompt) => routeTaskImpl('code_generation', prompt);

  // Research: only for visual components (html/css), skip for API routes
  let researchBrief = '';
  if (['html', 'css'].includes(component.type) && product) {
    try {
      const searchService = createWebSearchService({
        BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
        PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
        callAI,
      });
      const brief = await searchService.researchFeature(
        product.name || 'web product',
        product.description || component.name,
        component.type === 'html' ? 'landing_page' : 'web_component'
      );
      if (brief) {
        researchBrief = brief;
        console.log(`📚 [AUTO-BUILDER] Research brief loaded for ${component.name}`);
      }
    } catch (err) {
      console.warn(`[AUTO-BUILDER] Research failed (non-blocking): ${err.message}`);
    }
  }

  // Build enriched base prompt with brand + research context
  const brandBlock = brand
    ? `\n\n---\n## BRAND GUIDELINES (MUST FOLLOW)\n${brand.substring(0, 2000)}\n---\n`
    : '';

  const prefBlock = prefs.design?.dislikes?.length
    ? `\n\n## DESIGN PREFERENCES\nAVOID: ${prefs.design.dislikes.join(', ')}\nUSE: ${(prefs.design.likes || []).join(', ')}\n`
    : '';

  const researchBlock = researchBrief
    ? `\n\n## UX RESEARCH\n${researchBrief.substring(0, 1500)}\n`
    : '';

  const visionBlock = product?.vision
    ? `\n\n## VISION\nTarget audience: ${product.vision.target_audience || 'general users'}\nDesign notes: ${product.vision.design_notes || 'none'}\nReference: ${product.vision.reference_url || 'none'}\nAcceptance criteria: ${product.vision.acceptance_criteria || 'none'}\n`
    : '';

  const routingBlock = buildArchitecturePrompt(component);
  const enrichedBasePrompt = `${component.prompt}${routingBlock}${brandBlock}${prefBlock}${researchBlock}${visionBlock}`;

  // Quality gate (for visual components only)
  // Use a different model for critique to avoid "grading its own homework"
  // code_generation → deepseek-coder (builder), code_review → primary/qwen (critic)
  const callCritic     = async (prompt) => routeTaskImpl('code_review', prompt);
  const callValidator  = async (prompt) => routeTaskImpl('code_validation', prompt);
  const qualityGate = ['html', 'css'].includes(component.type)
    ? createDesignQualityGate({ callAI, callCritic })
    : null;

  // Build critic — runs on ALL file types. Builder writes, critic reads cold,
  // builder fixes, validator checks spec. Max 3 rounds per attempt.
  const buildCritic = createBuildCritic({ callAI, callCritic, callValidator });

  // Load SSOT spec for this component if available (optional — stored in component.ssotSpec)
  const ssotSpec = component.ssotSpec || null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${maxRetries}`);

    let prompt = enrichedBasePrompt;
    if (lastError && attempt > 1) {
      prompt = `PREVIOUS ATTEMPT FAILED:\n${lastError}\n\nFix this and try again.\n\n${enrichedBasePrompt}`;
    }

    try {
      console.log('🤖 Generating...');
      const response = await routeTaskImpl('code_generation', prompt);

      console.log('🔍 Validating...');
      const validation = await validateResponseImpl(response, component.type, component.file);

      if (!validation.passed) {
        lastError = validation.errors.join('; ');
        console.log(`⚠️ Validation failed: ${lastError}`);
        continue;
      }

      console.log('✂️ Extracting code...');
      let code = extractCodeImpl(response, component.type);

      if (code.length < 100) {
        lastError = 'Code too short (< 100 chars)';
        console.log(`⚠️ ${lastError}`);
        continue;
      }

      // ── Quality gate: check + auto-fix before saving ──────────────────────
      if (qualityGate) {
        console.log('🎨 Running design quality gate...');
        const gateResult = await qualityGate.checkAndFix(
          code,
          component.type,
          product?.description || component.name,
          product?.vision || {}
        );
        code = gateResult.code; // may be auto-fixed version

        if (gateResult.hadIssues) {
          console.log(`⚠️ [QUALITY-GATE] Shipped with warnings — review ${component.file}`);
        }
      }

      // ── Build critic loop: runs on ALL file types ──────────────────────────
      // Different models for builder vs critic vs validator = no homework grading.
      // Skipped on final attempt (attempt === maxRetries) to avoid infinite loops.
      if (attempt < maxRetries) {
        console.log('🔍 Running build critic loop...');
        try {
          const criticResult = await buildCritic.review(code, component, ssotSpec, 3);
          code = criticResult.code; // may be improved version

          if (!criticResult.passed) {
            // Log unresolved issues but don't block shipping — critic is advisory
            const criticalIssues = criticResult.issues.filter(i => i.severity === 'critical');
            if (criticalIssues.length > 0) {
              console.warn(`⚠️ [BUILD-CRITIC] ${criticalIssues.length} critical issue(s) unresolved in ${component.file}:`);
              for (const issue of criticalIssues) {
                console.warn(`   - ${issue.location}: ${issue.description}`);
              }
              // Treat as a soft failure — retry the whole attempt rather than shipping broken code
              if (criticalIssues.length >= 2) {
                lastError = `Build critic: ${criticalIssues.length} critical issues — ${criticalIssues.map(i => i.description).join('; ')}`;
                continue;
              }
            }
          } else {
            console.log(`✅ [BUILD-CRITIC] ${criticResult.summary}`);
          }
        } catch (criticErr) {
          // Critic failure is never blocking — ship original code
          console.warn(`⚠️ [BUILD-CRITIC] Review failed (non-blocking): ${criticErr.message}`);
        }
      }

      console.log('💾 Saving...');
      await saveFile(component.file, code);

      return { success: true, file: component.file };

    } catch (error) {
      lastError = error.message;
      console.log(`⚠️ Error: ${lastError}`);
    }
  }

  return { success: false, error: lastError };
}

async function saveFile(filepath, content) {
  const normalizedPath = normalizeGeneratedPath(filepath);
  if (normalizedPath === PROTECTED_COMPOSITION_ROOT) {
    throw new Error(`Refusing to write to protected composition root: ${PROTECTED_COMPOSITION_ROOT}`);
  }

  const fullPath = path.join(process.cwd(), normalizedPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');
  console.log(`💾 Saved: ${normalizedPath}`);
  await commitBuiltFile(normalizedPath, content);
}

async function commitBuiltFile(filepath, content) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.log(`⚠️ [AUTO-BUILDER] GITHUB_TOKEN/GITHUB_REPO not set — skipping git commit for ${filepath}`);
    return;
  }
  try {
    // noop pool/broadcast — deployment service only needs token+repo for commitToGitHub
    const { commitToGitHub } = createDeploymentService({
      pool: null,
      systemMetrics: { deploymentsTrigger: 0 },
      broadcastToAll: () => {},
      GITHUB_TOKEN,
      GITHUB_REPO,
      __dirname: process.cwd(),
    });
    await commitToGitHub(filepath, content, `[auto-builder] Build: ${filepath}`);
    console.log(`🚀 [AUTO-BUILDER] Committed to GitHub: ${filepath}`);
  } catch (err) {
    console.warn(`⚠️ [AUTO-BUILDER] GitHub commit failed for ${filepath}: ${err.message}`);
  }
}

function determineIdleReason(product) {
  if (!product) return null;
  if (isInBackoff()) return 'backoff_wait';
  if (product.components.some((c) => c.status === 'blocked')) return 'blocked_on_env';
  return 'no_runner_active';
}

async function runCycleWithArtifacts(triggerSource = 'manual') {
  const statusBefore = getStatus();
  const runDir = path.join(OUTPUT_ROOT, formatTimestampForPath());
  const startTime = new Date().toISOString();
  const result = await runBuildCycle();
  const statusAfter = getStatus();
  const endTime = new Date().toISOString();
  const pending = statusBefore.components.find((c) => c.status === 'pending');
  const summary = {
    trigger: triggerSource,
    start: startTime,
    end: endTime,
    component: result.componentName || pending?.name || null,
    file: pending?.file || null,
    product: result.productName || statusBefore.product || null,
    whatWasAttempted: `Auto-builder cycle (${triggerSource})`,
    result: result.success ? 'success' : 'failure',
    error: result.error || null
  };
  await writeCycleArtifacts(runDir, statusBefore, statusAfter, summary);
  const proofPaths = [
    path.relative(process.cwd(), path.join(runDir, 'status-before.json')),
    path.relative(process.cwd(), path.join(runDir, 'status-after.json')),
    path.relative(process.cwd(), path.join(runDir, 'cycle-log.txt'))
  ];
  await updateLatestRunRecord(
    runDir,
    summary,
    proofPaths,
    'UNVERIFIED',
    result.success ? '' : (result.error || 'cycle failed')
  );
  return result;
}

export function overrideBuildHelpers(helpers = {}) {
  const { routeTask: rt, validateResponse: vr, extractCode: ec } = helpers;
  if (rt) routeTaskImpl = rt;
  if (vr) validateResponseImpl = vr;
  if (ec) extractCodeImpl = ec;
}

export function resetBuildHelpers() {
  routeTaskImpl = DEFAULT_ROUTE_TASK;
  validateResponseImpl = DEFAULT_VALIDATE_RESPONSE;
  extractCodeImpl = DEFAULT_EXTRACT_CODE;
}

function formatTimestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureOutputDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeCycleArtifacts(runDir, statusBefore, statusAfter, summary) {
  await ensureOutputDir(runDir);
  await fs.writeFile(
    path.join(runDir, 'status-before.json'),
    JSON.stringify(statusBefore, null, 2)
  );
  await fs.writeFile(
    path.join(runDir, 'status-after.json'),
    JSON.stringify(statusAfter, null, 2)
  );
  await fs.writeFile(
    path.join(runDir, 'cycle-log.txt'),
    [`Cycle Summary (${summary.trigger})`, `Start: ${summary.start}`, `End: ${summary.end}`, `Component: ${summary.component || 'n/a'}`, `Result: ${summary.result}`, `Error: ${summary.error || 'none'}`].join('\n')
  );
}

async function updateLatestRunRecord(runDir, summary, proofPaths, result, blocker) {
  const record = {
    runId: path.basename(runDir),
    whatWasAttempted: summary.whatWasAttempted,
    result,
    proofPaths,
    runDir: path.relative(process.cwd(), runDir),
    blocker: blocker || ''
  };
  await fs.writeFile(LATEST_RUN_DOC, JSON.stringify(record, null, 2));
  await fs.writeFile(LATEST_RUN_ROOT, JSON.stringify(record, null, 2));
}

export function getStatus() {
  const product = PRODUCT_QUEUE[currentProductIndex];
  if (!product) return {
    status: 'all_complete',
    product: null,
    components: [],
    hasPending: false,
    buildInProgress: false,
    idleReason: null
  };

  const components = product.components.map(c => ({
    name: c.name,
    status: c.status,
    file: c.file,
    error: c.lastError || null
  }));
  const hasPending = product.components.some(c =>
    ['pending', 'blocked', 'failed'].includes(c.status)
  );
  const status = cycleLock ? 'running' : hasPending ? 'idle_pending' : 'complete';
  const idleReason = !cycleLock && hasPending ? determineIdleReason(product) : null;

  const blockedComponents = product.components
    .filter((c) => c.status === 'blocked')
    .map((c) => ({
      name: c.name,
      reason: c.lastError || 'blocked',
      file: c.file,
    }));

  return {
    status,
    product: product.name,
    components,
    hasPending,
    buildInProgress: cycleLock,
    idleReason,
    blockedComponents
  };
}

function shouldRunCycle(product) {
  if (!product) return false;
  return hasOutstandingWork(product);
}

async function runScheduledCycle() {
  const product = getCurrentProduct();
  if (!product) return;
  if (cycleLock) return;
  if (!shouldRunCycle(product)) return;
  if (isInBackoff()) {
    console.log('🕘 [AUTO-BUILDER][SCHEDULER] Backoff active - skipping cycle');
    return;
  }

  console.log('🕘 [AUTO-BUILDER][SCHEDULER] Triggered cycle');
  console.log(`   Product: ${product.name}`);
  const pendingComp = product.components.find(c => c.status === 'pending');
  if (pendingComp) {
    console.log(`   Pending component: ${pendingComp.name}`);
  }

  const result = await runCycleWithArtifacts('scheduler');
  if (result.skipped) {
    console.log('🕘 [AUTO-BUILDER][SCHEDULER] Cycle skipped (already running)');
    return;
  }

  if (result.success) {
    console.log('🕘 [AUTO-BUILDER][SCHEDULER] Cycle completed successfully');
  } else if (result.productComplete) {
    console.log('🕘 [AUTO-BUILDER][SCHEDULER] Product complete');
  } else {
    console.log(`🕘 [AUTO-BUILDER][SCHEDULER] Cycle result: ${result.success ? 'success' : 'failure'}${result.error ? ` - ${result.error}` : ''}`);
  }
}

function scheduleNextCycle(interval) {
  if (schedulerIntervalHandle) return;
  schedulerIntervalHandle = setInterval(async () => {
    try {
      await runScheduledCycle();
    } catch (error) {
      console.error('[AUTO-BUILDER][SCHEDULER] Interval cycle error:', error.message);
    }
  }, interval);
}

export function startBuildScheduler(options = {}) {
  const initialDelay = options.initialDelay ?? DEFAULT_INITIAL_DELAY;
  const interval = options.interval ?? DEFAULT_SCHEDULER_INTERVAL;

  if (schedulerTimeoutHandle || schedulerIntervalHandle) {
    console.log('🕘 [AUTO-BUILDER][SCHEDULER] Already scheduled');
    return;
  }

  schedulerTimeoutHandle = setTimeout(async () => {
    await runScheduledCycle();
    scheduleNextCycle(interval);
  }, initialDelay);

  console.log(`🕘 [AUTO-BUILDER][SCHEDULER] Scheduled first run in ${initialDelay}ms (interval ${interval}ms)`);
}

export function stopBuildScheduler() {
  if (schedulerTimeoutHandle) {
    clearTimeout(schedulerTimeoutHandle);
    schedulerTimeoutHandle = null;
  }
  if (schedulerIntervalHandle) {
    clearInterval(schedulerIntervalHandle);
    schedulerIntervalHandle = null;
  }
}

export function resetAllFailed() {
  let count = 0;
  for (const product of PRODUCT_QUEUE) {
    for (const comp of product.components) {
      if (comp.status === 'failed') {
        comp.status = 'pending';
        comp.lastError = null;
        count++;
      }
    }
  }
  return count;
}

export function resetComponent(componentId) {
  for (const product of PRODUCT_QUEUE) {
    const comp = product.components.find(c => c.id === componentId);
    if (comp) {
      comp.status = 'pending';
      comp.lastError = null;
      return true;
    }
  }
  return false;
}

export { PRODUCT_QUEUE };

export class AutoBuilder {
  constructor(pool, callCouncilMember, executionQueue, getCouncilConsensus) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.executionQueue = executionQueue;
    this.getCouncilConsensus = getCouncilConsensus;
  }

  async getStatus() {
    return getStatus();
  }

  async buildOpportunity(opportunity) {
    console.log(`🔨 [AUTO-BUILDER] buildOpportunity invoked for ${opportunity?.name || opportunity?.id || 'unknown'}`);
    return runBuildCycle();
  }
}

// Default export for convenience
export default {
  AutoBuilder,
  runBuildCycle,
  runCycleWithArtifacts,
  overrideBuildHelpers,
  resetBuildHelpers,
  getStatus,
  resetAllFailed,
  resetComponent,
  addProductToQueue,
  initPersistence,
  loadPersistedQueue,
  PRODUCT_QUEUE,
  startBuildScheduler,
  stopBuildScheduler
};
