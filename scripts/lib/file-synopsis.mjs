/**
 * SYNOPSIS: Shared helpers — detect, infer, inject SYNOPSIS headers; index entry builders.
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import path from 'node:path';

export const INDEX_REL = 'builderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json';

export const IN_FILE_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.html', '.sql', '.md', '.css', '.sh', '.yaml', '.yml']);
export const INDEX_EXTENSIONS = new Set([
  ...IN_FILE_EXTENSIONS,
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
]);

const SKIP_IN_FILE = [
  /^verify-runner-telemetry-g\d+\.mjs$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  /^AGENT_RULES\.compact\.md$/,
];

const SKIP_INDEX = [
  /^node_modules\//,
  /^\.git\//,
  /^\.claude\//,
  /^\.worktrees\//,
  /^backups\//,
  /^services\/code-review\//,
  /^src\//,
  // Volatile, machine-owned runtime files: the autonomous build loop rewrites
  // these every few minutes, so indexing their byte size makes the synopsis
  // index — and therefore every open PR that co-commits the index — go
  // INDEX_STALE within one loop tick. Excluding them keeps the index stable.
  /^docs\/products\/[^/]+\/BUILD_QUEUE\.json$/,
  /^data\/governed-autonomous-ship-state\.json$/,
];

export function shouldSkipInFile(relPath) {
  const base = path.basename(relPath);
  return SKIP_IN_FILE.some((re) => re.test(base));
}

export function shouldSkipIndex(relPath) {
  return SKIP_INDEX.some((re) => re.test(relPath));
}

export function isInFileEnforceable(relPath) {
  if (shouldSkipInFile(relPath)) return false;
  return IN_FILE_EXTENSIONS.has(path.extname(relPath).toLowerCase());
}

export function isIndexable(relPath) {
  if (shouldSkipIndex(relPath)) return false;
  const ext = path.extname(relPath).toLowerCase();
  if (INDEX_EXTENSIONS.has(ext)) return true;
  return false;
}

export function hasSynopsis(content, ext) {
  const e = ext.toLowerCase();
  if (['.js', '.mjs', '.ts'].includes(e)) {
    return /^\s*(?:\/\*\*[\s\S]*?\*\/\s*)?[\s\S]{0,200}SYNOPSIS\s*:/m.test(content.slice(0, 4000));
  }
  if (e === '.html' || e === '.md') {
    return /SYNOPSIS\s*:/i.test(content.slice(0, 4000));
  }
  if (e === '.sql' || e === '.css' || e === '.sh' || e === '.yaml' || e === '.yml') {
    return /^[\s\S]{0,800}(?:--|\/\*|#)\s*SYNOPSIS\s*:/m.test(content);
  }
  return false;
}

export function extractSynopsis(content, ext) {
  const head = content.slice(0, 12000);
  const e = ext.toLowerCase();

  const tagged = head.match(/SYNOPSIS\s*:\s*(.+?)(?:\n|\*\/|-->|$)/i);
  if (tagged) return tagged[1].trim().slice(0, 240);

  if (['.js', '.mjs', '.ts'].includes(e)) {
    const block = head.match(/\/\*\*([\s\S]*?)\*\//);
    if (block) {
      const lines = block[1]
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').trim())
        .filter((l) => l && !l.startsWith('@') && !l.startsWith('---') && !/^SYNOPSIS/i.test(l));
      const line = lines.find((l) => l.length > 8) || lines[0];
      if (line) return line.slice(0, 240);
    }
    const lineComment = head.match(/^\/\/\s*(.+)/m);
    if (lineComment) return lineComment[1].trim().slice(0, 240);
  }

  if (e === '.html') {
    const title = head.match(/<title>([^<]+)<\/title>/i);
    if (title) return `HTML page: ${title[1].trim()}`.slice(0, 240);
  }

  if (e === '.md') {
    const h1 = head.match(/^#\s+(.+)/m);
    if (h1) return h1[1].trim().slice(0, 240);
  }

  return null;
}

function humanize(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function inferSynopsis(relPath, content) {
  const ext = path.extname(relPath).toLowerCase();
  const base = path.basename(relPath);
  const existing = extractSynopsis(content, ext);
  if (existing && !/^SYNOPSIS/i.test(existing)) return existing;

  const head = content.slice(0, 8000);
  const register = head.match(/export\s+function\s+register(\w+)/);
  if (register) return `Registers ${register[1]} routes/handlers (${relPath}).`;

  const namedFn = head.match(/export\s+(?:async\s+)?function\s+(\w+)/);
  if (namedFn) return `Exports ${namedFn[1]} — ${relPath}.`;

  const klass = head.match(/export\s+(?:default\s+)?class\s+(\w+)/);
  if (klass) return `Class ${klass[1]} — ${relPath}.`;

  if (relPath.startsWith('routes/')) return `HTTP route module — ${humanize(base)}.`;
  if (relPath.startsWith('services/')) return `Service module — ${humanize(base)}.`;
  if (relPath.startsWith('startup/')) return `Startup/boot module — ${humanize(base)}.`;
  if (relPath.startsWith('config/')) return `Configuration — ${humanize(base)}.`;
  if (relPath.startsWith('core/')) return `Core library — ${humanize(base)}.`;
  if (relPath.startsWith('scripts/')) return `Script — ${humanize(base)}.`;
  if (relPath.startsWith('builderos-reboot/')) return `BuilderOS artifact — ${humanize(base)}.`;
  if (relPath.startsWith('factory-staging/')) return `Factory staging — ${humanize(base)}.`;
  if (relPath.startsWith('public/overlay/')) return `LifeOS overlay UI — ${humanize(base)}.`;
  if (relPath.startsWith('db/migrations/') || relPath.startsWith('migrations/')) {
    return `Database migration — ${base}.`;
  }
  if (relPath.startsWith('docs/')) return `Documentation — ${humanize(base)}.`;
  if (relPath.startsWith('products/receipts/')) return `Product receipt — ${humanize(base)}.`;
  if (ext === '.json') return `JSON data/config — ${relPath}.`;
  if (ext === '.html') return `HTML page — ${humanize(base)}.`;
  if (ext === '.sql') return `SQL — ${base}.`;
  if (ext === '.md') return `Markdown doc — ${humanize(base)}.`;
  if (ext === '.css') return `Stylesheet — ${humanize(base)}.`;
  if (ext === '.sh') return `Shell script — ${humanize(base)}.`;

  return `${ext.slice(1) || 'file'} — ${relPath}.`;
}

export function injectSynopsis(content, synopsis, ext) {
  const safe = synopsis.replace(/\*\//g, '* /').trim();
  const e = ext.toLowerCase();

  if (['.js', '.mjs', '.ts'].includes(e)) {
    const shebang = content.startsWith('#!') ? content.match(/^#!.*\n/)?.[0] || '' : '';
    const rest = shebang ? content.slice(shebang.length) : content;

    const openBlock = rest.match(/^(\s*\/\*\*[\s\S]*?\*\/\s*)/);
    if (openBlock && !/SYNOPSIS\s*:/i.test(openBlock[1])) {
      const patched = openBlock[1].replace('/**', `/**\n * SYNOPSIS: ${safe}`);
      return shebang + rest.replace(openBlock[1], patched);
    }
    if (openBlock && /SYNOPSIS\s*:/i.test(openBlock[1])) {
      return content;
    }

    const block = `/**\n * SYNOPSIS: ${safe}\n */\n`;
    return shebang + block + rest.replace(/^\s*/, '');
  }

  if (e === '.html') {
    if (/SYNOPSIS\s*:/i.test(content.slice(0, 500))) return content;
    const comment = `<!-- SYNOPSIS: ${safe} -->\n`;
    if (content.match(/^<!DOCTYPE/i)) {
      return content.replace(/^<!DOCTYPE[^>]*>\s*/i, (m) => `${m}${comment}`);
    }
    return comment + content;
  }

  if (e === '.md') {
    if (/SYNOPSIS\s*:/i.test(content.slice(0, 800))) return content;
    const fm = content.match(/^---\n[\s\S]*?\n---\n/);
    const comment = `<!-- SYNOPSIS: ${safe} -->\n\n`;
    if (fm) return fm[0] + comment + content.slice(fm[0].length);
    return comment + content;
  }

  if (e === '.sql') {
    if (/SYNOPSIS\s*:/i.test(content.slice(0, 400))) return content;
    return `-- SYNOPSIS: ${safe}\n${content}`;
  }

  if (e === '.css') {
    if (/SYNOPSIS\s*:/i.test(content.slice(0, 400))) return content;
    return `/* SYNOPSIS: ${safe} */\n${content}`;
  }

  if (e === '.sh') {
    if (/SYNOPSIS\s*:/i.test(content.slice(0, 400))) return content;
    const shebang = content.startsWith('#!') ? content.match(/^#!.*\n/)?.[0] || '' : '';
    const rest = shebang ? content.slice(shebang.length) : content;
    return `${shebang}# SYNOPSIS: ${safe}\n${rest}`;
  }

  if (e === '.yaml' || e === '.yml') {
    if (/SYNOPSIS\s*:/i.test(content.slice(0, 400))) return content;
    return `# SYNOPSIS: ${safe}\n${content}`;
  }

  return content;
}

