#!/usr/bin/env node
/**
 * SYNOPSIS: Smoke + proof-guard checks for Command Center communication UX.
 * Smoke + proof-guard checks for Command Center communication UX.
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCommunicationEvidence,
  detectPlaceholderClaims,
  verifyRepoFilePaths,
} from '../services/command-center-communication-service.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    failed += 1;
  } else {
    console.log(`✓ ${msg}`);
  }
}

const htmlPath = path.join(ROOT, 'public/overlay/lifeos-command-center.html');
const html = fs.readFileSync(htmlPath, 'utf8');

assert(html.includes('command-center-communication.js'), 'HTML loads communication script');
assert(html.includes('id="cc-comm-mode"'), 'mode selector present');
assert(html.includes('id="cc-voice-record"'), 'voice record button present');
assert(html.includes('data-cc-help'), 'help attributes present');
assert(html.includes('CcComm.askCouncil()'), 'Ask Council wired to CcComm');
assert(!html.includes('onclick="askCouncil()"'), 'legacy askCouncil removed');

const jsPath = path.join(ROOT, 'public/overlay/command-center-communication.js');
const js = fs.readFileSync(jsPath, 'utf8');
assert(js.includes('cc-tooltip'), 'tooltip UI in JS');
assert(js.includes('longPressTimer'), 'long-press handler present');
assert(js.includes('SpeechRecognition'), 'Web Speech API referenced');

const placeholder = buildCommunicationEvidence({
  responseText: 'Edit currentRepo/chatInterface.js for the chat UI.',
  endpointsUsed: ['POST /api/v1/lifeos/builder/task'],
  builderMeta: { advisory_only: true, execution_only: true },
});
assert(placeholder.evidence_status === 'UNVERIFIED', 'placeholder path → UNVERIFIED');
assert(placeholder.placeholder_warnings.length > 0, 'placeholder warning emitted');

const realFile = 'routes/lifeos-command-center-routes.js';
const verified = buildCommunicationEvidence({
  responseText: `Route lives in ${realFile} at POST /api/v1/lifeos/command-center/communications/record`,
  endpointsUsed: ['POST /api/v1/lifeos/command-center/communications/record'],
  builderMeta: { committed: true, commit_sha: 'abc123' },
});
assert(verified.files_checked.some((f) => f.path === realFile && f.exists), 'real file verified on disk');
assert(verified.evidence_status === 'VERIFIED', 'committed + real file + endpoints → VERIFIED');

assert(detectPlaceholderClaims('currentRepo/foo.js').length > 0, 'detectPlaceholderClaims works');
assert(verifyRepoFilePaths([realFile])[0].exists, 'verifyRepoFilePaths works');

assert(
  fs.existsSync(path.join(ROOT, 'db/migrations/20260529_command_center_communications.sql')),
  'migration file exists',
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll command-center communication checks passed');
