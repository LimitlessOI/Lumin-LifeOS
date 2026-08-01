/**
 * SYNOPSIS: Run every active product through the Creative Director lens and emit a CREATIVE_BRIEF.md.
 * @ssot docs/products/creative-engine/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLens, buildLensPrompt, selectModelMemberForLens } from '../services/cognitive-chair.mjs';
import { createCouncilService } from '../services/council-service.js';
import { createCouncilMembers, COUNCIL_ALIAS_MAP } from '../config/council-members.js';
import { createDbPool } from '../services/db.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REGISTRY_PATH = path.join(ROOT, 'docs/products/PRODUCT_REGISTRY.json');
const ACTIVE_STATUSES = new Set(['ACTIVE_PRODUCT_HOME', 'SHARED_PLATFORM_MODULE', 'PARTIAL_CODE_PRESENT']);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function createCallModel() {
  const validatedDatabaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
  const pool = validatedDatabaseUrl ? createDbPool({ validatedDatabaseUrl, DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED }) : null;
  const members = createCouncilMembers({ DEEPSEEK_BRIDGE_ENABLED: process.env.DEEPSEEK_BRIDGE_ENABLED });
  const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || process.env.BUILDEROS_MAX_DAILY_SPEND || 0);

  const service = createCouncilService({
    pool,
    COUNCIL_MEMBERS: members,
    COUNCIL_ALIAS_MAP,
    MAX_DAILY_SPEND,
    COST_SHUTDOWN_THRESHOLD: 0,
    NODE_ENV: process.env.NODE_ENV || 'production',
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'local',
    COUNCIL_TIMEOUT_MS: 120000,
    COUNCIL_PING_TIMEOUT_MS: 10000,
    getOpenSourceCouncil: () => null,
    providerCooldowns: null,
    getSourceOfTruthManager: () => null,
    updateROI: () => {},
    trackAIPerformance: async () => {},
    notifyCriticalIssue: async () => {},
  });

  const callModel = async ({ member, prompt, options = {} }) => {
    const result = await service.callCouncilMember(member, prompt, { ...options, returnObject: true });
    return typeof result === 'string' ? result : (result?.text || result?.content || JSON.stringify(result));
  };

  return { callModel, pool };
}

function readProductHome(productId) {
  const p = path.join(ROOT, 'docs/products', productId, 'PRODUCT_HOME.md');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function extractYStatement(home) {
  const m = home.match(/\*\*Y-STATEMENT:\*\*([^\n]+)/);
  return m ? m[1].trim() : '';
}

function summarizeHome(home, maxChars = 3000) {
  const cleaned = home
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\|[^\n]*\|/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars)}...` : cleaned;
}

function buildCreativeMission(productId, name, home) {
  const y = extractYStatement(home) || 'No Y-statement found.';
  const summary = summarizeHome(home);
  return `Product: ${name} (${productId})

Y-statement: ${y}

Product context:
${summary}

Act as the Creative Director. Produce a concise creative brief in markdown with these sections:
1. One-sentence promise (what the customer becomes)
2. Tagline options (3)
3. Key messages (3-5 bullets)
4. Visual direction (color, tone, imagery)
5. Content formats recommended (short video, graphic, landing page, email, etc.)
6. Launch narrative arc (hook → proof → call to action)
7. Creative asset backlog (prioritized list of concrete assets to produce)
8. Confidence (high/medium/low) and the biggest unknown that would sharpen the brief

Keep it grounded in the product context. Do not invent features not mentioned. Use plain markdown, no theatrics.`;
}

function scaffoldBrief(productId, name, home) {
  const y = extractYStatement(home) || 'No Y-statement found.';
  return `# Creative Brief — ${name}

**Product:** ${productId}  
**Y-statement:** ${y}  
**Status:** AI generation gated (no model response); deterministic scaffold below.

## 1. One-sentence promise
From the product home: ${y}

## 2. Tagline options
- (pending model generation)
- (pending model generation)
- (pending model generation)

## 3. Key messages
- (pending model generation)

## 4. Visual direction
- (pending model generation)

## 5. Content formats recommended
- (pending model generation)

## 6. Launch narrative arc
- (pending model generation)

## 7. Creative asset backlog
- (pending model generation)

## 8. Confidence and biggest unknown
- Confidence: low (model not called)
- Biggest unknown: model availability/cost for full creative synthesis
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const execute = args.execute === true || args.execute === 'true';
  const productFilter = (args.product || '').split(',').map((s) => s.trim()).filter(Boolean);

  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('PRODUCT_REGISTRY.json not found');
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  let products = registry.products.filter((p) => ACTIVE_STATUSES.has(p.status) && fs.existsSync(path.join(ROOT, 'docs/products', p.product_id, 'PRODUCT_HOME.md')));
  if (productFilter.length) {
    products = products.filter((p) => productFilter.includes(p.product_id));
  }

  let callModel = null;
  let pool = null;
  if (execute) {
    const created = createCallModel();
    callModel = created.callModel;
    pool = created.pool;
  }

  const lens = loadLens('creative-director', ROOT);
  const member = selectModelMemberForLens(lens, 'creative');
  const promptWrapper = (mission, context) => buildLensPrompt({ lens, responsibility: 'creative', mission, context });

  const results = [];
  for (const product of products) {
    const home = readProductHome(product.product_id);
    if (!home) {
      results.push({ product_id: product.product_id, status: 'no_home' });
      continue;
    }

    const mission = buildCreativeMission(product.product_id, product.name, home);
    let brief;
    let modelCalled = false;
    let error = null;

    if (callModel) {
      const prompt = promptWrapper(mission, { product_id: product.product_id, name: product.name, source: 'PRODUCT_HOME.md' });
      try {
        brief = await callModel({ member, prompt, options: { maxOutputTokens: 2500, temperature: 0.7 } });
        modelCalled = true;
      } catch (e) {
        error = e.message;
        brief = scaffoldBrief(product.product_id, product.name, home);
      }
    } else {
      brief = scaffoldBrief(product.product_id, product.name, home);
    }

    const outPath = path.join(ROOT, 'docs/products', product.product_id, 'CREATIVE_BRIEF.md');
    fs.writeFileSync(outPath, brief + '\n');

    // Update product home with a minimal receipt row if it has a Change Receipts table
    const homePath = path.join(ROOT, 'docs/products', product.product_id, 'PRODUCT_HOME.md');
    const homeText = fs.readFileSync(homePath, 'utf8');
    if (homeText.includes('## Change Receipts') && homeText.includes('| Date |')) {
      const date = new Date().toISOString().split('T')[0];
      const row = `| ${date} | **Creative Director review** — generated ${outPath.split('/').pop()} (${modelCalled ? 'model-generated' : 'scaffold'}). | ${product.name} reviewed through the Creative Director lens; brief written to product home for founder review. | ${modelCalled ? '✅ generated' : '⛔ model gated'} |\n`;
      const updated = homeText.replace('## Change Receipts\n\n', `## Change Receipts\n\n${row}`);
      fs.writeFileSync(homePath, updated);
    }

    results.push({
      product_id: product.product_id,
      name: product.name,
      status: modelCalled ? 'generated' : 'scaffold',
      error,
      outPath,
      member,
    });
    console.log(`${product.product_id}: ${modelCalled ? 'generated' : 'scaffold'}${error ? ` (error: ${error})` : ''}`);
  }

  if (pool) {
    try { await pool.end(); } catch { /* ignore */ }
  }

  const out = { ran: results.length, generated: results.filter((r) => r.status === 'generated').length, scaffold: results.filter((r) => r.status === 'scaffold').length, errors: results.filter((r) => r.error).length, results };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
