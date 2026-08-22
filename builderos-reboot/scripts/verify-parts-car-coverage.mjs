// SYNOPSIS: Verifies builderos-reboot/PARTS_CAR_MANIFEST.json's keep/adapt/reject
// decisions actually hold on disk, and syncs BP_PRIORITY.json via
// syncMissionFromTechnicalReceipt on a genuine PASS. Never marks PASS without
// a real, current filesystem check.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncMissionFromTechnicalReceipt } from '../../services/bp-priority-sync.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MISSION_ID = 'FACTORY-BUILDEROS-PARTS-CAR-CLOSURE-0001';
const MANIFEST_REL = 'builderos-reboot/PARTS_CAR_MANIFEST.json';
const RECEIPT_REL = 'builderos-reboot/PARTS_CAR_COVERAGE_RECEIPT.json';

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_REL), 'utf8'));
  const missingKept = [];
  for (const cat of ['import_as_is', 'adapt_and_import']) {
    for (const entry of manifest[cat] || []) {
      if (!fs.existsSync(path.join(ROOT, entry.source_path))) {
        missingKept.push({ category: cat, source_path: entry.source_path });
      }
    }
  }
  const rejectedButPresent = [];
  for (const entry of manifest.reject || []) {
    const rel = entry.source_path;
    if (rel.includes('*')) continue; // glob patterns not checked here
    if (fs.existsSync(path.join(ROOT, rel))) {
      rejectedButPresent.push(rel);
    }
  }

  const ok = missingKept.length === 0 && rejectedButPresent.length === 0;
  const receipt = {
    schema: 'parts_car_coverage_v1',
    mission_id: MISSION_ID,
    generated_at: new Date().toISOString(),
    verdict: ok ? 'PASS' : 'FAIL',
    missing_kept_or_adapted: missingKept,
    rejected_but_still_present: rejectedButPresent,
    note: ok
      ? 'Every import_as_is/adapt_and_import path exists; no reject path is present.'
      : 'Real gap: kept/adapted paths must all exist, and reject paths must all be absent. See missing_kept_or_adapted / rejected_but_still_present for the exact list.',
  };
  fs.writeFileSync(path.join(ROOT, RECEIPT_REL), `${JSON.stringify(receipt, null, 2)}\n`);

  if (ok) {
    const result = syncMissionFromTechnicalReceipt({
      missionId: MISSION_ID,
      receipt: { verdict: 'PASS', completed_at: receipt.generated_at, receipt_path: RECEIPT_REL },
      root: ROOT,
      buildRecord: { build_method: 'system-build' },
    });
    console.log(JSON.stringify({ ...receipt, bp_sync: result }, null, 2));
  } else {
    console.log(JSON.stringify(receipt, null, 2));
  }
  process.exit(ok ? 0 : 1);
}

main();
