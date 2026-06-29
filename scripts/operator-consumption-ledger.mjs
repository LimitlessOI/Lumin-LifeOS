#!/usr/bin/env node
/**
 * SYNOPSIS: CLI: record operator/Cursor token usage manually.
 * CLI: record operator/Cursor token usage manually.
 * Usage: npm run tokens:operator -- --source cursor --model claude-sonnet-4-6 --input 12000 --output 3000
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import 'dotenv/config';

const base = (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const keyName = a.slice(2).replace(/-/g, '_');
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[keyName] = next;
        i += 1;
      } else {
        out[keyName] = true;
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!key) {
    console.error('COMMAND_CENTER_KEY required');
    process.exit(2);
  }
  const payload = {
    source: args.source || 'cursor',
    model: args.model,
    input_tokens: Number(args.input || args.input_tokens || 0),
    output_tokens: Number(args.output || args.output_tokens || 0),
    task_id: args.task_id,
    blueprint_id: args.blueprint_id,
    product_lane: args.product_lane,
    evidence_note: args.note || args.evidence_note,
    free_tier: args.free_tier === 'true' || args.free_tier === true,
  };

  const res = await fetch(`${base}/api/v1/tokens/operator/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-key': key },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  console.log(JSON.stringify({ status: res.status, ...body }, null, 2));
  process.exit(res.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(2);
});
