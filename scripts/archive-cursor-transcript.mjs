#!/usr/bin/env node
/**
 * SYNOPSIS: Archive a Cursor agent transcript (.jsonl) into docs/conversation_dumps/.
 * @ssot docs/projects/AMENDMENT_38_IDEA_VAULT.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_RAW = path.join(ROOT, 'docs/conversation_dumps/raw');
const OUT_BY_PRODUCT = path.join(ROOT, 'docs/conversation_dumps/by-product/sessions');

const PRODUCT_RULES = [
  { id: 'LIFEOS_LUMIN', label: 'LifeOS / Lumin / Chair / direct connection', file: 'LIFEOS-LUMIN-CHAIR.md', re: /\blumin\b|\blumen\b|direct connection|fake connection|founder-interface|counsel only|drawer|listening setup|wake word|lifeos-app|chair\b|single connection|lifeos program/i },
  { id: 'BUILDEROS', label: 'BuilderOS / TSOS / autonomous / alpha', file: 'BUILDEROS-AUTONOMOUS.md', re: /builderos|builder os|tsos|autonomous|alpha_ready|proof refresh|governed loop|execute-mission|bp_priority|gap-fill|command.?control|c2 conductor|overnight|done.gate|server\.js/i },
  { id: 'TC_SKYSLOPE', label: 'TC / SkySlope / eXp / transaction coordinator', file: 'TC-SKYSLOPE.md', re: /skyslope|sky slope|transaction coordinator|\btc\b|exp okta|glvar|transaction desk|imap.*tc|tc integration/i },
  { id: 'LIFERE', label: 'LifeRE / real estate alpha', file: 'LIFERE-ALPHA.md', re: /lifere|life re|real estate alpha|marketingos|smos|content brief|agent portal/i },
  { id: 'CLIENTCARE', label: 'ClientCare billing', file: 'CLIENTCARE-BILLING.md', re: /clientcare|client care|billing recovery|vob/i },
  { id: 'PLATFORM', label: 'Platform / deploy / Railway / env / agent browser', file: 'PLATFORM-OPS.md', re: /railway|deploy|push to git|env registry|environment variable|browser verify|use my app|mcp browser|agent session|\.env\b|modulariz|server\.js|curser|cursor/i },
  { id: 'MEMORY_HIST', label: 'Memory / Historian / archaeology', file: 'MEMORY-HIST.md', re: /historian|archaeolog|memory system|memories\.json|digital twin|idea vault/i },
  { id: 'GOVERNANCE', label: 'Governance / NSSOT / founder packet', file: 'GOVERNANCE-SSOT.md', re: /nssot|north star|founder packet|amendment|ssot|truth enforcement|wisdom|opposition|assumption|review all ssot/i },
  { id: 'MODELS', label: 'Models / open source / Codex', file: 'MODELS-OPS.md', re: /open.?source model|codex|ope sorece|anthropic|gemini|together|openrouter/i },
];

const SKIP_USER_RE = /^(Briefly inform the user about the task result|If the available MCP tools do not fully support)/i;

export function sessionShortId(sessionId) {
  return String(sessionId).slice(0, 8);
}

function cleanText(raw) {
  let t = String(raw || '');
  t = t.replace(/<user_query>\n?/g, '').replace(/<\/user_query>/g, '');
  t = t.replace(/<image_files>[\s\S]*?<\/image_files>/gi, '[Image attachment — see workspace assets/]');
  t = t.replace(/<[^>]+>/g, '');
  return t.trim();
}

function isNoise(text) {
  if (!text) return true;
  if (SKIP_USER_RE.test(text)) return true;
  return false;
}

function classify(text) {
  const hits = [];
  for (const rule of PRODUCT_RULES) {
    if (rule.re.test(text)) hits.push(rule.id);
  }
  return hits.length ? hits : ['GENERAL'];
}

export function parseTranscript(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const turns = [];
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (row.role !== 'user' && row.role !== 'assistant') continue;
      const parts = row.message?.content || [];
      let text = '';
      for (const p of parts) {
        if (p.type === 'text') text += p.text;
      }
      text = cleanText(text);
      if (isNoise(text)) continue;
      if (!text) continue;
      turns.push({ role: row.role, text });
    } catch { /* skip bad lines */ }
  }
  return turns;
}

