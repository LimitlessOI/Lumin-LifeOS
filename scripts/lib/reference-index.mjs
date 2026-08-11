/**
 * SYNOPSIS: Deterministic repo reference/caller index — the shared mechanical
 * engine for enforcement-truth sweeps and rule-driven terminology migrations.
 * Reads the repo once, then answers "who references this symbol/file?" without
 * a model in the loop. Excludes generated indexes and log streams so a symbol
 * is never counted as "used" because it appears in a synopsis index or JSONL.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const CODE_DIRS = [
  'services',
  'routes',
  'middleware',
  'startup',
  'config',
  'core',
  'scripts',
  'factory-staging',
  'builderos-reboot/scripts',
  'db',
  'tests',
  'apps',
];

const CODE_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.sql']);

/**
 * Paths that must never count as evidence of real use:
 * - generated synopsis/catalog indexes (mention every file by construction)
 * - append-only log streams
 * - history/archive trees (explicitly dead per repo law)
 * - node_modules / .git
 */
const EVIDENCE_EXCLUDE_RE = [
  /(^|\/)node_modules\//,
  /(^|\/)\.git\//,
  /REPO_FILE_SYNOPSIS_INDEX\.json$/,
  /REPO_CATALOG[^/]*\.json$/,
  /\.jsonl$/,
  /(^|\/)docs\/history\//,
  /(^|\/)docs\/conversation_dumps\//,
  /(^|\/)docs\/audits\//,
  /(^|\/)agent-transcripts\//,
];

export function isExcludedFromEvidence(rel) {
  return EVIDENCE_EXCLUDE_RE.some((re) => re.test(rel));
}

function walk(dirRel, out, { exts = null, maxDepth = 12, depth = 0 } = {}) {
  const abs = path.join(ROOT, dirRel);
  let entries;
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const rel = path.posix.join(dirRel, e.name);
    if (isExcludedFromEvidence(rel)) continue;
    if (e.isDirectory()) {
      if (depth >= maxDepth) continue;
      walk(rel, out, { exts, maxDepth, depth: depth + 1 });
    } else if (e.isFile()) {
      if (exts && !exts.has(path.extname(e.name))) continue;
      out.push(rel);
    }
  }
  return out;
}

let _codeIndex = null;

/** Build (once) the in-memory index of code files: { rel, content, lines }. */
export function buildCodeIndex({ dirs = CODE_DIRS, force = false } = {}) {
  if (_codeIndex && !force) return _codeIndex;
  const files = [];
  for (const d of dirs) walk(d, files, { exts: CODE_EXTS });
  _codeIndex = files.map((rel) => {
    let content = '';
    try {
      content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    } catch {
      content = '';
    }
    return { rel, content };
  });
  return _codeIndex;
}

/** Every governance/config JSON + markdown that may *claim* enforcement. */
export function buildClaimIndex({ dirs = ['builderos-reboot/governance', 'docs/constitution', 'config'] } = {}) {
  const files = [];
  for (const d of dirs) walk(d, files, { exts: new Set(['.json', '.md']) });
  return files.map((rel) => {
    let content = '';
    try {
      content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    } catch {
      content = '';
    }
    return { rel, content };
  });
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find references to a bare identifier across the code index.
 * Word-boundary matched so `runFoo` never matches `runFooBar`.
 */
export function findReferences(symbol, { index = null, excludeFiles = [] } = {}) {
  const idx = index || buildCodeIndex();
  const re = new RegExp(`\\b${escapeRe(symbol)}\\b`);
  const hits = [];
  const skip = new Set(excludeFiles);
  for (const f of idx) {
    if (skip.has(f.rel)) continue;
    if (!re.test(f.content)) continue;
    const lines = f.content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (re.test(lines[i])) hits.push({ file: f.rel, line: i + 1, text: lines[i].trim().slice(0, 200) });
    }
  }
  return hits;
}

/** Files that reference a repo file by path or basename (import/read evidence). */
export function findFileReaders(targetRel, { index = null } = {}) {
  const idx = index || buildCodeIndex();
  const base = path.basename(targetRel);
  const reBase = new RegExp(escapeRe(base).replace(/\\\./g, '\\.'));
  const rePath = new RegExp(escapeRe(targetRel));
  const hits = [];
  for (const f of idx) {
    if (f.rel === targetRel) continue;
    if (rePath.test(f.content) || reBase.test(f.content)) {
      hits.push(f.rel);
    }
  }
  return [...new Set(hits)];
}

