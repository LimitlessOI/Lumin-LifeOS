#!/usr/bin/env node
/**
 * Lists which files under the canonical bullet+TAB `Lumin-Memory/00_INBOX/raw/` dump
 * directory match each keyword (via `rg`). Reproducible index for Amendment 38 Stream I
 * and [`docs/CONVERSATION_DUMP_IDEAS_INDEX.md`](../docs/CONVERSATION_DUMP_IDEAS_INDEX.md) §6–§7.
 *
 * Default keyword set = media/creator + platform/infra + trust + integrations + workflow (2026-04-28 expand).
 * Also scans `docs/conversation_dumps/OPERATOR_BRAINSTORM_INBOX.md` when present (verbatim brainstorm paste target).
 * Pass CLI args to run a custom list only: `node scripts/catalog-dump-keywords.mjs epistemic SSOT`
 *
 * @ssot docs/projects/AMENDMENT_38_IDEA_VAULT.md
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(REPO_ROOT, '\u2022\tLumin-Memory', '00_INBOX', 'raw');
const BRAINSTORM_INBOX = path.join(
  REPO_ROOT,
  'docs',
  'conversation_dumps',
  'OPERATOR_BRAINSTORM_INBOX.md',
);

/** @type {string[]} */
const MEDIA_CREATOR_KEYWORDS = [
  'video',
  'YouTube',
  'reel',
  'ComfyUI',
  'Kdenlive',
  'anime',
  'story',
  'shoppable',
  'overlay',
  'creator',
  'tiktok',
  'movie',
  'vision board',
];

/** Infra, council/builder, cost, real-estate ops — see CONVERSATION_DUMP §7 */
const PLATFORM_OPS_KEYWORDS = [
  'LCTP',
  'Twilio',
  'Neon',
  'Railway',
  'pgvector',
  'capsule',
  'council',
  'builder',
  'BoldTrail',
  'ClientCare',
  'migration',
  'receipt',
  'token',
];

/** Wellness / safety / governance phrasing that shows up in LifeOS dumps */
const TRUST_LANE_KEYWORDS = ['digital twin', 'IFS', 'VoiceGuard', 'Kingsman'];

/** Voice, local models, MICRO protocol, quick GTM hooks — see CONVERSATION_DUMP §7.4 */
const INTEGRATION_PRODUCT_KEYWORDS = ['MICRO', 'Ollama', 'VAPI', 'Calendly', 'bookmarklet'];

/** Zapier/Docs glue, billing, realtime, AI-to-AI capsule protocol — see CONVERSATION_DUMP §7.5 */
const WORKFLOW_REALTIME_KEYWORDS = ['Zapier', 'WebSocket', 'Stripe', 'AASHA'];

const DEFAULT_KEYWORDS = [
  ...MEDIA_CREATOR_KEYWORDS,
  ...PLATFORM_OPS_KEYWORDS,
  ...TRUST_LANE_KEYWORDS,
  ...INTEGRATION_PRODUCT_KEYWORDS,
  ...WORKFLOW_REALTIME_KEYWORDS,
];

function rgFilesMatching(dir, keyword) {
  const args = [
    '-l',
    '-S',
    '--glob',
    '!README.md',
    keyword,
    dir,
  ];
  try {
    const out = execFileSync('rg', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((full) => path.relative(dir, full));
  } catch (e) {
    const status = e?.status;
    if (status === 1) return []; // no matches
    throw e;
  }
}

/** @param {string} filePath */
function rgInboxHasKeyword(filePath, keyword) {
  try {
    execFileSync('rg', ['-q', keyword, filePath], { stdio: 'ignore' });
    return true;
  } catch (e) {
    const status = e?.status;
    if (status === 1) return false;
    throw e;
  }
}

function main() {
  const kwFromCli = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const keywords = kwFromCli.length ? kwFromCli : DEFAULT_KEYWORDS;

  if (!fs.existsSync(RAW_DIR)) {
    console.error(`Dump directory missing: ${RAW_DIR}`);
    process.exit(1);
  }

  try {
    execFileSync('rg', ['--version'], { stdio: 'ignore' });
  } catch {
    console.error('This script requires `rg` (ripgrep) on PATH.');
    process.exit(1);
  }

  const inboxPath = fs.existsSync(BRAINSTORM_INBOX) ? BRAINSTORM_INBOX : null;

  console.log('# Idea Vault — keyword → dump files\n');
  console.log(`Root: \`${path.relative(REPO_ROOT, RAW_DIR)}\`\n`);
  if (inboxPath) {
    console.log(
      `Brainstorm inbox: \`${path.relative(REPO_ROOT, inboxPath)}\` _(verbatim paste target — Amendment 38 §6 step 5)_\n`,
    );
  }

  for (const kw of keywords) {
    const files = rgFilesMatching(RAW_DIR, kw);
    const inboxHit = inboxPath && rgInboxHasKeyword(inboxPath, kw);
    console.log(`## ${kw} (${files.length} in raw/)\n`);
    for (const f of files.sort()) {
      console.log(`- ${f}`);
    }
    if (inboxHit) {
      console.log(`- ${path.relative(REPO_ROOT, inboxPath)} _(inbox)_`);
    }
    console.log('');
  }
}

main();
