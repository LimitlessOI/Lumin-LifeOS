#!/usr/bin/env node
/**
 * SYNOPSIS: HARD verify canonical product-home enforcement (lifeos + lifere).
 * @ssot docs/products/PRODUCT_REGISTRY.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditManifestOwnedSources,
  auditProductPrompts,
  auditMissionContentHistoryMarkers,
  auditAuthorityBoundaryMarkers,
  loadProductManifests,
} from './lib/product-home-enforce.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function fail(msg) {
  console.error(`PRODUCT_HOME_VERIFY_FAIL: ${msg}`);
  process.exit(1);
}

// Canonical homes + manifests must exist
for (const id of ['lifeos', 'lifere']) {
  const home = `docs/products/${id}/PRODUCT_HOME.md`;
  const manifest = `docs/products/${id}/FILE_MANIFEST.json`;
  if (!fs.existsSync(path.join(ROOT, home))) fail(`Missing ${home}`);
  if (!fs.existsSync(path.join(ROOT, manifest))) fail(`Missing ${manifest}`);
}

// Flat stubs must remain redirects, not competing specs
for (const stub of ['docs/products/LIFEOS.md', 'docs/products/LIFERE.md']) {
  const text = read(stub);
  if (!text.includes('redirect stub')) fail(`${stub} must remain a redirect stub`);
  if (!text.includes('PRODUCT_HOME.md')) fail(`${stub} must point at PRODUCT_HOME.md`);
}

const registry = JSON.parse(read('docs/products/PRODUCT_REGISTRY.json'));
for (const p of registry.products || []) {
  if (p.product_id !== 'lifeos' && p.product_id !== 'lifere') continue;
  if (p.canonical_home && !fs.existsSync(path.join(ROOT, p.canonical_home))) {
    fail(`PRODUCT_REGISTRY missing canonical home: ${p.canonical_home}`);
  }
}

const manifests = loadProductManifests(ROOT);

// Hard violations only (flat-stub, foreign-amendment, unexpected) — not migration debt
const drift = [
  ...auditManifestOwnedSources(manifests, ROOT),
  ...auditProductPrompts(ROOT),
  ...auditMissionContentHistoryMarkers(ROOT),
  ...auditAuthorityBoundaryMarkers(ROOT),
];
if (drift.length) {
  for (const v of drift) {
    console.error(`  ${v.file} [${v.product_id}] ${v.kind}`);
  }
  fail(`${drift.length} product-home drift violation(s)`);
}

// Migration debt report (informational — does not fail)
const debt = auditManifestOwnedSources(manifests, ROOT, { includeDebt: true });
const debtOnly = debt.filter((v) => !drift.some((d) => d.file === v.file && d.kind === v.kind));
if (debtOnly.length) {
  console.log(`INFO: ${debtOnly.length} migration-debt file(s) (amendment-first or missing @ssot — not blocking)`);
}

const pkg = JSON.parse(read('package.json'));
const preflight = pkg.scripts['builder:preflight'] || '';
if (!preflight.includes('lifeos:product-home:verify') && !preflight.includes('verify-product-home.mjs')) {
  fail('builder:preflight must include lifeos:product-home:verify');
}

console.log('PRODUCT_HOME_VERIFY: PASS');
process.exit(0);
