#!/usr/bin/env node
/**
 * SYNOPSIS: Build lumin-factory-bundle/ for clean-repo cutover (portable export). Build lumin-factory-bundle/ for clean-repo cutover (portable export). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUNDLE = path.join(REPO_ROOT, 'lumin-factory-bundle');
const PREFIX_FROM = 'builderos-reboot/MISSIONS/';
const PREFIX_TO = 'missions/';

function copyTree(src, dest, filter) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(s, d, filter);
    else if (!filter || filter(s)) fs.copyFileSync(s, d);
  }
}

function rewriteStandaloneStrings(value) {
  if (typeof value === 'string') {
    if (value.startsWith(PREFIX_FROM)) return PREFIX_TO + value.slice(PREFIX_FROM.length);
    if (value.startsWith('builderos-reboot/')) return value.slice('builderos-reboot/'.length);
    return value;
  }
  if (Array.isArray(value)) return value.map(rewriteStandaloneStrings);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewriteStandaloneStrings(v)]));
  }
  return value;
}

function normalizeAcceptancePaths(bundleRoot) {
  const missionsDir = path.join(bundleRoot, 'missions');
  if (!fs.existsSync(missionsDir)) return;
  for (const missionId of fs.readdirSync(missionsDir)) {
    const acceptancePath = path.join(missionsDir, missionId, 'ACCEPTANCE_TESTS.json');
    if (!fs.existsSync(acceptancePath)) continue;
    const tests = rewriteStandaloneStrings(JSON.parse(fs.readFileSync(acceptancePath, 'utf8')));
    fs.writeFileSync(acceptancePath, `${JSON.stringify(tests, null, 2)}\n`);
  }
}

function normalizeBlueprintPaths(bundleRoot) {
  const missionsDir = path.join(bundleRoot, 'missions');
  if (!fs.existsSync(missionsDir)) return;
  for (const missionId of fs.readdirSync(missionsDir)) {
    const missionPath = path.join(missionsDir, missionId);
    if (!fs.statSync(missionPath).isDirectory()) continue;
    const blueprintPath = path.join(missionPath, 'BLUEPRINT.json');
    if (!fs.existsSync(blueprintPath)) continue;
    const blueprint = rewriteStandaloneStrings(JSON.parse(fs.readFileSync(blueprintPath, 'utf8')));
    fs.writeFileSync(blueprintPath, `${JSON.stringify(blueprint, null, 2)}\n`);
  }
}

function normalizeStandalonePaths(bundleRoot) {
  const queuePath = path.join(bundleRoot, 'MISSION_QUEUE.json');
  if (fs.existsSync(queuePath)) {
    const queue = rewriteStandaloneStrings(JSON.parse(fs.readFileSync(queuePath, 'utf8')));
    fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  }
}

if (fs.existsSync(BUNDLE)) fs.rmSync(BUNDLE, { recursive: true, force: true });
fs.mkdirSync(BUNDLE, { recursive: true });

copyTree(path.join(REPO_ROOT, 'factory-staging'), path.join(BUNDLE, 'factory-staging'));
copyTree(path.join(REPO_ROOT, 'builderos-reboot/MISSIONS'), path.join(BUNDLE, 'missions'));
copyTree(path.join(REPO_ROOT, 'builderos-reboot/scripts'), path.join(BUNDLE, 'scripts'), (p) =>
  p.includes('factory') ||
  p.includes('autopilot') ||
  p.includes('export') ||
  p.includes('readiness') ||
  p.includes('determinism') ||
  p.includes('mission') ||
  p.includes('compare-run') ||
  p.includes('repo-layout') ||
  p.includes('cutover') ||
  p.includes('greenfield') ||
  p.includes('product-salvage') ||
  p.includes('emit-project') ||
  p.includes('tier1') ||
  p.includes('verify-tier1') ||
  p.includes('full-loop') ||
  p.includes('run-sentry') ||
  p.includes('generate-'),
);

const doctrineSrc = path.join(REPO_ROOT, 'docs/architecture/factory-v1-blueprint-pack');
if (fs.existsSync(doctrineSrc)) {
  copyTree(doctrineSrc, path.join(BUNDLE, 'docs/architecture/factory-v1-blueprint-pack'));
}

const vocabularySrc = path.join(REPO_ROOT, 'docs/BUILDEROS_VOCABULARY.md');
if (fs.existsSync(vocabularySrc)) {
  fs.mkdirSync(path.join(BUNDLE, 'docs'), { recursive: true });
  fs.copyFileSync(vocabularySrc, path.join(BUNDLE, 'docs/BUILDEROS_VOCABULARY.md'));
}

if (fs.existsSync(path.join(REPO_ROOT, 'builderos-reboot/README.md'))) {
  fs.copyFileSync(path.join(REPO_ROOT, 'builderos-reboot/README.md'), path.join(BUNDLE, 'README.md'));
}

for (const doc of ['INDEX.md', 'HANDOFF.md', 'IMPLEMENTATION_GUIDE.md', 'WORKSPACE_STATUS.md', 'MISSION_QUEUE.json', 'CURRENT_STATE.json', 'CUTOVER_MANIFEST.json', 'COMMINGLING_FAILURE_AUDIT.json', 'PARTS_CAR_MANIFEST.json', 'DETERMINISM_CODER_PROMPT.md', 'EVALUATION_PACKET.md', 'TSOS_FACTORY_INTEGRATION.md']) {
  const src = path.join(REPO_ROOT, 'builderos-reboot', doc);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(BUNDLE, doc));
  }
}

const cutoverReadmeSrc = path.join(
  REPO_ROOT,
  'builderos-reboot/MISSIONS/FACTORY-REBOOT-0019/CONTENT/lumin-factory-root-README.md',
);
if (fs.existsSync(cutoverReadmeSrc)) {
  fs.copyFileSync(cutoverReadmeSrc, path.join(BUNDLE, 'LUMIN_FACTORY_CUTOVER.md'));
} else if (fs.existsSync(path.join(REPO_ROOT, 'builderos-reboot/LUMIN_FACTORY_CUTOVER.md'))) {
  fs.copyFileSync(path.join(REPO_ROOT, 'builderos-reboot/LUMIN_FACTORY_CUTOVER.md'), path.join(BUNDLE, 'LUMIN_FACTORY_CUTOVER.md'));
}

const operatorComplete = path.join(
  REPO_ROOT,
  'builderos-reboot/MISSIONS/FACTORY-REBOOT-0025/CONTENT/OPERATOR_COMPLETE.md',
);
if (fs.existsSync(operatorComplete)) {
  fs.copyFileSync(operatorComplete, path.join(BUNDLE, 'OPERATOR_COMPLETE.md'));
}

for (const receipt of [
  'DETERMINISM_RECEIPT.json',
  'DUPLICATION_RECEIPT.json',
  'GREENFIELD_DETERMINISM_RECEIPT.json',
  'QUEUE_DRY_RUN_RECEIPT.json',
  'FULL_LOOP_PROOF_RECEIPT.json',
]) {
  const src = path.join(REPO_ROOT, 'builderos-reboot', receipt);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(BUNDLE, receipt));
}

normalizeStandalonePaths(BUNDLE);
normalizeBlueprintPaths(BUNDLE);
normalizeAcceptancePaths(BUNDLE);

function refreshAcceptanceSha256(bundleRoot) {
  const missionsDir = path.join(bundleRoot, 'missions');
  if (!fs.existsSync(missionsDir)) return;
  function sha(abs) {
    return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  }
  for (const missionId of fs.readdirSync(missionsDir)) {
    const acceptancePath = path.join(missionsDir, missionId, 'ACCEPTANCE_TESTS.json');
    if (!fs.existsSync(acceptancePath)) continue;
    const tests = JSON.parse(fs.readFileSync(acceptancePath, 'utf8'));
    if (!Array.isArray(tests)) continue;
    let changed = false;
    for (const test of tests) {
      if (test.type === 'file_sha256_matches' && test.target) {
        const abs = path.join(bundleRoot, test.target);
        if (fs.existsSync(abs)) {
          const got = sha(abs);
          if (test.expected_sha256 !== got) {
            test.expected_sha256 = got;
            changed = true;
          }
        }
      }
    }
    if (changed) fs.writeFileSync(acceptancePath, `${JSON.stringify(tests, null, 2)}\n`);
  }
}

refreshAcceptanceSha256(BUNDLE);

const manifest = {
  bundle_id: 'LUMIN-FACTORY-BUNDLE-001',
  built_at: new Date().toISOString(),
  source_repo: 'Lumin-LifeOS',
  target_repo: 'Lumin-Factory',
  entrypoint: 'factory-staging/server.js',
};
fs.writeFileSync(path.join(BUNDLE, 'BUNDLE_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

let files = 0;
function count(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) count(f);
    else files++;
  }
}
count(BUNDLE);
console.log(`Built lumin-factory-bundle with ${files} files at ${BUNDLE}`);
