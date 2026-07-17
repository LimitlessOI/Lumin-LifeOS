/**
 * SYNOPSIS: Shadow-twin competition orchestrator — scores primary vs shadow,
 * auto-promotes the winning branch, and logs the competition output.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const PRIMARY = process.env.PRIMARY_BASE_URL || 'http://127.0.0.1:3000';
const SHADOW = process.env.SHADOW_BASE_URL || 'http://127.0.0.1:3001';
const KEY = process.env.COMMAND_CENTER_KEY || '';
const REMOTE = process.env.SHADOW_COMPETITION_REMOTE || 'https://git-manager.devin.ai/proxy/github.com/LimitlessOI/Lumin-LifeOS';
const PRIMARY_BRANCH = process.env.PRIMARY_BRANCH || 'builderos-autonomous';
const SHADOW_BRANCH = process.env.SHADOW_BRANCH || 'builderos-shadow';
const SHADOW_REPO = process.env.SHADOW_REPO_ROOT || '/home/ubuntu/repos/Lumin-LifeOS-shadow';
const WIN_STREAK = Number(process.env.SHADOW_PROMOTION_STREAK || 3);
const INTERVAL_MS = Number(process.env.SHADOW_COMPETITION_INTERVAL_MS || 120_000);

const STATE_FILE = path.join(REPO_ROOT, 'data/shadow-twin-competition.json');
const LOG_FILE = path.join(REPO_ROOT, 'data/shadow-twin-competition.jsonl');

mkdirSync(path.dirname(STATE_FILE), { recursive: true });

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

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { rounds: [], streak: 0, lastWinner: null, lastAction: null, lastError: null };
  }
}

function writeState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function git(cmd, cwd) {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function gitSafe(cmd, cwd) {
  try {
    return { ok: true, out: execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim() };
  } catch (e) {
    return { ok: false, error: e.message || String(e), stderr: e.stderr || '' };
  }
}

function mergeBranch(opts) {
  const { baseBranch, mergeBranch: otherBranch, winner } = opts;
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'shadow-promote-'));
  try {
    const clone = gitSafe(`git clone --depth 500 --no-checkout ${REMOTE} .`, tmp);
    if (!clone.ok) throw new Error(`clone failed: ${clone.error}`);
    git('git config user.email "builderos@shadow.twin"', tmp);
    git('git config user.name "BuilderOS Shadow Twin"', tmp);

    const fetchBase = gitSafe(`git fetch origin ${baseBranch} ${otherBranch}`, tmp);
    if (!fetchBase.ok) throw new Error(`fetch failed: ${fetchBase.error}`);

    const checkout = gitSafe(`git checkout -B ${baseBranch} origin/${baseBranch}`, tmp);
    if (!checkout.ok) throw new Error(`checkout failed: ${checkout.error}`);

    const merge = gitSafe(`git merge origin/${otherBranch} --no-commit --no-ff`, tmp);
    if (!merge.ok) throw new Error(`merge failed: ${merge.error}`);

    if (existsSync(path.join(tmp, '.env'))) {
      const ours = git(`git show HEAD:.env`, tmp);
      writeFileSync(path.join(tmp, '.env'), ours);
      git('git add .env', tmp);
    }

    const commit = gitSafe(`git commit -m 'shadow-twin promotion: ${otherBranch} won ${winner} consecutive rounds and is merged into ${baseBranch}'`, tmp);
    if (!commit.ok) throw new Error(`commit failed: ${commit.error}`);

    const push = gitSafe(`git push origin ${baseBranch}`, tmp);
    if (!push.ok) throw new Error(`push failed: ${push.error}`);

    return { ok: true, action: `merged ${otherBranch} into ${baseBranch}` };
  } catch (e) {
    if (existsSync(path.join(tmp, '.git', 'MERGE_HEAD'))) {
      gitSafe('git merge --abort', tmp);
    }
    return { ok: false, action: 'merge-aborted', error: e.message };
  } finally {
    try { rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
}

async function promoteShadow() {
  return mergeBranch({ baseBranch: PRIMARY_BRANCH, mergeBranch: SHADOW_BRANCH, winner: 'shadow' });
}

async function catchUpShadow() {
  return mergeBranch({ baseBranch: SHADOW_BRANCH, mergeBranch: PRIMARY_BRANCH, winner: 'primary' });
}

function getRecentPrimaryFailures(hours = 1) {
  try {
    const out = execSync(
      `cd ${REPO_ROOT} && git log --since='${hours} hours ago' --until='now' --format='%s' origin/${PRIMARY_BRANCH} --grep='GOVERNED-AUTONOMOUS-FAILED'`,
      { encoding: 'utf8' },
    );
    const products = [];
    const seen = new Set();
    for (const line of out.split('\n')) {
      const m = line.match(/^GOVERNED-AUTONOMOUS-FAILED:\s*(\S+)/);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        products.push(m[1]);
      }
    }
    return products;
  } catch {
    return [];
  }
}

async function updateShadowPriority() {
  try {
    const failProducts = getRecentPrimaryFailures(1);
    if (!failProducts.length) return { ok: true, action: 'no-failure-telemetry' };

    for (const root of [REPO_ROOT, SHADOW_REPO]) {
      const priorityFile = path.join(root, 'docs/products/PRODUCT_BUILD_PRIORITY.shadow.json');
      if (!existsSync(priorityFile)) continue;
      const raw = readFileSync(priorityFile, 'utf8');
      const data = JSON.parse(raw);
      const list = Array.isArray(data.priority) ? data.priority : [];
      const reordered = failProducts.filter((id) => list.includes(id)).concat(list.filter((id) => !failProducts.includes(id)));
      data.priority = reordered;
      data.updated_at = new Date().toISOString();
      data.notes = data.notes || [];
      data.notes.unshift(`${new Date().toISOString()} — Reordered by shadow competition from primary failure telemetry: ${failProducts.join(', ')}.`);
      writeFileSync(priorityFile, JSON.stringify(data, null, 2));
    }
    return { ok: true, action: 'updated-shadow-priority', focus: failProducts };
  } catch (e) {
    return { ok: false, action: 'update-shadow-priority-failed', error: e.message };
  }
}

async function runRound() {
  const [pStatus, sStatus, pTokens, sTokens] = await Promise.all([
    fetchStatus(PRIMARY),
    fetchStatus(SHADOW),
    fetchTokens(PRIMARY),
    fetchTokens(SHADOW),
  ]);

  const pScore = score(pStatus, pTokens);
  const sScore = score(sStatus, sTokens);
  const winner = pScore > sScore ? 'primary' : sScore > pScore ? 'shadow' : 'tie';

  const state = readState();
  const round = {
    at: new Date().toISOString(),
    primary: { score: pScore, status: pStatus?.governed_autonomous_ship || pStatus },
    shadow: { score: sScore, status: sStatus?.governed_autonomous_ship || sStatus },
    winner,
  };
  state.rounds.push(round);
  if (state.rounds.length > 100) state.rounds.shift();

  if (state.lastWinner === winner && winner !== 'tie') {
    state.streak = (state.streak || 0) + 1;
  } else {
    state.streak = winner === 'tie' ? 0 : 1;
  }
  state.lastWinner = winner;

  let action = { action: 'none' };

  if (winner === 'shadow' && state.streak >= WIN_STREAK) {
    action = await promoteShadow();
    state.streak = 0;
    if (action.ok) {
      state.lastPromotion = { at: new Date().toISOString(), from: SHADOW_BRANCH, into: PRIMARY_BRANCH };
    }
  } else if (winner === 'primary' && state.streak >= WIN_STREAK) {
    action = await catchUpShadow();
    state.streak = 0;
    if (action.ok) {
      state.lastCatchUp = { at: new Date().toISOString(), from: PRIMARY_BRANCH, into: SHADOW_BRANCH };
    }
  } else {
    action = await updateShadowPriority();
  }

  state.lastAction = action;
  state.lastError = action.error || null;
  writeState(state);
  appendFileSync(LOG_FILE, JSON.stringify({ ...round, action }) + '\n');
  console.log(JSON.stringify({ ok: true, winner, primary: pScore, shadow: sScore, streak: state.streak, action }, null, 2));
}

async function main() {
  if (process.argv.includes('--once')) {
    await runRound();
    return;
  }
  while (true) {
    await runRound().catch((e) => {
      const state = readState();
      state.lastError = e.message;
      writeState(state);
      console.error(JSON.stringify({ ok: false, error: e.message }));
    });
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