export function pairTurns(turns) {
  const pairs = [];
  let pendingUser = null;
  for (const t of turns) {
    if (t.role === 'user') {
      if (pendingUser) pairs.push({ user: pendingUser, assistant: null });
      pendingUser = t.text;
    } else if (t.role === 'assistant' && pendingUser) {
      pairs.push({ user: pendingUser, assistant: t.text });
      pendingUser = null;
    }
  }
  if (pendingUser) pairs.push({ user: pendingUser, assistant: null });
  return pairs;
}

function mdEscape(s) {
  return String(s || '').replace(/\r/g, '');
}

function firstUserPreview(pairs) {
  const p = pairs.find((x) => x.user && x.user.length > 20);
  return p ? mdEscape(p.user).slice(0, 240) : 'Cursor agent session';
}

function writeProductFiles(pairs, sessionId, date) {
  const shortId = sessionShortId(sessionId);
  const sessionDir = path.join(OUT_BY_PRODUCT, shortId);
  fs.mkdirSync(sessionDir, { recursive: true });
  const buckets = Object.fromEntries(PRODUCT_RULES.map((r) => [r.id, []]));
  buckets.GENERAL = [];

  pairs.forEach((pair, idx) => {
    const blob = `${pair.user}\n${pair.assistant || ''}`;
    const tags = classify(blob);
    for (const tag of tags) {
      (buckets[tag] || buckets.GENERAL).push({ idx: idx + 1, ...pair, tags });
    }
  });

  const written = [];
  for (const rule of PRODUCT_RULES) {
    const items = buckets[rule.id] || [];
    if (!items.length) continue;
    const rel = `docs/conversation_dumps/by-product/sessions/${shortId}/${rule.file}`;
    const outPath = path.join(sessionDir, rule.file);
    const header = `# ${rule.label}\n\n**Session:** \`${sessionId}\` · **Archived:** ${date}  \n**Source:** \`docs/conversation_dumps/raw/cursor-${sessionId}.jsonl\`  \n**Pairs in this bucket:** ${items.length}\n\n---\n\n`;
    const body = items.map((p) => {
      const a = p.assistant
        ? `\n\n**Assistant:**\n\n${mdEscape(p.assistant).slice(0, 12000)}${p.assistant.length > 12000 ? '\n\n…[assistant reply truncated for index size]' : ''}`
        : '\n\n**Assistant:** _(no reply captured)_';
      return `## Exchange ${p.idx}\n\n**Adam / operator:**\n\n${mdEscape(p.user).slice(0, 8000)}${p.user.length > 8000 ? '\n\n…[user message truncated]' : ''}${a}\n\n---\n`;
    }).join('\n');
    fs.writeFileSync(outPath, header + body);
    written.push({ id: rule.id, file: rel, pairs: items.length });
  }

  if (buckets.GENERAL.length) {
    const rel = `docs/conversation_dumps/by-product/sessions/${shortId}/GENERAL-MISC.md`;
    const outPath = path.join(sessionDir, 'GENERAL-MISC.md');
    const header = `# General / uncategorized\n\n**Session:** \`${sessionId}\` · **Pairs:** ${buckets.GENERAL.length}\n\n---\n\n`;
    const body = buckets.GENERAL.slice(0, 200).map((p) => `## Exchange ${p.idx}\n\n**User:** ${mdEscape(p.user).slice(0, 2000)}\n\n---\n`).join('\n');
    fs.writeFileSync(outPath, header + body + (buckets.GENERAL.length > 200 ? `\n\n_…${buckets.GENERAL.length - 200} more pairs in raw jsonl._\n` : ''));
    written.push({ id: 'GENERAL', file: rel, pairs: buckets.GENERAL.length });
  }
  return written;
}

