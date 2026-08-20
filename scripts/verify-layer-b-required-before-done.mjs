#!/usr/bin/env node
/**
 * SYNOPSIS: SO-002 mechanical enforcement — a product's BUILD_QUEUE reaching
 * "all steps done/terminal" must never be treated as finished while its own
 * SENTRY Layer B (real-browser human-sim walkthrough) is still a placeholder.
 *
 * Founder directive 2026-08-20: the universal-overlay build loop reported
 * "0 shippable" with every §64 file-authoring step done while
 * SENTRY_PRODUCT_REGISTRY.json's own Layer B entry still said
 * REGISTERED_NOT_IMPLEMENTED -- nothing checked that field before treating
 * the product as exhausted. "Add it to the BP and make it a requirement for
 * all BPs, that's the standard" -- this is that standard, made real and
 * checkable, not just doctrine in a file.
 *
 * Scope, stated honestly: this checks every product that has BOTH a real
 * docs/products/<id>/BUILD_QUEUE.json AND a SENTRY_PRODUCT_REGISTRY.json
 * entry. As of 2026-08-20 that is exactly one product (universal-overlay,
 * per the "one build queue, ever" rule) -- but nothing here is hardcoded to
 * that product. The moment any other product gets a real BUILD_QUEUE.json,
 * this check covers it automatically. A product's queue existing without a
 * SENTRY registry entry at all is a separate, real gap (no gate exists to
 * check) -- this script cannot cover what was never registered, and says so.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layerBGateStatus } from '../services/sentry-layer-b-mandatory-gate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(ROOT, 'docs/products');
const ciMode = process.argv.includes('--ci');
const asJson = process.argv.includes('--json');

const TERMINAL_STATUSES = new Set(['done', 'skipped']);

function listProductIds() {
  try {
    return fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch { return []; }
}

function queueFullyTerminal(productId) {
  const queuePath = path.join(PRODUCTS_DIR, productId, 'BUILD_QUEUE.json');
  if (!fs.existsSync(queuePath)) return null;
  let queue;
  try { queue = JSON.parse(fs.readFileSync(queuePath, 'utf8')); } catch { return null; }
  const steps = Array.isArray(queue.steps) ? queue.steps : [];
  if (steps.length === 0) return null;
  const nonTerminal = steps.filter((s) => !TERMINAL_STATUSES.has(String(s.status || '')));
  return { total: steps.length, nonTerminal: nonTerminal.length, fullyTerminal: nonTerminal.length === 0 };
}

const results = [];
for (const productId of listProductIds()) {
  const queueState = queueFullyTerminal(productId);
  if (!queueState) continue; // no real BUILD_QUEUE.json for this product -- nothing to check
  const gate = layerBGateStatus(productId);
  results.push({ productId, queueState, gate });
}

const violations = results.filter((r) => r.queueState.fullyTerminal && r.gate.registered && !r.gate.satisfied);
const uncoverable = results.filter((r) => r.queueState.fullyTerminal && !r.gate.registered);

if (asJson) {
  console.log(JSON.stringify({ results, violations, uncoverable }, null, 2));
} else {
  console.log(`[layer-b-gate] checked ${results.length} product(s) with a real BUILD_QUEUE.json`);
  for (const r of results) {
    const state = r.queueState.fullyTerminal
      ? (r.gate.registered ? (r.gate.satisfied ? 'PASS' : 'FAIL') : 'UNCOVERABLE (not SENTRY-registered)')
      : `queue not yet exhausted (${r.queueState.nonTerminal}/${r.queueState.total} steps remaining)`;
    console.log(`  ${r.productId}: ${state}`);
  }
  if (violations.length) {
    console.log('');
    console.log('❌ VIOLATIONS -- queue reports fully done/terminal, but SENTRY Layer B is not implemented:');
    for (const v of violations) {
      console.log(`   ${v.productId}: ${v.gate.unimplementedLayers.join(', ')}`);
    }
  }
  if (uncoverable.length) {
    console.log('');
    console.log('⚠️  UNCOVERABLE -- queue reports fully done/terminal, but this product has no SENTRY registry entry at all (separate, real gap -- no gate exists to check):');
    for (const u of uncoverable) console.log(`   ${u.productId}`);
  }
}

if (ciMode && violations.length > 0) {
  console.error(`\n[layer-b-gate] FAIL: ${violations.length} product(s) reported done with an unimplemented Layer B.`);
  process.exit(1);
}
