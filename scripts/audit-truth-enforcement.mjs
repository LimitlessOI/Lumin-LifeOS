#!/usr/bin/env node
/**
 * SYNOPSIS: Audit entire repo for truth enforcement bypass paths — fail-closed in preflight.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_DIRS = ['routes', 'services', 'core', 'middleware', 'startup'];

const SKIP_DIR_PARTS = [
  'node_modules',
  'factory-staging',
  'lumin-factory',
  'builderos-reboot/MISSIONS',
  'dist',
  '.git',
];

const ALLOW_DIRECT_LLM = new Set([
  'services/council-service.js',
  'services/founder-direct-provider.js',
  'services/founder-provider-tool-action.js',
  'services/builder-council-review.js',
  'services/voice-rail-attachments.js',
  'services/voice-rail-stt.js',
  'services/voice-rail-tts.js',
  'services/word-keeper-transcriber.js',
  'services/builder-audit-before-done.js',
  'services/capability-map.js',
  // Never-stop planner failover chain (Anthropic → OpenAI → Gemini) — strong models only;
  // not a user-facing chat bypass. Required so product-queue planning never sits idle.
  'services/never-stop-product-factory.js',
  'core/tier0-council.js',
  'routes/tco-routes.js',
  'routes/gemini-proof-routes.js',
]);

const REQUIRED_SPINE = [
  { file: 'services/truth-enforcement-spine.js', needles: ['TRUTH_SPINE_VERSION', 'enforceTruthOnResponseBody'] },
  { file: 'middleware/truth-response-enforcer.js', needles: ['createTruthResponseEnforcer'] },
  { file: 'services/websocket-handler.js', needles: ['truthGateOutbound'] },
  { file: 'services/conversation-store.js', needles: ['scrubProseForStorage'] },
  // server.js is a bootstrap-only composition root (CLAUDE.md protected boundary):
  // it only selects a runtime lane. The truth wiring lives in the runtime files it
  // delegates to, so the audit follows it there.
  //  - full runtime: HTTP outbound enforcer + spine-wrapped AI calls + websocket gate
  //  - founder runtime: HTTP outbound enforcer (the minimal lane's boundary truth gate)
  { file: 'server-full-runtime.js', needles: ['createTruthResponseEnforcer', 'createSpineCallAI', 'spineCallAI', 'truthGateOutbound'] },
  { file: 'server-founder-runtime.js', needles: ['createTruthResponseEnforcer'] },
  { file: 'services/council-service.js', needles: ['finalizeResponse'] },
  { file: 'core/memory-system.js', needles: ['gateMemoryWrite'] },
];

const DIRECT_LLM_RE = /fetch\s*\(\s*['"`]https:\/\/(api\.(openai|anthropic|groq)|generativelanguage)/;

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const r = rel(abs);
    if (SKIP_DIR_PARTS.some((s) => r.includes(s))) continue;
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (name.endsWith('.js') && !name.endsWith('.test.js')) out.push(abs);
  }
  return out;
}

const violations = [];

for (const req of REQUIRED_SPINE) {
  const full = path.join(ROOT, req.file);
  if (!fs.existsSync(full)) {
    violations.push(`MISSING ${req.file}`);
    continue;
  }
  const src = fs.readFileSync(full, 'utf8');
  for (const n of req.needles) {
    if (!src.includes(n)) violations.push(`${req.file} missing ${n}`);
  }
}

for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const r = rel(file);
    const src = fs.readFileSync(file, 'utf8');
    if (DIRECT_LLM_RE.test(src) && !ALLOW_DIRECT_LLM.has(r)) {
      violations.push(`DIRECT_LLM_FETCH:${r}`);
    }
    if (r.startsWith('routes/') && /human_summary\s*:/.test(src) && !r.includes('lifeos-builderos-command-control')) {
      if (!src.includes('enforceTruth') && !src.includes('lockFounderResponse') && !src.includes('truth_spine')) {
        violations.push(`ROUTE_HUMAN_SUMMARY_UNGATED:${r}`);
      }
    }
  }
}

const orchestrator = fs.readFileSync(path.join(ROOT, 'services/lumin-chair-orchestrator.js'), 'utf8');
if (!orchestrator.includes('enforceTruthLockdown')) {
  violations.push('lumin-chair-orchestrator missing enforceTruthLockdown');
}

const report = {
  schema: 'truth_enforcement_audit_v1',
  at: new Date().toISOString(),
  ok: violations.length === 0,
  violations,
  scanned_dirs: SCAN_DIRS,
  allow_direct_llm: [...ALLOW_DIRECT_LLM],
};

const outPath = path.join(ROOT, 'products/receipts/TRUTH_ENFORCEMENT_AUDIT.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (violations.length) {
  console.error('TRUTH_ENFORCEMENT_AUDIT FAIL');
  for (const v of violations) console.error(`  • ${v}`);
  process.exit(1);
}

console.log('TRUTH_ENFORCEMENT_AUDIT OK');
console.log(JSON.stringify(report, null, 2));
process.exit(0);
