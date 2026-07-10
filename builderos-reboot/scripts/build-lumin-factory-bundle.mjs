#!/usr/bin/env node
/**
 * SYNOPSIS: Build lumin-factory-bundle/ for clean-repo cutover (portable export). Build lumin-factory-bundle/ for clean-repo cutover (portable export). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUNDLE = path.join(REPO_ROOT, 'lumin-factory-bundle');

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
  p.includes('repo-layout'),
);

function normalizeStandalonePaths(bundleRoot) {
  const queuePath = path.join(bundleRoot, 'MISSION_QUEUE.json');
  if (fs.existsSync(queuePath)) {
    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    for (const entry of queue.missions || []) {
      if (typeof entry.path === 'string') {
        entry.path = entry.path.replace(/^builderos-reboot\/MISSIONS\//, 'missions/');
      }
    }
    fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  }
}

const doctrineSrc = path.join(REPO_ROOT, 'docs/architecture/factory-v1-blueprint-pack');
if (fs.existsSync(doctrineSrc)) {
  copyTree(doctrineSrc, path.join(BUNDLE, 'docs/architecture/factory-v1-blueprint-pack'));
}

for (const doc of ['INDEX.md', 'HANDOFF.md', 'IMPLEMENTATION_GUIDE.md', 'WORKSPACE_STATUS.md', 'MISSION_QUEUE.json', 'CUTOVER_MANIFEST.json', 'READINESS_REPORT.json', 'COMMINGLING_FAILURE_AUDIT.json', 'LUMIN_FACTORY_CUTOVER.md']) {
  const src = path.join(REPO_ROOT, 'builderos-reboot', doc);
  if (fs.existsSync(src)) {
    const destName = doc === 'LUMIN_FACTORY_CUTOVER.md' ? 'README.md' : doc;
    fs.copyFileSync(src, path.join(BUNDLE, destName));
  }
}

const manifest = {
  bundle_id: 'LUMIN-FACTORY-BUNDLE-001',
  built_at: new Date().toISOString(),
  source_repo: 'Lumin-LifeOS',
  target_repo: 'Lumin-Factory',
  entrypoint: 'factory-staging/server.js',
};
fs.writeFileSync(path.join(BUNDLE, 'BUNDLE_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

normalizeStandalonePaths(BUNDLE);

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
