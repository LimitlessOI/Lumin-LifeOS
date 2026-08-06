#!/usr/bin/env node
/**
 * SYNOPSIS: Conversation dump scanner — produces a categorized catalog,
 * flags files for routing/archive review, and extracts Digital Twin signals
 * (decisions, preferences, mood markers, principles, open questions) from
 * conversation dump text.
 *
 * Usage:
 *   node scripts/scan-conversation-dumps.mjs
 *   node scripts/scan-conversation-dumps.mjs --signals
 *   node scripts/scan-conversation-dumps.mjs --signals --llm (future)
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
const SIGNAL_DIR = path.join(REPO_ROOT, 'docs', 'products', 'ideavault', 'data', 'twin-signals');
const INDEX_FILE = path.join(REPO_ROOT, 'docs', 'CONVERSATION_DUMP_IDEAS_INDEX.md');

const TODAY = new Date().toISOString().slice(0, 10);
const NOW = new Date();

const TAG_RULES = [
  { tag: 'LIFEOS', patterns: [/lifeos/i, /lumin/i, /chair/i, /communication/i, /emotional/i, /twin/i, /personality/i, /wellness/i] },
  { tag: 'BUILDEROS', patterns: [/builder/i, /factory/i, /mission/i, /convergence/i, /autonomous build/i, /build queue/i] },
  { tag: 'SALESOS', patterns: [/sales/i, /therapist/i, /meeting kit/i, /human performance/i, /practice/i] },
  { tag: 'LEGACY-IMPRINT', patterns: [/legacy/i, /imprint/i, /historical/i, /media os/i, /digital imprint/i] },
  { tag: 'TC', patterns: [/\btc\b/i, /skyslope/i, /boldtrail/i, /mls/i, /realestate/i, /lifere/i, /title/i] },
  { tag: 'CLIENTCARE', patterns: [/clientcare/i, /billing/i, /insurance/i, /claim/i] },
  { tag: 'MEMORY', patterns: [/memory/i, /adam_decisions/i, /adam_profile/i, /dump chunk/i, /memory intelligence/i] },
  { tag: 'PLATFORM', patterns: [/governance/i, /constitutional/i, /ssot/i, /truth/i, /council/i, /token/i, /railway/i, /deploy/i, /security/i, /kingsman/i] },
  { tag: 'CREATOR', patterns: [/video/i, /youtube/i, /reel/i, /comfyui/i, /kdenlive/i, /anime/i, /story/i, /tiktok/i, /movie/i, /shoppable/i, /creator/i, /vision board/i] },
  { tag: 'IDEAVAULT', patterns: [/brainstorm/i, /idea vault/i, /conversation dump/i, /index/i] },
];

const BUCKET_TOPIC_TO_TAGS = {
  LIFEOS: ['LIFEOS'],
  LUMIN: ['LIFEOS'],
  CHAIR: ['LIFEOS'],
  COMMUNICATION: ['LIFEOS'],
  EMOTIONAL: ['LIFEOS'],
  BUILDEROS: ['BUILDEROS'],
  AUTONOMOUS: ['BUILDEROS'],
  FACTORY: ['BUILDEROS'],
  PLATFORM: ['PLATFORM'],
  GOVERNANCE: ['PLATFORM'],
  SSOT: ['PLATFORM'],
  TC: ['TC'],
  SKYSLOPE: ['TC'],
  BOLDTRAIL: ['TC'],
  MEMORY: ['MEMORY'],
  HIST: ['MEMORY', 'LEGACY-IMPRINT'],
  MODELS: ['PLATFORM'],
  OPS: ['PLATFORM'],
  CLIENTCARE: ['CLIENTCARE'],
  BILLING: ['CLIENTCARE'],
};

const SIGNAL_PATTERNS = [
  {
    type: 'DECISION',
    confidence: 0.8,
    regex: /\b(i want|we should|we need to|let's|let us|i decided|we decided|i will|we will|going to|plan to|must|need to)\b[^.!?]{3,120}[.!?]?/gi,
  },
  {
    type: 'PREFERENCE',
    confidence: 0.7,
    regex: /\b(i like|i love|i prefer|i enjoy|i don't like|i do not like|i dislike|i hate|i can't stand|never want|always want|my favorite|my ideal)\b[^.!?]{3,120}[.!?]?/gi,
  },
  {
    type: 'MOOD',
    confidence: 0.6,
    regex: /\b(frustrated|frustrating|excited|exciting|worried|worry|stressed|stress|overwhelmed|happy|sad|angry|anxious|urgent|critical|important|disappointed|confused|confusing|concerned|thrilled|delighted)\b[^.!?]{0,80}[.!?]?/gi,
  },
  {
    type: 'PRINCIPLE',
    confidence: 0.75,
    regex: /\b(the most important|core principle|core value|north star|mission is|always remember|never forget|fundamentally|at the heart|what matters most|first rule|golden rule)\b[^.!?]{5,140}[.!?]?/gi,
  },
  {
    type: 'QUESTION',
    confidence: 0.5,
    regex: /^(what|how|why|should we|do we|can we|could we|is it|would it|are we|will we|did we|have we)\b[^?]{10,120}\?/gim,
  },
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
  if (relPath.includes('/by-product/sessions/')) {
    const topic = path.basename(relPath, '.md').toUpperCase();
    for (const [prefix, mapped] of Object.entries(BUCKET_TOPIC_TO_TAGS)) {
      if (topic.includes(prefix) && !mapped.every((t) => tags.includes(t))) {
        for (const t of mapped) if (!tags.includes(t)) tags.push(t);
      }
    }
  }
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

function loadIndexReferences() {
  const refs = new Set();
  try {
    const text = fs.readFileSync(INDEX_FILE, 'utf8');
    const re = /\]\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      let p = m[1];
      if (p.startsWith('../')) p = path.join('docs', p.replace(/^\.\.\//, ''));
      if (p.startsWith('conversation_dumps/')) p = p.replace('conversation_dumps/', 'docs/conversation_dumps/');
      refs.add(p);
    }
  } catch {}
  return refs;
}

function isPlaceholder(text) {
  return /404\s*:\s*Not Found|404: page not found/i.test(text);
}

function fileDateAgeDays(relPath) {
  const m = path.basename(relPath).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((NOW - d) / (1000 * 60 * 60 * 24));
}

function extractSignals(filePath) {
  const signals = [];
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    if (isPlaceholder(text)) return signals;
    const lines = text.split(/\r?\n/);
    const seen = new Set();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 10 || line.length > 500) continue;
      for (const { type, confidence, regex } of SIGNAL_PATTERNS) {
        const matches = line.matchAll(regex);
        for (const m of matches) {
          const quote = m[0].trim().replace(/\s+/g, ' ').slice(0, 280);
          const key = `${type}:${quote.toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          signals.push({ type, quote, line: i + 1, file: path.relative(REPO_ROOT, filePath), confidence });
        }
      }
    }
  } catch {}
  return signals;
}

function flagFile(row, indexRefs, tagTotals) {
  const flags = [];
  if (row.tags.length === 1 && row.tags[0] === 'UNCATEGORIZED') {
    flags.push('orphan — no product tag inferred; route to OPERATOR_BRAINSTORM_INBOX or a product home');
  }
  if (row.size > 500 * 1024 && row.headings.length < 5) {
    flags.push('oversized — >500KB with few headings; split or add a per-section index');
  }
  if (row.size > 100 * 1024 && row.headings.length < 3) {
    flags.push('sparse_headings — large file with no headings; hard to route without a heading pass');
  }
  if (row.rel.includes('/by-product/sessions/')) {
    const topic = path.basename(row.rel, '.md').toUpperCase();
    const expected = new Set();
    for (const [prefix, mapped] of Object.entries(BUCKET_TOPIC_TO_TAGS)) {
      if (topic.includes(prefix)) for (const t of mapped) expected.add(t);
    }
    if (expected.size > 0 && !row.tags.some((t) => expected.has(t))) {
      flags.push(`path_mismatch — bucket name suggests ${[...expected].join('/')} but inferred tags are ${row.tags.join(', ')}`);
    }
  }
  if (isPlaceholder(fs.readFileSync(row.full, 'utf8'))) {
    flags.push('placeholder — contains 404; not a real source, delete or re-fetch');
  } else if (row.size < 100) {
    flags.push('tiny — file is nearly empty; review for deletion/archive');
  }
  const age = fileDateAgeDays(row.rel);
  if (age !== null && age > 90 && row.type === 'master') {
    flags.push(`stale — ${age} days old; review whether content is still current or should move to docs/history/`);
  }
  return flags;
}

function aggregateProfile(signals) {
  const byType = {};
  for (const s of signals) {
    byType[s.type] = byType[s.type] || [];
    byType[s.type].push(s);
  }
  const top = (type, n = 10) =>
    [...new Set(byType[type]?.map((s) => s.quote))].slice(0, n);
  const tagCounts = {};
  for (const s of signals) {
    const tag = s.file.split('/')[2] || 'unknown';
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  return {
    generated_at: NOW.toISOString(),
    source_files: [...new Set(signals.map((s) => s.file))].length,
    signal_count: signals.length,
    top_decisions: top('DECISION'),
    top_preferences: top('PREFERENCE'),
    top_mood_markers: top('MOOD'),
    top_principles: top('PRINCIPLE'),
    top_questions: top('QUESTION'),
    signals_by_type: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    files_by_top_folder: tagCounts,
  };
}

function writeSignals(signals, outDir, profile) {
  fs.mkdirSync(outDir, { recursive: true });
  const signalPath = path.join(outDir, `adam-${TODAY}-signals.jsonl`);
  const fragmentPath = path.join(outDir, `adam-${TODAY}-profile-fragment.json`);
  const stream = fs.createWriteStream(signalPath, 'utf8');
  for (const s of signals) stream.write(JSON.stringify(s) + '\n');
  stream.end();
  fs.writeFileSync(fragmentPath, JSON.stringify(profile, null, 2) + '\n', 'utf8');
  return { signalPath, fragmentPath };
}

function buildCatalog(rows, flagged, signals, signalFiles) {
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
  out.push(`**Generated:** ${NOW.toISOString()}`);
  out.push(`**Source root:** \`docs/conversation_dumps/\``);
  out.push(`**Files scanned:** ${rows.length} (${masters.length} masters, ${buckets.length} buckets)`);
  out.push(`**Total raw size:** ${formatBytes(totalBytes)}`);
  if (signals.length > 0) {
    out.push(`**Digital Twin signals extracted:** ${signals.length} (decisions, preferences, mood, principles, questions)`);
    out.push(`**Signal files:** \`${signalFiles.signalPath.replace(REPO_ROOT + '/', '')}\`, \`${signalFiles.fragmentPath.replace(REPO_ROOT + '/', '')}\``);
  }
  out.push('');
  out.push('This file is a machine-built index. It groups conversation-dump files by inferred product/theme tags, shows file size, lists the first few headings, and flags files that need human routing or archival review. It also extracts structured Digital Twin signal fragments so the Entity Twin can ingest provenance-rich observations without opening multi-megabyte dumps cold.');
  out.push('');

  out.push('## Flagged for human review');
  out.push('');
  if (flagged.length === 0) {
    out.push('No flags. Every scanned file has a product tag, headings, and is linked from the index.');
  } else {
    out.push('| File | Flags | Suggested action |');
    out.push('|------|-------|------------------|');
    for (const f of flagged) {
      const flagList = f.flags.map((fl) => `- ${fl}`).join('<br>');
      out.push(`| [\`${f.repoRel}\`](../../${f.repoRel}) | ${flagList} | ${f.action} |`);
    }
  }
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
  const out = {
    output: path.join(CONV_DIR, `${TODAY}-conversation-dump-bot-catalog.md`),
    signals: false,
    signalsOut: SIGNAL_DIR,
    llm: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      out.output = path.resolve(argv[++i]);
    } else if (argv[i] === '--signals') {
      out.signals = true;
    } else if (argv[i] === '--signals-out' && argv[i + 1]) {
      out.signalsOut = path.resolve(argv[++i]);
    } else if (argv[i] === '--llm') {
      out.llm = true;
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

  const { output, signals: extractSignalsFlag, signalsOut, llm } = parseArgs(process.argv.slice(2));
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const files = discoverFiles(DUMP_DIR);
  const indexRefs = loadIndexReferences();

  const rows = files.map((f) => {
    const synopsis = extractSynopsis(f.full);
    const headings = extractHeadings(f.full, 35);
    const tags = tagFile(f.rel, synopsis, headings);
    return { ...f, synopsis, headings, tags };
  });

  const tagTotals = {};
  for (const r of rows) {
    for (const t of r.tags) tagTotals[t] = (tagTotals[t] || 0) + 1;
  }

  const flagged = [];
  for (const r of rows) {
    const flags = flagFile(r, indexRefs, tagTotals);
    if (flags.length) {
      const action = flags.some((f) => f.includes('placeholder') || f.includes('tiny'))
        ? 'review for deletion or archive'
        : flags.some((f) => f.includes('stale'))
          ? 'move to docs/history/ or update index'
          : 'route to correct product home or add synopsis/headings';
      flagged.push({ repoRel: r.repoRel, flags, action });
    }
  }

  let signals = [];
  let signalFiles = {};
  if (extractSignalsFlag) {
    for (const r of rows) {
      signals.push(...extractSignals(r.full));
    }
    const profile = aggregateProfile(signals);
    signalFiles = writeSignals(signals, signalsOut, profile);
  }

  const catalog = buildCatalog(rows, flagged, signals, signalFiles);
  fs.writeFileSync(output, catalog, 'utf8');

  const result = {
    ok: true,
    output: path.relative(REPO_ROOT, output),
    files: files.length,
    flagged: flagged.length,
    signals: signals.length,
  };
  if (signalFiles.signalPath) {
    result.signals_file = path.relative(REPO_ROOT, signalFiles.signalPath);
    result.profile_fragment = path.relative(REPO_ROOT, signalFiles.fragmentPath);
  }
  console.log(JSON.stringify(result, null, 2));
}

main();
