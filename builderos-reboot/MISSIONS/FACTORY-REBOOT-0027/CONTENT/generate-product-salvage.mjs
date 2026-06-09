#!/usr/bin/env node
/** Phase 12: emit PRODUCT_SALVAGE_CANDIDATES.json from amendment registry. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const amendmentsDir = path.join(REPO_ROOT, 'docs/projects');
const candidates = [];

if (fs.existsSync(amendmentsDir)) {
  for (const name of fs.readdirSync(amendmentsDir)) {
    if (!name.startsWith('AMENDMENT_') || !name.endsWith('.md')) continue;
    const full = path.join(amendmentsDir, name);
    const text = fs.readFileSync(full, 'utf8');
    const titleMatch = text.match(/^#\s+(.+)/m);
    const backlog = text.includes('## Approved Product Backlog');
    candidates.push({
      amendment_file: `docs/projects/${name}`,
      title: titleMatch?.[1]?.trim() || name,
      has_backlog: backlog,
      salvage_priority: backlog ? 'high' : 'medium',
      factory_ready: false,
      note: 'Requires BPB mission pack before coder execution',
    });
  }
}

candidates.sort((a, b) => (a.salvage_priority === 'high' ? -1 : 1));

const out = {
  generated_at: new Date().toISOString(),
  spec: 'Phase 12 — Product mission salvage',
  candidate_count: candidates.length,
  first_product_mission: 'PRODUCT-MARKETINGOS-SALVAGE-0001',
  candidates,
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/PRODUCT_SALVAGE_CANDIDATES.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ candidate_count: candidates.length, first: out.first_product_mission }, null, 2));
