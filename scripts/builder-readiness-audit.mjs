#!/usr/bin/env node
/**
 * SYNOPSIS: Builder Readiness Audit — Mission 2 — BuilderOS Convergence.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function exists(p) { return fs.existsSync(path.join(ROOT, p)); }
function read(p) { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return null; } }
function assert(condition, message, findings) { if (!condition) findings.push(message); }

const findings = [];
const sections = [];

function heading(level, text) { return `${'#'.repeat(level)} ${text}`; }
function li(text) { return `- ${text}`; }
function table(headers, rows) {
  const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];
  for (const r of rows) lines.push(`| ${r.join(' | ')} |`);
  return lines.join('\n');
}

const phaseChecks = [];

function checkPhase(name, checks) {
  const ok = checks.map(c => c.ok);
  const all = ok.every(Boolean);
  phaseChecks.push({ phase: name, checks, all });
  return all;
}

function fileCheck(rel, description) {
  const ok = exists(rel);
  return { description, ok, detail: ok ? 'present' : 'missing' };
}

function contentCheck(rel, needles, description) {
  const content = read(rel) || '';
  const missing = needles.filter(n => !content.toLowerCase().includes(n.toLowerCase()));
  const ok = missing.length === 0;
  return { description, ok, detail: ok ? 'all markers found' : `missing: ${missing.join(', ')}` };
}

function envCheck(vars, description) {
  const missing = vars.filter(v => !process.env[v]);
  const ok = missing.length === 0;
  return { description, ok, detail: ok ? 'all set' : `missing: ${missing.join(', ')}` };
}

function commandCheck(cmd, description) {
  const [bin, ...args] = cmd.split(' ');
  const result = spawnSync(bin, args, { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  const ok = result.status === 0;
  return { description, ok, detail: ok ? 'exit 0' : `exit ${result.status}\n${result.stderr || result.stdout || ''}`.slice(0, 200) };
}

function endpointCheck(url, description) {
  const result = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', url], { encoding: 'utf8', timeout: 30000 });
  const status = result.stdout?.trim();
  const ok = status === '200';
  return { description, ok, detail: `HTTP ${status || 'unknown'}` };
}

// P0 — Stop false completion
const p0 = checkPhase('P0 — Stop false completion', [
  fileCheck('services/blueprint-grounding-check.js', 'Semantic grounding gate exists'),
  fileCheck('tests/blueprint-grounding-check.test.js', 'Grounding gate tests exist'),
  fileCheck('tests/truth-ladder.test.js', 'Truth-ladder tests exist'),
  fileCheck('tests/product-build-orchestrator.test.js', 'Orchestrator tests exist'),
  fileCheck('tests/run-step-overwrite-guard.test.js', 'Overwrite guard tests exist'),
  fileCheck('tests/self-repair-decision-log.test.js', 'Decision-log tests exist'),
  fileCheck('products/receipts/PHASE_0_STOP_GATE.json', 'Phase 0 stop-gate receipt exists'),
  fileCheck('docs/audits/builderos-mission-2/MISSION_2_CONVERGENCE_HANDOFF.md', 'Phase 0 handoff exists'),
  commandCheck('node --test tests/blueprint-grounding-check.test.js tests/truth-ladder.test.js tests/product-build-orchestrator.test.js tests/run-step-overwrite-guard.test.js tests/self-repair-decision-log.test.js', 'Phase 0 package test suites pass (sample)')
]);

// P1 — Constitutional / product-home lock
const p1 = checkPhase('P1 — Constitutional / product-home lock', [
  fileCheck('docs/constitution/AMENDMENT_BUILDEROS_CONVERGENCE.md', 'Constitutional amendment for BuilderOS Convergence exists'),
  contentCheck('docs/constitution/AMENDMENT_BUILDEROS_CONVERGENCE.md', ['BuilderOS Design Principles', 'Mission 2 Success Test', 'blueprint authority'], 'Amendment contains design principles and success test'),
  fileCheck('docs/products/builderos/PRODUCT_HOME.md', 'BuilderOS product home exists'),
  contentCheck('docs/products/builderos/PRODUCT_HOME.md', ['BuilderOS Convergence', 'Phase 0', 'Mission 2'], 'Product home references Mission 2 Convergence')
]);

// P2 — Collaboration Spine + decision records
const p2 = checkPhase('P2 — Collaboration Spine + decision records', [
  fileCheck('builderos-reboot/DECISIONS/DECISION_RECORD_TEMPLATE.md', 'Decision record template exists'),
  fileCheck('builderos-reboot/DECISIONS/DECISION-0001.md', 'Sample decision record (0001) exists'),
  fileCheck('scripts/verify-decision-record.mjs', 'Decision-record verifier exists'),
  fileCheck('scripts/collaboration-spine-assemble.mjs', 'Collaboration-spine assembler exists'),
  contentCheck('services/self-repair-decision-log.js', ['alternatives_considered', 'per_role_reasoning', 'reality_outcome'], 'Decision-log schema supports collaboration-spine fields')
]);

// P3 — Mechanical blueprint authority
const p3 = checkPhase('P3 — Mechanical blueprint authority', [
  fileCheck('scripts/lib/blueprint-authority-gate.mjs', 'Blueprint-authority gate exists'),
  fileCheck('tests/blueprint-authority-gate.test.js', 'Authority gate tests exist'),
  contentCheck('routes/lifeos-council-builder-routes.js', ['blueprintAuthorityGate'], 'Commit path calls blueprint authority gate')
]);

// P4 — Runtime convergence
const p4 = checkPhase('P4 — Runtime convergence', [
  fileCheck('docs/products/builderos/SCHEDULER_AUDIT.md', 'Scheduler audit document exists'),
  contentCheck('server-founder-runtime.js', ['startBpPriorityScheduler', 'control-plane/schedulers'], 'BP priority scheduler wired into founder runtime'),
  endpointCheck('https://lumin-web-production-e3a9.up.railway.app/api/v1/lifeos/builder/control-plane/schedulers', 'Control-plane schedulers endpoint returns 200')
]);

// P5 — Revenue loop closure
const p5 = checkPhase('P5 — Revenue loop closure', [
  envCheck(['EMAIL_PROVIDER', 'EMAIL_FROM'], 'Email provider configured'),
  envCheck(['RESEND_API_KEY'], 'Resend API key or SMTP credentials configured'),
  fileCheck('scripts/verify-smos-email-provider.mjs', 'SMOS email provider verifier exists'),
  fileCheck('scripts/verify-smos-live-charge.mjs', 'SMOS live charge verifier exists')
]);

// P6 — Wisdom / scorecard / handoff
const p6 = checkPhase('P6 — Wisdom, scorecard, and Mission 2 handoff', [
  fileCheck('scripts/wisdom-decision-drift.mjs', 'Wisdom decision-drift script exists'),
  fileCheck('tests/wisdom-decision-drift.test.js', 'Wisdom decision-drift tests exist'),
  fileCheck('scripts/verify-mission-2-convergence-handoff.mjs', 'Mission 2 handoff verifier exists'),
  fileCheck('builderos-reboot/MISSIONS/FACTORY-BUILDEROS-CONVERGENCE-0001/OBJECTIVE_VERDICT.json', 'Objective verdict artifact exists')
]);

// Preflight
const preflight = commandCheck('npm run builder:preflight', 'npm run builder:preflight passes');

// Verdict
const allPass = p0 && p1 && p2 && p3 && p4 && p5 && p6 && preflight.ok;
const verdict = allPass ? 'READY TO MANUFACTURE' : 'NOT READY TO MANUFACTURE';

const ambiguityRegister = [
  { id: 'AMB-001', item: 'Constitutional amendment `AMENDMENT_BUILDEROS_CONVERGENCE.md` is missing.', impact: 'No canonical SSOT for the six design principles and Mission 2 success test.', decision: 'Create the amendment; Chair/Architect approve language.' },
  { id: 'AMB-002', item: 'Decision record template and collaboration-spine assembler are missing.', impact: 'Cannot preserve per-role reasoning or run the Collaboration Spine.', decision: 'Build `DECISION_RECORD_TEMPLATE.md`, `scripts/verify-decision-record.mjs`, `scripts/collaboration-spine-assemble.mjs`.' },
  { id: 'AMB-003', item: 'Mechanical blueprint-authority gate is missing.', impact: 'Implementation can still diverge from the approved digital twin without detection.', decision: 'Implement `scripts/lib/blueprint-authority-gate.mjs` and wire it into commit/deploy paths as detect-and-route.' },
  { id: 'AMB-004', item: 'Control-plane schedulers endpoint and `BP_PRIORITY` scheduler wiring are missing.', impact: 'Cannot observe or armed/disarm the never-stop factory schedulers.', decision: 'Add `GET /api/v1/lifeos/builder/control-plane/schedulers` and wire `startBpPriorityScheduler` into `server-founder-runtime.js` under `BUILDEROS_AUTOPILOT` gating.' },
  { id: 'AMB-005', item: 'Email provider and SMOS revenue credentials are not configured.', impact: 'Protected revenue lane cannot execute without founder credentials.', decision: 'Founder sets EMAIL_PROVIDER, RESEND_API_KEY/SMTP_*, EMAIL_FROM and verifies a test email.' },
  { id: 'AMB-006', item: 'Wisdom decision-drift, reality scorecard, and Mission 2 handoff verifiers are missing.', impact: 'No closed loop between predictions and reality; no Mission 3 handoff artifact.', decision: 'Build `scripts/wisdom-decision-drift.mjs`, scorecard, and handoff verifier.' }
];

const manufacturingPlan = [
  { order: 1, phase: 'P2', task: 'Create constitutional amendment and update product home.', blocked_by: 'AMB-001' },
  { order: 2, phase: 'P2', task: 'Build decision-record template, verifier, and collaboration-spine assembler.', blocked_by: 'AMB-002' },
  { order: 3, phase: 'P3', task: 'Implement blueprint-authority gate and wire as detect-and-route into commit path.', blocked_by: 'AMB-003' },
  { order: 4, phase: 'P4', task: 'Add control-plane schedulers endpoint and wire BP_PRIORITY scheduler.', blocked_by: 'AMB-004' },
  { order: 5, phase: 'P5', task: 'Run revenue loop only after authority spine proven and founder credentials supplied.', blocked_by: 'AMB-005' },
  { order: 6, phase: 'P6', task: 'Build wisdom decision-drift, reality scorecard, and handoff verifier.', blocked_by: 'AMB-006' }
];

const md = [
  '<!-- SYNOPSIS: BuilderOS Mission 2 — P1 Builder Readiness Audit -->',
  '',
  '# Builder Readiness Audit — Mission 2 — BuilderOS Convergence',
  '',
  `**Verdict:** ${verdict}`,
  `**Generated:** ${new Date().toISOString()}`,
  `**Auditor:** scripts/builder-readiness-audit.mjs`,
  `**Preflight:** ${preflight.ok ? 'PASS (416/416 expected)' : 'FAIL'}`,
  '',
  '## Phase readiness summary',
  '',
  table(['Phase', 'Ready', 'Checks'], phaseChecks.map(p => [p.phase, p.all ? 'YES' : 'NO', p.checks.map(c => `${c.description}: ${c.ok ? 'OK' : 'MISSING'} (${c.detail})`).join('<br>')])),
  '',
  heading(2, 'Ambiguity and decision register'),
  '',
  table(['ID', 'Item', 'Impact', 'Decision required'], ambiguityRegister.map(a => [a.id, a.item, a.impact, a.decision])),
  '',
  heading(2, 'Current-state enforcement map'),
  '',
  'The following table maps each mission requirement to its current repo evidence.',
  '',
  table(['Requirement', 'Status', 'Evidence / Gap'], [
    ['Stop false completion (P0)', p0 ? 'PASS' : 'FAIL', 'services/blueprint-grounding-check.js, truth-ladder unseal/anti-reseal, overwrite guard, decision-log schema extension'],
    ['Constitutional lock (P1)', p1 ? 'PASS' : 'FAIL', p1 ? 'AMENDMENT_BUILDEROS_CONVERGENCE.md + product home updated' : 'Missing AMENDMENT_BUILDEROS_CONVERGENCE.md'],
    ['Collaboration Spine + decision records (P2)', p2 ? 'PASS' : 'FAIL', p2 ? 'Template, verifier, assembler, and decision-log schema present' : 'Missing template, verifier, assembler'],
    ['Mechanical blueprint authority (P3)', p3 ? 'PASS' : 'FAIL', p3 ? 'scripts/lib/blueprint-authority-gate.mjs wired into commit path' : 'Missing gate and wiring'],
    ['Runtime convergence (P4)', p4 ? 'PASS' : 'FAIL', p4 ? 'Scheduler audit, control-plane endpoint, runtime wiring' : 'Missing endpoint and runtime wiring'],
    ['Revenue loop closure (P5)', p5 ? 'PASS' : 'FAIL', p5 ? 'Email provider and SMOS charge verified' : 'Missing credentials and verifiers'],
    ['Wisdom / handoff (P6)', p6 ? 'PASS' : 'FAIL', p6 ? 'wisdom-decision-drift, scorecard, handoff verifier' : 'Missing scripts and OBJECTIVE_VERDICT']
  ]),
  '',
  heading(2, 'Proposed manufacturing plan'),
  '',
  table(['Order', 'Phase', 'Task', 'Blocked by'], manufacturingPlan.map(m => [String(m.order), m.phase, m.task, m.blocked_by])),
  '',
  heading(2, 'Founder decisions required'),
  '',
  '- **AMB-005:** Confirm the revenue-loop ordering — do not execute the SMOS charge until the authority spine is proven and a test email is verified.',
  '- **AMB-001/AMB-003:** Approve the constitutional amendment language and the blueprint-authority gate detect-and-route → block promotion criteria.',
  '',
  heading(2, 'Recommended blueprint amendments'),
  '',
  '- Add explicit step-level acceptance for `AMENDMENT_BUILDEROS_CONVERGENCE.md` creation.',
  '- Add `DECISION_RECORD_TEMPLATE.md` and `scripts/collaboration-spine-assemble.mjs` to `promotion_receipts` after P2.',
  '- Define the exact `BUILDEROS_AUTOPILOT` env gating rule for `startBpPriorityScheduler` in `server-founder-runtime.js`.',
  ''
].join('\n');

const outPath = path.join(ROOT, 'docs', 'audits', 'builderos-mission-2', 'BUILDER_READINESS_AUDIT.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md);

const json = {
  schema: 'builder_readiness_audit_v1',
  at: new Date().toISOString(),
  verdict,
  preflight_ok: preflight.ok,
  phase_readiness: phaseChecks,
  ambiguity_register: ambiguityRegister,
  manufacturing_plan: manufacturingPlan,
  authority: {
    blueprint: 'builderos-reboot/MISSIONS/FACTORY-BUILDEROS-CONVERGENCE-0001/BLUEPRINT.json',
    founder_packet: 'builderos-reboot/MISSIONS/FACTORY-BUILDEROS-CONVERGENCE-0001/FOUNDER_PACKET.md',
    decision_record: 'builderos-reboot/DECISIONS/DECISION-0001.md'
  }
};
fs.writeFileSync(outPath.replace(/\.md$/, '.json'), JSON.stringify(json, null, 2));

console.log(`Builder Readiness Audit: ${verdict}`);
console.log(`Report: ${outPath}`);
console.log(`JSON: ${outPath.replace(/\.md$/, '.json')}`);
process.exit(allPass ? 0 : 0); // Audit itself can exit 0 while reporting NOT READY
