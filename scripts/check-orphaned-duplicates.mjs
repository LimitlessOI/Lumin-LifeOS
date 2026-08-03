#!/usr/bin/env node
/**
 * SYNOPSIS: check-orphaned-duplicates.mjs
 * Warning-first detector for the "move, don't rename" rule in CLAUDE.md.
 *
 * Flags two shapes of drift, confirmed live in this repo more than once:
 *   1. A file whose entire body (stripped of comments/whitespace) is just a
 *      re-export of another local file, with no `// intentional alias:` comment
 *      explaining why the shim still exists.
 *   2. A named function/const exported from two or more different files under
 *      the same identifier — a strong signal that architectural ownership moved
 *      but the old file was left in place instead of deleted or moved.
 *
 * Warning-only for now (exits 0, prints findings) — wired into builder:preflight
 * as advisory output, not a blocking gate, per the blueprint's own "detect and
 * route before hard-block" discipline used elsewhere in this repo.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SCAN_DIRS = ['routes', 'services', 'middleware', 'core'];
const SKIP_SUFFIXES = ['.test.js', '.test.mjs'];
const ALIAS_MARKER = 'intentional alias';

// Common generic export names that collide legitimately all over the codebase
// (every route file has *a* register function) — only flag identifiers precise
// enough that a collision is actually meaningful.
const NAME_DENYLIST = new Set([
  'default', 'register', 'init', 'main', 'handler', 'middleware', 'router',
  'create', 'setup', 'configure', 'run', 'start', 'stop', 'get', 'set',
  // 'version' is a per-module metadata const many unrelated files export by
  // convention (confirmed: services/confidence-vectors.js and
  // services/governance-cost-index.js both export version = "2026-08-02" as
  // independent, unrelated module stamps, not architectural drift).
  'version',
]);

function listJsFiles(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (!/\.(js|mjs)$/.test(entry.name)) continue;
    if (SKIP_SUFFIXES.some((s) => entry.name.endsWith(s))) continue;
    out.push(path.join(dir, entry.name));
  }
  return out;
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function isReexportShim(src) {
  const stripped = stripComments(src).trim();
  if (!stripped) return false;
  const lines = stripped.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  return lines.every((l) => /^(export\s*\*|export\s*\{[^}]*\}\s*from|import\s|export\s+default\s+)/.test(l));
}

function extractExportedNames(src) {
  const stripped = stripComments(src);
  const names = new Set();
  // Anchored to line start (after indentation) so a string/JSON literal that merely
  // *contains* the text "export function foo" (e.g. a documented signature example)
  // is never mistaken for a real export — confirmed as a real false-positive source
  // in this repo's services/blueprint-intake.js during testing.
  for (const m of stripped.matchAll(/^[ \t]*export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  for (const m of stripped.matchAll(/^[ \t]*export\s+const\s+([A-Za-z0-9_$]+)\s*=/gm)) names.add(m[1]);
  return names;
}

function main() {
  const files = SCAN_DIRS.flatMap(listJsFiles);
  const shimFindings = [];
  const exportsByName = new Map();

  for (const relPath of files) {
    const abs = path.join(ROOT, relPath);
    let src;
    try {
      src = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    if (isReexportShim(src) && !src.includes(ALIAS_MARKER)) {
      shimFindings.push(relPath);
    }

    for (const name of extractExportedNames(src)) {
      if (NAME_DENYLIST.has(name)) continue;
      if (!exportsByName.has(name)) exportsByName.set(name, []);
      exportsByName.get(name).push(relPath);
    }
  }

  const duplicateFindings = Array.from(exportsByName.entries())
    .filter(([, paths]) => paths.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const totalFindings = shimFindings.length + duplicateFindings.length;

  if (totalFindings === 0) {
    console.log('✅ check-orphaned-duplicates: no unmarked re-export shims or duplicate exported names found.');
    process.exit(0);
  }

  console.log(`⚠️  check-orphaned-duplicates: ${totalFindings} finding(s) — advisory only, does not block.\n`);

  if (shimFindings.length) {
    console.log(`Unmarked re-export shims (${shimFindings.length}) — add "// intentional alias: <why>" or move/delete per CLAUDE.md "MOVE, DON'T RENAME":`);
    for (const f of shimFindings) console.log(`  - ${f}`);
    console.log('');
  }

  if (duplicateFindings.length) {
    console.log(`Exported names claimed by multiple files (${duplicateFindings.length}) — check whether an old file was left behind instead of moved/deleted:`);
    for (const [name, paths] of duplicateFindings) {
      console.log(`  - "${name}": ${paths.join(', ')}`);
    }
  }

  process.exit(0);
}

main();