function writeMasterDigest(pairs, sessionId, date, productFiles) {
  const shortId = sessionShortId(sessionId);
  const outPath = path.join(ROOT, 'docs/conversation_dumps', `${date}-cursor-session-${shortId}-MASTER.md`);
  const topics = productFiles.sort((a, b) => b.pairs - a.pairs);
  const recent = pairs.slice(-25);
  const preview = firstUserPreview(pairs);

  let md = `# Cursor session archive — master index

**Session ID:** \`${sessionId}\`  
**Archived:** ${date}  
**Raw transcript:** [\`docs/conversation_dumps/raw/cursor-${sessionId}.jsonl\`](raw/cursor-${sessionId}.jsonl)  
**Exchange pairs (user → assistant):** ${pairs.length}  
**Opening prompt (preview):** ${preview}  
**Cursor transcript path (local):** \`~/.cursor/projects/Users-adamhopkins-Projects-Lumin-LifeOS/agent-transcripts/${sessionId}/${sessionId}.jsonl\`

---

## Product buckets

| Product / theme | File | Pairs |
|-----------------|------|------:|
`;
  for (const t of topics) {
    md += `| ${t.id} | [\`${t.file}\`](${t.file.replace('docs/conversation_dumps/', '')}) | ${t.pairs} |\n`;
  }

  md += `\n---\n\n## Session arc\n\n${preview}\n\nUse **product bucket files** under \`by-product/sessions/${shortId}/\` for full back-and-forth. Use **raw jsonl** for complete machine replay.\n\n`;
  md += `---\n\n## Last 25 exchanges (most recent context)\n\n`;

  for (const p of recent) {
    md += `### Exchange ${pairs.indexOf(p) + 1}\n\n**Adam:** ${mdEscape(p.user).slice(0, 1500)}${p.user.length > 1500 ? '…' : ''}\n\n`;
    if (p.assistant) {
      md += `**Assistant:** ${mdEscape(p.assistant).slice(0, 2500)}${p.assistant.length > 2500 ? '…' : ''}\n\n---\n\n`;
    } else {
      md += `**Assistant:** _(pending / not captured)_\n\n---\n\n`;
    }
  }

  fs.writeFileSync(outPath, md);
  return outPath.replace(`${ROOT}/`, '');
}

export function archiveTranscript(src, sessionId, date = new Date().toISOString().slice(0, 10), { force = false } = {}) {
  if (!src || !fs.existsSync(src)) {
    throw new Error(`Transcript not found: ${src}`);
  }
  const receiptPath = path.join(ROOT, 'products/receipts', `CURSOR_SESSION_${sessionShortId(sessionId).toUpperCase()}.json`);
  if (!force && fs.existsSync(receiptPath)) {
    return { skipped: true, session_id: sessionId, receipt: receiptPath.replace(`${ROOT}/`, '') };
  }

  fs.mkdirSync(OUT_RAW, { recursive: true });
  const rawDest = path.join(OUT_RAW, `cursor-${sessionId}.jsonl`);
  fs.copyFileSync(src, rawDest);

  const turns = parseTranscript(src);
  const pairs = pairTurns(turns);
  const productFiles = writeProductFiles(pairs, sessionId, date);
  const master = writeMasterDigest(pairs, sessionId, date, productFiles);

  const receipt = {
    schema: 'cursor_session_archive_v1',
    at: new Date().toISOString(),
    session_id: sessionId,
    session_short: sessionShortId(sessionId),
    date,
    raw: `docs/conversation_dumps/raw/cursor-${sessionId}.jsonl`,
    master,
    product_files: productFiles,
    pair_count: pairs.length,
    turn_count: turns.length,
    opening_preview: firstUserPreview(pairs),
    ok: true,
  };
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

function main() {
  const force = process.argv.includes('--force');
  const args = process.argv.slice(2).filter((a) => a !== '--force');
  const src = args[0];
  const sessionId = args[1] || path.basename(src, '.jsonl');
  const date = args[2] || new Date().toISOString().slice(0, 10);

  if (!src) {
    console.error('Usage: node scripts/archive-cursor-transcript.mjs [--force] <path-to.jsonl> [sessionId] [YYYY-MM-DD]');
    process.exit(1);
  }

  const result = archiveTranscript(src, sessionId, date, { force });
  console.log(JSON.stringify(result, null, 2));
  if (result.skipped) process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('archive-cursor-transcript.mjs')) {
  main();
}
