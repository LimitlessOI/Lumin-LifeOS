#!/usr/bin/env node
/**
 * Lists which files under the canonical bullet+TAB `Lumin-Memory/00_INBOX/raw/` dump
 * directory match each keyword (via `rg`). Reproducible index for Amendment 38 Stream I
 * and [`docs/CONVERSATION_DUMP_IDEAS_INDEX.md`](../docs/CONVERSATION_DUMP_IDEAS_INDEX.md) §6–§7.
 *
 * Default keyword set = media/creator + platform/infra + trust lane (2026-04-26 expand).
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

const DEFAULT_KEYWORDS = [
  ...MEDIA_CREATOR_KEYWORDS,
  ...PLATFORM_OPS_KEYWORDS,
  ...TRUST_LANE_KEYWORDS,
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

  console.log('# Idea Vault — keyword → dump files\n');
  console.log(`Root: \`${path.relative(REPO_ROOT, RAW_DIR)}\`\n`);

  for (const kw of keywords) {
    const files = rgFilesMatching(RAW_DIR, kw);
    console.log(`## ${kw} (${files.length} files)\n`);
    for (const f of files.sort()) {
      console.log(`- ${f}`);
    }
    console.log('');
  }
}

main();
