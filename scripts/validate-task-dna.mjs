#!/usr/bin/env node
/**
 * SYNOPSIS: S4 / Task DNA v0 — Queue DNA field validator
 * S4 / Task DNA v0 — Queue DNA field validator
 *
 * Scans all known queue JSON files for optional Task DNA fields.
 * Warn-only: never exits non-zero due to missing DNA fields.
 * Prints counts by lane and highlights the next task's DNA if present.
 *
 * DNA fields (optional-but-recommended):
 *   why_created         — why this task was queued (motivation / origin event)
 *   source_receipt      — AM/receipt that authorized it (e.g. "AM36 receipt 2026-05-14")
 *   depends_on          — task id(s) that must complete first (array or string)
 *   blocks              — task id(s) that cannot start until this one closes (array or string)
 *   proof_required_to_close — what evidence must exist before this task is marked done
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DNA_FIELDS = ['why_created', 'source_receipt', 'depends_on', 'blocks', 'proof_required_to_close'];

const QUEUE_FILES = [
  { lane: 'LIFEOS_DASHBOARD_BUILDER_QUEUE', file: 'docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json' },
  { lane: 'SITE_BUILDER_AUTONOMOUS_QUEUE',  file: 'docs/projects/SITE_BUILDER_AUTONOMOUS_QUEUE.json' },
  { lane: 'TC_SERVICE_BUILDER_QUEUE',       file: 'docs/projects/TC_SERVICE_BUILDER_QUEUE.json' },
];

export async function validateTaskDNA() {
  const results = [];
  let grandTotal = 0;
  let grandMissing = 0;

  for (const { lane, file } of QUEUE_FILES) {
    const fullPath = path.join(ROOT, file);
    let data;
    try {
      const raw = await fs.readFile(fullPath, 'utf8');
      data = JSON.parse(raw);
    } catch {
      results.push({ lane, file, error: 'could not read or parse', tasks: 0, missing: 0, populated: 0, nextTaskDNA: null });
      continue;
    }

    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    let missing = 0;
    let populated = 0;
    let nextTaskDNA = null;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const hasDNA = DNA_FIELDS.some((f) => task[f] !== undefined && task[f] !== null && task[f] !== '');
      if (hasDNA) {
        populated++;
        if (nextTaskDNA === null) {
          // First task with any DNA — record which fields it has
          const present = DNA_FIELDS.filter((f) => task[f] !== undefined && task[f] !== null && task[f] !== '');
          const absent = DNA_FIELDS.filter((f) => !present.includes(f));
          nextTaskDNA = { id: task.id, present, absent };
        }
      } else {
        missing++;
      }
      grandTotal++;
    }
    grandMissing += missing;
    results.push({ lane, file, tasks: tasks.length, missing, populated, nextTaskDNA });
  }

  return { results, grandTotal, grandMissing, grandPopulated: grandTotal - grandMissing };
}

export function formatReport({ results, grandTotal, grandMissing, grandPopulated }) {
  const lines = ['[task-dna] S4 Task DNA v0 — field coverage report', ''];
  for (const r of results) {
    if (r.error) {
      lines.push(`  ${r.lane}: ERROR — ${r.error}`);
      continue;
    }
    const pct = r.tasks > 0 ? Math.round((r.populated / r.tasks) * 100) : 0;
    lines.push(`  ${r.lane}: ${r.tasks} tasks | ${r.populated} with DNA (${pct}%) | ${r.missing} missing`);
    if (r.nextTaskDNA) {
      lines.push(`    → next DNA task: ${r.nextTaskDNA.id}`);
      lines.push(`       present: ${r.nextTaskDNA.present.join(', ') || 'none'}`);
      if (r.nextTaskDNA.absent.length) {
        lines.push(`       absent:  ${r.nextTaskDNA.absent.join(', ')}`);
      }
    }
  }
  lines.push('');
  const grandPct = grandTotal > 0 ? Math.round((grandPopulated / grandTotal) * 100) : 0;
  lines.push(`  TOTAL: ${grandTotal} tasks | ${grandPopulated} with DNA (${grandPct}%) | ${grandMissing} missing`);
  lines.push('  (warn-only — missing DNA does not block queue execution)');
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await validateTaskDNA();
  console.log(formatReport(report));
}
