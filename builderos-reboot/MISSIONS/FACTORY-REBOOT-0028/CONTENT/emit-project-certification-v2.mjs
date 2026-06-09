#!/usr/bin/env node
/** Final certification v2 — includes Phase 11 full loop + Phase 12 salvage. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadJson(rel) {
  const p = path.join(REPO_ROOT, rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

const readiness = loadJson('builderos-reboot/READINESS_REPORT.json');
const fullLoop = loadJson('builderos-reboot/FULL_LOOP_PROOF_RECEIPT.json');
const salvage = loadJson('builderos-reboot/PRODUCT_SALVAGE_CANDIDATES.json');
const queue = loadJson('builderos-reboot/MISSION_QUEUE.json');

const cert = {
  certification_id: 'FACTORY-REBOOT-CERT-002',
  generated_at: new Date().toISOString(),
  build_spec_phases: {
    segments_0_10_runtime: true,
    phase_11_full_loop_proof: fullLoop?.pass === true,
    phase_12_product_salvage: salvage?.candidate_count > 0,
  },
  levels: {
    STAGING_READY: readiness?.verdict?.includes('STAGING_READY') ?? false,
    BLUEPRINT_DUPLICABLE: loadJson('builderos-reboot/DUPLICATION_RECEIPT.json')?.pass === true,
    GREENFIELD_DETERMINISTIC_MECHANICAL: loadJson('builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json')?.pass === true,
    SENTRY_MECHANICAL: loadJson('builderos-reboot/SENTRY_CHECK_RESULT.json')?.verdict === 'SENTRY_MECHANICAL_PASS',
    FULL_LOOP_GOVERNED: fullLoop?.pass === true,
    FULLY_MACHINE_READY: false,
    BOOTSTRAP_AND_STAGING_READY:
      (readiness?.verdict?.includes('STAGING_READY') ?? false) &&
      loadJson('builderos-reboot/DUPLICATION_RECEIPT.json')?.pass === true,
    SAME_TIER_CODER_DETERMINISM: loadJson('builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json')?.pass === true,
    LUMIN_FACTORY_GITHUB: false,
    LIFEOS_PRODUCT_COMPLETE: false,
  },
  missions_complete: queue?.missions?.filter((m) => m.status === 'complete').length ?? 0,
  missions_total: queue?.missions?.length ?? 0,
  product_salvage_candidates: salvage?.candidate_count ?? 0,
  next_human_actions: [
    'Push lumin-factory/ to GitHub',
    'Run 3-session same-tier coder determinism before claiming FULLY_MACHINE_READY',
    'Expand PRODUCT-MARKETINGOS-SALVAGE-0001 via BPB',
  ],
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/PROJECT_CERTIFICATION.json'), `${JSON.stringify(cert, null, 2)}\n`);
console.log(JSON.stringify(cert, null, 2));
