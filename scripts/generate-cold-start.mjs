#!/usr/bin/env node
/**
 * SYNOPSIS: Regenerates docs/AI_COLD_START.md from continuity lane files + INDEX pointer.
 * Regenerates docs/AI_COLD_START.md from continuity lane files + INDEX pointer.
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateTaskDNA, formatReport } from './validate-task-dna.mjs';
import { validatePredictions, formatPredictionReport } from './validate-predictions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function readSafe(rel) {
  try {
    return await fs.readFile(path.join(ROOT, rel), 'utf8');
  } catch {
    return `_(missing: ${rel})_`;
  }
}

function firstUpdateBlock(md) {
  const m = md.match(/##\s[^\n]+/);
  return m ? md.slice(m.index, Math.min(md.length, m.index + 3500)) : md.slice(0, 3500);
}

/** First line of `> **Operator directive …**` in Amendment 21 blockquote (LifeOS P1 + execution focus). */
function extractOperatorDirectiveKnowLine(amd21) {
  const lines = amd21.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('>') && t.includes('**Operator directive (')) {
      return t.replace(/^>\s?/, '').trim();
    }
  }
  return null;
}

async function main() {
  const dnaSummary = await validateTaskDNA().catch(() => null);
  const predictionSummary = await validatePredictions().catch(() => null);
  const index = await readSafe('docs/CONTINUITY_INDEX.md');
  const mainLog = await readSafe('docs/CONTINUITY_LOG.md');
  const lifeos = await readSafe('docs/CONTINUITY_LOG_LIFEOS.md');
  const council = await readSafe('docs/CONTINUITY_LOG_COUNCIL.md');
  const amd36 = await readSafe('docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md');
  const amd21h = await readSafe('docs/products/lifeos/PRODUCT_HOME.md');
  const memoryDigest = await readSafe('docs/INSTITUTIONAL_MEMORY_DIGEST.md');

  const handoff = amd21h.includes('## Agent Handoff Notes')
    ? amd21h.slice(amd21h.indexOf('## Agent Handoff Notes'), amd21h.indexOf('## Agent Handoff Notes') + 2500)
    : '_(Add ## Agent Handoff Notes to Amendment 21)_';

  const directiveLine =
    extractOperatorDirectiveKnowLine(amd21h) ||
    '_(No **Operator directive** line found in `AMENDMENT_21_LIFEOS_CORE.md` — read **Approved Product Backlog → PRIORITY ALIGNMENT** manually.)_';

  const out = `# AI Cold Start Packet

> **AUTO-GENERATED** — do not hand-edit. Regenerate: \`npm run cold-start:gen\`
> Generated: ${new Date().toISOString()}

## Read order (mandatory)

1. \`docs/AGENT_RULES.compact.md\` — enforcement packet.
2. \`prompts/00-HIST-LEGACY-BOUNDARY.md\` — **STOP:** Hist vs active systems (do not skip).
3. \`prompts/00-LIFEOS-AGENT-CONTRACT.md\` — epistemic baseline (§2.6, §2.11, §2.15).
4. \`prompts/00-SSOT-READ-SEQUENCE.md\` — ordered SSOT reads (anti-drift).
5. \`prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md\` — think vs execute model policy.
6. This file (you are reading it).
7. The lane log for your task (\`CONTINUITY_LOG_LIFEOS.md\` / \`CONTINUITY_LOG_COUNCIL.md\` / main log).
8. Owning manifest JSON (e.g. \`AMENDMENT_21_LIFEOS_CORE.manifest.json\`) for structured next steps.
9. \`prompts/<domain>.md\` when using the builder.

## Program priority — LifeOS (KNOW)

${directiveLine}

**In practice:** execution is \`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json\`, LifeOS routes/overlays in **Amendment 21** scope, and honest **Change Receipts**. **No** scope outside the approved backlog without Adam or a load-bearing **§2.12** path (\`run-council\` / gate-change on the running app). Full legal text: \`docs/products/lifeos/PRODUCT_HOME.md\` → **Approved Product Backlog** → **PRIORITY ALIGNMENT**.

## CONTINUITY_INDEX.md

${index}

## Snippet — main CONTINUITY_LOG (first update block)

${firstUpdateBlock(mainLog)}

## Snippet — LifeOS lane

${firstUpdateBlock(lifeos)}

## Snippet — Council lane

${firstUpdateBlock(council)}

## Amendment 36 (Zero-Drift) — abstract

${amd36.slice(0, 2500)}

## Amendment 21 — Agent Handoff Notes region

${handoff}

## Institutional Memory — top lessons (RECEIPT-class, not FACT)

> Source: \`docs/INSTITUTIONAL_MEMORY_DIGEST.md\` — generated from \`lessons_learned\` DB table.
> Confidence: low-to-medium. Do not treat as INVARIANT without runtime evidence.

${memoryDigest.includes('AUTO-GENERATED') ? memoryDigest.slice(memoryDigest.indexOf('---\n\n') + 5, memoryDigest.indexOf('---\n\n') + 3000) : memoryDigest.slice(0, 2500)}

## Task DNA coverage (S4 — warn-only)

> Fields: why_created, source_receipt, depends_on, blocks, proof_required_to_close
> Missing DNA does not block execution. This section is informational only.

${dnaSummary ? formatReport(dnaSummary) : '_(validate-task-dna.mjs unavailable)_'}

## Prediction loop (S5 — warn-only)

> Source: \`data/prediction-loop.jsonl\` — written by queue at each task exit.
> Mismatches are informational only and do not block queue execution.

${predictionSummary ? formatPredictionReport(predictionSummary) : '_(validate-predictions.mjs unavailable)_'}
`;

  await fs.writeFile(path.join(ROOT, 'docs/AI_COLD_START.md'), out, 'utf8');
  console.log('✅ Wrote docs/AI_COLD_START.md');

  // Also regenerate compact rules so they never drift from QUICK_LAUNCH + CONTINUITY_LOG
  const { main: genRules } = await import('./generate-agent-rules.mjs');
  if (typeof genRules === 'function') await genRules();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
