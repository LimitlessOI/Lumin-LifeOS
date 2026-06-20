#!/usr/bin/env node
/**
 * Direct terminal intake: raw founder text -> BuilderOS mission -> Chair pre-handoff/system path.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../factory-staging/factory-core/builder/run-step.js';
import { runDevelopmentStage, runFoundationPipeline } from '../factory-staging/factory-core/arc/run-foundation.js';

const MISSIONS_ROOT = path.join(REPO_ROOT, 'builderos-reboot', 'MISSIONS');

function usage() {
  console.error(
    [
      'Usage:',
      '  node scripts/run-founder-intake-direct.mjs --text "raw founder notes" [--mission-id ID] [--stage development|system] [--force]',
      '  node scripts/run-founder-intake-direct.mjs --text-file /abs/path/notes.txt [--mission-id ID] [--stage development|system] [--force]',
    ].join('\n'),
  );
}

function parseArgs(argv) {
  const args = { stage: 'development', force: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--text') args.text = argv[++i];
    else if (token === '--text-file') args.textFile = argv[++i];
    else if (token === '--mission-id') args.missionId = argv[++i];
    else if (token === '--stage') args.stage = String(argv[++i] || '').toLowerCase();
    else if (token === '--force') args.force = true;
    else if (token === '--help' || token === '-h') args.help = true;
  }
  return args;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function toMissionId(rawMissionId, text) {
  if (rawMissionId) return rawMissionId;
  const t = String(text || '').toUpperCase();
  const lane =
    /\bSOCIAL|MARKETING|CONTENT|YOUTUBE|VIDEO\b/.test(t)
      ? 'SOCIALMEDIAOS'
      : /\bVOICE|CALL|AUDIO\b/.test(t)
        ? 'VOICE'
        : 'FOUNDER';
  return `BUILDEROS-DIRECT-INTAKE-${lane}-${timestampSlug()}`;
}

function ensureRawFounderPacket(missionFolder, missionId, text) {
  fs.mkdirSync(path.join(missionFolder, 'receipts'), { recursive: true });
  const founderPacketPath = path.join(missionFolder, 'FOUNDER_PACKET.md');
  const payload = [
    `# Raw Founder Notes Intake — ${missionId}`,
    '',
    'Terminal direct intake entrypoint. Raw notes are intentionally unpolished.',
    '',
    '## Raw Founder Notes',
    '```text',
    String(text || '').trim(),
    '```',
    '',
  ].join('\n');
  fs.writeFileSync(founderPacketPath, payload);
  return founderPacketPath;
}

function writeReceipt(missionFolder, data) {
  const receiptPath = path.join(missionFolder, 'receipts', 'DIRECT_TERMINAL_INTAKE_RECEIPT.json');
  fs.writeFileSync(receiptPath, `${JSON.stringify(data, null, 2)}\n`);
  return receiptPath;
}

function rel(absPath) {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, '/');
}

function readTextInput(args) {
  if (args.text) return String(args.text);
  if (args.textFile) {
    const abs = path.isAbsolute(args.textFile) ? args.textFile : path.join(process.cwd(), args.textFile);
    return fs.readFileSync(abs, 'utf8');
  }
  return '';
}

const args = parseArgs(process.argv);
if (args.help) {
  usage();
  process.exit(0);
}

const rawText = readTextInput(args).trim();
if (!rawText) {
  usage();
  console.error('\nError: --text or --text-file is required.');
  process.exit(1);
}

if (!['development', 'system'].includes(args.stage)) {
  usage();
  console.error('\nError: --stage must be development or system.');
  process.exit(1);
}

const missionId = toMissionId(args.missionId, rawText);
const missionFolder = path.join(MISSIONS_ROOT, missionId);
const founderPacketPath = ensureRawFounderPacket(missionFolder, missionId, rawText);

const receiptPath = writeReceipt(missionFolder, {
  schema: 'direct_terminal_intake_receipt_v1',
  mission_id: missionId,
  created_at: new Date().toISOString(),
  entrypoint: 'terminal_direct_builderos_intake',
  stage: args.stage,
  force: args.force === true,
  founder_packet_path: rel(founderPacketPath),
  raw_text_chars: rawText.length,
});

const result =
  args.stage === 'system'
    ? runFoundationPipeline(missionId, { force: args.force, dryRun: false })
    : runDevelopmentStage(missionId, { force: args.force });

const preHandoff = path.join(missionFolder, 'receipts', 'PRE_HANDOFF_INTENT_GATE_REPORT.json');
const handoff = path.join(missionFolder, 'CHAIR_HANDOFF_RECEIPT.json');
const out = {
  ok: Boolean(result?.ok),
  stage: args.stage,
  mission_id: missionId,
  mission_folder: rel(missionFolder),
  entrypoint_receipt_path: rel(receiptPath),
  founder_packet_path: rel(founderPacketPath),
  intent_baseline_path: rel(path.join(missionFolder, 'INTENT_BASELINE.json')),
  pre_handoff_report_path: fs.existsSync(preHandoff) ? rel(preHandoff) : null,
  chair_handoff_receipt_path: fs.existsSync(handoff) ? rel(handoff) : null,
  first_blocker: result?.violations?.[0] || null,
  result,
};
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
