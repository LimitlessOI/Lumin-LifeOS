import fs from 'node:fs';
import path from 'node:path';
import {
  applyRepairHandoff,
  readyForArchitect,
  sealConsensusRound,
} from '../config/sentry-repair-handoff.js';

const root = process.cwd();
const protocolPath = path.join(root, 'docs/constitution/FOUNDER_AI_OPERATING_PROTOCOL.md');
const capsulePath = path.join(root, 'docs/CHATGPT_CONTEXT_CAPSULE.md');
const recoveryPath = path.join(root, 'services/autonomous-recovery-council.js');

const failures = [];

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    failures.push(`missing required file: ${path.relative(root, filePath)}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function requireText(content, needle, label) {
  if (!content.includes(needle)) failures.push(`missing invariant: ${label}`);
}

function requireBehavior(condition, label) {
  if (!condition) failures.push(`behavioral enforcement failed: ${label}`);
}

const protocol = requireFile(protocolPath);
const capsule = requireFile(capsulePath);
const recovery = requireFile(recoveryPath);

requireText(protocol, 'The BP authors the whole decision tree. Factories only traverse it. They never author the next move.', 'decision-tree law');
requireText(protocol, 'Blueprint Completeness Law', 'blueprint completeness law');
requireText(protocol, 'Conversation Preservation Law', 'conversation preservation law');
requireText(protocol, 'Persistent Context Capsule', 'persistent context capsule law');
requireText(protocol, 'Brainstorm Timebox Rule', 'brainstorm timebox rule');
requireText(protocol, 'ABBOTT', 'Abbott identity');
requireText(protocol, 'COSTELLO', 'Costello identity');
requireText(protocol, 'prose-only governance is not complete', 'enforceability law');
requireText(capsule, 'Taloa', 'current product identity');
requireText(capsule, 'ABBOTT', 'Abbott context identity');
requireText(capsule, 'COSTELLO', 'Costello context identity');
requireText(capsule, '20 minutes', 'default brainstorm timebox');
requireText(capsule, 'Turning the Mac off must not stop Abbott or Costello.', 'remote independence invariant');

requireText(recovery, "disposition: 'RECOVERED'", 'autonomous recovery success disposition');
requireText(recovery, "disposition: 'UNSOLVED'", 'autonomous recovery exhausted disposition');
requireText(recovery, 'founder_alert_is_record_only: true', 'founder is record-only after recovery exhaustion');
requireText(recovery, 'terminal_stop_forbidden: true', 'terminal stop forbidden');

const complexFinding = {
  id: 'fixer_failed:governed_loop_stale',
  check: 'fixer_failed',
  severity: 'P0',
  summary: 'factory stopped',
  proposed_solution: 'restart services/never-stop-product-factory-scheduler.js and verify a fresh tick',
  chair_status: 'approved',
};

const matching = applyRepairHandoff(complexFinding, {
  conductorSolution: 'restart services/never-stop-product-factory-scheduler.js then verify progress',
});
requireBehavior(matching.repair_consensus === false, 'early matching solutions cannot seal consensus');
requireBehavior(matching.conductor_status === 'hidden_alternatives_required', 'early agreement triggers hidden alternatives');
requireBehavior(readyForArchitect(matching) === false, 'Architect handoff blocked before 1+1=3 evidence');

const shallowConsensus = sealConsensusRound({
  synthesized: 'restart the scheduler and verify the next slice',
  sentry_accepts: true,
  conductor_accepts: true,
});
requireBehavior(shallowConsensus.unanimous === false, 'unanimity alone is insufficient without hidden-alternative evidence');
requireBehavior(shallowConsensus.reason === 'hidden_alternatives_not_cleared', 'missing hidden-alternative evidence fails closed');

const deepConsensus = sealConsensusRound({
  synthesized: 'restart via the supervised launcher and require two fresh slice receipts before recovery is declared',
  sentry_accepts: true,
  conductor_accepts: true,
  argued_both_sides: true,
  unintended_positive: 'proves sustained manufacturing rather than process liveness',
  unintended_negative: 'adds verification latency before recovery is declared',
});
requireBehavior(deepConsensus.unanimous === true, 'unanimous 1+1=3 synthesis can seal after required evidence');

if (failures.length) {
  console.error('FOUNDER AI OPERATING PROTOCOL: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FOUNDER AI OPERATING PROTOCOL: PASS');
