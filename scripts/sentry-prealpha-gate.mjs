#!/usr/bin/env node
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
 * @ssot builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSentryFindings, toReadinessFindings } from '../services/sentry-findings-to-improvement-feed.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = path.join(ROOT, 'builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json');
const BASE = (process.env.PUBLIC_BASE_URL || process.env.SITE_BASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || '';

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
        proposed_solution: `Reproduce "${id}" in the ${source} walkthrough, then fix the first failing behavior: ${detail.slice(0, 160)}`,
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
  const deferred = !envSatisfied(layer.requiresEnv);
  if (deferred && layer.deferrableWithoutEnv) {
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
  // pass here but the gate is only "both layers satisfied" when they actually ran.
  const ranLayers = layerResults.filter((r) => r.ran);
  const gateOk = layerResults.every((r) => r.ok);
  const fullySatisfied = ranLayers.length === (product.layers || []).length && gateOk;
  const anyDeferred = layerResults.some((r) => r.deferred);

  console.log(`\n── GATE ${product.id}: ${gateOk ? 'PASS' : 'FAIL'}${anyDeferred ? ' (some layers deferred — run on prod with creds for full proof)' : fullySatisfied ? ' (all layers satisfied)' : ''} ──`);
  return { id: product.id, ok: gateOk, fullySatisfied, findings_count: feed.findings_count, layers: layerResults.map((r) => ({ name: r.name, ok: r.ok, ran: r.ran, deferred: r.deferred })) };
}

async function main() {
  const registry = loadRegistry();
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
