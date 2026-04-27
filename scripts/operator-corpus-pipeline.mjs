#!/usr/bin/env node
/**
 * Operator corpus — dual-lane checklist + optional keyword index.
 *
 * - Lane A (ideas): Amendment 38 — vault, INDEX, machine keyword map.
 * - Lane B (“study me”): Amendment 09 — Digital Twin → adam_decisions / adam_profile / simulate.
 *
 * This script does **not** connect to the database or call LLMs (safe offline / CI).
 * For full ingestion, run the commands it prints under Lane B.
 *
 * @ssot docs/projects/AMENDMENT_38_IDEA_VAULT.md
 */
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const RAW = path.join(REPO, '\u2022\tLumin-Memory', '00_INBOX', 'raw');

function main() {
  const skipKeywords = process.argv.includes('--skip-keywords');

  console.log('# Operator corpus pipeline\n');

  const brainstormInbox = path.join(REPO, 'docs', 'conversation_dumps', 'OPERATOR_BRAINSTORM_INBOX.md');

  console.log('## Lane A — Product ideas (permanent SSOT)\n');
  console.log(`- Canonical raw inbox: \`${path.relative(REPO, RAW)}\` — ${fs.existsSync(RAW) ? '**found**' : '**missing** (add exports under bullet+TAB Lumin-Memory)'}`);
  console.log(
    `- Verbatim **brainstorm** paste (ChatGPT / external, limited context OK): \`${path.relative(REPO, brainstormInbox)}\` — ${fs.existsSync(brainstormInbox) ? '**found**' : '**missing**'}`,
  );
  console.log('- Owning doc: `docs/projects/AMENDMENT_38_IDEA_VAULT.md`');
  console.log('- Companion: `docs/CONVERSATION_DUMP_IDEAS_INDEX.md`\n');

  if (!skipKeywords) {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const r = spawnSync(npm, ['run', 'idea-vault:catalog-keywords'], {
      cwd: REPO,
      stdio: 'inherit',
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
  } else {
    console.log('_(Skipped `idea-vault:catalog-keywords` — `--skip-keywords`)_\n');
  }

  console.log('\n## Lane B — Digital Twin (“study me”, predict stance)\n');
  console.log('SSOT: `docs/projects/AMENDMENT_09_LIFE_COACHING.md` — Digital Twin tables + `services/twin-auto-ingest.js`.');
  console.log('Prediction surface: `POST /api/v1/twin/simulate` (`routes/twin-routes.js`).\n');
  console.log('**Historical exports → DB (operator-run, with `DATABASE_URL`):**');
  console.log('1. `node scripts/run-memory-import.mjs` — GitHub tree → `memory_dump_chunks` (optional per-chunk AI if `ANTHROPIC_API_KEY`).');
  console.log('2. `node scripts/import-dumps-to-twin.js --build-profile` — chunks → `adam_decisions` → profile rebuild.\n');
  console.log('**Live chats:** `conversation_messages` → `twin-auto-ingest` watermark → `adam_decisions` → periodic `adam_profile` rebuild.\n');
  console.log('**Governance:** Bulk scheduled LLM passes on dumps must follow CLAUDE.md **Zero-Waste AI** (`createUsefulWorkGuard`) — not silent always-on burn.\n');
}

main();
