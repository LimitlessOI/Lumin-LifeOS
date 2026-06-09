#!/usr/bin/env node
/** Emit PROJECT_CERTIFICATION.json with honest claim boundaries. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadJson(rel) {
  const p = path.join(REPO_ROOT, rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

const readiness = loadJson('builderos-reboot/READINESS_REPORT.json');
const sentry = loadJson('builderos-reboot/SENTRY_CHECK_RESULT.json');
const duplication = loadJson('builderos-reboot/DUPLICATION_RECEIPT.json');
const greenfield3x = loadJson('builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json');
const queue = loadJson('builderos-reboot/MISSION_QUEUE.json');

const cert = {
  certification_id: 'FACTORY-REBOOT-CERT-001',
  generated_at: new Date().toISOString(),
  levels: {
    STAGING_READY: readiness?.verdict?.includes('STAGING_READY') ?? false,
    BLUEPRINT_DUPLICABLE: duplication?.pass === true,
    GREENFIELD_DETERMINISTIC_MECHANICAL: greenfield3x?.pass === true,
    SENTRY_MECHANICAL: sentry?.verdict === 'SENTRY_MECHANICAL_PASS',
    FULLY_MACHINE_READY: false,
    LUMIN_FACTORY_GITHUB: false,
    LIFEOS_PRODUCT_COMPLETE: false,
  },
  missions_complete: queue?.missions?.filter((m) => m.status === 'complete').length ?? 0,
  missions_total: queue?.missions?.length ?? 0,
  next_human_actions: [
    'Create GitHub repo Lumin-Factory and push lumin-factory/',
    'Optional: 3-session coder determinism per DETERMINISM_CODER_PROMPT.md',
    'Qualitative SENTRY review via CLAUDE_CODE_SENTRY_REVIEW_PROMPT.md',
  ],
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/PROJECT_CERTIFICATION.json'), `${JSON.stringify(cert, null, 2)}\n`);
console.log(JSON.stringify(cert, null, 2));
