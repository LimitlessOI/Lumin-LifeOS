#!/usr/bin/env node
/**
 * generate-agent-rules.mjs
 *
 * Generates docs/AGENT_RULES.compact.md — a compressed, machine-readable enforcement
 * packet that cold AI agents read INSTEAD of the full NSSOT + Companion on routine
 * build sessions.
 *
 * TOKEN BUDGET LAW: Output MUST be smaller than the previous version.
 * Enforced by: comparing against docs/.compact-rules-baseline (byte count).
 * If the new output is larger → script exits 1 (commit blocked).
 *
 * Run: npm run gen:rules
 * Auto-run: pre-commit hook regenerates this if NSSOT or Companion staged.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'AGENT_RULES.compact.md');
const BASELINE = path.join(ROOT, 'docs', '.compact-rules-baseline');

async function main() {
  const out = `# AGENT RULES — COMPACT ENFORCEMENT
> Generated: ${new Date().toISOString()} | Regenerate: \`npm run gen:rules\`
> Normal sessions: read THIS instead of NSSOT + Companion (~26k tokens). Full NSSOT only for constitutional edits/conflicts/onboarding.

## HIERARCHY
NSSOT \`docs/SSOT_NORTH_STAR.md\` > Companion \`docs/SSOT_COMPANION.md\` > \`CLAUDE.md\` > Amendments > else

## SUPREME LAWS (§2.6 — no exceptions)

| Law | Enforcement |
|-----|-------------|
| Never lie or mislead. Misleading = lying. | HALT |
| Uncertainty: KNOW / THINK / GUESS / DON'T KNOW | Required |
| No shortcuts on reads, verify, receipts | Pre-commit |
| Wasteful? → council debate (§2.6 ¶8), not solo skip | Gate-change API |
| QUICK_LAUNCH must stay current | Session end |
| **System must always improve, never regress** | Baseline check hard-blocks |
| TSOS (§2.11a): builder P0 | Preflight, receipts |
| Report Adam (§2.11b): score+evidence, why A vs B, residue | End-slice |
| Machine channel (§2.14) | \`docs/TSOS_SYSTEM_LANGUAGE.md\` only |

## §2.11 BUILDER-FIRST (machine-enforced)

1. \`npm run builder:preflight\` — fail-closed; fixes URL/key/GITHUB_TOKEN errors
2. \`POST /api/v1/lifeos/builder/build\` \`{ domain, task, spec, target_file, commit_message: "[system-build] ..." }\`
3. \`committed:true\` → done, write receipt. \`committed:false\` → call \`/execute\`. Builder down → **GAP-FILL: <exact reason>**, fix platform same session.

Commit-msg hook hard-blocks \`routes/\`, \`services/\`, \`public/overlay/\`, \`db/migrations/\` without \`[system-build]\` or \`GAP-FILL:\`. \`--no-verify\` forbidden without Adam's explicit request.

Platform exceptions (no builder): \`startup/\`, \`middleware/\`, composition-only \`core/\` wiring, SSOT docs.

§2.11b end-slice (load-bearing/builder): plain what/score+evidence/why/not-proven. Bad scores surface.

## §2.14 MACHINE CHANNEL

\`[TSOS-MACHINE]\` + builder \`task\` control lines: **only** tokens/templates in \`docs/TSOS_SYSTEM_LANGUAGE.md\`. §2.11b to Adam unchanged. Sheriff (§2.13.2) rejects unmarked verifier/deploy claims in machine context.

## §2.12 TECHNICAL DECISIONS

Load-bearing forks (architecture, security, data model, API contracts, hard-to-reverse) → real council via \`POST /api/v1/lifeos/gate-change/run-preset\` or \`npm run lifeos:gate-change-run\`. Cite \`proposal.id\` as receipt. If blocked: output \`COUNCIL: NOT RUN (reason)\` + \`OPINION ONLY\`. Synthetic consensus (one model in chat) forbidden.

## SESSION PROTOCOL

| Phase | Required actions |
|-------|-----------------|
| START | \`builder:preflight\`; QUICK_LAUNCH; lane log; amendment handoff + last 3–5 receipts |
| BUILD | \`POST /builder/build\` → committed → receipt. GAP-FILL if blocked. |
| VERIFY | \`node --check\` all staged .js; \`node scripts/verify-project.mjs --project <id>\`; receipts match runtime |
| END | §2.11b report if load-bearing; update Change Receipts (atomic); update Handoff Notes; update CONTINUITY_LOG; update QUICK_LAUNCH queue |

## SSOT EDIT RULES

Read full file before any edit (chunked reads count). Atomic: one file → amendment updated → next file. No blind patches from memory. Receipt = what/why/current state/next.

SSOT-class (full read): \`SSOT_NORTH_STAR.md\`, \`SSOT_COMPANION.md\`, \`NORTH_STAR_*\`, \`AMENDMENT_*\`, \`CONTINUITY_*\` (policy), \`CONTINUITY_INDEX.md\`

## PROHIBITED

Lying/misleading state/build/verify. Silent failed checks. "Done" w/o receipts. Product w/o builder try. \`--no-verify\` w/o Adam. SSOT edit w/o read. Synthetic council. Skip QUICK_LAUNCH. Env gaslighting (re-prove vars Adam proved). §2.14 machine prose w/o TSOS lexicon.

## ENDPOINTS

\`/lifeos/builder/build\` \`/execute\` \`/domains\` \`/ready\` — \`/lifeos/gate-change/*\` — \`/railway/env\` \`/bulk\` \`/deploy\` → \`docs/SYSTEM_CAPABILITIES.md\`

## CURRENT STATE

Priority queue: \`docs/QUICK_LAUNCH.md → ## Current Priority Queue\`
Latest session: \`docs/CONTINUITY_LOG.md\` (newest entry at top)
LifeOS handoff: \`docs/projects/AMENDMENT_21_LIFEOS_CORE.md → ## Agent Handoff Notes\`
TC handoff: \`docs/projects/AMENDMENT_17_TC_SERVICE.md → ## Agent Handoff Notes\`
`

  // TOKEN BUDGET LAW: new output must be <= baseline (system must improve, never regress)
  let baseline = Infinity;
  try {
    const b = await fs.readFile(BASELINE, 'utf8');
    baseline = parseInt(b.trim(), 10);
  } catch {
    // No baseline yet — first run, set it
  }

  // Use UTF-8 byte count (same as `wc -c`) so generator and pre-commit hook agree
  const newSize = Buffer.byteLength(out, 'utf8');

  if (newSize > baseline) {
    console.error(`\n❌ TOKEN BUDGET LAW VIOLATION`);
    console.error(`   New size:  ${newSize} bytes (~${Math.ceil(newSize / 4)} tokens)`);
    console.error(`   Baseline:  ${baseline} bytes (~${Math.ceil(baseline / 4)} tokens)`);
    console.error(`   Delta:     +${newSize - baseline} bytes — the system must IMPROVE, not regress.`);
    console.error(`   Fix:       Compress the generator output before committing.`);
    process.exit(1);
  }

  await fs.writeFile(OUT, out, 'utf8');
  await fs.writeFile(BASELINE, String(newSize), 'utf8');

  const tokens = Math.ceil(newSize / 4);
  const saved = baseline === Infinity ? '(first run)' : `↓${Math.ceil((baseline - newSize) / 4)} tokens vs prior`;
  console.log(`✅ AGENT_RULES.compact.md written`);
  console.log(`   Size: ~${tokens} tokens ${saved}`);
  console.log(`   vs full NSSOT+Companion+CLAUDE.md: ~26,000 tokens (~${Math.round((1 - newSize / 104429) * 100)}% reduction)`);
}

export { main };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
