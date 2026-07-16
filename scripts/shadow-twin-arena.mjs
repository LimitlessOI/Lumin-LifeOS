/**
 * SYNOPSIS: Poll primary and shadow BuilderOS runtimes and score which branch is ahead.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import { writeFileSync } from 'fs';

const PRIMARY = 'http://127.0.0.1:3000';
const SHADOW = 'http://127.0.0.1:3001';
const KEY = process.env.COMMAND_CENTER_KEY;

async function fetchStatus(base) {
  try {
    const res = await fetch(`${base}/api/v1/lifeos/builder/status`, {
      headers: { 'x-command-key': KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function fetchTokens(base) {
  try {
    const res = await fetch(`${base}/api/v1/twin/tokens`, {
      headers: { 'x-command-key': KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function score(status, tokens) {
  const s = status?.governed_autonomous_ship || {};
  const t = tokens?.today || {};
  let points = 0;
  points += (s.totalRuns || 0) * 1;
  points += (s.lastShipped || 0) * 10;
  points -= (s.cyclesFailed || 0) * 50;
  points += (t.avgSavingsPct || 0) * 5;
  return Math.round(points * 100) / 100;
}

async function main() {
  const [pStatus, sStatus, pTokens, sTokens] = await Promise.all([
    fetchStatus(PRIMARY),
    fetchStatus(SHADOW),
    fetchTokens(PRIMARY),
    fetchTokens(SHADOW),
  ]);

  const pScore = score(pStatus, pTokens);
  const sScore = score(sStatus, sTokens);
  const winner = pScore > sScore ? 'primary' : sScore > pScore ? 'shadow' : 'tie';

  const report = {
    at: new Date().toISOString(),
    primary: {
      base: PRIMARY,
      branch: 'builderos-autonomous',
      status: pStatus?.governed_autonomous_ship || pStatus,
      tokens: pTokens?.today || pTokens,
      score: pScore,
    },
    shadow: {
      base: SHADOW,
      branch: 'builderos-shadow',
      status: sStatus?.governed_autonomous_ship || sStatus,
      tokens: sTokens?.today || sTokens,
      score: sScore,
    },
    winner,
  };

  writeFileSync('data/shadow-twin-arena.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, winner, primary: pScore, shadow: sScore }, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
