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
> Read this instead of full NSSOT for routine work. Full NSSOT only for constitutional edits/conflicts/onboarding.

## HIERARCHY
NSSOT \`docs/SSOT_NORTH_STAR.md\` > Companion \`docs/SSOT_COMPANION.md\` > \`CLAUDE.md\` > Amendments > repo state

## SUPREME LAWS
- §2.6: no lies/mislead; KNOW/THINK/GUESS/UNKNOWN; no silent failed checks.
- Improve only; QUICK_LAUNCH stays current.
- §2.11a: builder-first. §2.11b: Adam gets score+evidence, why A>B, residue. §2.11c: supervisor = maximize verified system output, not IDE authorship.
- §2.14: TSOS machine-channel only. Remote truth: GitHub=source, Railway=runtime, Neon=data; local is mirror. §2.15: clear ask → do it or HALT; drift → log INTENT DRIFT.

## BUILDER-FIRST
1. \`npm run builder:preflight\`
2. \`POST /api/v1/lifeos/builder/build\` with domain/task/spec/target/` + "`[system-build]`" + `
3. \`committed:true\` = receipt. \`committed:false\` = use \`/execute\`. Builder blocked = **GAP-FILL** on platform, same session.

Hook: staged \`routes/\`/\`services/\`/\`public/overlay/\`/\`db/migrations/\` need \`[system-build]\` or \`GAP-FILL:\`. No \`--no-verify\` w/o Adam. Exceptions: \`startup/\`, \`middleware/\`, composition \`core/\`, SSOT.

## COUNCIL / TECHNICAL FORKS
Load-bearing arch/security/data/API → \`/api/v1/lifeos/gate-change/*\` or \`npm run lifeos:gate-change-run\`. No fake panel-in-chat.
Protocol: frame → pro/con → blind spots → future-back → vote → audits.

## MEMORY + ANTI-CORNER-CUTTING
Design Q: **what earned the right to influence action, at what weight, here?**
- Ladder: CLAIM→…→INVARIANT. INVARIANT ≠ LAW. Scope: \`context_required\`+\`false_when\`. \`residue_risk\` keeps minority views.
- Output=claim; code/receipts=proof. Violations → \`/api/v1/memory/agents/violations\`, drift → \`/intent-drift\`. Runtime may \`watch\`/\`block\` models by task.

## IDEA VAULT (Lane A/B)
\`AMENDMENT_38\`+\`CONVERSATION_DUMP*\` = **map/routes only** — not substitute for **source threads** (e.g. ChatGPT) + \`raw/\` exports. **Promote nuance:** one theme/chunk → 38 §A **or** twin \`import-dumps-to-twin\`. **Tools:** \`npm run operator-corpus:pipeline\`, \`idea-vault:catalog-keywords\`. **Programs/backlog:** 38 § seed §A + portfolio; **queue:** \`INDEX.md\` North Star priorities.

## SESSION PROTOCOL
- START: \`builder:preflight\`; QUICK_LAUNCH; correct continuity lane; amendment handoff + last receipts.
- BUILD: try \`/build\`; failure → \`/gaps\`; only GAP-FILL when platform path is provably blocked.
- VERIFY: \`node --check\` touched JS; project verifier; receipts match runtime.
- END: Change Receipts, Handoff, continuity, QUICK_LAUNCH; §2.11b if load-bearing.

## SSOT RULES
Read full SSOT-class files before editing; chunked reads OK. Atomic: file→receipt→next. No blind patches.
SSOT-class: \`SSOT_NORTH_STAR.md\`, \`SSOT_COMPANION.md\`, \`NORTH_STAR_*\`, \`AMENDMENT_*\`, \`CONTINUITY_*\`, \`CONTINUITY_INDEX.md\`.

## PROHIBITED
Lying; hidden failures; “done” w/o receipts; product w/o real \`/build\`; \`--no-verify\` w/o Adam; blind SSOT edits; synthetic council; skip QUICK_LAUNCH; env gaslight; §2.15 drift; IDE default when system path owed.

## CURRENT STATE
Queue: \`docs/QUICK_LAUNCH.md\` → Current Priority Queue
General log: \`docs/CONTINUITY_LOG.md\`
LifeOS: \`docs/projects/AMENDMENT_21_LIFEOS_CORE.md\`
TC: \`docs/projects/AMENDMENT_17_TC_SERVICE.md\`
Memory: \`docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md\`
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
