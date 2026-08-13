#!/usr/bin/env node
/**
 * SYNOPSIS: Dispatch one tick of work for a named factory lane. Production
 * Railway is factory-1 (GOVERNED_AUTONOMOUS_SHIP). factory-2 is a local
 * worktree — sync + compile Taloa when native/macos-overlay changes.
 * factory-3 owns Collectibles path prefixes — sync + request production
 * ship-queue-and-commit with factory_id against the ONE manufacturing queue.
 * `--loop` keeps ticking. `--install-agent` installs a LaunchAgent.
 *
 * Usage: FACTORY_ID=factory-3 node scripts/run-factory-lane.mjs [--loop|--install-agent|--unload-agent]
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import * as dotenv from 'dotenv';
dotenv.config({ override: true });
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ownerFor, thisFactoryId } from '../config/lane-assignment.js';
import { workspaceRootFor } from '../config/factory-workspace.js';
import { syncFactoryWorktree } from './sync-factory-worktree.mjs';
import { evaluateSystemWatchdog, overlayNativeBlockedSteps } from './lib/system-watchdog.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function tipBaseUrl() {
  return (
    process.env.BUILDER_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.LUMIN_SMOKE_BASE_URL ||
    'https://lumin-web-production-e3a9.up.railway.app'
  ).trim().replace(/\/$/, '');
}

function tipCommandKey() {
  return (
    process.env.COMMAND_CENTER_KEY ||
    process.env.COMMAND_KEY ||
    process.env.LIFEOS_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();
}

function ownsCollectiblesLane(factoryId) {
  return ownerFor('services/collectibles/category-adapter.js') === factoryId;
}

/** One queue hosts every project; factories filter by owns, not by product queue file. */
function productIdForFactory(_factoryId) {
  return 'universal-overlay';
}

async function requestLaneShip(factoryId) {
  const key = tipCommandKey();
  if (!key) {
    return { ok: false, skipped: true, reason: 'missing_command_key' };
  }
  const url = `${tipBaseUrl()}/factory/ship-queue-and-commit`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-command-key': key,
      },
      body: JSON.stringify({ factory_id: factoryId, maxStepsPerProduct: 1 }),
    });
    const body = await res.json().catch(() => ({}));
    return {
      ok: res.ok && body?.ok !== false,
      status: res.status,
      shipped: body?.shipped ?? 0,
      reason: body?.reason,
      factory_id: body?.factory_id || factoryId,
      products: body?.products,
      detail: body?.error || body?.detail,
    };
  } catch (err) {
    return { ok: false, error: String(err.message || err).slice(0, 300) };
  }
}

