#!/usr/bin/env node
/**
 * system-rotate-command-key.mjs
 *
 * Atomically rotates COMMAND_CENTER_KEY — sets it in Railway vault AND updates
 * .env.local so both sides stay in sync.  No manual copy-paste required.
 *
 * Requires RAILWAY_TOKEN in your local shell (not the CCK — that's the point).
 * Get it from: railway.app → Account Settings → Tokens → New Token
 *
 * Usage:
 *   node scripts/system-rotate-command-key.mjs            — auto-generate new key
 *   node scripts/system-rotate-command-key.mjs --key MyNewKey  — use specific key
 *
 * What it does:
 *   1. Calls POST /api/v1/railway/managed-env/rotate-command-key (x-railway-token auth)
 *   2. Railway app updates COMMAND_CENTER_KEY in its own vault via GraphQL
 *   3. This script rewrites COMMAND_CENTER_KEY in .env.local to match
 *   4. Triggers a redeploy so Railway picks up the new value
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_FILE = resolve(ROOT, '.env.local');

// ── Config ────────────────────────────────────────────────────────────────────

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
const BASE_URL      = process.env.PUBLIC_BASE_URL || readEnvVar('PUBLIC_BASE_URL');

function readEnvVar(name) {
  if (!existsSync(ENV_FILE)) return null;
  const line = readFileSync(ENV_FILE, 'utf8').split('\n').find(l => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : null;
}

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

// ── Parse args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const keyIdx = args.indexOf('--key');
const providedKey = keyIdx >= 0 ? args[keyIdx + 1] : null;

// ── Rotate ────────────────────────────────────────────────────────────────────

console.log(`\n🔑 TSOS Key Rotation`);
console.log(`   Base URL:  ${BASE_URL}`);
console.log(`   New key:   ${providedKey || '(auto-generate)'}\n`);

let newKey;
try {
  const res = await fetch(`${BASE_URL}/api/v1/railway/managed-env/rotate-command-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-railway-token': RAILWAY_TOKEN,
    },
    body: JSON.stringify(providedKey ? { new_key: providedKey } : {}),
  });

  const json = await res.json();
  if (!res.ok || !json.ok) {
    console.error(`❌ Rotation failed (HTTP ${res.status}):`, json.error || json);
    process.exit(1);
  }

  newKey = json.new_key;
  console.log(`✅ Railway vault updated`);
  console.log(`   New CCK: ${newKey}\n`);
} catch (err) {
  console.error('❌ Network error calling rotate-command-key:', err.message);
  process.exit(1);
}

// ── Update .env.local ─────────────────────────────────────────────────────────

try {
  let envContent = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';

  if (envContent.includes('COMMAND_CENTER_KEY=')) {
    envContent = envContent.replace(/^COMMAND_CENTER_KEY=.*/m, `COMMAND_CENTER_KEY=${newKey}`);
  } else {
    envContent = envContent.trimEnd() + `\nCOMMAND_CENTER_KEY=${newKey}\n`;
  }

  writeFileSync(ENV_FILE, envContent, 'utf8');
  console.log(`✅ .env.local updated with new key`);
} catch (err) {
  console.error('⚠️  Could not update .env.local:', err.message);
  console.error(`   Manually set: COMMAND_CENTER_KEY=${newKey}`);
}

// ── Trigger redeploy ──────────────────────────────────────────────────────────

console.log('\n🚀 Triggering Railway redeploy to activate new key...');
try {
  const res = await fetch(`${BASE_URL}/api/v1/railway/managed-env/self-redeploy`, {
    method: 'POST',
    headers: { 'x-railway-token': RAILWAY_TOKEN },
  });
  const json = await res.json();
  if (json.ok) {
    console.log('✅ Redeploy triggered — Railway will restart with new key in ~60s');
  } else {
    console.warn('⚠️  Redeploy trigger returned:', json);
  }
} catch (err) {
  console.warn('⚠️  Could not trigger redeploy:', err.message);
  console.warn('   Run manually: npm run system:railway:redeploy');
}

console.log('\n✅ Key rotation complete.');
console.log(`   Both Railway vault and .env.local now have: COMMAND_CENTER_KEY=${newKey}`);
console.log('   Wait ~60s for Railway to finish redeploying, then test.\n');
