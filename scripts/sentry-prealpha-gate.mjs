/**
 * SYNOPSIS: Product-agnostic SENTRY pre-alpha completion gate — the generalized
 * form of Standing Order SO-002. Reads builderos-reboot/governance/
 * SENTRY_PRODUCT_REGISTRY.json and runs ANY registered product's two doctrine
 * layers purely from config: Layer A (structural, no browser) and Layer B
 * (human-sim, real browser). Both fail closed. After the layers run, every
 * failing signal is folded — through the system-authored closer
 * (services/sentry-findings-to-improvement-feed.js) — into a per-product,
 * solution-mandatory findings feed the BuilderOS improvement loop consumes to
 * self-fix. This is what makes SENTRY apply to all BP products, not just Site
 * Builder. Conductor-authored SCRIPT (SO-001 allows scripts/CI): it authors no
 * product code and no browser primitive; it only orchestrates already-proven
 * per-product layer scripts/endpoints declared in the registry.
 *
 * Usage:
 *   node scripts/sentry-prealpha-gate.mjs <product-id>
 *   node scripts/sentry-prealpha-gate.mjs --all
 *   node scripts/sentry-prealpha-gate.mjs --list
 *   node scripts/sentry-prealpha-gate.mjs --all --enforce-creds
 * @ssot builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSentryFindings, toReadinessFindings } from '../services/sentry-findings-to-improvement-feed.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = path.join(ROOT, 'builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json');
let BASE = (process.env.PUBLIC_BASE_URL || process.env.SITE_BASE_URL || '').replace(/\/+$/, '');
let KEY = process.env.COMMAND_CENTER_KEY || '';
const ENFORCE_CREDS = process.argv.includes('--enforce-creds');

function readJson(absOrRel) {
  const abs = path.isAbsolute(absOrRel) ? absOrRel : path.join(ROOT, absOrRel);
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    return null;
  }
}

function loadRegistry() {
  const reg = readJson(REGISTRY_PATH);
  if (!reg || !Array.isArray(reg.products)) {
    throw new Error(`SENTRY registry missing or malformed at ${REGISTRY_PATH}`);
  }
  return reg;
}

function envSatisfied(requiresEnv) {
  if (!Array.isArray(requiresEnv) || requiresEnv.length === 0) return true;
  return requiresEnv.every((name) => String(process.env[name] || '').trim().length > 0);
}

// Map a raw failure signature to a CONCRETE, localizable next action so the
// self-fix planner can author a real target_file step instead of a "reproduce
// then fix" placeholder (SO-002 amendment: every finding carries a real fix, no
// "impossible"). Heuristic + honest fallback — never silent.
function concreteSolution(id, detail, source) {
  const text = String(detail || '');
  const lc = text.toLowerCase();

  // Broken plumbing: an endpoint returned an HTTP error (e.g. dashboard 404s).
  const status = text.match(/\b(4\d\d|5\d\d)\b/);
  const url = text.match(/\/api\/[\w/\-.:]+/);
  if (status && (url || lc.includes('failed to load resource') || lc.includes('http'))) {
    const path = url ? url[0] : 'the failing endpoint';
    return `A request to ${path} returned HTTP ${status[1]}. Find the route module that owns ${path} and ensure it is mounted in the founder-builder runtime lane — prefer config/auto-registered-product-modules.json (auto-register, no composition-root edit). Then confirm the endpoint returns 200 and the dashboard call succeeds.`;
  }

  // Founder-chat quality/intent defects: the chat essays/recites instead of
  // routing to the correct lane (workflow / build / commit-proof).
  const chatSig = ['no workflow content', 'thin answer', 'no builder content', 'missing terminal pass', 'transport/commit proof', 'counsel_only', 'drawer_direct', 'smos_question']
    .some((s) => lc.includes(s) || String(id).toLowerCase().includes(s));
  if (chatSig) {
    return `The founder chat returned counsel/essay text instead of the required response for "${id}". Fix intent routing in routes/lifeos-builderos-command-control-routes.js (POST /founder-interface/message) and the intent services (services/founder-chair-intent.js, services/founder-intent-clarify.js, services/chair-intent-signals.js): classify this prompt into the correct lane (workflow-content / direct-build / counsel) and compose the lane's real response — for build intents emit the build + terminal PASS + commit-proof receipt, not a description of the mechanics.`;
  }

  return `Reproduce "${id}" in the ${source} walkthrough, read the failing assertion's output, and fix the first failing behavior in the module that produces it: ${text.slice(0, 160)}`;
}

// Convert a raw layer receipt (any known shape) into SENTRY findings.
// Handles: a findings-feed object, the Layer-A/Layer-B shapes normalizeSentryFindings
// already understands, and the E2E "results" map (id -> { ok, error/detail }).
function findingsFromReceipt(receipt, source) {
  if (!receipt || typeof receipt !== 'object') return [];
  if (Array.isArray(receipt.findings)) return receipt.findings;

  const findings = normalizeSentryFindings(receipt);

  const results = receipt.results && typeof receipt.results === 'object' ? receipt.results : null;
  if (results) {
    for (const [id, value] of Object.entries(results)) {
      if (!value || typeof value !== 'object' || value.ok === true) continue;
      const detail = String(value.error || value.detail || value.reason || id).slice(0, 400);
      findings.push({
        code: id,
        detail,
        proposed_solution: concreteSolution(id, detail, source),
        proposed_solution_source: 'synthesized',
        severity: 'error',
        source,
      });
    }
  }
  return findings;
}

function runCommand(runArgs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, runArgs, { cwd: ROOT, stdio: 'inherit' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function runHttpLayer(layer) {
  if (!BASE || !KEY) return { ok: false, ran: false, reason: 'no_prod_creds' };
  try {
    const res = await fetch(`${BASE}${layer.path}`, {
      method: layer.method || 'POST',
      headers: { 'content-type': 'application/json', 'x-command-key': KEY },
      body: JSON.stringify(layer.body || {}),
    });
    const body = await res.json().catch(() => ({}));
    const ux = body.uxCritique || {};
    return { ok: res.ok && body.ok === true && ux.verdict !== 'broken', ran: true, raw: body };
  } catch (err) {
    return { ok: false, ran: true, reason: String(err.message || err).slice(0, 200) };
  }
}

async function runLayer(layer) {
  // B-credentialed (API JWT) is the enforce-creds hard gate. UI form login is
  // optional until LIFEOS_FOUNDER_LOGIN_* is in the local shell — mark layers
  // with optionalUnderEnforceCreds so missing form-login env does not FAIL the gate.
  const needsFounderCreds = (layer.requiresEnv || []).some((e) => /LIFEOS_FOUNDER_LOGIN/.test(e));
  const optionalUi = layer.optionalUnderEnforceCreds === true;
  const deferAllowed = layer.deferrableWithoutEnv && (!(ENFORCE_CREDS && needsFounderCreds) || optionalUi);
  const deferred = !envSatisfied(layer.requiresEnv);
  if (deferred && deferAllowed) {
    return { name: layer.name, ran: false, deferred: true, ok: true, findings: [], reason: `env not set: ${(layer.requiresEnv || []).join(', ')}` };
  }
  if (deferred) {
    return { name: layer.name, ran: false, deferred: false, ok: false, findings: [], reason: `required env missing: ${(layer.requiresEnv || []).join(', ')}` };
  }

  if (layer.type === 'command' || layer.type === 'gate-script') {
    const ok = await runCommand(layer.run);
    let findings = [];
    if (layer.type === 'gate-script' && layer.feedFrom) {
      const feed = readJson(layer.feedFrom);
      findings = Array.isArray(feed?.findings) ? feed.findings : [];
    } else if (layer.receipt) {
      findings = findingsFromReceipt(readJson(layer.receipt), `layer-${String(layer.name || '').toLowerCase()}`);
    }
    return { name: layer.name, ran: true, deferred: false, ok, findings };
  }

  if (layer.type === 'http') {
    const r = await runHttpLayer(layer);
    if (!r.ran && layer.deferrableWithoutEnv) {
      return { name: layer.name, ran: false, deferred: true, ok: true, findings: [], reason: r.reason };
    }
    const findings = findingsFromReceipt(r.raw, `layer-${String(layer.name || '').toLowerCase()}`);
    return { name: layer.name, ran: r.ran, deferred: false, ok: r.ok, findings, reason: r.reason };
  }

  return { name: layer.name, ran: false, deferred: false, ok: false, findings: [], reason: `unknown layer type: ${layer.type}` };
}

function emitFeed(product, allFindings) {
  const readiness = toReadinessFindings(allFindings);
  const feed = {
    schema: 'sentry_findings_feed_v1',
    product: product.id,
    generated_at: new Date().toISOString(),
    findings_count: allFindings.length,
    without_solution: allFindings.filter((f) => !f || !f.proposed_solution).length,
    findings: allFindings,
    readiness,
  };
  const out = path.join(ROOT, product.findingsFeed);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(feed, null, 2)}\n`);
  return feed;
}

async function runProduct(product) {
  console.log(`\n══ SENTRY pre-alpha gate · ${product.title} (${product.id}) ══`);
  const layerResults = [];
  const allFindings = [];
  for (const layer of product.layers || []) {
    console.log(`\n▶ Layer ${layer.name} (${layer.kind}, ${layer.type})…`);
    const r = await runLayer(layer);
    // Solution-mandatory: a layer that RAN and FAILED must never be silent. If it
    // produced no structured findings, synthesize one carrying a concrete next step
    // so the self-fix loop always has something to act on.
    if (r.ran && !r.ok && (!Array.isArray(r.findings) || r.findings.length === 0)) {
      r.findings = [{
        code: `layer_${String(layer.name || '').toLowerCase()}_failed`,
        detail: `Layer ${layer.name} (${layer.kind}) failed with no structured finding${r.reason ? `: ${r.reason}` : ''}.`,
        proposed_solution: `Run \`npm run sentry:gate -- ${product.id}\` with prod creds, read the failing layer's output/receipt, and fix the first failing assertion; if the failure is a build/preview timeout, re-run once the async build completes.`,
        proposed_solution_source: 'synthesized',
        severity: 'error',
        source: `layer-${String(layer.name || '').toLowerCase()}`,
      }];
    }
    layerResults.push(r);
    if (Array.isArray(r.findings)) allFindings.push(...r.findings);
    if (r.deferred) console.log(`  Layer ${layer.name}: DEFERRED (${r.reason})`);
    else console.log(`  Layer ${layer.name}: ${r.ok ? 'PASS' : 'FAIL'}${r.reason ? ` (${r.reason})` : ''}`);
  }

  const feed = emitFeed(product, allFindings);
  console.log(`\n▶ Self-fix feed: ${feed.findings_count} finding(s), ${feed.without_solution} without a solution → ${product.findingsFeed}`);

  // Fail-closed: every layer that RAN must pass. Deferred layers (env absent)
  // pass here unless --enforce-creds (founder maturity: credentialed Layer B required).
  const ranLayers = layerResults.filter((r) => r.ran);
  // Only hard-fail enforce-creds when the API credentialed layer deferred —
  // not when optional UI-form layer deferred for missing local password.
  const deferredHardCredLayers = layerResults.filter((r) => {
    if (!r.deferred) return false;
    const layerDef = (product.layers || []).find((l) => l.name === r.name);
    if (layerDef?.optionalUnderEnforceCreds) return false;
    return /B-credentialed|LIFEOS_FOUNDER_LOGIN|COMMAND_CENTER_KEY/i.test(`${r.name} ${r.reason || ''}`);
  });
  let gateOk = layerResults.every((r) => r.ok);
  if (ENFORCE_CREDS && deferredHardCredLayers.length) {
    gateOk = false;
  }
  const fullySatisfied = ranLayers.length === (product.layers || []).length && gateOk && !(ENFORCE_CREDS && deferredHardCredLayers.length);
  const anyDeferred = layerResults.some((r) => r.deferred);

  console.log(`\n── GATE ${product.id}: ${gateOk ? 'PASS' : 'FAIL'}${ENFORCE_CREDS && deferredHardCredLayers.length ? ' (--enforce-creds: credentialed layer deferred)' : anyDeferred ? ' (some layers deferred — run on prod with creds for full proof)' : fullySatisfied ? ' (all layers satisfied)' : ''} ──`);
  return { id: product.id, ok: gateOk, fullySatisfied, findings_count: feed.findings_count, layers: layerResults.map((r) => ({ name: r.name, ok: r.ok, ran: r.ran, deferred: r.deferred })) };
}

// Scoped self-provision (SO-002 amendment, founder-ratified 2026-07-20):
// on the FOUNDER-FACING path only (--enforce-creds), a credentialed layer must
// not fail just because a cred was gettable-but-not-yet-synced. If RAILWAY_TOKEN
// is present we pull the live COMMAND_CENTER_KEY from Railway (the system writing
// its own env) BEFORE deciding to enforce. This is A's benefit scoped to where it
// belongs — NOT applied to bare local/CI runs, which legitimately should not hold
// production secrets. Fail-open: any error leaves the existing defer/enforce logic
// exactly as it was, never fabricates a credential.
async function selfProvisionCredsIfFounderFacing() {
  if (!ENFORCE_CREDS) return;
  const railwayToken = String(process.env.RAILWAY_TOKEN || '').trim();
  if (!railwayToken || !BASE || KEY) return; // nothing to do / cannot reach / already have it
  try {
    const res = await fetch(`${BASE}/api/v1/railway/managed-env/sync-command-key`, {
      method: 'POST',
      headers: { 'x-railway-token': railwayToken },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.ok && body.command_center_key) {
      KEY = body.command_center_key;
      process.env.COMMAND_CENTER_KEY = KEY;
      console.log('  ↻ self-provisioned COMMAND_CENTER_KEY from Railway (enforce-creds path; value hidden)');
    } else {
      console.warn(`  ⚠️ self-provision skipped: sync-command-key returned ${res.status} (falling back to existing enforce logic)`);
    }
  } catch (err) {
    console.warn(`  ⚠️ self-provision skipped: ${String(err.message || err).slice(0, 120)} (falling back to existing enforce logic)`);
  }
}

async function main() {
  const registry = loadRegistry();
  await selfProvisionCredsIfFounderFacing();
  const arg = process.argv[2];

  if (arg === '--list') {
    console.log('Registered SENTRY products:');
    for (const p of registry.products) console.log(`  ${p.id} — ${p.title}`);
    process.exit(0);
  }

  let targets;
  if (arg === '--all' || !arg) {
    targets = registry.products;
  } else {
    const p = registry.products.find((x) => x.id === arg);
    if (!p) {
      console.error(`Unknown product "${arg}". Known: ${registry.products.map((x) => x.id).join(', ')}`);
      process.exit(2);
    }
    targets = [p];
  }

  const summary = [];
  for (const product of targets) {
    summary.push(await runProduct(product));
  }

  console.log('\n══ SENTRY summary ══');
  for (const s of summary) {
    console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.id}  — ${s.findings_count} finding(s)${s.fullySatisfied ? '' : ' (not fully satisfied)'}`);
  }

  const allOk = summary.every((s) => s.ok);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('sentry-prealpha-gate crashed:', err);
  process.exit(1);
});