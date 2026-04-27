#!/usr/bin/env node
/**
 * Regenerates docs/AI_COLD_START.md from continuity lane files + INDEX pointer.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function main() {
  const index = await readSafe('docs/CONTINUITY_INDEX.md');
  const mainLog = await readSafe('docs/CONTINUITY_LOG.md');
  const lifeos = await readSafe('docs/CONTINUITY_LOG_LIFEOS.md');
  const council = await readSafe('docs/CONTINUITY_LOG_COUNCIL.md');
  const amd36 = await readSafe('docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md');
  const amd21h = await readSafe('docs/projects/AMENDMENT_21_LIFEOS_CORE.md');

  const handoff = amd21h.includes('## Agent Handoff Notes')
    ? amd21h.slice(amd21h.indexOf('## Agent Handoff Notes'), amd21h.indexOf('## Agent Handoff Notes') + 2500)
    : '_(Add ## Agent Handoff Notes to Amendment 21)_';

  const out = `# AI Cold Start Packet

> **AUTO-GENERATED** — do not hand-edit. Regenerate: \`npm run cold-start:gen\`
> Generated: ${new Date().toISOString()}

## Read order (mandatory)

1. \`docs/CONTINUITY_INDEX.md\` — pick your lane.
2. \`prompts/00-LIFEOS-AGENT-CONTRACT.md\` — epistemic baseline (§2.6, §2.11, §2.15).
3. \`prompts/00-SSOT-READ-SEQUENCE.md\` — ordered SSOT reads (anti-drift).
4. \`prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md\` — think vs execute model policy.
5. This file (you are reading it).
6. The lane log for your task (\`CONTINUITY_LOG_LIFEOS.md\` / \`CONTINUITY_LOG_COUNCIL.md\` / main log).
7. Owning manifest JSON (e.g. \`AMENDMENT_21_LIFEOS_CORE.manifest.json\`) for structured next steps.
8. \`prompts/<domain>.md\` when using the builder.

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
