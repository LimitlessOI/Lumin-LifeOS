#!/usr/bin/env node
/**
 * system-sync-command-key.mjs
 *
 * Pulls the COMMAND_CENTER_KEY that Railway is ACTUALLY running with and
 * writes it into .env.local — no changes to Railway vault, no key rotation.
 *
 * Use this when Railway and local are out of sync and you want local to match
 * whatever Railway already has (i.e. you don't want to change the Railway key).
 *
 * Requires RAILWAY_TOKEN in your local shell.
 * Get it from: railway.app → Account Settings → Tokens → New Token
 *
 * Usage:
 *   export RAILWAY_TOKEN=<your-token>
 *   node scripts/system-sync-command-key.mjs
 *   # or: npm run system:sync-command-key
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_FILE = resolve(ROOT, '.env.local');

function readEnvVar(name) {
  if (!existsSync(ENV_FILE)) return null;
  const line = readFileSync(ENV_FILE, 'utf8').split('\n').find(l => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : null;
}

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || readEnvVar('PUBLIC_BASE_URL');

if (!RAILWAY_TOKEN) {
  console.error('\n❌ RAILWAY_TOKEN not found in shell environment.');
  console.error('   Get it from: railway.app → Account Settings → Tokens → New Token');
  console.error('   Then: export RAILWAY_TOKEN=<your-token>\n');
  process.exit(1);
}

if (!BASE_URL) {
  console.error('\n❌ PUBLIC_BASE_URL not set. Check .env.local.\n');
  process.exit(1);
}

console.log(`\n🔄 Syncing COMMAND_CENTER_KEY from Railway → .env.local`);
console.log(`   Base URL: ${BASE_URL}\n`);

let liveKey;
try {
  const res = await fetch(`${BASE_URL}/api/v1/railway/managed-env/sync-command-key`, {
    headers: { 'x-railway-token': RAILWAY_TOKEN },
  });

  const json = await res.json();
  if (!res.ok || !json.ok) {
    console.error(`❌ Sync failed (HTTP ${res.status}):`, json.error || json);
    process.exit(1);
  }

  liveKey = json.command_center_key;
  console.log(`✅ Got live key from Railway (value hidden)`);
} catch (err) {
  console.error('❌ Network error:', err.message);
  process.exit(1);
}

// Write to .env.local
try {
  let envContent = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';

  if (envContent.includes('COMMAND_CENTER_KEY=')) {
    envContent = envContent.replace(/^COMMAND_CENTER_KEY=.*/m, `COMMAND_CENTER_KEY=${liveKey}`);
  } else {
    envContent = envContent.trimEnd() + `\nCOMMAND_CENTER_KEY=${liveKey}\n`;
  }

  writeFileSync(ENV_FILE, envContent, 'utf8');
  console.log(`✅ .env.local updated — COMMAND_CENTER_KEY now matches Railway`);
} catch (err) {
  console.error('⚠️  Could not update .env.local:', err.message);
  process.exit(1);
}

console.log('\n✅ Sync complete. Railway vault unchanged. Local .env.local now matches.\n');
