#!/usr/bin/env node
/**
 * SYNOPSIS: HARD verify LifeOS service doctrine wired across LifeOS + stack proxies.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function fail(msg) {
  console.error(`LIFEOS_SERVICE_DOCTRINE_FAIL: ${msg}`);
  process.exit(1);
}

const required = JSON.parse(read('builderos-reboot/governance/LIFEOS_SERVICE_DOCTRINE_RUNTIME.json')).required_artifacts;
for (const rel of required) {
  if (!fs.existsSync(path.join(ROOT, rel))) fail(`Missing required artifact: ${rel}`);
}

const am21 = read('docs/products/lifeos/PRODUCT_HOME.md');
if (!am21.includes('LIFEOS_SERVICE_AND_EPISTEMOLOGY_DOCTRINE')) {
  fail('AMENDMENT_21 must reference LIFEOS_SERVICE_AND_EPISTEMOLOGY_DOCTRINE');
}

const amLifere = read('docs/products/lifere/PRODUCT_HOME.md');
if (!amLifere.includes('LIFEOS_SERVICE_AND_EPISTEMOLOGY_DOCTRINE')) {
  fail('AMENDMENT_LIFERE must proxy LifeOS service doctrine');
}

const pkg = JSON.parse(read('package.json'));
const preflight = pkg.scripts['builder:preflight'] || '';
if (!preflight.includes('lifeos:service-doctrine:verify') && !preflight.includes('verify-lifeos-service-doctrine.mjs')) {
  fail('builder:preflight must include lifeos:service-doctrine:verify');
}

const matrix = JSON.parse(read('builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json'));
if (!(matrix.gates || []).some((g) => g.gate_id === 'LIFEOS_SERVICE_DOCTRINE')) {
  fail('GATE_ENFORCEMENT_MATRIX missing LIFEOS_SERVICE_DOCTRINE gate');
}

const ccRoutes = read('routes/lifeos-builderos-command-control-routes.js');
if (!ccRoutes.includes('lifeos-service-doctrine')) {
  fail('command-control routes must import lifeos-service-doctrine prompt block');
}

const stackReg = JSON.parse(read('config/lifeos-stack-registry.json'));
const lifere = stackReg.stacks?.find((s) => s.stack_id === 'lifere');
if (!lifere || lifere.is_separate_product !== false) {
  fail('lifere stack must exist with is_separate_product: false');
}

const fpTemplate = read(
  'builderos-reboot/MISSIONS/FACTORY-REBOOT-0002/ARTIFACTS/factory-core/founder-packet/FOUNDER_PACKET_SLIM_TEMPLATE.md'
);
for (const field of ['ASSUMPTIONS', 'NOT_THIS', 'ALWAYS']) {
  if (!fpTemplate.includes(field)) fail(`Founder packet template missing ${field}`);
}

const agentContract = read('prompts/00-LIFEOS-AGENT-CONTRACT.md');
if (!agentContract.includes('00-LIFEOS-SERVICE-DOCTRINE')) {
  fail('00-LIFEOS-AGENT-CONTRACT must reference 00-LIFEOS-SERVICE-DOCTRINE');
}

const lifereBridge = read('services/lifere-socialmediaos-bridge.js');
if (!lifereBridge.includes('lifeos-service-doctrine')) {
  fail('lifere-socialmediaos-bridge must import lifeos-service-doctrine');
}

const chairUnified = read('services/chair-lumin-unified.js');
if (!chairUnified.includes('lifeos-service-doctrine')) {
  fail('chair-lumin-unified must import lifeos-service-doctrine prompt block');
}

if (!fs.existsSync(path.join(ROOT, 'services/lifere-content-brief-engine.js'))) {
  fail('lifere-content-brief-engine.js required for SMOS brief-first law');
}

console.log('LIFEOS_SERVICE_DOCTRINE_VERIFY: PASS');
process.exit(0);