function loadQueue(productId, repoRoot) {
  const p = path.join(repoRoot, 'docs/products', productId, 'BUILD_QUEUE.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function pendingOwnedSteps(queue, factoryId) {
  return (queue.steps || []).filter((s) => {
    const status = String(s.status || '').toLowerCase();
    // Include blocked so factory-3 keeps requesting tip ship/revive for owned
    // Collectibles (and future BP) slices on the one manufacturing queue.
    if (status !== 'pending' && status !== 'building' && status !== 'blocked') return false;
    return ownerFor(s.target_file || s.file) === factoryId;
  });
}

function mustIncludeOf(step) {
  const fromAssert = (step.behavior_assertions || [])
    .filter((a) => a && a.type === 'file_contains')
    .flatMap((a) => a.must_include || []);
  return [...(step.file_contains || []), ...fromAssert];
}

export function stepSatisfiedOnDisk(repoRoot, step) {
  const rel = step.target_file || step.file || '';
  const abs = path.join(repoRoot, rel);
  if (!rel || !fs.existsSync(abs)) return { ok: false, reason: 'missing_file' };
  const needles = mustIncludeOf(step);
  if (!needles.length) return { ok: true, reason: 'no_file_contains' };
  const body = fs.readFileSync(abs, 'utf8');
  const missing = needles.filter((s) => !body.includes(s));
  return missing.length ? { ok: false, reason: 'missing_strings', missing } : { ok: true };
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function nativeTreeSha(repoRoot) {
  try {
    return git(repoRoot, ['rev-parse', 'HEAD:native/macos-overlay']);
  } catch {
    return git(repoRoot, ['rev-parse', 'HEAD']);
  }
}

export function launchAgentLabel(factoryId) {
  return `com.lumin.${factoryId}-lane`;
}

function ownsNative(factoryId) {
  return ownerFor('native/macos-overlay/ContainerView.swift') === factoryId;
}

function tickPath(repoRoot, factoryId = 'factory-2') {
  if (factoryId === 'factory-2' || ownsNative(factoryId)) {
    const name = factoryId === 'factory-2' ? '.factory-2-tick.json' : `.${factoryId}-tick.json`;
    return path.join(repoRoot, 'native/macos-overlay/build', name);
  }
  return path.join(os.homedir(), 'Library/Logs', `lumin-${factoryId}-tick.json`);
}

function readLastTick(repoRoot, factoryId) {
  try {
    return JSON.parse(fs.readFileSync(tickPath(repoRoot, factoryId), 'utf8'));
  } catch {
    return null;
  }
}

function taloaPids() {
  try {
    return execFileSync('pgrep', ['-f', 'Taloa.app/Contents/MacOS/Taloa'], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function ensureTaloaRunning(repoRoot) {
  if (taloaPids().length) return { running: true };
  const app = path.join(repoRoot, 'native/macos-overlay/build/Taloa.app');
  if (!fs.existsSync(app)) return { running: false, error: 'app_missing' };
  try {
    execFileSync('open', [app]);
    return { running: true, relaunched: true };
  } catch (err) {
    return { running: false, error: String(err.message || err).slice(0, 200) };
  }
}

function writeTick(repoRoot, factoryId, tick) {
  const dest = tickPath(repoRoot, factoryId);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(tick, null, 2)}\n`);
}

function buildTaloa(repoRoot) {
  return execFileSync('bash', ['build.sh'], {
    cwd: path.join(repoRoot, 'native/macos-overlay'),
    encoding: 'utf8',
    timeout: 180_000,
  });
}

export async function runFactoryLane({ factoryId = thisFactoryId(), productId = null } = {}) {
  const resolvedProduct = productId || productIdForFactory(factoryId);
  const sync = factoryId === 'factory-1' ? { ok: true, skipped: true } : syncFactoryWorktree(factoryId);
  const repoRoot = workspaceRootFor(factoryId);
  let queue;
  try {
    queue = loadQueue(resolvedProduct, repoRoot);
  } catch (err) {
    return {
      ok: false,
      factory_id: factoryId,
      workspace: repoRoot,
      sync,
      product_id: resolvedProduct,
      pending_owned: [],
      build: { skipped: true, reason: 'queue_missing' },
      ship: { skipped: true, reason: 'queue_missing' },
      detail: `BUILD_QUEUE missing for ${resolvedProduct}: ${String(err.message || err).slice(0, 200)}`,
    };
  }
  const owned = pendingOwnedSteps(queue, factoryId);
  const checks = owned.map((s) => ({
    id: s.id,
    target_file: s.target_file,
    status: s.status,
    ...stepSatisfiedOnDisk(repoRoot, s),
  }));
  const needsAuthor = checks.filter((c) => !c.ok);
  const claimable = checks.filter((c) => c.ok);

  let build = { skipped: true, reason: factoryId === 'factory-1' ? 'primary_lane_does_not_compile_native' : 'lane_does_not_own_native' };
  let ship = { skipped: true, reason: 'not_web_shell_lane' };
  let taloa = null;
  let watchdog = null;
  if (ownsNative(factoryId) && sync.ok !== false) {
    const head = nativeTreeSha(repoRoot);
    const prev = readLastTick(repoRoot, factoryId);
    if (!prev || prev.native_tree_sha !== head) {
      try {
        const log = buildTaloa(repoRoot);
        build = { ok: true, native_tree_sha: head, log_tail: String(log).trim().split('\n').slice(-3) };
      } catch (err) {
        build = {
          ok: false,
          native_tree_sha: head,
          error: String(err.stderr || err.message || err).slice(0, 600),
        };
      }
    } else {
      build = { skipped: true, reason: 'native_unchanged', native_tree_sha: head };
    }
    const taloaState = ensureTaloaRunning(repoRoot);
    taloa = taloaState;
    watchdog = evaluateSystemWatchdog({
      factory2: { tickAt: prev?.at, ok: true, taloaRunning: taloaState.running },
      overlayNativeBlocks: overlayNativeBlockedSteps(queue),
    });
    writeTick(repoRoot, factoryId, {
      at: new Date().toISOString(),
      factory_id: factoryId,
      native_tree_sha: head,
      build,
      taloa: taloaState,
      watchdog,
      pending_owned: checks,
    });
  } else if (ownsCollectiblesLane(factoryId) && factoryId !== 'factory-1') {
    build = { skipped: true, reason: 'collectibles_lane_ships_via_tip' };
    if (needsAuthor.length || claimable.length) {
      ship = await requestLaneShip(factoryId);
    } else {
      ship = { skipped: true, reason: 'no_pending_owned_steps' };
    }
    writeTick(repoRoot, factoryId, {
      at: new Date().toISOString(),
      factory_id: factoryId,
      product_id: resolvedProduct,
      build,
      ship,
      pending_owned: checks,
    });
  } else if (factoryId !== 'factory-1') {
    writeTick(repoRoot, factoryId, {
      at: new Date().toISOString(),
      factory_id: factoryId,
      build,
      pending_owned: checks,
    });
  }

  let detail;
  if (ownsCollectiblesLane(factoryId) && ship && !ship.skipped) {
    detail = ship.ok
      ? `collectibles ship requested for ${factoryId}: shipped=${ship.shipped || 0}`
      : `collectibles ship failed for ${factoryId}: ${ship.reason || ship.error || ship.detail || 'unknown'}`;
  } else if (needsAuthor.length) {
    detail = `${needsAuthor.length} owned step(s) need authoring: ${needsAuthor.map((c) => c.id).join(', ')}`;
  } else if (claimable.length) {
    detail = `${claimable.length} owned step(s) satisfied on disk (queue claim is factory-1): ${claimable.map((c) => c.id).join(', ')}`;
  } else if (build.ok) {
    detail = `compiled Taloa.app at native ${build.native_tree_sha}`;
  } else if (build.skipped) {
    detail = `no pending ${resolvedProduct} steps owned by ${factoryId}; ${build.reason}`;
  } else {
    detail = `native compile failed`;
  }

  return {
    ok: sync.ok !== false && build.ok !== false && (ship.skipped || ship.ok !== false),
    factory_id: factoryId,
    workspace: repoRoot,
    sync,
    product_id: resolvedProduct,
    pending_owned: checks,
    build,
    ship,
    taloa,
    watchdog,
    detail,
  };
}

export function launchAgentPaths(factoryId) {
  const home = process.env.HOME;
  if (!home) throw new Error('HOME unset');
  const label = launchAgentLabel(factoryId);
  return {
    label,
    plistPath: path.join(home, 'Library/LaunchAgents', `${label}.plist`),
    logPath: path.join(home, 'Library/Logs', `lumin-${factoryId}-lane.log`),
  };
}

export function installLaunchAgent(factoryId = thisFactoryId()) {
  if (factoryId === 'factory-1') {
    throw new Error('factory-1_is_production_railway_not_a_launchagent');
  }
  const { label, plistPath, logPath } = launchAgentPaths(factoryId);
  const node = process.execPath;
  const script = path.join(REPO_ROOT, 'scripts/run-factory-lane.mjs');
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>WorkingDirectory</key><string>${REPO_ROOT}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${node}</string>
    <string>${script}</string>
    <string>--loop</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>FACTORY_ID</key><string>${factoryId}</string>
    <key>FACTORY_LANE_INTERVAL_MS</key><string>60000</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>PUBLIC_BASE_URL</key><string>${tipBaseUrl()}</string>
    ${tipCommandKey() ? `<key>COMMAND_CENTER_KEY</key><string>${tipCommandKey().replace(/&/g, '&amp;').replace(/</g, '&lt;')}</string>` : ''}
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${logPath}</string>
  <key>StandardErrorPath</key><string>${logPath}</string>
</dict>
</plist>
`;
  fs.mkdirSync(path.dirname(plistPath), { recursive: true });
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(plistPath, plist);
  try {
    execFileSync('launchctl', ['unload', plistPath], { encoding: 'utf8' });
  } catch {
    // not loaded yet
  }
  execFileSync('launchctl', ['load', '-w', plistPath], { encoding: 'utf8' });
  return { ok: true, factory_id: factoryId, label, plist: plistPath, log: logPath, node, script };
}

export function unloadLaunchAgent(factoryId = thisFactoryId()) {
  if (factoryId === 'factory-1') {
    return { ok: true, skipped: true, reason: 'factory-1_has_no_launchagent' };
  }
  const { label, plistPath } = launchAgentPaths(factoryId);
  try {
    execFileSync('launchctl', ['unload', '-w', plistPath], { encoding: 'utf8' });
  } catch {
    try {
      execFileSync('launchctl', ['unload', plistPath], { encoding: 'utf8' });
    } catch {
      // not loaded
    }
  }
  return { ok: true, factory_id: factoryId, label, plist: plistPath, unloaded: true, worktree_kept: true };
}

function main() {
  if (process.argv.includes('--install-agent')) {
    const result = installLaunchAgent(thisFactoryId());
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (process.argv.includes('--unload-agent')) {
    const result = unloadLaunchAgent(thisFactoryId());
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const loop = process.argv.includes('--loop');
  const tick = async () => {
    const result = await runFactoryLane({ factoryId: thisFactoryId() });
    console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
    if (!result.ok && !loop) process.exit(1);
  };
  tick();
  if (loop) {
    const ms = Number(process.env.FACTORY_LANE_INTERVAL_MS || 60_000);
    console.error(`[factory-lane] looping every ${ms}ms as ${thisFactoryId()}`);
    setInterval(() => { tick().catch((err) => console.error(String(err))); }, ms);
  }
}

if (process.argv[1] && process.argv[1].endsWith('run-factory-lane.mjs')) {
  main();
}
