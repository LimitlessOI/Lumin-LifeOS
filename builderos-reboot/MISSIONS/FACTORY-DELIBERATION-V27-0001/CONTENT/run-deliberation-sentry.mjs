#!/usr/bin/env node
/**
 * SYNOPSIS: SENTRY review for FACTORY-DELIBERATION-V27-0001 — mechanical + qualitative emit.
 * SENTRY review for FACTORY-DELIBERATION-V27-0001 — mechanical + qualitative emit.
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 * HISTORY_SNAPSHOT — not runtime authority; mission-era snapshot.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const MISSION = 'FACTORY-DELIBERATION-V27-0001';
const MISSION_DIR = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', MISSION);

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: REPO_ROOT, encoding: 'utf8' });
}

const checks = [];

function add(id, name, pass, detail = '') {
  checks.push({ id, name, pass, detail });
}

// FP → BP contracts exist
for (const f of ['FOUNDER_PACKET.json', 'BLUEPRINT.json', 'ACCEPTANCE_TESTS.json', 'PRODUCT_DEVELOPMENT_RESULT.json']) {
  add(`SD-${f}`, `${f} exists`, fs.existsSync(path.join(MISSION_DIR, f)));
}

const bp = JSON.parse(fs.readFileSync(path.join(MISSION_DIR, 'BLUEPRINT.json'), 'utf8'));
add('SD-BP-STEPS', 'Blueprint has 12 steps', bp.steps?.length === 12);

const acc = run(process.execPath, [
  path.join(REPO_ROOT, 'builderos-reboot/scripts/run-mission-acceptance.mjs'),
  MISSION,
]);
add('SD-ACCEPTANCE', 'Mission acceptance tests pass', acc.status === 0, acc.stdout?.slice(-400));

const smoke = run('npm', ['run', 'lifeos:deliberation:a-to-z-smoke']);
add('SD-SMOKE', 'A→Z smoke pass', smoke.status === 0);

const hasDb = Boolean(process.env.DATABASE_URL);
add('SD-DB-ENV', 'DATABASE_URL set for Neon verify', hasDb, hasDb ? 'set' : 'SKIP — not PROVEN on Neon');

if (hasDb) {
  const verify = run(process.execPath, ['scripts/verify-deliberation-governance.mjs']);
  add('SD-DB-TABLES', 'Nine deliberation tables on Neon', verify.status === 0);
}

const hasApi = Boolean(process.env.PUBLIC_BASE_URL && process.env.COMMAND_CENTER_KEY);
add('SD-API-ENV', 'Railway API leg env present', hasApi, hasApi ? 'set' : 'SKIP — API leg not PROVEN');

// Deprecated terms in new deliberation files
const forbidden = /\bLens\b|\bC2 department\b/;
const scanPaths = [
  'services/deliberation-governance-service.js',
  'routes/deliberation-governance-routes.js',
  'config/deliberation-governance.js',
];
let termOk = true;
for (const rel of scanPaths) {
  const text = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
  if (forbidden.test(text)) termOk = false;
}
add('SD-VOCAB', 'No Lens/C2-dept in new deliberation core', termOk);

const blockers = checks.filter((c) => !c.pass && !c.detail?.startsWith('SKIP'));
const skips = checks.filter((c) => c.detail?.startsWith('SKIP'));
const pass = blockers.length === 0;

let maturity = 'WIRED';
if (pass && hasDb && hasApi) maturity = 'PROVEN';
else if (pass) maturity = 'WIRED';

const verdict = pass ? 'SENTRY_MISSION_PASS' : 'SENTRY_MISSION_FAIL';

const report = `# SENTRY Audit — ${MISSION}

**Generated:** ${new Date().toISOString()}
**Role:** SENTRY (not builder)
**Execution path:** Reverse-BP (code → formalize BP → SENTRY). Compare to BP-first missions.

## 1. Verdict

**${verdict}** — maturity classification: **${maturity}**

| Level | Meaning for this mission |
|-------|--------------------------|
| WIRED | Code + factory smoke pass; FP/BP contracts exist |
| PROVEN | Above + Neon tables verified + Railway API smoke |
| LIVE | Deploy receipt + operator confirmation |

This mission is **not** certifying \`FULLY_MACHINE_READY\` for the entire factory reboot.

## 2. Findings (${blockers.length} blockers, ${skips.length} skips)

${blockers.length ? blockers.map((b) => `- **BLOCKER** \`${b.id}\`: ${b.name}${b.detail ? ` — ${b.detail}` : ''}`).join('\n') : '- None'}

${skips.length ? `\n### Skips (honest limits)\n\n${skips.map((s) => `- \`${s.id}\`: ${s.detail}`).join('\n')}` : ''}

## 3. What is already strong

- Complete FP from founder v2.7 consensus with explicit non-goals
- Retroactive BP with 12 verify steps matching shipped artifacts
- Factory local A→Z pipeline (seed → gate → BPB intake)
- Council \`/build\` deliberation hook (seed + finalize)
- Gate-change Position E/K synthesis persist
- 18 mechanical acceptance tests + blueprint coverage test

## 4. Exact next required work

1. Deploy to Railway; confirm migrations applied (9 tables)
2. Run \`npm run lifeos:deliberation:a-to-z-smoke\` with \`PUBLIC_BASE_URL\` + \`COMMAND_CENTER_KEY\`
3. REP catalog overlay UI (deferred non-goal)
4. Founder Debrief delivery to FM/Lumin (deferred non-goal)

## 5. BP-first vs reverse-BP comparison

| Aspect | BP-first (e.g. REBOOT-0003) | Reverse-BP (this mission) |
|--------|----------------------------|---------------------------|
| Coder decisions | Zero — byte-exact steps | Conductor GAP-FILL chose structure |
| Determinism | SHA256 contracts | file_exists + syntax + smoke |
| Speed | Slower upfront | Faster ship; BP formalized after |
| SENTRY risk | Lower drift | Requires retroactive acceptance tests |
| Destination | Same if SENTRY passes | Same if SENTRY passes |

**SENTRY opinion:** Reverse-BP is acceptable for **platform GAP-FILL** when FP is already sealed and acceptance tests are added immediately. For product features at scale, prefer BP-first.

## Mechanical checks

${checks.map((c) => `- [${c.pass ? 'x' : ' '}] ${c.id}: ${c.name}${c.detail ? ` (${c.detail})` : ''}`).join('\n')}
`;

fs.writeFileSync(path.join(MISSION_DIR, 'SENTRY_AUDIT_REPORT.md'), report);

const result = {
  generated_at: new Date().toISOString(),
  mission_id: MISSION,
  verdict,
  maturity,
  fully_machine_ready: false,
  checks,
  blockers: blockers.map((b) => b.id),
};
fs.writeFileSync(path.join(MISSION_DIR, 'SENTRY_CHECK_RESULT.json'), `${JSON.stringify(result, null, 2)}\n`);

console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
