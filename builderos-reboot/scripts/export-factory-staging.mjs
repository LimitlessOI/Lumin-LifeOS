#!/usr/bin/env node
/** Export manifest for Lumin-Factory repo cutover. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STAGING = path.join(REPO_ROOT, 'factory-staging');

function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else out.push(path.relative(REPO_ROOT, full).replace(/\\/g, '/'));
  }
  return out.sort();
}

const files = fs.existsSync(STAGING) ? walkFiles(STAGING) : [];
const manifest = {
  export_id: 'FACTORY-STAGING-EXPORT-001',
  generated_at: new Date().toISOString(),
  source_repo: 'Lumin-LifeOS',
  target_repo: 'Lumin-Factory',
  file_count: files.length,
  files: files.map((rel) => {
    const abs = path.join(REPO_ROOT, rel);
    const buf = fs.readFileSync(abs);
    return { path: rel, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
  }),
  missions_included: [
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0001',
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0002',
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0003',
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0004',
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0005',
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0006',
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0007',
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0008',
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0009',
    'builderos-reboot/MISSIONS/FACTORY-REBOOT-0010',
  ],
};

const outPath = path.join(REPO_ROOT, 'builderos-reboot/CUTOVER_MANIFEST.json');
fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${manifest.file_count} files to ${outPath}`);
