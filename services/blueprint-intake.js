/**
 * SYNOPSIS: Blueprint Intake Service — three flows: backfill existing amendment, greenfield
 * conversation, and adjustment patch. Scans codebase patterns before generation so every import,
 * auth ref, and AI call matches reality. GAP_FLAG surfaces unknowns for founder conversation.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanCodebasePatterns } from './blueprint-codebase-scanner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Progressive trust: track AI success/failure per model per task type ──────
const _aiTrustLedger = new Map();

function recordAiOutcome(model, taskType, success, productName) {
  const key = `${model}::${taskType}`;
  if (!_aiTrustLedger.has(key)) {
    _aiTrustLedger.set(key, { successes: 0, failures: 0, lastFailProduct: null, lastSuccess: null });
  }
  const entry = _aiTrustLedger.get(key);
  if (success) {
    entry.successes++;
    entry.lastSuccess = new Date().toISOString();
  } else {
    entry.failures++;
    entry.lastFailProduct = productName;
  }
  const total = entry.successes + entry.failures;
  const rate = total > 0 ? Math.round((entry.successes / total) * 100) : 0;
  console.log(`[AI-TRUST] ${key} ${success ? 'OK' : 'FAIL'} product=${productName} rate=${rate}% (${entry.successes}/${total})`);
}

export function getAiTrustLedger() {
  const result = {};
  for (const [key, val] of _aiTrustLedger) result[key] = { ...val, rate: val.successes + val.failures > 0 ? Math.round((val.successes / (val.successes + val.failures)) * 100) : 0 };
  return result;
}

// ── Prompt templates ─────────────────────────────────────────────────────────

const INTENT_EXTRACT_SYSTEM = `You are BuilderOS ARC. Your job: read a product amendment document and extract structured build intent as JSON.

Return ONLY a valid JSON object — no markdown, no code fences, no commentary.

Required shape:
{
  "product_name": "string",
  "product_purpose": "one sentence",
  "phase": 1,
  "routes_needed": [{"method":"POST","path":"/api/v1/...","purpose":"...","auth":"requireKey|public","body_fields":["field:type"]}],
  "services_needed": [{"name":"file-stem-no-js","purpose":"...","ai_operations":["what AI does here, which model alias"]}],
  "db_tables_needed": [{"name":"...","columns":[{"name":"...","type":"TEXT|UUID|JSONB|TIMESTAMPTZ|INT|NUMERIC(3,2)","nullable":false,"default":"gen_random_uuid()|NOW()|[]|{}"}]}],
  "env_vars_needed": ["VAR_NAME"],
  "ai_operations": [{"name":"...","purpose":"...","alias":"claude|gemini|openai"}],
  "acceptance_criteria": ["human-readable test that proves it works"],
  "non_goals": ["what is explicitly NOT in this phase"],
  "html_files": [{"path":"public/overlay/name.html","purpose":"..."}],
  "scripts": [{"path":"scripts/verify-name.mjs","purpose":"acceptance test runner"}]
}

If a section is unclear or missing from the amendment: use the string "UNKNOWN" for that field's value.
Do NOT invent requirements. Only extract what is stated or clearly implied.`;

const BLUEPRINT_GEN_SYSTEM = (patterns) => {
  const slim = {
    installed_packages: patterns.installed_packages,
    not_installed: patterns.not_installed,
    route_factory: patterns.route_factory,
    auth_pattern: patterns.auth_pattern,
    ai_call_pattern: patterns.ai_call_pattern,
    db_pattern: patterns.db_pattern,
    registration_pattern: patterns.registration_pattern,
    existing_tables: (patterns.existing_tables || []).slice(0, 30),
    existing_services: (patterns.existing_services || []).slice(0, 30),
    existing_routes: (patterns.existing_routes || []).slice(0, 20),
    scanned_at: patterns.scanned_at,
  };
  return `You are BuilderOS ARC generating an EXECUTABLE blueprint JSON.

Each step must contain enough contract detail that execution is MECHANICAL — no design decisions left for the coder.

CODEBASE PATTERNS:
${JSON.stringify(slim)}

STEP CONTRACT FORMAT (every field required, no extras):
{"_meta":{"product":"...","phase":1,"parent_ssot":"...","blueprint_version":"1.0.0","build_rule":"ARC_CONTRACT","ssot_tag":"docs/products/PRODUCT/PRODUCT_HOME.md","acceptance_cmd":"node scripts/verify-PRODUCT.mjs"},"env":["ENV_VAR_NAME"],"steps":[...]}

Each step object:
{
  "id": "XXX-P1-001",
  "file": "db/migrations/YYYYMMDD_name.sql",
  "type": "sql",
  "purpose": "one sentence",
  "deps": [],
  "ssot_tag": "docs/products/PRODUCT/PRODUCT_HOME.md",
  "contract": {
    "exports": ["functionName"],
    "factory_signature": "export function createXxx({ pool, logger })",
    "endpoints": [{"method":"POST","path":"/api/v1/...","auth":"requireKey","body":["field:type"],"returns":"{ ok, data }"}],
    "tables": [{"name":"table_name","columns":["id UUID PRIMARY KEY DEFAULT gen_random_uuid()","owner_id TEXT NOT NULL","created_at TIMESTAMPTZ DEFAULT NOW()"]}],
    "ai_calls": [{"alias":"openai","purpose":"...","taskType":"general"}],
    "test_assertions": ["HTTP 200 on GET /api/v1/...", "row inserted in table_name"]
  }
}

The "contract" field makes execution mechanical:
- sql steps: "tables" array with exact column definitions
- esm service steps: "exports" + "factory_signature" (what the module provides)
- esm route steps: "endpoints" array with method/path/auth/body/returns
- esm_script steps: "test_assertions" array (what the verify script checks)
- html steps: no contract needed (static file)
- All steps with AI: "ai_calls" array

RULES:
1. id format: PRODUCT_ABBREV-P1-NNN (e.g. TC-P1-001 for TC Service)
2. type: sql | esm | esm_script | html — NEVER .md files as steps
3. esm_script is only for standalone .mjs acceptance scripts
4. deps: only step IDs defined earlier in steps[]
5. GAP_FLAG: only in purpose when truly unknown — NEVER in type field
6. purpose: one sentence, specific action (not vague)
7. contract: required for sql/esm/esm_script steps — this IS the executable spec
8. acceptance_cmd in _meta must be a real node command
9. ssot_tag must point to the actual product home, not AMENDMENT_XX.md
10. File paths NEVER start with src/ — this repo uses services/, routes/, scripts/, db/, public/ at the repo root

Return ONLY the compact JSON. No markdown, no fences, no commentary.`;
};

const GAP_CONVERSATION_SYSTEM = `You are Lumin (the BuilderOS Chair). A blueprint has gaps that need founder input to resolve.

Be direct and conversational. Ask one gap at a time. When the founder answers, confirm understanding before moving to the next gap.

Never ask for technical details Adam hasn't offered — frame gaps in plain product terms ("What should happen when X?").

When all gaps are answered, say exactly: "GAPS_RESOLVED" on a new line.`;

const ADJUSTMENT_SYSTEM = (existingBlueprint, patterns) => `You are BuilderOS ARC. The founder has requested an adjustment to an existing blueprint.

EXISTING BLUEPRINT:
${JSON.stringify(existingBlueprint, null, 2)}

CODEBASE PATTERNS:
${JSON.stringify(patterns)}

The founder's adjustment request will follow. Apply it precisely:
1. Only change what the founder described — do not refactor unrelated parts
2. If the adjustment requires a new step, add it with the next sequential id
3. If the adjustment removes a feature, remove its step and update deps arrays
4. If the adjustment changes a route, update only that route's behavior array
5. Flag any consequence that needs the founder's attention with: "CONSEQUENCE_FLAG: [description]"

Return the COMPLETE updated blueprint JSON — no partial updates, no diffs. Full object only.`;

// ── Gap detection ─────────────────────────────────────────────────────────────

function detectGaps(blueprintJson) {
  const text = JSON.stringify(blueprintJson);
  const gaps = [];
  const regex = /"GAP_FLAG:\s*([^"]+)"/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const context = text.slice(Math.max(0, match.index - 100), match.index + 100);
    const keyMatch = context.match(/"([^"]+)":\s*"GAP_FLAG:/);
    gaps.push({
      id: `gap_${gaps.length + 1}`,
      description: match[1].trim(),
      field_context: keyMatch ? keyMatch[1] : 'unknown_field',
      resolved: false,
      answer: null,
    });
  }
  for (const step of blueprintJson?.steps || []) {
    const file = String(step.file || '').toLowerCase();
    if (file.endsWith('.md')) {
      gaps.push({
        id: `gap_${gaps.length + 1}`,
        description: `${step.file} is documentation — not a build step`,
        field_context: 'file',
        resolved: false,
        answer: null,
      });
    }
  }
  return gaps;
}

function stripInvalidSteps(blueprint) {
  if (!Array.isArray(blueprint?.steps)) return blueprint;
  blueprint.steps = blueprint.steps.filter((s) => {
    const file = String(s.file || '').toLowerCase();
    const type = String(s.type || '');
    const purpose = String(s.purpose || '');
    if (file.endsWith('.md')) return false;
    if (type.includes('GAP_FLAG') || purpose.includes('GAP_FLAG')) return false;
    return Boolean(file);
  });
  return blueprint;
}

function founderRequestedPhase1Infra(gapAnswers) {
  const text = Object.values(gapAnswers || {}).join(' ').toLowerCase();
  return /phase 1|migration|service\.js|routes\.js|verify-|scaffold/.test(text);
}

function productFileSlug(productName) {
  return String(productName || 'product').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'product';
}

function productStepPrefix(productName) {
  const slug = productFileSlug(productName);
  if (slug.startsWith('socialmedia')) return 'SMS';
  return slug.slice(0, 3).toUpperCase() || 'PRD';
}

function scaffoldPhase1Steps({ productName, parentSsot }) {
  const slug = productFileSlug(productName);
  const prefix = productStepPrefix(productName);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const tag = parentSsot || 'docs/projects/AMENDMENT_XX.md';
  return [
    { id: `${prefix}-P1-001`, file: `db/migrations/${date}_${slug}_core.sql`, type: 'sql', purpose: `Core ${slug} tables and indexes`, deps: [], ssot_tag: tag },
    { id: `${prefix}-P1-002`, file: `services/${slug}-service.js`, type: 'esm', purpose: `Core ${slug} business logic`, deps: [`${prefix}-P1-001`], ssot_tag: tag },
    { id: `${prefix}-P1-003`, file: `routes/${slug}-routes.js`, type: 'esm', purpose: `HTTP API routes for ${slug}`, deps: [`${prefix}-P1-002`], ssot_tag: tag },
    { id: `${prefix}-P1-004`, file: `scripts/verify-${slug}.mjs`, type: 'esm_script', purpose: `Acceptance verification for ${slug}`, deps: [`${prefix}-P1-003`], ssot_tag: tag },
  ];
}

function dedupeVerifySteps(blueprint, productName) {
  const slug = productFileSlug(productName);
  const canonical = `scripts/verify-${slug}.mjs`;
  const verifySteps = (blueprint.steps || []).filter(s => s.type === 'esm_script');
  if (verifySteps.length === 0) {
    const prefix = productStepPrefix(productName);
    const lastStep = (blueprint.steps || []).slice(-1)[0];
    const depId = lastStep?.id || `${prefix}-P1-001`;
    const nextNum = (blueprint.steps || []).length + 1;
    (blueprint.steps || []).push({
      id: `${prefix}-P1-${String(nextNum).padStart(3, '0')}`,
      file: canonical,
      type: 'esm_script',
      purpose: `Acceptance verification for ${slug}`,
      deps: [depId],
      ssot_tag: blueprint._meta?.ssot_tag || 'docs/projects/AMENDMENT_XX.md',
    });
    if (blueprint._meta) blueprint._meta.acceptance_cmd = `node ${canonical}`;
    return blueprint;
  }
  if (verifySteps.length === 1) {
    if (verifySteps[0].file !== canonical) verifySteps[0].file = canonical;
    if (blueprint._meta) blueprint._meta.acceptance_cmd = `node ${canonical}`;
    return blueprint;
  }
  blueprint.steps = (blueprint.steps || []).filter((s) => {
    if (s.type !== 'esm_script') return true;
    return s.file === canonical;
  });
  if (!blueprint.steps.some(s => s.file === canonical)) {
    const prefix = productStepPrefix(productName);
    const lastDep = blueprint.steps.filter(s => s.type === 'esm').pop()?.id
      || blueprint.steps[blueprint.steps.length - 1]?.id
      || `${prefix}-P1-003`;
    blueprint.steps.push({
      id: `${prefix}-P1-004`,
      file: canonical,
      type: 'esm_script',
      purpose: `Acceptance verification for ${slug}`,
      deps: [lastDep],
      ssot_tag: blueprint._meta?.ssot_tag || 'docs/projects/AMENDMENT_XX.md',
    });
  }
  if (blueprint._meta) blueprint._meta.acceptance_cmd = `node ${canonical}`;
  return blueprint;
}

function normalizeStepPaths(blueprint) {
  for (const step of blueprint?.steps || []) {
    if (!step.file) continue;
    // This repo has no src/ directory — services/ routes/ scripts/ are at root
    step.file = step.file.replace(/^src\//, '');
  }
}

function finalizeBlueprint(blueprint, { productName, parentSsot, gapAnswers = null } = {}) {
  normalizeStepPaths(blueprint);
  stripInvalidSteps(blueprint);
  let gaps = detectGaps(blueprint);
  if ((gaps.length > 0 || (blueprint.steps?.length || 0) < 3) && founderRequestedPhase1Infra(gapAnswers)) {
    blueprint.steps = scaffoldPhase1Steps({ productName, parentSsot });
    gaps = detectGaps(blueprint);
  }
  dedupeVerifySteps(blueprint, productName);
  gaps = detectGaps(blueprint);
  blueprint._gaps = gaps;
  return { blueprint, gaps };
}

function detectConsequenceFlags(blueprintJson) {
  const text = JSON.stringify(blueprintJson);
  const flags = [];
  const regex = /"CONSEQUENCE_FLAG:\s*([^"]+)"/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    flags.push(match[1].trim());
  }
  return flags;
}

function applyGapAnswers(blueprintJson, answers) {
  let text = JSON.stringify(blueprintJson);
  for (const [gapId, answer] of Object.entries(answers)) {
    const gap = blueprintJson._gaps?.find(g => g.id === gapId);
    if (gap) {
      const escaped = gap.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(
        new RegExp(`"GAP_FLAG: ${escaped}"`, 'g'),
        JSON.stringify(answer)
      );
    }
  }
  return JSON.parse(text);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function amendmentReadableOnDisk(amendmentFile) {
  const candidates = [
    amendmentFile,
    path.join(ROOT, amendmentFile),
    path.join(ROOT, 'docs/projects', amendmentFile),
    path.join(ROOT, 'docs/projects', path.basename(amendmentFile)),
  ];
  return candidates.some((p) => fs.existsSync(p));
}

function amendmentNotFoundError(amendmentFile) {
  return new Error(
    `AmendmentNotFound: ${amendmentFile}. On Railway (docs/ not in image) pass amendment_text in POST body, or run: node scripts/run-blueprint-intake.mjs --amendment ${amendmentFile}`,
  );
}

function readAmendment(amendmentFile) {
  const candidates = [
    amendmentFile,
    path.join(ROOT, amendmentFile),
    path.join(ROOT, 'docs/projects', amendmentFile),
    path.join(ROOT, 'docs/projects', path.basename(amendmentFile)),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw amendmentNotFoundError(amendmentFile);
}

export { amendmentReadableOnDisk };

async function loadExistingBlueprintForAmendment(pool, amendmentFile) {
  const blueprintPath = path.join(
    ROOT,
    'docs/projects',
    path.basename(String(amendmentFile).replace('.md', '.blueprint.json')),
  );
  try {
    return JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  } catch {
    /* Railway image excludes docs/ — fall back to latest intake session blueprint */
  }

  const basename = path.basename(amendmentFile);
  const { rows } = await pool.query(
    `SELECT blueprint_json FROM blueprint_intake_sessions
     WHERE amendment_file IN ($1, $2)
       AND blueprint_json IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [amendmentFile, basename],
  );
  if (rows[0]?.blueprint_json) return rows[0].blueprint_json;

  throw new Error(`BlueprintNotFound: ${amendmentFile} — run backfill first`);
}

function tryWriteBlueprintFile(amendmentFile, blueprint) {
  const blueprintPath = path.join(
    ROOT,
    'docs/projects',
    path.basename(String(amendmentFile).replace('.md', '.blueprint.json')),
  );
  try {
    fs.mkdirSync(path.dirname(blueprintPath), { recursive: true });
    fs.writeFileSync(blueprintPath, JSON.stringify(blueprint, null, 2) + '\n');
    return blueprintPath;
  } catch {
    return null;
  }
}

function parseBlueprintFromAiResponse(raw) {
  const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || (typeof raw === 'object' ? JSON.stringify(raw) : String(raw));
  console.log(`[BLUEPRINT-PARSE] raw type=${typeof raw} text_len=${text.length} first100=${text.slice(0, 100).replace(/\n/g, '\\n')}`);
  const stripped = text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')
    .replace(/^```\w*\s*/gm, '').replace(/```\s*$/gm, '')
    .trim();
  try { return JSON.parse(stripped); } catch {}
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(stripped.slice(start, end + 1)); } catch (e2) {
      console.error(`[BLUEPRINT-PARSE] brace-extract failed: ${e2.message} substr_len=${end + 1 - start}`);
    }
  }
  const jsonBlockMatch = stripped.match(/```json\s*([\s\S]*?)```/i) || stripped.match(/```\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try { return JSON.parse(jsonBlockMatch[1].trim()); } catch {}
  }
  console.error('[BLUEPRINT-PARSE] FAILED full text:', text.slice(0, 500));
  throw new SyntaxError(`AI response is not JSON: ${stripped.slice(0, 200)}...`);
}

