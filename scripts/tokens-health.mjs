#!/usr/bin/env node
/**
 * SYNOPSIS: Script — Tokens Health. @ssot docs/products/token-accounting-os/PRODUCT_HOME.md */
import 'dotenv/config';

const base = (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';

async function main() {
  if (!key) {
    console.error('COMMAND_CENTER_KEY required');
    process.exit(2);
  }
  const res = await fetch(`${base}/api/v1/tokens/unified/health`, {
    headers: { 'x-command-key': key },
  });
  const body = await res.json();
  console.log(JSON.stringify(body, null, 2));
  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(2);
});
