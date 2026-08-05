#!/usr/bin/env node
/**
 * SYNOPSIS: Conversation dump scanner — produces a categorized catalog of
 * docs/conversation_dumps/ files and their extracted headings for IdeaVault.
 *
 * Usage:
 *   node scripts/scan-conversation-dumps.mjs [--out docs/products/ideavault/conversations/YYYY-MM-DD-conversation-dump-bot-catalog.md]
 *
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DUMP_DIR = path.join(REPO_ROOT, 'docs', 'conversation_dumps');
const CONV_DIR = path.join(REPO_ROOT, 'docs', 'products', 'ideavault', 'conversations');

const TODAY = new Date().toISOString().slice(0, 10);

const TAG_RULES = [
  { tag: 'LIFEOS', patterns: [/lifeos/i, /lumin/i, /chair/i, /communication/i, /emotional/i, /twin/i, /personality/i, /wellness/i] },
  { tag: 'BUILDEROS', patterns: [/builder/i, /factory/i, /mission/i, /convergence/i, /autonomous build/i, /build queue/i] },
  { tag: 'SALESOS', patterns: [/sales/i, /therapist/i, /meeting kit/i, /human performance/i, /practice/i] },
  { tag: 'LEGACYOS', patterns: [/legacy/i, /imprint/i, /historical/i, /media os/i, /digital imprint/i] },
  { tag: 'TC', patterns: [/\btc\b/i, /skyslope/i, /boldtrail/i, /mls/i, /realestate/i, /lifere/i, /title/i] },
  { tag: 'CLIENTCARE', patterns: [/clientcare/i, /billing/i, /insurance/i, /claim/i] },
  { tag: 'MEMORY', patterns: [/memory/i, /adam_decisions/i, /adam_profile/i, /dump chunk/i, /memory intelligence/i] },
  { tag: 'PLATFORM', patterns: [/governance/i, /constitutional/i, /ssot/i, /truth/i, /council/i, /token/i, /railway/i, /deploy/i, /security/i, /kingsman/i] },
  { tag: 'CREATOR', patterns: [/video/i, /youtube/i, /reel/i, /comfyui/i, /kdenlive/i, /anime/i, /story/i, /tiktok/i, /movie/i, /shoppable/i, /creator/i, /vision board/i] },
  { tag: 'IDEAVAULT', patterns: [/brainstorm/i, /idea vault/i, /conversation dump/i, /index/i] },
];

function formatBytes(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / (1024 * 1024)).toFixed(2)}MB`;
}

function extractSynopsis(filePath) {
  try {
    const first = fs.readFileSync(filePath, 'utf8').split(/\r?\n/, 1)[0].trim();
    const m = first.match(/<!--\s*SYNOPSIS:\s*(.*?)\s*-->/i);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

function extractHeadings(filePath, max = 30) {
  try {
    const out = execFileSync(
      'rg',
      ['-n', '^(#{1,3}\\s|<!--\\s*SYNOPSIS:)', path.relative(REPO_ROOT, filePath)],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return out
      .split('\n')
      .filter(Boolean)
      .slice(0, max)
      .map((l) => {
        const [num, ...rest] = l.split(':');
        return rest.join(':').trim().replace(/^<!--\s*SYNOPSIS:\s*/, '').replace(/\s*-->$/, '');
      });
  } catch {
    return [];
  }
}

function tagFile(relPath, synopsis, headings) {
  const probe = `${relPath}\n${synopsis}\n${headings.join('\n')}`;
  const tags = [];
  for (const { tag, patterns } of TAG_RULES) {
    if (patterns.some((p) => p.test(probe))) tags.push(tag);
  }
  // A master cursor dump with explicit session-topic buckets should also inherit tags from bucket contents.
  if (relPath.includes('/by-product/sessions/')) {
    const topic = path.basename(relPath, '.md');
    if (/LIFEOS|LUMIN|CHAIR|COMMUNICATION|EMOTIONAL/.test(topic)) tags.push('LIFEOS');
    if (/BUILDEROS|AUTONOMOUS|FACTORY/.test(topic)) tags.push('BUILDEROS');
    if (/PLATFORM|GOVERNANCE|SSOT/.test(topic)) tags.push('PLATFORM');
    if (/TC|SKYSLOPE|BOLDTRAIL/.test(topic)) tags.push('TC');
    if (/MEMORY|HIST/.test(topic)) tags.push('MEMORY');
    if (/MODELS|OPS/.test(topic)) tags.push('PLATFORM');
    if (/CLIENTCARE|BILLING/.test(topic)) tags.push('CLIENTCARE');
  }
  // README / INBOX / INDEX files should be tagged IDEAVAULT since they are catalog infrastructure.
  if (/README\.md$|CURSOR_SESSIONS_INDEX\.md$|OPERATOR_BRAINSTORM_INBOX\.md$/.test(relPath)) {
    if (!tags.includes('IDEAVAULT')) tags.push('IDEAVAULT');
  }
  if (tags.length === 0) tags.push('UNCATEGORIZED');
  return Array.from(new Set(tags));
}

function discoverFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;
    const full = path.join(entry.parentPath || dir, entry.name);
    const rel = path.relative(DUMP_DIR, full);
    files.push({
      rel,
      full,
      size: fs.statSync(full).size,
      type: rel.startsWith('by-product' + path.sep) ? 'bucket' : 'master',
      repoRel: path.relative(REPO_ROOT, full),
    });
  }
  return files.sort((a, b) => a.repoRel.localeCompare(b.repoRel));
}

function buildCatalog(files) {
  const rows = files.map((f) => {
    const synopsis = extractSynopsis(f.full);
    const headings = extractHeadings(f.full, 35);
    const tags = tagFile(f.rel, synopsis, headings);
    return { ...f, synopsis, headings, tags };
  });

  const byTag = {};
  for (const r of rows) {
    for (const t of r.tags) {
      byTag[t] = byTag[t] || [];
      byTag[t].push(r);
    }
  }

  const totalBytes = rows.reduce((s, r) => s + r.size, 0);
  const masters = rows.filter((r) => r.type === 'master');
  const buckets = rows.filter((r) => r.type === 'bucket');

  const out = [];
  out.push(`<!-- SYNOPSIS: Bot-generated catalog of docs/conversation_dumps/ — ${TODAY} -->`);
  out.push('');
  out.push('# Conversation Dump Bot Catalog');
  out.push('');
  out.push(`**Generated:** ${new Date().toISOString()}`);
  out.push(`**Source root:** \`docs/conversation_dumps/\``);
  out.push(`**Files scanned:** ${files.length} (${masters.length} masters, ${buckets.length} buckets)`);
  out.push(`**Total raw size:** ${formatBytes(totalBytes)}`);
  out.push('');
  out.push('This file is a machine-built index. It groups conversation-dump files by inferred product/theme tags, shows file size, and lists the first few headings so a human or agent can route ideas to the right product home without opening multi-megabyte exports cold.');
  out.push('');
  out.push('## Tags');
  out.push('');
  const tagList = Object.keys(byTag).sort();
  for (const t of tagList) {
    out.push(`- **${t}** (${byTag[t].length} files, ${formatBytes(byTag[t].reduce((s, r) => s + r.size, 0))})`);
  }
  out.push('');

  for (const t of tagList) {
    out.push(`## ${t}`);
    out.push('');
    out.push('| File | Size | Type | Synopsis / Headings |');
    out.push('|------|------|------|---------------------|');
    for (const r of byTag[t].sort((a, b) => a.repoRel.localeCompare(b.repoRel))) {
      const headingStr = r.headings.slice(0, 4).join(' · ').replace(/\|/g, '\\|');
      const synopsis = r.synopsis ? r.synopsis.replace(/\|/g, '\\|') : headingStr;
      out.push(`| [\`${r.repoRel}\`](../../${r.repoRel}) | ${formatBytes(r.size)} | ${r.type} | ${synopsis || '(no synopsis/headings)'} |`);
    }
    out.push('');
  }

  out.push('## Full file inventory');
  out.push('');
  out.push('| File | Size | Tags |');
  out.push('|------|------|------|');
  for (const r of rows) {
    out.push(`| [\`${r.repoRel}\`](../../${r.repoRel}) | ${formatBytes(r.size)} | ${r.tags.join(', ')} |`);
  }
  out.push('');

  return out.join('\n');
}

function parseArgs(argv) {
  const out = { output: path.join(CONV_DIR, `${TODAY}-conversation-dump-bot-catalog.md`) };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      out.output = path.resolve(argv[++i]);
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(DUMP_DIR)) {
    console.error(`Dump directory missing: ${DUMP_DIR}`);
    process.exit(1);
  }

  let rgOk = false;
  try {
    execFileSync('rg', ['--version'], { stdio: 'ignore' });
    rgOk = true;
  } catch {}
  if (!rgOk) {
    console.error('This script requires `rg` (ripgrep) on PATH.');
    process.exit(1);
  }

  const { output } = parseArgs(process.argv.slice(2));
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const files = discoverFiles(DUMP_DIR);
  const catalog = buildCatalog(files);
  fs.writeFileSync(output, catalog, 'utf8');
  console.log(JSON.stringify({ ok: true, output: path.relative(REPO_ROOT, output), files: files.length }, null, 2));
}

main();
