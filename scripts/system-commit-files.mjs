/**
 * SYNOPSIS: Commit local files to GitHub main via tip BuilderOS execute-batch (no human PR).
 * Usage:
 *   npm run system:commit-files -- --message "GAP-FILL: …" -- path/one.js path/two.md
 * Env:
 *   PUBLIC_BASE_URL | BUILDER_BASE_URL
 *   COMMAND_CENTER_KEY | COMMAND_KEY | LIFEOS_KEY | API_KEY
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  'https://lumin-web-production-e3a9.up.railway.app'
).replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

function usage(exitCode = 1) {
  console.error(`Usage: npm run system:commit-files -- --message "…" -- <repo-relative-paths…>
Example: npm run system:commit-files -- --message "GAP-FILL: system ship desk" -- routes/foo.js docs/products/lifeos/PRODUCT_HOME.md`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const out = { message: '', branch: '', paths: [] };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--message' || a === '-m') {
      out.message = String(argv[++i] || '').trim();
    } else if (a === '--branch' || a === '-b') {
      out.branch = String(argv[++i] || '').trim();
    } else if (a === '--help' || a === '-h') {
      usage(0);
    } else if (a === '--') {
      out.paths.push(...argv.slice(i + 1).filter(Boolean));
      break;
    } else if (a.startsWith('-')) {
      console.error(`Unknown flag: ${a}`);
      usage(1);
    } else {
      out.paths.push(a);
    }
    i += 1;
  }
  return out;
}

async function main() {
  const { message, branch, paths } = parseArgs(process.argv.slice(2));
  if (!key) {
    console.error('Missing COMMAND_CENTER_KEY (or COMMAND_KEY / LIFEOS_KEY / API_KEY).');
    process.exit(1);
  }
  if (!message || paths.length === 0) usage(1);

  const files = [];
  for (const rel of paths) {
    const normalized = rel.replace(/^\.\//, '').replace(/\\/g, '/');
    if (normalized.includes('..') || path.isAbsolute(normalized)) {
      console.error(`Refusing path: ${rel}`);
      process.exit(1);
    }
    const abs = path.join(process.cwd(), normalized);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      console.error(`Not a file: ${normalized}`);
      process.exit(1);
    }
    files.push({
      target_file: normalized,
      output: fs.readFileSync(abs, 'utf8'),
    });
  }

  const body = {
    files,
    commit_message: message,
  };
  if (branch) body.branch = branch;

  const url = `${base}/api/v1/lifeos/builder/execute-batch`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-command-key': key,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }

  if (!res.ok || !json?.ok || json?.committed !== true) {
    console.error(JSON.stringify({ ok: false, status: res.status, body: json }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    committed: true,
    commit_sha: json.commit_sha || json.sha || null,
    commit_mode: json.commit_mode || null,
    committed_files: json.committed_files || files.map((f) => f.target_file),
    tip: base,
  }, null, 2));
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});