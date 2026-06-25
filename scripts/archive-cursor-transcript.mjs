#!/usr/bin/env node
/**
 * SYNOPSIS: Archive a Cursor agent transcript (.jsonl) into docs/conversation_dumps/.
 * Archive a Cursor agent transcript (.jsonl) into docs/conversation_dumps/.
 * @ssot docs/projects/AMENDMENT_38_IDEA_VAULT.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_RAW = path.join(ROOT, 'docs/conversation_dumps/raw');
const OUT_BY_PRODUCT = path.join(ROOT, 'docs/conversation_dumps/by-product');

const PRODUCT_RULES = [
  { id: 'LIFEOS_LUMIN', label: 'LifeOS / Lumin / Chair / direct connection', file: 'LIFEOS-LUMIN-CHAIR.md', re: /\blumin\b|\blumen\b|direct connection|fake connection|founder-interface|counsel only|drawer|listening setup|wake word|lifeos-app|chair\b|single connection/i },
  { id: 'BUILDEROS', label: 'BuilderOS / TSOS / autonomous / alpha', file: 'BUILDEROS-AUTONOMOUS.md', re: /builderos|builder os|tsos|autonomous|alpha_ready|proof refresh|governed loop|execute-mission|bp_priority|gap-fill|command.?control|c2 conductor|overnight/i },
  { id: 'TC_SKYSLOPE', label: 'TC / SkySlope / eXp / transaction coordinator', file: 'TC-SKYSLOPE.md', re: /skyslope|sky slope|transaction coordinator|\btc\b|exp okta|glvar|transaction desk|imap.*tc|tc integration/i },
  { id: 'LIFERE', label: 'LifeRE / real estate alpha', file: 'LIFERE-ALPHA.md', re: /lifere|life re|real estate alpha|marketingos|smos|content brief|agent portal/i },
  { id: 'CLIENTCARE', label: 'ClientCare billing', file: 'CLIENTCARE-BILLING.md', re: /clientcare|client care|billing recovery|vob/i },
  { id: 'PLATFORM', label: 'Platform / deploy / Railway / env / agent browser', file: 'PLATFORM-OPS.md', re: /railway|deploy|push to git|env registry|environment variable|browser verify|use my app|mcp browser|agent session|\.env\b/i },
  { id: 'MEMORY_HIST', label: 'Memory / Historian / archaeology', file: 'MEMORY-HIST.md', re: /historian|archaeolog|memory system|memories\.json|digital twin|idea vault/i },
  { id: 'GOVERNANCE', label: 'Governance / NSSOT / founder packet', file: 'GOVERNANCE-SSOT.md', re: /nssot|north star|founder packet|amendment|ssot|truth enforcement|wisdom|opposition|assumption/i },
];

const SKIP_USER_RE = /^(Briefly inform the user about the task result|If the available MCP tools do not fully support)/i;

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
  if (text.startsWith('[ADAM AUTHORIZED]') && text.length < 120 && /continuation directive/i.test(text)) return false;
  return false;
}

function classify(text) {
  const hits = [];
  for (const rule of PRODUCT_RULES) {
    if (rule.re.test(text)) hits.push(rule.id);
  }
  return hits.length ? hits : ['GENERAL'];
}

function parseTranscript(filePath) {
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

function pairTurns(turns) {
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

function writeProductFiles(pairs, sessionId, date) {
  fs.mkdirSync(OUT_BY_PRODUCT, { recursive: true });
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
    const outPath = path.join(OUT_BY_PRODUCT, rule.file);
    const header = `# ${rule.label}\n\n**Session:** \`${sessionId}\` · **Archived:** ${date}  \n**Source:** \`docs/conversation_dumps/raw/cursor-${sessionId}.jsonl\`  \n**Pairs in this bucket:** ${items.length}\n\n---\n\n`;
    const body = items.map((p) => {
      const a = p.assistant
        ? `\n\n**Assistant:**\n\n${mdEscape(p.assistant).slice(0, 12000)}${p.assistant.length > 12000 ? '\n\n…[assistant reply truncated for index size]' : ''}`
        : '\n\n**Assistant:** _(no reply captured)_';
      return `## Exchange ${p.idx}\n\n**Adam / operator:**\n\n${mdEscape(p.user).slice(0, 8000)}${p.user.length > 8000 ? '\n\n…[user message truncated]' : ''}${a}\n\n---\n`;
    }).join('\n');
    fs.writeFileSync(outPath, header + body);
    written.push({ id: rule.id, file: `docs/conversation_dumps/by-product/${rule.file}`, pairs: items.length });
  }

  if (buckets.GENERAL.length) {
    const outPath = path.join(OUT_BY_PRODUCT, 'GENERAL-MISC.md');
    const header = `# General / uncategorized\n\n**Session:** \`${sessionId}\` · **Pairs:** ${buckets.GENERAL.length}\n\n---\n\n`;
    const body = buckets.GENERAL.slice(0, 200).map((p) => `## Exchange ${p.idx}\n\n**User:** ${mdEscape(p.user).slice(0, 2000)}\n\n---\n`).join('\n');
    fs.writeFileSync(outPath, header + body + (buckets.GENERAL.length > 200 ? `\n\n_…${buckets.GENERAL.length - 200} more pairs in raw jsonl._\n` : ''));
    written.push({ id: 'GENERAL', file: 'docs/conversation_dumps/by-product/GENERAL-MISC.md', pairs: buckets.GENERAL.length });
  }
  return written;
}

function writeMasterDigest(pairs, sessionId, date, productFiles) {
  const outPath = path.join(ROOT, 'docs/conversation_dumps', `${date}-cursor-session-${sessionId.slice(0, 8)}-MASTER.md`);
  const userCount = pairs.length;
  const topics = productFiles.sort((a, b) => b.pairs - a.pairs);
  const recent = pairs.slice(-25);

  let md = `# Cursor session archive — master index

**Session ID:** \`${sessionId}\`  
**Archived:** ${date}  
**Raw transcript:** [\`docs/conversation_dumps/raw/cursor-${sessionId}.jsonl\`](raw/cursor-${sessionId}.jsonl)  
**Exchange pairs (user → assistant):** ${userCount}  
**Cursor transcript path (local):** \`~/.cursor/projects/Users-adamhopkins-Projects-Lumin-LifeOS/agent-transcripts/${sessionId}/${sessionId}.jsonl\`

---

## Product buckets

| Product / theme | File | Pairs |
|-----------------|------|------:|
`;
  for (const t of topics) {
    md += `| ${t.id} | [\`${t.file}\`](${t.file.replace('docs/conversation_dumps/', '')}) | ${t.pairs} |\n`;
  }

  md += `\n---\n\n## Session arc (high level)\n\n`;
  md += `This session spans governed overnight BuilderOS runs, alpha/proof remediation, LifeOS/Lumin direct-connection fixes, TC/SkySlope env questions, LifeRE alpha work, and operator directives on push-by-default + browser-based agent verification.\n\n`;
  md += `Use **product bucket files** for full back-and-forth on a topic. Use **raw jsonl** for complete machine replay.\n\n`;
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
  return outPath;
}

function main() {
  const src = process.argv[2];
  const sessionId = process.argv[3] || path.basename(src, '.jsonl');
  const date = process.argv[4] || new Date().toISOString().slice(0, 10);

  if (!src || !fs.existsSync(src)) {
    console.error('Usage: node scripts/archive-cursor-transcript.mjs <path-to.jsonl> [sessionId] [YYYY-MM-DD]');
    process.exit(1);
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
    date,
    raw: `docs/conversation_dumps/raw/cursor-${sessionId}.jsonl`,
    master,
    product_files: productFiles,
    pair_count: pairs.length,
    turn_count: turns.length,
    ok: true,
  };
  const receiptPath = path.join(ROOT, 'products/receipts', `CURSOR_SESSION_${sessionId.slice(0, 8).toUpperCase()}.json`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

  console.log(JSON.stringify(receipt, null, 2));
}

main();
