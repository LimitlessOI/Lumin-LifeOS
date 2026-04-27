#!/usr/bin/env node
/**
 * Full-repo inventory for triage (keep / deprecate / delete) and onboarding.
 * Regenerates docs/REPO_CATALOG.md (+ optional JSON). Do not hand-edit the catalog table.
 *
 * Run: npm run repo:catalog
 *
 * Human verdicts live in docs/REPO_TRIAGE_NOTES.md
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_MD = path.join(ROOT, 'docs', 'REPO_CATALOG.md');
const OUT_BUCKET_MD = path.join(ROOT, 'docs', 'REPO_BUCKET_INDEX.md');
const OUT_JSON = path.join(ROOT, 'docs', 'REPO_CATALOG.json');

const IGNORE_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.cursor',
  '.next',
  'dist',
  'build',
  'coverage',
  'archive',
  'sandbox',
  '.worktrees',
  '__pycache__',
  '.quarantine',
  // Conversation / thread dumps — hundreds of thousands of small files; bloats catalog & git
  'THREAD_REALITY',
]);

const IGNORE_PATH_PREFIXES = [
  'knowledge/index/entries.jsonl',
  'audit/reports/', // generated FSAR/drift JSON+md — gitignored in .gitignore for new runs; legacy copies may remain
];

const MAX_HINT_BYTES = 280;
const MAX_LINE_COUNT_FILE = 400_000; // skip line count above this size (bytes)

function kindFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.js': 'js',
    '.mjs': 'mjs',
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.jsx': 'jsx',
    '.md': 'markdown',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.png': 'binary-image',
    '.jpg': 'binary-image',
    '.jpeg': 'binary-image',
    '.gif': 'binary-image',
    '.webp': 'binary-image',
    '.ico': 'binary-image',
    '.svg': 'svg',
    '.pdf': 'binary',
    '.woff': 'font',
    '.woff2': 'font',
    '.ttf': 'font',
    '.sh': 'shell',
    '.txt': 'text',
  };
  return map[ext] || (ext ? ext.slice(1) : 'file');
}

function shouldSkip(relPosix) {
  const parts = relPosix.split('/');
  for (const p of parts) {
    if (IGNORE_DIR_NAMES.has(p)) return true;
  }
  for (const pre of IGNORE_PATH_PREFIXES) {
    const n = pre.endsWith('/') ? pre.slice(0, -1) : pre;
    if (relPosix === n || relPosix.startsWith(`${n}/`)) return true;
  }
  return false;
}

async function hintForFile(absPath, relPosix, size) {
  if (size === 0) return '(empty)';
  const binaryKinds = new Set(['binary-image', 'binary', 'font']);
  const k = kindFromExt(relPosix);
  if (binaryKinds.has(k) || size > 512 * 1024) return `(${k}, ${size} B)`;

  try {
    const fh = await fs.open(absPath, 'r');
    const buf = Buffer.allocUnsafe(Math.min(MAX_HINT_BYTES, size));
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    await fh.close();
    let s = buf.slice(0, bytesRead).toString('utf8').split(/\r?\n/)[0]?.trim() ?? '';
    s = s.replace(/^\/\/\s?|^#\s?|^\*\s?|^\/\*\*?\s?/, '').slice(0, 200);
    if (!s) return `(${k})`;
    return s.replace(/\|/g, '\\|');
  } catch {
    return `(${k})`;
  }
}

async function lineCountIfSmall(absPath, size) {
  if (size > 96 * 1024) return '—';
  if (size > MAX_LINE_COUNT_FILE) return '—';
  try {
    const text = await fs.readFile(absPath, 'utf8');
    let n = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') n++;
    }
    return String(n + (text.length && !text.endsWith('\n') ? 1 : 0));
  } catch {
    return '—';
  }
}

async function walk(dirAbs, relBase, acc) {
  let entries;
  try {
    entries = await fs.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const rel = relBase ? `${relBase}/${ent.name}` : ent.name;
    const relPosix = rel.split(path.sep).join('/');
    if (shouldSkip(relPosix)) continue;

    const abs = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      await walk(abs, rel, acc);
    } else if (ent.isFile()) {
      let st;
      try {
        st = await fs.stat(abs);
      } catch {
        continue;
      }
      const hint = await hintForFile(abs, relPosix, st.size);
      const lines = await lineCountIfSmall(abs, st.size);
      acc.push({
        path: relPosix,
        bytes: st.size,
        lines,
        kind: kindFromExt(relPosix),
        hint,
        mtime: st.mtime.toISOString().slice(0, 10),
      });
    }
  }
}

function topLevelBucket(p) {
  const i = p.indexOf('/');
  return i === -1 ? '(root)' : p.slice(0, i);
}

async function main() {
  const acc = [];
  await walk(ROOT, '', acc);
  acc.sort((a, b) => a.path.localeCompare(b.path));

  const byBucket = new Map();
  let totalBytes = 0;
  for (const row of acc) {
    totalBytes += row.bytes;
    const b = topLevelBucket(row.path);
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b).push(row);
  }

  const buckets = [...byBucket.keys()].sort((a, b) => a.localeCompare(b));

  const genAt = new Date().toISOString();
  let md = `# REPO_CATALOG — machine-generated inventory

> **AUTO-GENERATED** — \`npm run repo:catalog\`  
> **Do not hand-edit** the tables below (regenerate). **Human triage** (gold / trash / keep): \`docs/REPO_TRIAGE_NOTES.md\`  
> **Compact buckets only:** \`docs/REPO_BUCKET_INDEX.md\` — **All indexes map:** \`docs/REPO_MASTER_INDEX.md\`  
> **Parent protocol:** \`docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md\`

## Summary

| Metric | Value |
|--------|-------|
| Generated (UTC) | ${genAt} |
| File count | ${acc.length} |
| Approx. total bytes (files only) | ${totalBytes.toLocaleString()} |
| Ignored | \`node_modules\`, \`.git\`, \`.cursor\`, \`archive\`, \`sandbox\`, \`coverage\`, \`dist\`, \`build\`, \`.next\`, \`.worktrees\`, \`THREAD_REALITY\`, \`audit/reports/\`, \`knowledge/index/entries.jsonl\`, etc. |

## Maintenance

1. After **large adds/moves/deletes**, run \`npm run repo:catalog\`.
2. Record **deprecations and deletion candidates** in \`docs/REPO_TRIAGE_NOTES.md\` (paths + rationale).
3. When an amendment **owns a new top-level tree**, add a one-line pointer in \`docs/projects/INDEX.md\` if needed; add a row to \`docs/REPO_MASTER_INDEX.md\` if you added a new **class** of index.
4. **Multi-run cleanup:** use triage notes to open PRs that delete or archive; re-run catalog to verify.

## Index of top-level buckets

| Bucket | Files | Bytes (sum) |
|--------|------:|------------:|
`;

  for (const b of buckets) {
    const rows = byBucket.get(b);
    const sum = rows.reduce((s, r) => s + r.bytes, 0);
    md += `| \`${b}/\` | ${rows.length} | ${sum.toLocaleString()} |\n`;
  }

  md += `
## Files by directory

`;

  for (const b of buckets) {
    const rows = byBucket.get(b);
    md += `### \`${b === '(root)' ? '.' : b + '/'}\`

| Path | Bytes | Lines | Kind | Modified | Hint (first line / type) |
|------|------:|------:|------|----------|----------------------------|
`;
    for (const r of rows) {
      md += `| \`${r.path}\` | ${r.bytes} | ${r.lines} | ${r.kind} | ${r.mtime} | ${r.hint} |\n`;
    }
    md += '\n';
  }

  await fs.writeFile(OUT_MD, md, 'utf8');

  /** Compact bucket-only view — fast to open; full paths stay in REPO_CATALOG.md */
  let bucketMd = `# REPO_BUCKET_INDEX — top-level buckets only

> **AUTO-GENERATED** — \`npm run repo:catalog\` (same run as \`REPO_CATALOG.md\`)  
> **Full file paths + hints:** \`docs/REPO_CATALOG.md\` — **Navigation hub:** \`docs/REPO_MASTER_INDEX.md\`

## Summary

| Metric | Value |
|--------|-------|
| Generated (UTC) | ${genAt} |
| File count | ${acc.length} |
| Total bytes (indexed files) | ${totalBytes.toLocaleString()} |

## Top-level buckets (sorted A→Z)

| Bucket | Files | Bytes (sum) |
|--------|------:|------------:|
`;
  for (const b of buckets) {
    const rows = byBucket.get(b);
    const sum = rows.reduce((s, r) => s + r.bytes, 0);
    bucketMd += `| \`${b}/\` | ${rows.length} | ${sum.toLocaleString()} |\n`;
  }
  bucketMd += `
## Largest buckets (by byte sum, top 15)

| Rank | Bucket | Bytes |
|------|--------|------:|
`;
  const bySize = buckets
    .map((b) => ({ b, sum: byBucket.get(b).reduce((s, r) => s + r.bytes, 0) }))
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 15);
  bySize.forEach((row, i) => {
    bucketMd += `| ${i + 1} | \`${row.b}/\` | ${row.sum.toLocaleString()} |\n`;
  });

  await fs.writeFile(OUT_BUCKET_MD, bucketMd, 'utf8');

  await fs.writeFile(
    OUT_JSON,
    JSON.stringify({ generated: genAt, fileCount: acc.length, totalBytes, files: acc }, null, 0),
    'utf8'
  );

  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_BUCKET_MD}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Files indexed: ${acc.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