/**
 * Exported symbols per code file: `export function X`, `export async function X`,
 * `export const X =`, and `export { A, B }`.
 */
export function extractExports(content) {
  const names = new Set();
  const fnRe = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
  const constRe = /export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;
  const listRe = /export\s*\{([^}]+)\}/g;
  let m;
  while ((m = fnRe.exec(content))) names.add(m[1]);
  while ((m = constRe.exec(content))) names.add(m[1]);
  while ((m = listRe.exec(content))) {
    for (const part of m[1].split(',')) {
      const name = part.split(/\s+as\s+/)[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  return [...names];
}

/* ------------------------------------------------------------------ *
 * Transitive import graph — "is this module actually loaded by anything
 * the system runs?" Name heuristics cannot answer that; an import graph
 * from real entrypoints can.
 * ------------------------------------------------------------------ */

const IMPORT_RE = /(?:import\s[^'"]*from\s*|import\s*\(|require\s*\(\s*)['"]([^'"]+)['"]/g;

function resolveSpecifier(spec, fromRel) {
  if (!spec.startsWith('.')) return null; // bare package specifier
  const baseDir = path.posix.dirname(fromRel);
  const joined = path.posix.normalize(path.posix.join(baseDir, spec));
  const candidates = [
    joined,
    `${joined}.js`,
    `${joined}.mjs`,
    `${joined}.cjs`,
    `${joined}/index.js`,
    `${joined}/index.mjs`,
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile()) return c;
  }
  return null;
}

export function buildImportGraph({ index = null } = {}) {
  const idx = index || buildCodeIndex();
  const graph = new Map();
  for (const f of idx) {
    const deps = new Set();
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(f.content))) {
      const resolved = resolveSpecifier(m[1], f.rel);
      if (resolved) deps.add(resolved);
    }
    graph.set(f.rel, [...deps]);
  }
  return graph;
}

/**
 * Real execution entrypoints: the server composition root, boot/startup, and
 * every file named by a package.json script (those are how the factory CLI,
 * schedulers, verifiers and acceptance runs actually enter the code).
 */
export function entrypointRoots({ index = null } = {}) {
  const idx = index || buildCodeIndex();
  const roots = new Set();
  const add = (rel) => { if (idx.some((f) => f.rel === rel)) roots.add(rel); };

  add('server.js');
  for (const f of idx) {
    if (f.rel.startsWith('startup/') || f.rel.startsWith('routes/') || f.rel.startsWith('middleware/')) roots.add(f.rel);
  }
  // package.json scripts: `node path/to/file.mjs`, `node --test tests/x.js`
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    for (const cmd of Object.values(pkg.scripts || {})) {
      for (const m of String(cmd).matchAll(/(?:^|\s)((?:scripts|builderos-reboot|factory-staging|apps|db|tests)\/[\w./-]+\.(?:mjs|js|cjs))/g)) {
        add(m[1]);
      }
    }
  } catch { /* package.json unreadable — roots still include server/startup/routes */ }
  return [...roots];
}

export function reachableModules({ index = null, graph = null, roots = null } = {}) {
  const idx = index || buildCodeIndex();
  const g = graph || buildImportGraph({ index: idx });
  const start = roots || entrypointRoots({ index: idx });
  const seen = new Set();
  const stack = [...start];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const dep of g.get(cur) || []) if (!seen.has(dep)) stack.push(dep);
  }
  return seen;
}

/**
 * Is a symbol reachable from something other than its own definition file and
 * its own tests? Tests alone are explicitly NOT reachability: the 2026-08-08
 * "zero real callers" failure passed its own unit tests.
 */
export function symbolReachability(symbol, defFile, { index = null } = {}) {
  const refs = findReferences(symbol, { index, excludeFiles: [defFile] });
  const nonTest = refs.filter((r) => !r.file.startsWith('tests/') && !/\.test\./.test(r.file));
  const production = nonTest.filter((r) => !r.file.startsWith('scripts/'));
  return {
    symbol,
    def_file: defFile,
    total_refs: refs.length,
    test_only: refs.length > 0 && nonTest.length === 0,
    script_only: nonTest.length > 0 && production.length === 0,
    reachable: production.length > 0,
    callers: [...new Set(nonTest.map((r) => r.file))].slice(0, 12),
  };
}

export { ROOT };