export function extractSsot(content) {
  const tags = [...content.slice(0, 6000).matchAll(/@ssot\s+([^\n*]+)/g)].map((m) => m[1].trim());
  return tags.slice(0, 2);
}

export function buildIndexEntry(relPath, content, stat, indexedAt) {
  const ext = path.extname(relPath).toLowerCase();
  const synopsis = extractSynopsis(content, ext) || inferSynopsis(relPath, content);
  const ssot = ['.js', '.mjs', '.ts'].includes(ext) ? extractSsot(content) : [];
  const entry = {
    path: relPath,
    synopsis,
    bytes: stat.size,
    mtime: stat.mtime.toISOString(),
    indexed_at: indexedAt,
  };
  if (ssot.length) entry.ssot = ssot;
  if (ext === '.json') entry.synopsis_index_only = true;
  return entry;
}

export function ensureSynopsisInContent(relPath, content) {
  if (!isInFileEnforceable(relPath)) return content;
  const ext = path.extname(relPath);
  if (hasSynopsis(content, ext)) return content;
  return injectSynopsis(content, inferSynopsis(relPath, content), ext);
}

/**
 * Remove a single markdown code fence that wraps an ENTIRE file's content
 * (e.g. the model emitted ```json\n{...}\n``` instead of raw JSON). Only strips
 * when the whole content is one fenced block; a fence appearing mid-file is left
 * untouched, and `.md` is never stripped (markdown legitimately contains fences).
 * Root cause of services/health-nexus/package.json being committed unparseable.
 */
