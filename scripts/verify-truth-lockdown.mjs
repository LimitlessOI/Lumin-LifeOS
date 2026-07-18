#!/usr/bin/env node
/**
 * SYNOPSIS: Static proof — truth lockdown wired on all founder exit paths.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED = [
  {
    file: 'services/lumin-chair-orchestrator.js',
    needles: ['enforceTruthLockdown', 'function finalizeTruth'],
  },
  {
    file: 'services/truth-lockdown.js',
    needles: ['enforceTruthLockdown', 'TRUTH_LOCKDOWN_VERSION'],
  },
  {
    file: 'services/chair-truth-gate.js',
    needles: ['enforceChairTruthExit'],
  },
  {
    file: 'services/chair-direct-connection-truth.js',
    needles: ['scrubCounselTheater', 'detectCounselTheater'],
  },
  {
    file: 'services/council-service.js',
    needles: ['finalizeResponse', 'envelopeCouncilMemberOutput'],
  },
  {
    file: 'services/ai-prose-truth-envelope.js',
    needles: ['applyAiProseTruthEnvelope', 'AI_PROSE_ENVELOPE_VERSION'],
  },
  {
    file: 'services/lifere-council-router.js',
    needles: ['applyAiProseTruthEnvelope', 'counsel_only'],
  },
  {
    file: 'services/memory-write-gate.js',
    needles: ['gateMemoryWrite', 'sanitizeLegacyMemoryContent'],
  },
  {
    file: 'services/receipt-truth-validator.js',
    needles: ['validateReceiptDirectory', 'validateReceiptObject'],
  },
  {
    file: 'services/truth-scoreboard-worker.js',
    needles: ['runTruthScoreboardTick', 'registerTruthScoreboardScheduler'],
  },
  {
    file: 'core/memory-system.js',
    needles: ['gateMemoryWrite', 'sanitizeLegacyMemoryContent'],
  },
  {
    file: 'startup/boot-domains.js',
    needles: ['bootTruthScoreboard', 'registerTruthScoreboardScheduler'],
  },
  {
    file: 'services/lifeos-execution-truth.js',
    needles: ['enforceExecutionTruth', 'buildExecutionAutopsy'],
  },
  {
    file: 'services/truth-enforcement-spine.js',
    needles: ['TRUTH_SPINE_VERSION', 'enforceTruthOnResponseBody', 'createSpineCallAI'],
  },
  {
    file: 'middleware/truth-response-enforcer.js',
    needles: ['createTruthResponseEnforcer', 'enforceTruthOnResponseBody'],
  },
  {
    // Production hard-locks to the founder_builder runtime; it must gate every
    // res.json/res.send through the response enforcer.
    file: 'server-founder-runtime.js',
    needles: ['createTruthResponseEnforcer'],
  },
  {
    // Full runtime additionally spine-wraps its scheduled/background AI calls.
    file: 'server-full-runtime.js',
    needles: ['createTruthResponseEnforcer', 'createSpineCallAI', 'spineCallAI'],
  },
  {
    file: 'services/lifeos-lumin.js',
    needles: ['scrubProseForStorage'],
  },
  {
    file: 'services/websocket-handler.js',
    needles: ['truthGateOutbound'],
  },
  {
    file: 'services/conversation-store.js',
    needles: ['scrubProseForStorage'],
  },
  {
    file: 'startup/memory.js',
    needles: ['gateMemoryWrite'],
  },
  {
    file: 'services/chair-personality-translate.js',
    needles: ['applyAiProseTruthEnvelope'],
  },
  {
    file: 'services/founder-direct-provider.js',
    needles: ['applyAiProseTruthEnvelope', 'stampDirectResult'],
  },
  {
    file: 'services/wisdom-truth-auditor.js',
    needles: ['WISDOM_TRUTH_AUDITOR_VERSION', 'runAdversarialTruthProbes', 'assessFounderUtteranceWisdom'],
  },
  {
    file: 'services/lumin-chair-orchestrator.js',
    needles: ['assessFounderUtteranceWisdom', 'chairWisdomClarifyResponse'],
  },
  {
    file: 'startup/boot-domains.js',
    needles: ['bootWisdomTruthAuditor'],
  },
  {
    file: 'services/point-b-dna.js',
    needles: ['POINT_B_DNA_VERSION', 'stampPointBDna', 'getPointBDnaPromptBlock'],
  },
  {
    file: 'docs/constitution/POINT_B_DNA.md',
    needles: ['Synergy', '100% intention'],
  },
];

const FORBIDDEN_BYPASS = [
  {
    file: 'routes/lifeos-builderos-command-control-routes.js',
    pattern: /human_summary:\s*plainReply(?![\s\S]{0,200}enforceTruthLockdown)/,
    note: 'founder-interface must route through runLuminChairTurn → finalizeTruth',
  },
];

const failures = [];

for (const req of REQUIRED) {
  const full = path.join(ROOT, req.file);
  if (!fs.existsSync(full)) {
    failures.push(`MISSING ${req.file}`);
    continue;
  }
  const src = fs.readFileSync(full, 'utf8');
  for (const needle of req.needles) {
    if (!src.includes(needle)) {
      failures.push(`${req.file} missing "${needle}"`);
    }
  }
}

const orchestrator = fs.readFileSync(path.join(ROOT, 'services/lumin-chair-orchestrator.js'), 'utf8');
if (!orchestrator.includes("from './truth-lockdown.js'")) {
  failures.push('lumin-chair-orchestrator.js must import truth-lockdown.js');
}
if (!orchestrator.match(/enforceTruthLockdown\s*\(/)) {
  failures.push('finalizeTruth must call enforceTruthLockdown');
}

const routeSrc = fs.readFileSync(path.join(ROOT, 'routes/lifeos-builderos-command-control-routes.js'), 'utf8');
if (!routeSrc.includes('runLuminChairTurn')) {
  failures.push('founder-interface must use runLuminChairTurn');
}

const testRun = spawnSync('node', ['--test', 'tests/truth-lockdown.test.js', 'tests/chair-direct-connection-truth.test.js', 'tests/chair-truth-gate.test.js', 'tests/ai-prose-truth-envelope.test.js', 'tests/truth-gap-closure.test.js'], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (testRun.status !== 0) {
  failures.push(`truth unit tests failed:\n${testRun.stdout}\n${testRun.stderr}`);
}

const report = {
  schema: 'truth_lockdown_verify_v1',
  at: new Date().toISOString(),
  ok: failures.length === 0,
  failures,
  checks: REQUIRED.map((r) => r.file),
};

const outPath = path.join(ROOT, 'products/receipts/TRUTH_LOCKDOWN_VERIFY.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error('TRUTH_LOCKDOWN_VERIFY FAIL');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}

console.log('TRUTH_LOCKDOWN_VERIFY OK');
console.log(JSON.stringify(report, null, 2));
process.exit(0);
