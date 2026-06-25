#!/usr/bin/env node
/**
 * SYNOPSIS: Archive all parent Cursor agent transcripts for this workspace.
 * @ssot docs/projects/AMENDMENT_38_IDEA_VAULT.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { archiveTranscript, sessionShortId } from './archive-cursor-transcript.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRANSCRIPT_ROOT = path.join(
  process.env.HOME || '',
  '.cursor/projects/Users-adamhopkins-Projects-Lumin-LifeOS/agent-transcripts',
);

function listParentTranscripts() {
  if (!fs.existsSync(TRANSCRIPT_ROOT)) return [];
  return fs.readdirSync(TRANSCRIPT_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => {
      const id = d.name;
      const jsonl = path.join(TRANSCRIPT_ROOT, id, `${id}.jsonl`);
      if (!fs.existsSync(jsonl)) return null;
      const stat = fs.statSync(jsonl);
      return { id, jsonl, mtime: stat.mtime.toISOString(), bytes: stat.size };
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function writeSessionsIndex(results) {
  const indexPath = path.join(ROOT, 'docs/conversation_dumps/CURSOR_SESSIONS_INDEX.md');
  let md = `# Cursor agent sessions — full index

**Generated:** ${new Date().toISOString()}  
**Parent sessions on disk:** ${results.length}  
**Archive command:** \`npm run lifeos:archive-cursor-transcripts:all\`

Each session has: raw jsonl · master digest · \`by-product/sessions/<id>/\` buckets · \`products/receipts/CURSOR_SESSION_*.json\`

---

| Short ID | Full session ID | Pairs | Size | Master index | Receipt |
|----------|-----------------|------:|-----:|--------------|---------|
`;
  for (const r of results.sort((a, b) => (b.pair_count || 0) - (a.pair_count || 0))) {
    const short = sessionShortId(r.session_id);
    const master = r.master ? `[${short}-MASTER](${path.basename(r.master)})` : '—';
    const receipt = `[CURSOR_SESSION_${short.toUpperCase()}](../../products/receipts/CURSOR_SESSION_${short.toUpperCase()}.json)`;
    md += `| \`${short}\` | \`${r.session_id}\` | ${r.pair_count ?? '—'} | ${r.bytes ? `${Math.round(r.bytes / 1024)}KB` : '—'} | ${master} | ${receipt} |\n`;
  }

  md += `\n---\n\n## Local transcript paths\n\n\`~/.cursor/projects/Users-adamhopkins-Projects-Lumin-LifeOS/agent-transcripts/<uuid>/<uuid>.jsonl\`\n\nSubagent folders (\`subagents/\`) are not archived separately — parent jsonl is canonical.\n`;
  fs.writeFileSync(indexPath, md);
  return indexPath.replace(`${ROOT}/`, '');
}

function main() {
  const force = process.argv.includes('--force');
  const sessions = listParentTranscripts();
  const results = [];

  for (const s of sessions) {
    try {
      const date = s.mtime.slice(0, 10);
      const out = archiveTranscript(s.jsonl, s.id, date, { force });
      results.push({ ...out, bytes: s.bytes });
    } catch (err) {
      results.push({ session_id: s.id, ok: false, error: err.message, bytes: s.bytes });
    }
  }

  const index = writeSessionsIndex(results);
  const summary = {
    schema: 'cursor_session_archive_batch_v1',
    at: new Date().toISOString(),
    sessions_found: sessions.length,
    archived: results.filter((r) => r.ok && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => r.ok === false).length,
    index,
    sessions: results.map((r) => ({
      session_id: r.session_id,
      session_short: sessionShortId(r.session_id),
      pair_count: r.pair_count,
      skipped: r.skipped || false,
      ok: r.ok !== false,
      master: r.master,
    })),
  };

  const batchReceipt = path.join(ROOT, 'products/receipts/CURSOR_SESSIONS_BATCH.json');
  fs.writeFileSync(batchReceipt, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.failed ? 1 : 0);
}

main();
