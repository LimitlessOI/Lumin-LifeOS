#!/usr/bin/env node
/**
 * Mechanical enforcement: BP_PRIORITY canonical; Hist domain owns legacy artifacts.
 * Exit 0 = PASS, 1 = FAIL (pre-commit + builder:preflight).
 *
 * @ssot docs/architecture/HIST_LEGACY_SYSTEM_REGISTRY.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BP_PRIORITY_REL,
  loadBpPriority,
  findLegacyQueueProductViolations,
} from '../services/bp-priority-queue.js';
import {
  checkBpReceiptAlignment,
  checkAcceptanceScriptsRequireBpSync,
  checkPassReceiptsHaveBpSyncProof,
  checkStagedProductReceiptCommit,
  checkOrphanProductPassReceipts,
} from '../services/bp-priority-sync.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_CANDIDATES = [
  'builderos-reboot/HIST_DOMAIN_REGISTRY.json',
  'builderos-reboot/LEGACY_PLUMBING_REGISTRY.json',
];
const RECEIPT_REL = 'data/bp-priority-guardrails-last-run.json';
const HIST_LAW = 'prompts/00-HIST-LEGACY-BOUNDARY.md';

const failures = [];
const passes = [];

function fail(id, detail) {
  failures.push({ id, detail });
}

function pass(id, detail = '') {
  passes.push({ id, detail });
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadRegistry() {
  for (const rel of REGISTRY_CANDIDATES) {
    if (fs.existsSync(path.join(ROOT, rel))) {
      const data = JSON.parse(readText(rel));
      if (data._authority?.redirect) continue;
      return { rel, data };
    }
  }
  fail('REGISTRY_MISSING', REGISTRY_CANDIDATES.join(' or '));
  return null;
}

function assertHistAuthority(auth, rel, expectedHistId) {
  if (!auth) {
    fail('HIST_AUTHORITY_MISSING', `${rel} missing _authority`);
    return false;
  }
  if (auth.domain !== 'Hist') {
    fail('HIST_DOMAIN', `${rel} _authority.domain must be Hist`);
    return false;
  }
  if (auth.owner_department !== 'Historian') {
    fail('HIST_OWNER', `${rel} _authority.owner_department must be Historian`);
    return false;
  }
  if (auth.status !== 'HIST_OWNED') {
    fail('HIST_STATUS', `${rel} _authority.status must be HIST_OWNED`);
    return false;
  }
  if (expectedHistId && auth.hist_id !== expectedHistId) {
    fail('HIST_ID_MISMATCH', `${rel} expected hist_id ${expectedHistId}, got ${auth.hist_id || 'none'}`);
    return false;
  }
  if (!auth.canonical_work_queue && !auth.do_not_use_for && !auth.applies_to) {
    fail('HIST_AUTHORITY_INCOMPLETE', `${rel} _authority missing queue pointer or applies_to`);
    return false;
  }
  return true;
}

function checkHistOwnedJson(entry) {
  const rel = typeof entry === 'string' ? entry : entry.path;
  const histId = typeof entry === 'object' ? entry.hist_id : null;
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    fail('HIST_JSON_MISSING', rel);
    return;
  }
  let data;
  try {
    data = JSON.parse(readText(rel));
  } catch (e) {
    fail('HIST_JSON_PARSE', `${rel}: ${e.message}`);
    return;
  }
  if (assertHistAuthority(data._authority, rel, histId)) {
    pass('HIST_JSON_BANNER', `${rel} (${data._authority.hist_id})`);
  }
}

function checkHistOwnedScript(entry) {
  const rel = typeof entry === 'string' ? entry : entry.path;
  const histId = typeof entry === 'object' ? entry.hist_id : null;
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    fail('HIST_SCRIPT_MISSING', rel);
    return;
  }
  const head = readText(rel).slice(0, 700);
  if (!/HIST DOMAIN|Hist domain|Historian owns/i.test(head)) {
    fail('HIST_SCRIPT_BANNER', `${rel} header must declare Hist domain / Historian ownership`);
    return;
  }
  if (!/BP_PRIORITY\.json/.test(head)) {
    fail('HIST_SCRIPT_POINTER', `${rel} header must cite builderos-reboot/BP_PRIORITY.json`);
    return;
  }
  if (histId && !head.includes(histId)) {
    fail('HIST_SCRIPT_ID', `${rel} header should cite ${histId}`);
    return;
  }
  pass('HIST_SCRIPT_BANNER', `${rel}${histId ? ` (${histId})` : ''}`);
}

function checkHistOwnedSidecars(registry) {
  for (const entry of registry?.hist_owned_json_sidecars || registry?.legacy_json_sidecars || []) {
    checkHistOwnedJson({ path: entry.meta_file, hist_id: entry.hist_id });
  }
}

function isAllowlistedMissionQueueRef(relPath, registry) {
  const allow = registry?.mission_queue_reference_allowlist_prefixes || [];
  return allow.some((prefix) => relPath.startsWith(prefix) || relPath === prefix.replace(/\/$/, ''));
}

function walkFiles(dirRel, out = []) {
  const dir = path.join(ROOT, dirRel);
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const rel = path.join(dirRel, name).replace(/\\/g, '/');
    const stat = fs.statSync(path.join(ROOT, rel));
    if (stat.isDirectory()) walkFiles(rel, out);
    else if (/\.(js|mjs|cjs|ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

function checkMissionQueueReferences(registry) {
  if (!registry) return;
  const needle = 'MISSION_QUEUE.json';
  for (const root of registry.forbidden_mission_queue_scan_roots || []) {
    for (const rel of walkFiles(root)) {
      if (isAllowlistedMissionQueueRef(rel, registry)) continue;
      if (readText(rel).includes(needle)) {
        fail('MISSION_QUEUE_FORBIDDEN_REF', `${rel} references ${needle} — Hist-owned; use ${BP_PRIORITY_REL}`);
      }
    }
  }
  if (!failures.some((f) => f.id === 'MISSION_QUEUE_FORBIDDEN_REF')) {
    pass('MISSION_QUEUE_SPINE_SCAN');
  }
}

function checkBpPriorityShape() {
  try {
    const bp = loadBpPriority({ root: ROOT });
    if (bp._authority?.domain === 'Hist') {
      fail('BP_PRIORITY_NOT_HIST', `${BP_PRIORITY_REL} must not be Hist domain — active product queue`);
    }
    const ranks = bp.items.map((i) => i.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        fail('BP_PRIORITY_RANKS', `ranks must be 1..n sequential; got ${ranks.join(',')}`);
        break;
      }
    }
    for (const item of bp.items) {
      if (!item.mission_id || !item.founder_packet || !item.acceptance_command) {
        fail('BP_PRIORITY_ITEM', `rank ${item.rank} missing mission_id/founder_packet/acceptance_command`);
      }
      if (!fs.existsSync(path.join(ROOT, item.founder_packet))) {
        fail('BP_PRIORITY_FOUNDER_PACKET', `missing ${item.founder_packet}`);
      }
    }
    pass('BP_PRIORITY_SHAPE', `items=${bp.items.length}`);
  } catch (e) {
    fail('BP_PRIORITY_LOAD', e.message);
  }
}

function checkLegacyQueueProductMissions() {
  const violations = findLegacyQueueProductViolations({ root: ROOT });
  for (const v of violations) {
    fail('HIST_QUEUE_ACTIVE_PRODUCT', v.message);
  }
  if (!violations.length) pass('HIST_QUEUE_NO_ACTIVE_PRODUCT');
}

function checkBpPriorityCoversActiveProducts(registry) {
  if (!registry) return;
  const pattern = new RegExp(registry.product_mission_id_pattern || '^PRODUCT-');
  let queue;
  try {
    queue = JSON.parse(readText('builderos-reboot/MISSION_QUEUE.json'));
  } catch {
    return;
  }
  let bp;
  try {
    bp = loadBpPriority({ root: ROOT });
  } catch {
    return;
  }
  const bpIds = new Set(bp.items.map((i) => i.mission_id));
  const archived = new Set(['complete', 'archived', 'archived_to_bp_priority']);
  for (const m of queue.missions || []) {
    if (!pattern.test(String(m.mission_id || ''))) continue;
    if (archived.has(String(m.status || '').toLowerCase())) continue;
    if (!bpIds.has(m.mission_id)) {
      fail('BP_PRIORITY_COVERAGE', `active PRODUCT ${m.mission_id} in Hist MISSION_QUEUE but not in ${BP_PRIORITY_REL}`);
    }
  }
  if (!failures.some((f) => f.id === 'BP_PRIORITY_COVERAGE')) {
    pass('BP_PRIORITY_COVERS_ACTIVE_PRODUCT_MISSIONS');
  }
}

function checkHistLawPresent() {
  if (!fs.existsSync(path.join(ROOT, HIST_LAW))) {
    fail('HIST_LAW_MISSING', HIST_LAW);
    return;
  }
  pass('HIST_LAW', HIST_LAW);
}

function writeReceipt(payload) {
  const out = path.join(ROOT, RECEIPT_REL);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
}

function main() {
  const stagedMode = process.argv.includes('--staged');
  const loaded = loadRegistry();
  const registry = loaded?.data;
  checkHistLawPresent();
  checkBpPriorityShape();
  checkLegacyQueueProductMissions();
  checkBpPriorityCoversActiveProducts(registry);

  for (const f of checkBpReceiptAlignment({ root: ROOT })) {
    fail(f.id, f.detail);
  }
  if (!failures.some((x) => x.id.startsWith('BP_RECEIPT') || x.id.startsWith('BP_OBJECTIVE'))) {
    pass('BP_RECEIPT_ALIGNMENT');
  }

  for (const f of checkAcceptanceScriptsRequireBpSync({ root: ROOT })) {
    fail(f.id, f.detail);
  }
  if (!failures.some((x) => x.id.startsWith('BP_ACCEPTANCE'))) {
    pass('BP_ACCEPTANCE_SYNC_WIRED');
  }

  for (const f of checkPassReceiptsHaveBpSyncProof({ root: ROOT })) {
    fail(f.id, f.detail);
  }
  if (!failures.some((x) => x.id.startsWith('BP_RECEIPT_NO_SYNC') || x.id.startsWith('BP_FINGERPRINT'))) {
    pass('BP_PASS_RECEIPT_SYNC_PROOF');
  }

  for (const f of checkOrphanProductPassReceipts({ root: ROOT })) {
    fail(f.id, f.detail);
  }
  if (!failures.some((x) => x.id.startsWith('BP_ORPHAN_PASS') || x.id.startsWith('BP_RECEIPT_PARSE'))) {
    pass('BP_NO_ORPHAN_PASS_RECEIPTS');
  }

  if (stagedMode) {
    for (const f of checkStagedProductReceiptCommit({ root: ROOT })) {
      fail(f.id, f.detail);
    }
    if (!failures.some((x) => x.id.startsWith('BP_STAGED'))) {
      pass('BP_STAGED_CO_COMMIT');
    }
  }

  const jsonFiles = registry?.hist_owned_json_files || registry?.legacy_json_files || [];
  const scriptFiles = registry?.hist_owned_script_files || registry?.legacy_script_files || [];
  for (const entry of jsonFiles) checkHistOwnedJson(entry);
  for (const entry of scriptFiles) checkHistOwnedScript(entry);
  checkHistOwnedSidecars(registry);
  checkMissionQueueReferences(registry);

  const verdict = failures.length === 0 ? 'PASS' : 'FAIL';
  const payload = {
    schema: 'bp_priority_guardrails_v1',
    checked_at: new Date().toISOString(),
    verdict,
    owner_department: 'Historian',
    registry: loaded?.rel || null,
    pass_count: passes.length,
    fail_count: failures.length,
    passes,
    failures,
    canonical_work_queue: BP_PRIORITY_REL,
  };
  writeReceipt(payload);

  if (verdict === 'FAIL') {
    console.error(`\n❌ BP PRIORITY / HIST GUARDRAILS: FAIL (${failures.length} violation(s))\n`);
    for (const f of failures) {
      console.error(`  [${f.id}] ${f.detail}`);
    }
    console.error(`\nHist law: ${HIST_LAW}`);
    console.error(`Fix and re-run: npm run lifeos:bp-priority:verify\n`);
    process.exit(1);
  }

  console.log(`✅ BP PRIORITY / HIST GUARDRAILS: PASS (${passes.length} checks)`);
  process.exit(0);
}

main();
