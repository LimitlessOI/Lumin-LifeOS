#!/usr/bin/env node
/**
 * SYNOPSIS: Backfill founder_decision_log from the existing historical
 * conversation corpus (docs/conversation_dumps/raw/*.jsonl + Lumin-Memory
 * 00_INBOX dumps) instead of waiting for future events only.
 *
 * Founder, direct (2026-07-28): "I have hours and hours of communication
 * that I've had with the system... study that shit and fucking make my
 * twin... They're so big... you can only look at it or read it in raw."
 *
 * Local machine has no provider keys (Anthropic/OpenAI/Together all
 * needs_payment locally and in general right now) -- the actual extraction
 * runs server-side against the real Railway env via
 * POST /factory/founder-decisions/extract, so this script only parses,
 * chunks, and calls that endpoint. It never talks to a model directly.
 *
 * Usage:
 *   node scripts/founder-decision-backfill.mjs --file <path> [--dry-run] [--limit N]
 *   node scripts/founder-decision-backfill.mjs --all [--limit-per-file N]
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app';
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';

const CHUNK_CHAR_BUDGET = 18000; // leaves headroom under the endpoint's 24000-char excerpt cap

const CURSOR_JSONL_DIR = path.join(ROOT, 'docs/conversation_dumps/raw');
const PROVIDER_DUMP_DIR = path.join(ROOT, 'Lumin-Memory/00_INBOX/raw/00_INBOX/raw');

function parseArgs(argv) {
  const out = { all: false, file: null, dryRun: false, limit: null, limitPerFile: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') out.all = true;
    else if (a === '--file') out.file = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--limit') out.limit = Number(argv[++i]);
    else if (a === '--limit-per-file') out.limitPerFile = Number(argv[++i]);
  }
  return out;
}

/** Extract Adam's real messages from a raw Cursor JSONL export. */
function extractUserTextFromCursorJsonl(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  const userTexts = [];
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (obj?.role !== 'user') continue;
    const blocks = obj?.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b?.type !== 'text' || !b.text) continue;
      const cleaned = String(b.text)
        .replace(/<user_query>/g, '')
        .replace(/<\/user_query>/g, '')
        .trim();
      if (cleaned) userTexts.push(cleaned);
    }
  }
  return userTexts;
}

/** Provider-dump files are plain text/markdown -- use the whole file, chunked. */
function extractTextFromPlainDump(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw || raw === '404: Not Found') return [];
  return [raw];
}

function chunkTexts(texts, charBudget) {
  const chunks = [];
  let current = '';
  for (const t of texts) {
    const withSep = current ? `${current}\n\n---\n\n${t}` : t;
    if (withSep.length > charBudget && current) {
      chunks.push(current);
      current = t;
    } else {
      current = withSep;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function extractChunk(text, fileLabel, dryRun) {
  if (dryRun) {
    console.log(`  [dry-run] would send ${text.length} chars from ${fileLabel}`);
    return { ok: true, written_count: 0, candidates_extracted: 0, dry_run: true };
  }
  const res = await fetch(`${BASE}/factory/founder-decisions/extract`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-command-key': KEY },
    body: JSON.stringify({ text_batch: text, source: 'historical_conversation_backfill', file_label: fileLabel }),
  });
  const body = await res.json().catch(() => ({ ok: false, error: `non-JSON response, status ${res.status}` }));
  return body;
}

async function processFile(filePath, { dryRun, limitChunks }) {
  const base = path.basename(filePath);
  const isJsonl = base.endsWith('.jsonl');
  const texts = isJsonl ? extractUserTextFromCursorJsonl(filePath) : extractTextFromPlainDump(filePath);
  if (texts.length === 0) {
    console.log(`${base}: no extractable text (skipped)`);
    return { file: base, chunks: 0, written: 0, extracted: 0, errors: 0 };
  }
  let chunks = chunkTexts(texts, CHUNK_CHAR_BUDGET);
  if (limitChunks) chunks = chunks.slice(0, limitChunks);
  console.log(`${base}: ${texts.length} user message(s) -> ${chunks.length} chunk(s)`);

  let written = 0;
  let extracted = 0;
  let errors = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    process.stdout.write(`  chunk ${i + 1}/${chunks.length}... `);
    try {
      const result = await extractChunk(chunks[i], `${base}#${i + 1}`, dryRun);
      if (result.ok) {
        written += result.written_count || 0;
        extracted += result.candidates_extracted || 0;
        console.log(`ok (extracted ${result.candidates_extracted ?? 0}, wrote ${result.written_count ?? 0})`);
      } else {
        errors += 1;
        console.log(`FAILED: ${result.error}`);
      }
    } catch (err) {
      errors += 1;
      console.log(`FAILED: ${err.message}`);
    }
  }
  return { file: base, chunks: chunks.length, written, extracted, errors };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.dryRun && !KEY) {
    console.error('COMMAND_CENTER_KEY (or LIFEOS_KEY) required unless --dry-run');
    process.exit(1);
  }

  let files = [];
  if (args.file) {
    files = [args.file];
  } else if (args.all) {
    const jsonlFiles = fs.existsSync(CURSOR_JSONL_DIR)
      ? fs.readdirSync(CURSOR_JSONL_DIR).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(CURSOR_JSONL_DIR, f))
      : [];
    const dumpFiles = fs.existsSync(PROVIDER_DUMP_DIR)
      ? fs.readdirSync(PROVIDER_DUMP_DIR).filter((f) => !f.startsWith('.')).map((f) => path.join(PROVIDER_DUMP_DIR, f))
      : [];
    files = [...dumpFiles, ...jsonlFiles]; // smaller files first
  } else {
    console.error('Usage: node scripts/founder-decision-backfill.mjs (--file <path> | --all) [--dry-run] [--limit-per-file N]');
    process.exit(1);
  }

  console.log(`Target: ${args.dryRun ? '(dry run)' : BASE}`);
  console.log(`Files: ${files.length}\n`);

  const summary = [];
  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.log(`${f}: NOT FOUND (skipped)`);
      continue;
    }
    const result = await processFile(f, { dryRun: args.dryRun, limitChunks: args.limitPerFile });
    summary.push(result);
  }

  console.log('\n=== SUMMARY ===');
  let totalWritten = 0;
  let totalExtracted = 0;
  let totalErrors = 0;
  for (const s of summary) {
    console.log(`${s.file}: ${s.chunks} chunks, ${s.extracted} extracted, ${s.written} written, ${s.errors} errors`);
    totalWritten += s.written;
    totalExtracted += s.extracted;
    totalErrors += s.errors;
  }
  console.log(`\nTOTAL: ${totalExtracted} decisions extracted, ${totalWritten} written to founder_decision_log, ${totalErrors} chunk errors`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