export function stripWrappingCodeFence(content, relPath = '') {
  if (typeof content !== 'string') return content;
  if (path.extname(relPath).toLowerCase() === '.md') return content;
  const withoutBom = content.replace(/^\uFEFF/, '');
  const m = withoutBom.match(/^\s*```[A-Za-z0-9._+-]*[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*\s*$/);
  if (!m) return content;
  const inner = m[1];
  return inner.endsWith('\n') ? inner : `${inner}\n`;
}

/**
 * Produce an updated synopsis-index payload after committing `committedFiles`
 * (each `{ path, content }`), reusing the on-disk generator's shape so a
 * builder commit can carry a fresh index row for every file it writes — making
 * autonomous output pass the File Synopsis Law by construction. Non-indexable
 * files and the index file itself are ignored. `bytes` is derived from the exact
 * UTF-8 content committed, matching the checkout-stable freshness signal the
 * verifier uses.
 */
export function computeUpdatedIndex(currentIndex, committedFiles = [], indexedAt = new Date().toISOString()) {
  const byPath = new Map(((currentIndex && currentIndex.files) || []).map((e) => [e.path, e]));
  for (const entry of committedFiles) {
    const rel = entry?.path;
    const content = entry?.content;
    if (!rel || typeof content !== 'string') continue;
    if (rel === INDEX_REL || !isIndexable(rel)) continue;
    const stat = { size: Buffer.byteLength(content, 'utf8'), mtime: new Date(indexedAt) };
    byPath.set(rel, buildIndexEntry(rel, content, stat, indexedAt));
  }
  const files = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  return {
    schema: 'repo_file_synopsis_index_v1',
    generated_at: indexedAt,
    law: (currentIndex && currentIndex.law)
      || 'Every git-tracked file indexed here. In-file SYNOPSIS enforced on commit for .js/.mjs/.html/.sql/.md/.css/.sh — JSON index-only.',
    file_count: files.length,
    files,
  };
}
