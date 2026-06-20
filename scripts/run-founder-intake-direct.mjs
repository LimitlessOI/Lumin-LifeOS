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
const STRUCTURED_LABELS = [
  'Problem',
  'Desired Outcome',
  'Scope Boundary',
  'Constraints',
  'Success Metric',
  'Failure Metric',
  'Unacceptable Result',
  'Founder Success Test',
  'Acceptance Command',
];

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

function extractStructuredSections(text) {
  const sections = {};
  let current = null;
  const labelPattern = STRUCTURED_LABELS.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const headingRe = new RegExp(`^(?:#{2,}\\s*)?(${labelPattern})\\s*:?\\s*$`, 'i');
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.trim().match(headingRe);
    if (match) {
      current = STRUCTURED_LABELS.find((label) => label.toLowerCase() === match[1].toLowerCase());
      sections[current] = sections[current] || [];
      continue;
    }
    if (current) sections[current].push(line);
  }
  return Object.fromEntries(
    Object.entries(sections)
      .map(([key, value]) => [key, value.join('\n').trim()])
      .filter(([, value]) => value),
  );
}

function hasDirectIntakeStructure(sections) {
  return Boolean(
    sections.Problem
      && sections['Desired Outcome']
      && (sections['Founder Success Test'] || sections['Success Metric'])
      && sections['Acceptance Command'],
  );
}

function renderStructuredFounderPacket(missionId, text, sections) {
  const successTest = sections['Founder Success Test'] || sections['Success Metric'] || 'Founder can verify the requested change directly.';
  const failureMetric = sections['Failure Metric'] || 'No real change, or missing execution evidence/receipts.';
  const constraints = sections.Constraints || '- Keep behavior fail-closed and reversible where possible';
  const acceptance = sections['Acceptance Command'] || 'Return command_truth, pass_fail, exit_code, commit_sha, changed_files, receipt_paths, first_blocker.';
  return [
    `# Founder Packet — ${missionId}`,
    '',
    '**Source:** Direct terminal intake from authenticated Founder Interface.',
    '**Authority:** Outcome truth only. System derives HOW. Receipts prove PASS.',
    '',
    '---',
    '',
    '## Problem',
    '',
    sections.Problem,
    '',
    '---',
    '',
    '## Desired Outcome',
    '',
    sections['Desired Outcome'],
    '',
    '---',
    '',
    '## FOUNDER SUCCESS TEST',
    '',
    successTest,
    '',
    '---',
    '',
    '## Constraints',
    '',
    constraints,
    '',
    '---',
    '',
    '## Failure metrics',
    '',
    failureMetric,
    '',
    '---',
    '',
    '## Scope Boundary',
    '',
    sections['Scope Boundary'] || 'Only the minimum files required to complete this exact request.',
    '',
    '---',
    '',
    '## Unacceptable Result',
    '',
    sections['Unacceptable Result'] || 'Claiming completion without runtime-verifiable evidence.',
    '',
    '---',
    '',
    '## Acceptance command',
    '',
    '```text',
    acceptance,
    '```',
    '',
    '---',
    '',
    '## Raw Founder Notes',
    '',
    '```text',
    String(text || '').trim(),
    '```',
    '',
  ].join('\n');
}

function writeDirectIntentBaseline(missionFolder, missionId, sections) {
  if (!hasDirectIntakeStructure(sections)) return null;
  const baselinePath = path.join(missionFolder, 'INTENT_BASELINE.json');
  const baseline = {
    schema: 'intent_baseline_v1',
    intent_id: missionId,
    mission_id: missionId,
    tier: 1,
    status: 'HANDOFF_READY',
    created_at: new Date().toISOString().slice(0, 10),
    amendment_pack: 'docs/constitution/AMENDMENT_PACK_V2.0A.md',
    direct_terminal_intake: true,
    proof_lap_only: false,
    outcome_statement: sections['Desired Outcome'].slice(0, 500),
    user: 'Adam (founder)',
    pain: sections.Problem.slice(0, 400),
    value: sections['Desired Outcome'].slice(0, 400),
    success_metrics: [
      (sections['Founder Success Test'] || sections['Success Metric'] || 'Founder can verify the requested change directly.').slice(0, 300),
    ],
    failure_metrics: [
      (sections['Failure Metric'] || 'No real change, or missing execution evidence/receipts.').slice(0, 300),
    ],
    constraints: String(sections.Constraints || 'Keep behavior fail-closed and reversible where possible')
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean),
    scope_boundary: sections['Scope Boundary'] || 'Only the minimum files required to complete this exact request.',
    unacceptable_result: sections['Unacceptable Result'] || 'Claiming completion without runtime-verifiable evidence.',
    ownership: 'Founder Interface direct intake; BuilderOS executes; Adam verifies outcome.',
    priority_fit: 'Direct founder interface explicit operator request',
    point_model: {
      A: 'Founder command captured through authenticated direct terminal intake',
      B: 'Chair locks a bounded handoff without re-questioning Adam',
      C: 'Alpha is runtime-verifiable command execution evidence',
    },
  };
  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  return baselinePath;
}

function writeDirectAssetReuseDecision(missionFolder, missionId, sections) {
  if (!hasDirectIntakeStructure(sections)) return null;
  const assetPath = path.join(missionFolder, 'ASSET_REUSE_DECISION.json');
  const decision = {
    schema: 'asset_reuse_decision_v1',
    mission_id: missionId,
    arc_decision_status: 'CONFIRMED',
    surveyed_at: new Date().toISOString().slice(0, 10),
    direct_terminal_intake: true,
    wisdom_lessons: ['Use existing repo assets; direct founder command should not create a parallel stack.'],
    cfo_recommendation: 'EXTEND existing repo assets through BuilderOS system path.',
    assets_reviewed: ['repo_current_state'],
    decisions: [
      {
        asset: 'repo_current_state',
        decision: 'REUSE',
        reason: sections['Scope Boundary'] || 'Direct intake is bounded to the minimum files required.',
      },
    ],
    arc_decision: 'Reuse repo truth; ARC derives specific target assets during translation.',
  };
  fs.writeFileSync(assetPath, `${JSON.stringify(decision, null, 2)}\n`);
  return assetPath;
}

function ensureRawFounderPacket(missionFolder, missionId, text) {
  fs.mkdirSync(path.join(missionFolder, 'receipts'), { recursive: true });
  const founderPacketPath = path.join(missionFolder, 'FOUNDER_PACKET.md');
  const sections = extractStructuredSections(text);
  const structured = hasDirectIntakeStructure(sections);
  const payload = structured
    ? renderStructuredFounderPacket(missionId, text, sections)
    : [
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
  const baselinePath = writeDirectIntentBaseline(missionFolder, missionId, sections);
  const assetReusePath = writeDirectAssetReuseDecision(missionFolder, missionId, sections);
  return { founderPacketPath, baselinePath, assetReusePath, structured };
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
const {
  founderPacketPath,
  baselinePath,
  assetReusePath,
  structured,
} = ensureRawFounderPacket(missionFolder, missionId, rawText);

const receiptPath = writeReceipt(missionFolder, {
  schema: 'direct_terminal_intake_receipt_v1',
  mission_id: missionId,
  created_at: new Date().toISOString(),
  entrypoint: 'terminal_direct_builderos_intake',
  stage: args.stage,
  force: args.force === true,
  founder_packet_path: rel(founderPacketPath),
  intent_baseline_path: baselinePath ? rel(baselinePath) : null,
  asset_reuse_decision_path: assetReusePath ? rel(assetReusePath) : null,
  structured_intake: structured,
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
