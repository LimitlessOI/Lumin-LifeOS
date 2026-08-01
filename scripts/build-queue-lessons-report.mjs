/**
 * SYNOPSIS: Aggregate the build-queue drift lessons log by failure family.
 * Emits a JSON report with counts, root causes, and recommended blueprint amendments.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS_LOG = path.join(ROOT, 'data/build-queue-drift-lessons.jsonl');

function loadLines() {
  if (!fs.existsSync(LESSONS_LOG)) return [];
  return fs.readFileSync(LESSONS_LOG, 'utf8')
    .split(/\n/)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function familyKey(entry) {
  const parts = [entry.failure_class, entry.root_cause, entry.attempted_fix].filter(Boolean);
  return parts.join(' | ');
}

function main() {
  const lines = loadLines();
  const byFamily = {};
  const byProduct = {};

  for (const entry of lines) {
    const key = familyKey(entry) || 'unknown';
    byFamily[key] = byFamily[key] || { count: 0, examples: [], products: new Set() };
    byFamily[key].count += 1;
    byFamily[key].products.add(entry.product || 'unknown');
    if (byFamily[key].examples.length < 3) byFamily[key].examples.push(entry);

    const p = entry.product || 'unknown';
    byProduct[p] = byProduct[p] || { count: 0, results: {} };
    byProduct[p].count += 1;
    byProduct[p].results[entry.result] = (byProduct[p].results[entry.result] || 0) + 1;
  }

  const families = Object.entries(byFamily)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, value]) => ({
      family: key,
      count: value.count,
      products: [...value.products],
      examples: value.examples.map((e) => ({
        step_id: e.step_id,
        target_file: e.target_file,
        reason: e.reason,
      })),
    }));

  const report = {
    schema: 'build_queue_lessons_report_v1',
    generated_at: new Date().toISOString(),
    total_lessons: lines.length,
    families,
    by_product: byProduct,
    recommendations: [
      { target: 'BUILD_QUEUE.json', action: 'review steps with repeated missing_export failures and align expected_exports with actual module names' },
      { target: 'config/auto-registered-product-modules.json', action: 'keep auto-register list synchronized with every new route module' },
      { target: 'factory build pipeline', action: 'generate route aliases and file_contains anchors at build time, not as post-hoc repairs' },
    ],
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
