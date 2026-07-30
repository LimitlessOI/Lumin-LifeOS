/**
 * SYNOPSIS: Doc-hygiene detect-and-route for machine ship path (Q-003).
 * Gate Charter: ssot/synopsis are NOT irreversible — never hard-block; route findings.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import path from 'node:path';
import { hasSynopsis } from './file-synopsis.mjs';
import { extractSsotTag } from './product-home-enforce.mjs';

const SOURCE_PREFIXES = [
  'routes/',
  'services/',
  'core/',
  'startup/',
  'middleware/',
  'config/',
  'scripts/',
];

function norm(p) {
  return String(p || '').replace(/^\.\//, '').replace(/\\/g, '/');
}

function isCoCommitSource(rel) {
  const p = norm(rel);
  if (!/\.(js|mjs|cjs|ts)$/i.test(p)) return false;
  if (p.includes('docs/')) return false;
  return SOURCE_PREFIXES.some((prefix) => p.startsWith(prefix));
}

/**
 * Evaluate proposed commit bytes for missing SYNOPSIS / @ssot / co-commit.
 * Always non-blocking: returns { ok: true, routed: Finding[] }.
 */
export function evaluateDocHygiene(proposed = []) {
  const entries = Array.isArray(proposed) ? proposed : [];
  const byPath = new Map();
  for (const entry of entries) {
    const p = norm(entry?.path || entry?.target_file || entry?.file || '');
    if (!p) continue;
    byPath.set(p, entry?.content ?? entry?.output ?? '');
  }
  const batchPaths = new Set(byPath.keys());
  const routed = [];

  for (const [rel, content] of byPath) {
    if (!isCoCommitSource(rel)) continue;
    if (content == null || content === '') continue;
    const text = String(content);
    const ext = path.extname(rel).toLowerCase() || '.js';

    if (!hasSynopsis(text, ext)) {
      routed.push({
        kind: 'missing_synopsis',
        posture: 'route',
        path: rel,
        reason: 'Source file lacks SYNOPSIS header (FILE_SYNOPSIS_LAW); machine path previously bypassed the hook.',
        proposed_solution: `Add a SYNOPSIS header to ${rel} (or let deployment-service injectSynopsis run) and co-commit REPO_FILE_SYNOPSIS_INDEX.json.`,
      });
    }

    const ssot = extractSsotTag(text);
    if (!ssot) {
      routed.push({
        kind: 'missing_ssot_tag',
        posture: 'route',
        path: rel,
        reason: 'Source file lacks @ssot JSDoc tag; product-home co-commit cannot be verified.',
        proposed_solution: `Add \`@ssot docs/products/<product>/PRODUCT_HOME.md\` to the file header and update that home in the same ship.`,
      });
      continue;
    }

    const ssotNorm = norm(ssot);
    if (!batchPaths.has(ssotNorm)) {
      routed.push({
        kind: 'ssot_not_co_committed',
        posture: 'route',
        path: rel,
        ssot: ssotNorm,
        reason: `@ssot ${ssotNorm} is not in this machine-ship batch — standing orders require atomic SSOT update.`,
        proposed_solution: `Include ${ssotNorm} (Last Updated + Change Receipts row) in the same execute-batch / system:commit-files call.`,
      });
    }
  }

  return { ok: true, routed };
}

export function formatDocHygieneFindings(findings = []) {
  return findings
    .map((f) => `- [${f.kind}] ${f.path}: ${f.reason}`)
    .join('\n');
}
