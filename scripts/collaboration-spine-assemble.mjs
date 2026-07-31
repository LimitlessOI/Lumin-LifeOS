#!/usr/bin/env node
/**
 * SYNOPSIS: Assemble the Collaboration Spine from all DECISION-XXXX.md files.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDecisionRecord } from './verify-decision-record.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DECISIONS_DIR = path.join(ROOT, 'builderos-reboot', 'DECISIONS');
const OUTPUT_MD = path.join(DECISIONS_DIR, 'COLLABORATION_SPINE.md');
const OUTPUT_JSON = path.join(DECISIONS_DIR, 'COLLABORATION_SPINE.json');

function decisionIdSort(a, b) {
  const na = Number(a.decision_id?.split('-')[1] || 0);
  const nb = Number(b.decision_id?.split('-')[1] || 0);
  return na - nb;
}

export async function assembleCollaborationSpine({ decisionsDir = DECISIONS_DIR, outMd = OUTPUT_MD, outJson = OUTPUT_JSON } = {}) {
  const files = fs.readdirSync(decisionsDir)
    .filter(f => /^DECISION-\d{4}\.md$/.test(f))
    .map(f => path.join(decisionsDir, f));

  const results = [];
  const errors = [];
  for (const file of files) {
    const v = verifyDecisionRecord(file);
    if (v.ok) {
      results.push({
        decision_id: v.decision_id,
        file: path.relative(ROOT, v.file),
        summary: extractSummary(file),
      });
    } else {
      errors.push({ file: path.relative(ROOT, v.file), errors: v.errors });
    }
  }

  results.sort(decisionIdSort);

  const md = [
    '<!-- SYNOPSIS: Assembled Collaboration Spine for Mission 2 — BuilderOS Convergence -->',
    '',
    '# Collaboration Spine',
    '',
    `**Assembled at:** ${new Date().toISOString()}`,
    `**Decision count:** ${results.length}`,
    `**Invalid records:** ${errors.length}`,
    '',
    '## Decision chain',
    '',
    '| Order | Decision | File | Summary |',
    '|---|---|---|---|',
    ...results.map((r, i) => `| ${i + 1} | ${r.decision_id} | ${r.file} | ${r.summary} |`),
    '',
    '## Invalid records',
    '',
    ...(errors.length ? errors.map(e => `- ${e.file}: ${e.errors.join('; ')}`) : ['None.']),
    '',
    '---',
    '',
    '## Full chain',
    '',
    ...results.flatMap(r => [`### ${r.decision_id}`, '', `See ${r.file}.`, '']),
    ''
  ].join('\n');

  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outMd, md);

  const json = {
    schema: 'collaboration_spine_v1',
    assembled_at: new Date().toISOString(),
    decisions: results,
    invalid: errors,
  };
  fs.writeFileSync(outJson, JSON.stringify(json, null, 2));

  return { ok: errors.length === 0, count: results.length, errors: errors.length, outMd, outJson };
}

function extractSummary(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const m = content.match(/## Decision\s*\n+([^\n]+)/);
  return m ? m[1].trim().slice(0, 120) : '';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await assembleCollaborationSpine();
  console.log(`Collaboration Spine assembled: ${result.count} valid, ${result.errors} invalid`);
  console.log(`  ${result.outMd}`);
  console.log(`  ${result.outJson}`);
  process.exit(result.ok ? 0 : 1);
}
