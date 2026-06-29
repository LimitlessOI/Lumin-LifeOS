#!/usr/bin/env node
/**
 * SYNOPSIS: LifeOS Communication OS smoke checks.
 * LifeOS Communication OS smoke checks.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  enrichEvidence,
  parseMeetingJson,
  modeFrame,
  COMM_MODES,
} from '../services/lifeos-communication-os-service.js';
import { buildCommunicationEvidence } from '../services/command-center-communication-service.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;

function assert(cond, msg) {
  if (!cond) { console.error(`✗ ${msg}`); failed += 1; }
  else console.log(`✓ ${msg}`);
}

assert(Object.keys(COMM_MODES).length >= 10, '10 communication modes defined');

const partial = enrichEvidence(buildCommunicationEvidence({
  responseText: 'See routes/foo.js and routes/lifeos-communication-routes.js',
  endpointsUsed: ['POST /api/v1/lifeos/communication/ask'],
  builderMeta: { advisory_only: true },
}));
assert(partial.evidence_status === 'PARTIAL', 'mixed file paths → PARTIAL');
assert(typeof partial.confidence_pct === 'number', 'confidence_pct present');

const meeting = parseMeetingJson('{"turns":[{"speaker":"Lumin","text":"hi","stance":"neutral"}],"disagreements":[]}');
assert(meeting?.turns?.length === 1, 'parseMeetingJson works');

assert(modeFrame('revenue', 'test').includes('REVENUE MODE'), 'revenue mode frame');

const html = fs.readFileSync(path.join(ROOT, 'public/overlay/lifeos-communication.html'), 'utf8');
assert(html.includes('lifeos-communication-os.js'), 'hub HTML loads client');
assert(fs.existsSync(path.join(ROOT, 'routes/lifeos-communication-routes.js')), 'routes file exists');
assert(fs.existsSync(path.join(ROOT, 'db/migrations/20260530_lifeos_communication_os.sql')), 'migration exists');

if (failed) process.exit(1);
console.log('\nAll LifeOS Communication OS checks passed');
