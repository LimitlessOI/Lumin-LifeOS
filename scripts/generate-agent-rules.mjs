#!/usr/bin/env node
/**
 * SYNOPSIS: generate-agent-rules.mjs
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
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'AGENT_RULES.compact.md');
const BASELINE = path.join(ROOT, 'docs', '.compact-rules-baseline');

async function main() {
  const out = `# AGENT RULES — COMPACT ENFORCEMENT
> gen:\`npm run gen:rules\` | NSSOT=\`docs/constitution/NORTH_STAR_SSOT.md\` | Next:\`prompts/00-HIST-LEGACY-BOUNDARY.md\`

## HIST (mandatory first)
Legacy=Hist-owned;salvage-only. Law:\`prompts/00-HIST-LEGACY-BOUNDARY.md\`. Factory:\`builderos-reboot/MISSIONS/\`. Live:\`routes/\`/\`services/\`

## HIERARCHY
NSSOT > Companion > \`CLAUDE.md\` > product homes > repo

## SUPREME LAWS
- §2.6: truth labels; no silent fail.
- §2.11a builder-first; §2.11b score+evidence; §2.11c supervisor≠IDE typist.
- §2.14 lexicon. §2.15 do|HALT. §2.17 proof|UNSOLVED. §2.18 correct-or-HALT; no close-enough.

## BUILDER-FIRST
1. \`npm run builder:preflight\`
2. \`POST /api/v1/lifeos/builder/build\` domain/task/spec/target/` + "`[system-build]`" + `
3. \`committed:true\`=receipt; else \`/execute\`. Blocked=**GAP-FILL** same session

Hook: staged product paths need \`[system-build]\`|GAP-FILL. Exc: startup,middleware,core,SSOT.

## COUNCIL
Load-bearing→\`gate-change/*\` or \`lifeos:gate-change-run\`. No chat-council.

## TOKENS+HISTORY
\`useful-work-guard\` sched AI. preflight,probe,\`/gaps\`. Receipts append-only. Plat break→GAP-FILL.

## MEMORY
CLAIM→INVARIANT. Violations \`/memory/agents/violations\`.

## SESSION
START:Hist,preflight,QL. BUILD:/build→GAP-FILL. END:receipts. PUSH unless hold. HARD:\`lifeos:bp-priority:verify\`

## SSOT
Read SSOT b4 edit. Atomic file→receipt. Hist=parts car only. Doctrine=MFST16

## PROHIBITED
Lie; extend legacy; done w/o receipts; \`--no-verify\`; env gaslight; IDE when system owed

## STATE
\`QUICK_LAUNCH\` · \`CONTINUITY_LOG\` · product handoffs
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
