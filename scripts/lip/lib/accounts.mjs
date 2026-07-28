/**
 * SYNOPSIS: Paper fleet accounts for Limitless Protocol
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Paper fleet accounts for Limitless Protocol
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ACCOUNTS_PATH, LIP_DATA } from './paths.mjs';

export const STRATEGY_ID = 'limitless_protocol';
export const SEED_MIN = 300;
export const SEED_MAX = 2000;

function randomSeed(rng) {
  return Math.round((SEED_MIN + rng() * (SEED_MAX - SEED_MIN)) * 100) / 100;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function ensureLipDataDir() {
  fs.mkdirSync(LIP_DATA, { recursive: true });
}

/**
 * @param {{ count?: number, lane?: string, seed?: number, force?: boolean }} opts
 */
export function seedAccounts(opts = {}) {
  const count = opts.count ?? 100;
  const lane = opts.lane ?? 'crypto';
  const force = opts.force === true;
  ensureLipDataDir();

  if (!force && fs.existsSync(ACCOUNTS_PATH)) {
    const existing = JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf8'));
    if (Array.isArray(existing.accounts) && existing.accounts.length >= count) {
      return existing;
    }
  }

  const rng = mulberry32(opts.seed ?? 20260727);
  const accounts = [];
  for (let i = 0; i < count; i++) {
    const seedUsd = randomSeed(rng);
    const tranche = i % 3 === 0 ? 'secure' : i % 3 === 1 ? 'core' : 'runner';
    accounts.push({
      id: `lip_${lane}_${String(i + 1).padStart(4, '0')}`,
      lane,
      strategy_id: STRATEGY_ID,
      seed_usd: seedUsd,
      balance_usd: seedUsd,
      house_money: false,
      tranche,
      status: 'paper',
      created_at: new Date().toISOString(),
    });
  }

  const payload = {
    strategy_id: STRATEGY_ID,
    lane,
    count: accounts.length,
    seeded_at: new Date().toISOString(),
    seed_band: [SEED_MIN, SEED_MAX],
    accounts,
  };
  fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(payload, null, 2));
  return payload;
}

export function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_PATH)) return null;
  return JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf8'));
}

export function appendJsonl(filePath, row) {
  ensureLipDataDir();
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`);
}

export function fingerprint() {
  return crypto.randomBytes(4).toString('hex');
}
