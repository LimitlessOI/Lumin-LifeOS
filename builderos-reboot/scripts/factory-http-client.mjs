#!/usr/bin/env node
/** HTTP client for factory-staging API. */
const base = process.env.FACTORY_URL || 'http://127.0.0.1:3099';

async function main() {
  const cmd = process.argv[2] || 'health';
  if (cmd === 'health') {
    const r = await fetch(`${base}/health`);
    console.log(await r.json());
    return;
  }
  if (cmd === 'execute-mission') {
    const mission_id = process.argv[3];
    const dry_run = process.argv.includes('--dry-run');
    const r = await fetch(`${base}/factory/execute-mission`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mission_id, dry_run }),
    });
    console.log(r.status, await r.json());
    return;
  }
  if (cmd === 'readiness') {
    const r = await fetch(`${base}/factory/readiness`);
    console.log(await r.json());
    return;
  }
  console.error('Usage: factory-http-client.mjs health|readiness|execute-mission MISSION_ID [--dry-run]');
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
