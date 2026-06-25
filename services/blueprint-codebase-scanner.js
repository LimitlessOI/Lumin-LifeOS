/**
 * SYNOPSIS: Scans the live project for patterns a blueprint generator must know before writing specs.
 * Grounding source — prevents the #1 blueprint failure: importing packages that aren't installed
 * or assuming middleware behaviour that doesn't match reality.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch { return null; }
}

function readFile(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
  catch { return null; }
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function findFiles(dir, ext) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter(f => f.endsWith(ext));
}

export async function scanCodebasePatterns() {
  const pkg = readJson('package.json') || {};
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  // ── Installed packages ────────────────────────────────────────────────────
  const installedPackages = Object.keys(allDeps).sort();
  const notInstalled = [
    '@anthropic-ai/sdk',
    '@google/generative-ai',
    'openai',
  ].filter(p => !allDeps[p]);

  // ── Route factory pattern (from an established route file) ────────────────
  const sampleRoute = readFile('routes/video-routes.js') || '';
  const routeFactorySig = sampleRoute.match(/^export function (\w+)\(app, ctx\)/m)?.[0]
    || 'createXxxRoutes(app, ctx)';
  const ctxAvailable = ['pool','requireKey','callCouncilMember','callCouncilWithFailover',
    'broadcastToAll','dayjs','logger','updateROI','recordRevenueEvent'];

  // ── Auth pattern (verified from requireKey source) ────────────────────────
  const requireKeySrc = readFile('src/server/auth/requireKey.js') || '';
  const setsLifeosUser = requireKeySrc.includes('req.lifeosUser');
  const authPattern = {
    middleware_source: 'ctx.requireKey — do NOT import directly',
    owner_id_field: setsLifeosUser ? 'req.lifeosUser?.sub' : 'UNKNOWN — verify requireKey src',
    owner_id_guard: "const ownerId = req.lifeosUser?.sub || null; if (!ownerId) return res.status(401).json({ error: 'jwt_required' });",
    jwt_field: 'req.lifeosUser set by requireKey when Bearer JWT provided',
  };

  // ── Council / AI call pattern ─────────────────────────────────────────────
  const councilMembersCfg = readFile('config/council-members.js') || '';
  const aliasMatch = councilMembersCfg.match(/export const COUNCIL_ALIAS_MAP\s*=\s*(\{[^}]+\})/s);
  let councilAliases = { claude: 'claude_sonnet', gemini: 'gemini_flash', openai: 'openai_gpt' };
  if (aliasMatch) {
    const raw = aliasMatch[1].replace(/\/\/[^\n]*/g, '').replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
    try { councilAliases = JSON.parse(raw); } catch { /* keep defaults */ }
  }
  const aiCallPattern = {
    rule: 'NEVER import @anthropic-ai/sdk or @google/generative-ai. Use callCouncilMember from ctx.',
    call_signature: "callCouncilMember(alias, userPrompt, { systemPrompt, maxOutputTokens, taskType: 'general' })",
    failover_signature: "callCouncilWithFailover(prompt, alias)",
    aliases: councilAliases,
    inject_via: 'factory parameter — createXxxService(pool, callCouncilMember)',
  };

  // ── Transcription ─────────────────────────────────────────────────────────
  const transcriberSrc = readFile('services/word-keeper-transcriber.js') || '';
  const transcriptionPattern = transcriberSrc
    ? {
        import: "import { createTranscriber } from './word-keeper-transcriber.js';",
        instantiate: "const transcriber = createTranscriber(process.env.OPENAI_API_KEY);",
        method: 'transcriber.transcribeBuffer(buffer, mimeType, filename)',
        language: 'hardcodes language: en — no language detection available in this version',
      }
    : null;

  // ── Storage ───────────────────────────────────────────────────────────────
  const storageInstalled = Boolean(allDeps['@aws-sdk/client-s3']);
  const storagePattern = {
    sdk: '@aws-sdk/client-s3',
    installed: storageInstalled,
    install_if_missing: 'npm install @aws-sdk/client-s3',
    client_init: "new S3Client({ region: 'auto', endpoint: process.env.STORAGE_ENDPOINT, credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY_ID, secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY } })",
    env_required: ['STORAGE_ENDPOINT','STORAGE_BUCKET','STORAGE_ACCESS_KEY_ID','STORAGE_SECRET_ACCESS_KEY','STORAGE_PUBLIC_URL'],
    note: 'R2 is S3-compatible. region must be "auto".',
  };

  // ── Multer ────────────────────────────────────────────────────────────────
  const multerInstalled = Boolean(allDeps['multer']);
  const multerPattern = multerInstalled
    ? {
        import: "import multer from 'multer';",
        memory_config: 'multer({ storage: multer.memoryStorage(), limits: { fileSize: N } })',
        field_usage: "upload.single('fieldName')",
        middleware_order: ['requireKey', 'upload.single(field)', 'async handler'],
      }
    : null;

  // ── DB / Pool ─────────────────────────────────────────────────────────────
  const dbPattern = {
    source: 'pool from ctx — pool.query(sql, params)',
    migration_dir: 'db/migrations/',
    idempotent: 'always use CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS',
    uuid: 'gen_random_uuid() for primary keys',
    owner_id_type: 'TEXT NOT NULL (stores req.lifeosUser.sub which is a JWT sub string, not a DB UUID)',
  };

  // ── Registration ──────────────────────────────────────────────────────────
  const twoTierSrc = readFile('core/two-tier-system-init.js') || '';
  const routeCtxKeys = (twoTierSrc.match(/const routeCtx = \{([^}]+)\}/s)?.[1] || '')
    .split('\n').map(l => l.trim().replace(/[,:].*/, '').trim()).filter(Boolean);
  const registrationPattern = {
    import_location: 'core/two-tier-system-init.js — add import at top alongside other route imports',
    call_location: 'core/two-tier-system-init.js — add createXxxRoutes(app, routeCtx) in the route registration block after createCommandCenterRoutes',
    server_js_import: 'server.js — add import alongside other route imports',
    routeCtx_keys: routeCtxKeys.length > 0 ? routeCtxKeys : ctxAvailable,
    factory_signature: 'export function createXxxRoutes(app, ctx)',
  };

  // ── Existing migration tables (scan migration files) ──────────────────────
  const migrationFiles = findFiles('db/migrations', '.sql');
  const existingTables = [];
  for (const f of migrationFiles) {
    const src = readFile(`db/migrations/${f}`) || '';
    const matches = [...src.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/gi)];
    for (const m of matches) existingTables.push(m[1]);
  }

  // ── Existing services and routes ──────────────────────────────────────────
  const existingServices = findFiles('services', '.js').map(f => f.replace('.js', ''));
  const existingRoutes = findFiles('routes', '.js').map(f => f.replace('.js', ''));

  // ── Node version / globals ────────────────────────────────────────────────
  const nodeVersion = process.version;
  const nodeGlobals = {
    crypto_randomUUID: 'crypto.randomUUID() — available globally in Node 18+, no import needed',
    fetch: 'fetch — available globally in Node 18+, no import needed',
  };

  return {
    scanned_at: new Date().toISOString(),
    node_version: nodeVersion,
    node_globals: nodeGlobals,
    installed_packages: installedPackages,
    not_installed: notInstalled,
    route_factory: {
      signature: 'export function createXxxRoutes(app, ctx)',
      example: routeFactorySig,
      ctx_available: ctxAvailable,
    },
    auth_pattern: authPattern,
    ai_call_pattern: aiCallPattern,
    transcription_pattern: transcriptionPattern,
    storage_pattern: storagePattern,
    multer_pattern: multerPattern,
    db_pattern: dbPattern,
    registration_pattern: registrationPattern,
    existing_tables: [...new Set(existingTables)].sort(),
    existing_services: existingServices.sort(),
    existing_routes: existingRoutes.sort(),
  };
}