function extractIntentDeterministic(amendmentText, productName) {
  const lines = amendmentText.split('\n');
  const productPurpose = lines.find(l => /^##\s*(WHAT|PURPOSE|OVERVIEW)/i.test(l.trim()))
    ? lines[lines.findIndex(l => /^##\s*(WHAT|PURPOSE|OVERVIEW)/i.test(l.trim())) + 1]?.trim() || ''
    : '';
  const routes = [];
  const services = [];
  const tables = [];
  const envVars = [];
  for (const line of lines) {
    const routeMatch = line.match(/`((?:GET|POST|PUT|DELETE|PATCH)\s+\/[^\s`]+)`/i) || line.match(/(\/api\/v1\/[^\s,)`]+)/);
    if (routeMatch) {
      const parts = routeMatch[1].split(/\s+/);
      routes.push({ method: parts.length > 1 ? parts[0] : 'GET', path: parts[parts.length - 1], purpose: line.trim().slice(0, 80), auth: 'requireKey' });
    }
    const svcMatch = line.match(/`(services\/([^`/]+)\.js)`/) || line.match(/`([a-z][\w-]+-service)\.js`/i);
    if (svcMatch) services.push({ name: svcMatch[2] || svcMatch[1].replace('.js', ''), purpose: line.trim().slice(0, 80), ai_operations: [] });
    const tableMatch = line.match(/`([a-z_]+)`.*(?:table|schema|migration)/i) || line.match(/(?:table|CREATE TABLE)\s+`?([a-z_]+)`?/i);
    if (tableMatch) tables.push({ name: tableMatch[1], columns: [] });
    const envMatch = line.match(/`([A-Z][A-Z_]{2,})`/);
    if (envMatch && !envVars.includes(envMatch[1])) envVars.push(envMatch[1]);
  }
  const purposeText = productPurpose || `${productName} product — automated from PRODUCT_HOME.md`;
  console.log(`[INTENT-DETERMINISTIC] product=${productName} routes=${routes.length} services=${services.length} tables=${tables.length}`);
  return {
    product_name: productName,
    product_purpose: purposeText.slice(0, 200),
    phase: 1,
    routes_needed: routes.slice(0, 20),
    services_needed: services.slice(0, 15),
    db_tables_needed: tables.slice(0, 15),
    env_vars_needed: envVars.slice(0, 20),
    ai_operations: [],
    acceptance_criteria: [`${productName} server starts`, `${productName} routes respond 200`],
    non_goals: [],
    html_files: [],
    scripts: [{ path: `scripts/verify-${productName}.mjs`, purpose: 'acceptance test runner' }],
    _deterministic_fallback: true,
  };
}

async function updateSession(pool, id, updates) {
  const sets = Object.entries(updates).map(([k, v], i) => `${k} = $${i + 2}`);
  const vals = Object.values(updates).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
  await pool.query(
    `UPDATE blueprint_intake_sessions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1`,
    [id, ...vals]
  );
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createBlueprintIntakeService(pool, callCouncilMember) {

  // ── FLOW 1: Backfill (existing amendment → blueprint) ─────────────────────
  // amendmentText takes precedence over amendmentFile — CLI reads locally and passes text.
  // docs/products/** IS included in the Railway Docker image (.dockerignore whitelists it),
  // but inline text avoids a disk read when the caller already has the content.
  // Returns immediately with session_id; AI processing runs in background.
  let _backfillRunning = false;
  async function startBackfill({ amendmentFile, amendmentText: inlineText, productName, ownerId = null, onComplete = null }) {
    const amendmentText = inlineText || readAmendment(amendmentFile);

    if (_backfillRunning) {
      const { rows: existRows } = await pool.query(
        `SELECT id, status FROM blueprint_intake_sessions WHERE product_name = $1 AND status IN ('extracting','generating','arc_review') ORDER BY created_at DESC LIMIT 1`,
        [productName]
      );
      if (existRows.length) {
        return { sessionId: existRows[0].id, status: existRows[0].status, reused: true };
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO blueprint_intake_sessions
         (product_name, amendment_file, flow_type, status, owner_id)
       VALUES ($1, $2, 'backfill', 'extracting', $3) RETURNING id`,
      [productName, amendmentFile || null, ownerId]
    );
    const sessionId = rows[0].id;

    _backfillRunning = true;
    setImmediate(() => {
      _runBackfill(sessionId, amendmentText)
        .then(async () => {
          if (typeof onComplete === 'function') {
            try {
              const { rows: finalRows } = await pool.query('SELECT status, blueprint_json FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
              const finalStatus = finalRows[0]?.status || 'unknown';
              const stepCount = finalRows[0]?.blueprint_json?.steps?.length || 0;
              onComplete({ sessionId, status: finalStatus, stepCount, ok: true });
            } catch { /* non-critical */ }
          }
        })
        .catch(err => {
          const errDetail = `${err.message}`.slice(0, 500);
          console.error(`[BACKFILL-FAIL] session=${sessionId.slice(0,8)} error=${errDetail}`);
          updateSession(pool, sessionId, { status: 'failed', error_message: errDetail }).catch(() => {});
          if (typeof onComplete === 'function') {
            try { onComplete({ sessionId, status: 'failed', error: errDetail, ok: false }); } catch { /* */ }
          }
        })
        .finally(() => { _backfillRunning = false; });
    });

    return { sessionId, status: 'extracting' };
  }

  async function _applyGapAnswersAndRegenerate(sessionId, session, gapAnswers) {
    try {
      const codebaseScan = session.codebase_scan_json || await scanCodebasePatterns();
      const intent = session.extracted_intent_json;
      const oldBlueprint = session.blueprint_json;
      if (!intent || !oldBlueprint) {
        throw new Error('MissingIntentOrBlueprint: cannot regenerate without prior intake data');
      }

      const gapContext = Object.entries(gapAnswers).map(([id, answer]) => {
        const gap = (session.gaps_json || []).find(g => g.id === id);
        return `- ${id}${gap?.description ? `: ${gap.description}` : ''}\n  Founder answer: ${answer}`;
      }).join('\n');

      const regeneratePrompt = `PRODUCT INTENT:
${JSON.stringify(intent)}

PREVIOUS BLUEPRINT (had structural gaps — do not copy invalid steps):
${JSON.stringify(oldBlueprint).slice(0, 12000)}

FOUNDER GAP RESOLUTIONS — apply exactly; remove steps that violate these answers:
${gapContext}

Regenerate a complete corrected skeleton blueprint JSON. Documentation .md files are NOT steps.
Phase 1 code infrastructure (migration, service, routes, verify script) belongs in steps when the founder asked for it.`;

      const blueprintRaw = await callCouncilMember('openai',
        regeneratePrompt,
        { systemPromptOverride: BLUEPRINT_GEN_SYSTEM(codebaseScan), maxOutputTokens: 3000, taskType: 'codegen', product_lane: 'builderos', allowModelDowngrade: false }
      );
      let blueprint = parseBlueprintFromAiResponse(blueprintRaw);
      const { blueprint: finalized, gaps } = finalizeBlueprint(blueprint, {
        productName: session.product_name,
        parentSsot: oldBlueprint._meta?.parent_ssot,
        gapAnswers,
      });
      blueprint = finalized;
      blueprint._meta = {
        ...oldBlueprint._meta,
        ...blueprint._meta,
        blueprint_version: '1.0.0-intake-corrected',
        generated_by: 'blueprint-intake-service',
        gap_corrections_applied_at: new Date().toISOString(),
        scanned_at: codebaseScan.scanned_at,
      };

      const newStatus = gaps.length > 0 ? 'gap_collection' : 'arc_review';
      await updateSession(pool, sessionId, {
        blueprint_json: blueprint,
        gaps_json: gaps,
        status: newStatus,
      });
    } catch (err) {
      await updateSession(pool, sessionId, { status: 'failed', error_message: err.message });
      throw err;
    }
  }

  function _withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
    ]);
  }

  async function _runBackfill(sessionId, amendmentText) {
    const _bt0 = Date.now();
    const _blog = (label) => console.log(`[BACKFILL] ${sessionId.slice(0,8)} ${label} +${Date.now() - _bt0}ms mem=${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`);
    _blog('start');
    const { rows: sessionRows } = await pool.query(
      'SELECT product_name FROM blueprint_intake_sessions WHERE id = $1',
      [sessionId]
    );
    const productName = sessionRows[0]?.product_name;

    const codebaseScan = await scanCodebasePatterns();
    _blog('codebaseScan_done');
    await updateSession(pool, sessionId, { codebase_scan_json: codebaseScan });

    _blog('pre_intent_extraction');
    let intent;
    let aiIntentSucceeded = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const intentPrompt = attempt === 0
          ? `Amendment to analyze:\n\n${amendmentText.slice(0, 12000)}`
          : `CRITICAL: You MUST return a JSON object with at least "product_name" and "product_purpose" fields. Do NOT return an empty object.\n\nAmendment to analyze:\n\n${amendmentText.slice(0, 10000)}`;
        const intentRaw = await _withTimeout(
          callCouncilMember('openai', intentPrompt,
            { systemPromptOverride: INTENT_EXTRACT_SYSTEM, maxOutputTokens: 4000, taskType: 'codegen', product_lane: 'builderos', allowModelDowngrade: false, responseFormat: 'json' }
          ), 60000, 'intent_extraction'
        );
        _blog(`intent_raw_type=${typeof intentRaw} len=${String(intentRaw).length} preview=${String(intentRaw).slice(0,80)}`);
        intent = parseBlueprintFromAiResponse(intentRaw);
        if (!intent.product_name && !intent.product_purpose && Object.keys(intent).length < 3) {
          _blog(`intent_empty attempt=${attempt} keys=${Object.keys(intent).join(',')}`);
          if (attempt < 2) continue;
        } else {
          aiIntentSucceeded = true;
          break;
        }
      } catch (parseErr) {
        _blog(`intent_extraction_fail attempt=${attempt}: ${parseErr.message.slice(0, 200)}`);
        if (attempt < 2) continue;
      }
    }
    recordAiOutcome('openai', 'intent_extraction', aiIntentSucceeded, productName);
    if (!aiIntentSucceeded) {
      _blog('intent_fallback_deterministic');
      intent = extractIntentDeterministic(amendmentText, productName);
    }
    _blog(`intent_extraction_done ai=${aiIntentSucceeded} keys=${Object.keys(intent).join(',')}`);
    await updateSession(pool, sessionId, { extracted_intent_json: intent, status: 'generating' });

    _blog('pre_blueprint_generation');
    let blueprint;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const intentSlice = attempt < 2 ? JSON.stringify(intent) : JSON.stringify(intent).slice(0, 4000);
        const bpPrompt = attempt === 0
          ? `PRODUCT INTENT:\n${intentSlice}\n\nGenerate the complete blueprint JSON now.`
          : `CRITICAL: Return a JSON object with "_meta" and "steps" array. Each step needs id, file, type, purpose, deps, ssot_tag, contract.\n\nPRODUCT INTENT:\n${intentSlice}\n\nGenerate the complete blueprint JSON now.`;
        const maxTokens = attempt < 2 ? 6000 : 4000;
        const blueprintRaw = await _withTimeout(
          callCouncilMember('openai', bpPrompt,
            { systemPromptOverride: BLUEPRINT_GEN_SYSTEM(codebaseScan), maxOutputTokens: maxTokens, taskType: 'codegen', product_lane: 'builderos', allowModelDowngrade: false, responseFormat: 'json' }
          ), 90000, 'blueprint_generation'
        );
        _blog(`blueprint_raw_type=${typeof blueprintRaw} len=${String(blueprintRaw).length}`);
        blueprint = parseBlueprintFromAiResponse(blueprintRaw);
        if (!blueprint.steps || !Array.isArray(blueprint.steps) || blueprint.steps.length === 0) {
          _blog(`blueprint_empty attempt=${attempt} keys=${Object.keys(blueprint).join(',')}`);
          if (attempt < 2) continue;
          throw new Error('Blueprint generation returned object without steps array after 3 attempts');
        }
        break;
      } catch (parseErr) {
        _blog(`blueprint_generation_fail attempt=${attempt}: ${parseErr.message.slice(0, 120)}`);
        if (attempt === 2) throw parseErr;
      }
    }
    const bpSuccess = blueprint?.steps?.length > 0;
    recordAiOutcome('openai', 'blueprint_generation', bpSuccess, productName);
    _blog(`blueprint_generation_done steps=${blueprint.steps?.length}`);

    const { blueprint: finalized, gaps } = finalizeBlueprint(blueprint, {
      productName,
      parentSsot: blueprint._meta?.parent_ssot,
    });
    blueprint = finalized;
    blueprint._meta = { ...blueprint._meta, blueprint_version: '1.0.0-intake', generated_by: 'blueprint-intake-service', scanned_at: codebaseScan.scanned_at };

    const newStatus = gaps.length > 0 ? 'gap_collection' : 'arc_review';
    await updateSession(pool, sessionId, {
      blueprint_json: blueprint,
      gaps_json: gaps,
      status: newStatus,
    });

    if (newStatus === 'arc_review') {
      try {
        _blog('pre_arcReview');
        await runArcReview(sessionId);
        _blog('post_arcReview');
      } catch (arcErr) {
        _blog(`arcReview_failed: ${arcErr.message}`);
        console.error('[BACKFILL-ARC] ARC review failed in backfill, session stays arc_review:', arcErr.message);
      }
    }
    _blog('backfill_complete');
  }

  // ── FLOW 2: Greenfield (conversation → spec → blueprint) ──────────────────
  async function startGreenfield({ productName, firstMessage, ownerId = null }) {
    const codebaseScan = await scanCodebasePatterns();

    const { rows } = await pool.query(
      `INSERT INTO blueprint_intake_sessions
         (product_name, flow_type, status, codebase_scan_json, conversation_json, owner_id)
       VALUES ($1, 'greenfield', 'extracting', $2, $3, $4) RETURNING id`,
      [productName, JSON.stringify(codebaseScan), JSON.stringify([{ role: 'user', content: firstMessage }]), ownerId]
    );
    const sessionId = rows[0].id;

    const greenfieldSystem = `You are Lumin (Chair) running a product intake conversation with the founder.
Your goal: understand the new product well enough to generate a complete build spec.

Phase 1 — Discovery (ask until you know): What does it do? Who uses it? What's the single most important flow?
Phase 2 — Tech decisions (resolve each): What data needs to be stored? What AI operations are needed? Any external APIs?
Phase 3 — Scope lock: "Here's what Phase 1 includes / excludes. Confirm?"

When scope is confirmed, say exactly: SPEC_READY
Then output the spec as a JSON block using the intent extraction format.

Ask ONE question at a time. Be brief and direct. You are Lumin — conversational, not formal.`;

    const firstResponse = await callCouncilMember('openai',
      firstMessage,
      { systemPromptOverride: greenfieldSystem, maxOutputTokens: 500, taskType: 'general', product_lane: 'builderos' }
    );

    const conversation = [
      { role: 'user', content: firstMessage },
      { role: 'assistant', content: firstResponse },
    ];

    await updateSession(pool, sessionId, { conversation_json: conversation });

    const specReady = firstResponse.includes('SPEC_READY');
    return { sessionId, response: firstResponse, specReady, status: specReady ? 'generating' : 'extracting' };
  }

  async function continueGreenfield({ sessionId, userMessage }) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    if (!rows[0]) throw new Error('SessionNotFound: ' + sessionId);
    const session = rows[0];
    const codebaseScan = session.codebase_scan_json;
    const conversation = session.conversation_json || [];

    const greenfieldSystem = `You are Lumin (Chair) running a product intake conversation.
You are mid-conversation. Continue naturally. When scope is confirmed say SPEC_READY then output the JSON spec.
Ask ONE question at a time. Be brief.`;

    const messages = [...conversation, { role: 'user', content: userMessage }];
    const response = await callCouncilMember('openai',
      messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n'),
      { systemPromptOverride: greenfieldSystem, maxOutputTokens: 600, taskType: 'general', product_lane: 'builderos' }
    );

    messages.push({ role: 'assistant', content: response });
    await updateSession(pool, sessionId, { conversation_json: messages });

    if (response.includes('SPEC_READY')) {
      const jsonMatch = response.match(/```json([\s\S]+?)```/) || response.match(/\{[\s\S]+\}/);
      if (jsonMatch) {
        const intent = parseBlueprintFromAiResponse(jsonMatch[0]);
        const blueprintRaw = await callCouncilMember('openai',
          `PRODUCT INTENT:\n${JSON.stringify(intent, null, 2)}\n\nGenerate the complete blueprint JSON now.`,
          { systemPromptOverride: BLUEPRINT_GEN_SYSTEM(codebaseScan), maxOutputTokens: 3000, taskType: 'codegen', product_lane: 'builderos', allowModelDowngrade: false }
        );
        const blueprint = parseBlueprintFromAiResponse(blueprintRaw);
        const gaps = detectGaps(blueprint);
        blueprint._gaps = gaps;
        const newStatus = gaps.length > 0 ? 'gap_collection' : 'arc_review';
        await updateSession(pool, sessionId, {
          extracted_intent_json: intent,
          blueprint_json: blueprint,
          gaps_json: gaps,
          status: newStatus,
        });
        return { sessionId, response, specReady: true, gapCount: gaps.length, status: newStatus };
      }
    }

    return { sessionId, response, specReady: false, status: 'extracting' };
  }

  // ── FLOW 3: Adjustment (founder says change X → ARC patches blueprint) ─────
  async function startAdjustment({ amendmentFile, adjustmentText, ownerId = null }) {
    const existingBlueprint = await loadExistingBlueprintForAmendment(pool, amendmentFile);

    const codebaseScan = await scanCodebasePatterns();
    const productName = existingBlueprint._meta?.product || path.basename(amendmentFile, '.md');

    const { rows } = await pool.query(
      `INSERT INTO blueprint_intake_sessions
         (product_name, amendment_file, flow_type, status, codebase_scan_json, conversation_json, owner_id)
       VALUES ($1, $2, 'adjustment', 'generating', $3, $4, $5) RETURNING id`,
      [
        productName, amendmentFile,
        JSON.stringify(codebaseScan),
        JSON.stringify([{ role: 'user', content: adjustmentText }]),
        ownerId,
      ]
    );
    const sessionId = rows[0].id;

    try {
      const patchedRaw = await callCouncilMember('openai',
        `FOUNDER ADJUSTMENT REQUEST:\n${adjustmentText}`,
        { systemPromptOverride: ADJUSTMENT_SYSTEM(existingBlueprint, codebaseScan), maxOutputTokens: 8000, taskType: 'codegen', product_lane: 'builderos', allowModelDowngrade: false }
      );
      const patched = parseBlueprintFromAiResponse(patchedRaw);
      const gaps = detectGaps(patched);
      const consequenceFlags = detectConsequenceFlags(patched);
      patched._gaps = gaps;
      patched._meta = { ...patched._meta, blueprint_version: incrementVersion(existingBlueprint._meta?.blueprint_version || '1.0.0'), adjusted_at: new Date().toISOString() };

      const newStatus = gaps.length > 0 ? 'gap_collection' : 'arc_review';
      await updateSession(pool, sessionId, {
        blueprint_json: patched,
        gaps_json: gaps,
        status: newStatus,
      });

      if (gaps.length === 0) {
        tryWriteBlueprintFile(amendmentFile, patched);
      }

      return {
        sessionId, status: newStatus,
        gapCount: gaps.length, gaps,
        consequenceFlags,
        blueprintVersion: patched._meta.blueprint_version,
      };
    } catch (err) {
      await updateSession(pool, sessionId, { status: 'failed' });
      throw err;
    }
  }

  // ── Gap conversation (fill gaps via Lumin) ────────────────────────────────
  async function sendGapMessage({ sessionId, userMessage }) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    if (!rows[0]) throw new Error('SessionNotFound: ' + sessionId);
    const session = rows[0];
    if (session.status !== 'gap_collection') {
      throw new Error(`SessionNotInGapCollection: status=${session.status}`);
    }

    const gaps = session.gaps_json || [];
    const openGaps = gaps.filter(g => !g.resolved);
    const conversation = session.conversation_json || [];

    const gapContext = `Open gaps:\n${openGaps.map(g => `- ${g.id}: ${g.description}`).join('\n')}`;
    const messages = [...conversation, { role: 'user', content: userMessage }];

    const response = await callCouncilMember('openai',
      `${gapContext}\n\nCurrent message from founder: ${userMessage}`,
      { systemPromptOverride: GAP_CONVERSATION_SYSTEM, maxOutputTokens: 400, taskType: 'general', product_lane: 'builderos' }
    );
    messages.push({ role: 'assistant', content: response });

    // Extract answers for specific gaps — only resolve a gap when the user
    // explicitly references it by ID or the assistant output contains
    // GAPS_RESOLVED (all gaps answered). Generic confirmations ("got it",
    // "confirmed") without a specific gap ID do NOT auto-resolve.
    const gapAnswers = { ...(session.gap_answers_json || {}) };
    const allGapsResolved = response.includes('GAPS_RESOLVED');
    for (const gap of openGaps) {
      const mentionsGapId = userMessage.toLowerCase().includes(gap.id.toLowerCase());
      if (mentionsGapId || allGapsResolved) {
        gapAnswers[gap.id] = userMessage;
        gap.resolved = true;
        gap.answer = userMessage;
      }
    }

    const allResolved = gaps.every(g => g.resolved);
    if (allResolved) {
      await updateSession(pool, sessionId, {
        conversation_json: messages,
        gaps_json: gaps,
        gap_answers_json: gapAnswers,
        status: 'generating',
      });
      const sessionSnapshot = { ...session, gaps_json: gaps, gap_answers_json: gapAnswers };
      setImmediate(() => {
        _applyGapAnswersAndRegenerate(sessionId, sessionSnapshot, gapAnswers).catch(() => {});
      });
    } else {
      await updateSession(pool, sessionId, {
        conversation_json: messages,
        gaps_json: gaps,
        gap_answers_json: gapAnswers,
        status: 'gap_collection',
      });
    }

    return { response, allResolved, openGapCount: gaps.filter(g => !g.resolved).length };
  }

  // ── Answer a specific gap directly (API call without conversation) ─────────
  async function answerGap({ sessionId, gapId, answer }) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    if (!rows[0]) throw new Error('SessionNotFound: ' + sessionId);
    const session = rows[0];
    const gaps = session.gaps_json || [];
    const gap = gaps.find(g => g.id === gapId);
    if (!gap) throw new Error(`GapNotFound: ${gapId}`);

    gap.resolved = true;
    gap.answer = answer;
    const gapAnswers = { ...(session.gap_answers_json || {}), [gapId]: answer };
    const allResolved = gaps.every(g => g.resolved);

    if (allResolved) {
      await updateSession(pool, sessionId, { gaps_json: gaps, gap_answers_json: gapAnswers, status: 'generating' });
      const sessionSnapshot = { ...session, gaps_json: gaps, gap_answers_json: gapAnswers };
      setImmediate(() => {
        _applyGapAnswersAndRegenerate(sessionId, sessionSnapshot, gapAnswers).catch(() => {});
      });
    } else {
      await updateSession(pool, sessionId, { gaps_json: gaps, gap_answers_json: gapAnswers });
    }

    return { resolved: true, allResolved, remainingGaps: gaps.filter(g => !g.resolved).length };
  }

  // ── ARC review (gap-check the current blueprint) ──────────────────────────
  async function runArcReview(sessionId) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    if (!rows[0]) throw new Error('SessionNotFound: ' + sessionId);
    const session = rows[0];
    const blueprint = session.blueprint_json;
    if (!blueprint) throw new Error('NoBlueprintYet: run startBackfill or continueGreenfield first');

    dedupeVerifySteps(blueprint, session.product_name);
    await updateSession(pool, sessionId, { blueprint_json: blueprint, status: 'arc_review' });

    const arcPrompt = `Review this SKELETON blueprint for execution readiness. Steps are routing metadata only (id, file, type, purpose, deps, ssot_tag).

For each step check:
1. type matches file extension (sql / esm for .js / esm_script for .mjs / html)
2. NEVER .md files as steps — documentation is not executable code
3. esm_script is only for standalone node .mjs verification scripts
4. purpose is one actionable build sentence — not gap-resolution prose pasted into fields
5. deps reference only step IDs defined earlier in steps[]
6. acceptance_cmd in _meta is a real node command for a verify script in steps[]
7. No orphan verify scripts referencing artifacts missing from steps[]

Return JSON:
{
  "critical": [{"step_id":"...","issue":"...","fix":"..."}],
  "moderate": [{"step_id":"...","issue":"...","fix":"..."}],
  "minor": [{"step_id":"...","issue":"...","fix":"..."}],
  "total_critical": N,
  "total_moderate": N,
  "total_minor": N,
  "ready_to_execute": true|false
}`;

    let arcReport;
    try {
      const arcRaw = await _withTimeout(
        callCouncilMember('openai',
          `BLUEPRINT TO REVIEW:\n${JSON.stringify(blueprint, null, 2).slice(0, 12000)}`,
          { systemPromptOverride: arcPrompt, maxOutputTokens: 3000, taskType: 'codegen', product_lane: 'builderos', allowModelDowngrade: false }
        ), 60000, 'arc_review'
      );
      arcReport = parseBlueprintFromAiResponse(arcRaw);
    } catch (aiParseErr) {
      console.error(`[ARC-REVIEW] AI response not parseable, falling back to deterministic validation: ${aiParseErr.message}`);
      recordAiOutcome('openai', 'arc_review', false, session.product_name);
      const structFallback = _validateBlueprintStructure(blueprint);
      if (structFallback.valid) {
        const fixedBp = _autoFixFromArcReport(blueprint, { critical: [], moderate: [], minor: [] }, session.product_name) || blueprint;
        dedupeVerifySteps(fixedBp, session.product_name);
        const deterministicFix = _validateBlueprintStructure(fixedBp);
        const passReport = {
          critical: [], moderate: [], minor: [],
          total_critical: 0, total_moderate: 0, total_minor: 0,
          ready_to_execute: deterministicFix.valid,
          validation_method: 'deterministic_fallback_ai_parse_failed',
        };
        await updateSession(pool, sessionId, { arc_report_json: passReport, blueprint_json: fixedBp, status: deterministicFix.valid ? 'ready' : 'gap_collection' });
        if (deterministicFix.valid && session.amendment_file) {
          const blueprintFile = tryWriteBlueprintFile(session.amendment_file, fixedBp);
          if (blueprintFile) await updateSession(pool, sessionId, { blueprint_file: blueprintFile });
        }
        return { arcReport: passReport, status: deterministicFix.valid ? 'ready' : 'gap_collection', autoFixed: true, aiParseFailed: true };
      }
      arcReport = {
        critical: structFallback.errors.map(e => ({ step_id: e.stepId || 'blueprint', issue: e.issue, fix: e.fix })),
        moderate: [], minor: [],
        total_critical: structFallback.errors.length,
        total_moderate: 0, total_minor: 0,
        ready_to_execute: false,
        validation_method: 'deterministic_fallback_ai_parse_failed',
      };
    }

    const hasCritical = Number(arcReport.total_critical) > 0 || (arcReport.critical && arcReport.critical.length > 0);
    const hasModerate = Number(arcReport.total_moderate) > 0 || (arcReport.moderate && arcReport.moderate.length > 0);
    let autoFixError = null;
    if (!arcReport.ready_to_execute && (hasCritical || hasModerate)) {
      let fixedBlueprint = null;
      try {
        fixedBlueprint = _autoFixFromArcReport(blueprint, arcReport, session.product_name);
      } catch (fixErr) {
        autoFixError = fixErr.message;
        console.error('[ARC-AUTOFIX] Failed to auto-fix blueprint:', fixErr.message);
      }
      if (fixedBlueprint) {
        const structuralCheck = _validateBlueprintStructure(fixedBlueprint);
        if (structuralCheck.valid) {
          const passReport = {
            critical: [], moderate: [], minor: [],
            total_critical: 0, total_moderate: 0, total_minor: 0,
            ready_to_execute: true,
            validation_method: 'deterministic_structural_check',
            auto_fix_count: fixedBlueprint._meta?.arc_fixes_applied || 0,
          };
          await updateSession(pool, sessionId, { arc_report_json: passReport, blueprint_json: fixedBlueprint, status: 'ready' });

          if (session.amendment_file) {
            const blueprintFile = tryWriteBlueprintFile(session.amendment_file, fixedBlueprint);
            await updateSession(pool, sessionId, { ...(blueprintFile ? { blueprint_file: blueprintFile } : {}), status: 'ready' });
          }
          return { arcReport: passReport, status: 'ready', autoFixed: true };
        }
        const failReport = {
          critical: structuralCheck.errors.map(e => ({ step_id: e.stepId || 'blueprint', issue: e.issue, fix: e.fix })),
          moderate: [], minor: [],
          total_critical: structuralCheck.errors.length,
          total_moderate: 0, total_minor: 0,
          ready_to_execute: false,
          validation_method: 'deterministic_structural_check',
        };
        await updateSession(pool, sessionId, { arc_report_json: failReport, blueprint_json: fixedBlueprint, status: 'gap_collection' });
        return { arcReport: failReport, status: 'gap_collection', autoFixed: true };
      }
    }

    const newStatus = arcReport.ready_to_execute ? 'ready' : 'gap_collection';
    await updateSession(pool, sessionId, { arc_report_json: arcReport, blueprint_json: blueprint, status: newStatus });

    if (arcReport.ready_to_execute && session.amendment_file) {
      const blueprintFile = tryWriteBlueprintFile(session.amendment_file, blueprint);
      await updateSession(pool, sessionId, {
        ...(blueprintFile ? { blueprint_file: blueprintFile } : {}),
        status: 'ready',
      });
    }

    return { arcReport, status: newStatus, autoFixed: false, autoFixError };
  }

  function _autoFixFromArcReport(blueprint, arcReport, productName) {
    const allFindings = [
      ...(arcReport.critical || []).map(f => ({ severity: 'CRITICAL', ...f })),
      ...(arcReport.moderate || []).map(f => ({ severity: 'MODERATE', ...f })),
    ];
    if (allFindings.length === 0) return null;

    const fixed = JSON.parse(JSON.stringify(blueprint));
    const steps = fixed.steps || [];
    if (steps.length === 0) return null;
    let fixCount = 0;

    const idSet = new Set();
    const duplicates = new Set();
    for (const s of steps) {
      if (idSet.has(s.id)) duplicates.add(s.id);
      idSet.add(s.id);
    }
    if (duplicates.size > 0) {
      const prefix = steps[0]?.id?.replace(/-\d+$/, '') || 'STEP';
      let nextNum = steps.length + 1;
      for (let i = steps.length - 1; i >= 0; i--) {
        if (duplicates.has(steps[i].id)) {
          const ext = (steps[i].file || '').split('.').pop();
          if (ext === 'mjs' || steps[i].type === 'esm_script') {
            steps[i].id = `${prefix}-${String(nextNum).padStart(3, '0')}`;
            nextNum++;
            fixCount++;
          }
        }
      }
    }

    const serviceStepIds = steps
      .filter(s => s.type === 'esm' && !s.file?.includes('coordinator') && !s.file?.includes('route'))
      .map(s => s.id);
    const allNonVerifyIds = steps
      .filter(s => s.type !== 'esm_script')
      .map(s => s.id);

    for (const s of steps) {
      if (s.file?.includes('coordinator') && s.type === 'esm') {
        const missing = serviceStepIds.filter(id => id !== s.id && !(s.deps || []).includes(id));
        if (missing.length > 0) {
          s.deps = [...new Set([...(s.deps || []), ...missing])];
          fixCount++;
        }
      }
      if (s.type === 'esm_script' || s.file?.includes('verify')) {
        const missing = allNonVerifyIds.filter(id => !(s.deps || []).includes(id));
        if (missing.length > 0) {
          s.deps = [...new Set([...(s.deps || []), ...allNonVerifyIds])];
          fixCount++;
        }
      }
      if ((s.file?.includes('routes') || s.file?.includes('route')) && s.type === 'esm') {
        const dbStep = steps.find(st => st.type === 'sql');
        const coordStep = steps.find(st => st.file?.includes('coordinator'));
        const needed = [dbStep?.id, coordStep?.id, ...serviceStepIds].filter(Boolean);
        const missing = needed.filter(id => id !== s.id && !(s.deps || []).includes(id));
        if (missing.length > 0) {
          s.deps = [...new Set([...(s.deps || []), ...missing])];
          fixCount++;
        }
      }
      if ((s.type === 'html') && (!s.deps || s.deps.length === 0)) {
        const routeStep = steps.find(st => st.file?.includes('route'));
        if (routeStep) {
          s.deps = [routeStep.id];
          fixCount++;
        }
      }
      if (!s.deps || s.deps.length === 0) {
        const dbStep = steps.find(st => st.type === 'sql');
        if (dbStep && dbStep.id !== s.id && s.type !== 'sql') {
          s.deps = [dbStep.id];
          fixCount++;
        }
      }
    }

    const ssotPath = `docs/products/${(productName || 'unknown').toLowerCase().replace(/\s+/g, '-')}/PRODUCT_HOME.md`;
    for (const s of steps) {
      if (!s.ssot_tag || s.ssot_tag.includes('AMENDMENT_XX') || s.ssot_tag.includes('placeholder')) {
        s.ssot_tag = ssotPath;
        fixCount++;
      }
    }

    const stepIndex = new Map(steps.map(s => [s.id, s]));
    for (const s of steps) {
      if (!s.deps) continue;
      const clean = s.deps.filter(depId => {
        const depStep = stepIndex.get(depId);
        if (!depStep || !depStep.deps) return true;
        if (depStep.deps.includes(s.id)) {
          fixCount++;
          return false;
        }
        return true;
      });
      s.deps = clean;
    }

    const verifyStep = steps.find(s => s.type === 'esm_script');
    if (verifyStep && verifyStep.file) {
      let correctCmd = `node ${verifyStep.file}`;
      if (verifyStep.file.includes('verify-project')) {
        correctCmd += ' --all --dry-run';
      }
      if (!fixed._meta) fixed._meta = {};
      if (fixed._meta.acceptance_cmd !== correctCmd) {
        fixed._meta.acceptance_cmd = correctCmd;
        fixCount++;
      }
    }

    if (fixCount === 0) return null;

    fixed._meta = {
      ...blueprint._meta,
      ...fixed._meta,
      blueprint_version: incrementVersion(blueprint._meta?.blueprint_version || '1.0.0'),
      auto_fixed_at: new Date().toISOString(),
      arc_fixes_applied: fixCount,
      fix_types: 'duplicate_ids,missing_deps,ssot_tag,circular_deps,acceptance_cmd',
    };
    return fixed;
  }

  function _validateBlueprintStructure(blueprint) {
    const errors = [];
    const steps = blueprint.steps || [];
    if (steps.length === 0) {
      errors.push({ issue: 'Blueprint has no steps', fix: 'Add at least one step' });
      return { valid: false, errors };
    }

    const idSet = new Set();
    for (const s of steps) {
      if (!s.id) errors.push({ stepId: s.file || '?', issue: 'Step has no id', fix: 'Assign a unique step ID' });
      if (idSet.has(s.id)) errors.push({ stepId: s.id, issue: `Duplicate step ID: ${s.id}`, fix: 'Rename to unique ID' });
      idSet.add(s.id);
    }

    for (const s of steps) {
      if (!s.deps) continue;
      for (const dep of s.deps) {
        if (!idSet.has(dep)) {
          errors.push({ stepId: s.id, issue: `Dep '${dep}' references non-existent step`, fix: 'Remove or fix dep reference' });
        }
      }
    }

    const nonSqlSteps = steps.filter(s => s.type !== 'sql');
    for (const s of nonSqlSteps) {
      if (!s.deps || s.deps.length === 0) {
        errors.push({ stepId: s.id, issue: `Step has empty deps`, fix: 'Add at least DB migration dep' });
      }
    }

    const validTypes = new Set(['sql', 'esm', 'esm_script', 'html']);
    for (const s of steps) {
      if (!validTypes.has(s.type)) {
        errors.push({ stepId: s.id, issue: `Invalid type '${s.type}'`, fix: `Use one of: ${[...validTypes].join(', ')}` });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  async function getSession(sessionId) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    return rows[0] || null;
  }

  async function listSessions({ status, flowType, limit = 20 } = {}) {
    let sql = 'SELECT id, product_name, flow_type, status, amendment_file, created_at, updated_at FROM blueprint_intake_sessions';
    const params = [];
    const conditions = [];
    if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
    if (flowType) { conditions.push(`flow_type = $${params.length + 1}`); params.push(flowType); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY updated_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  return {
    startBackfill,
    startGreenfield,
    continueGreenfield,
    startAdjustment,
    sendGapMessage,
    answerGap,
    runArcReview,
    getSession,
    listSessions,
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────
function incrementVersion(v) {
  const parts = String(v).split('.');
  const patch = parseInt(parts[2] || '0', 10) + 1;
  return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`;
}
