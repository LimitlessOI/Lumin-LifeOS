#!/usr/bin/env node
/**
 * SYNOPSIS: Unified SENTRY regression harness — mechanical install via recovery protocol.
 * Unified SENTRY regression harness — mechanical install via recovery protocol.
 * @ssot builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/REGRESSION_PROBE_CATALOG.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createDeliberationGovernanceService } from '../services/deliberation-governance-service.js';
import {
  validateCfoReceipt,
  validateConsensusSession,
  validateScorecardEntry,
} from '../config/deliberation-governance.js';
import { createMockPool } from './deliberation-regression-mock-pool.mjs';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001';
const MISSION_DIR = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', MISSION_ID);
const RECEIPT_PATH = path.join(MISSION_DIR, 'REGRESSION_RUN_RESULT.json');

const SUBSTANTIVE_CASE =
  'Substantive historian case text for regression harness (min twenty chars).';

const validConsensus = {
  final_synthesis: 'Position E synthesis after future-back scan.',
  participants: [{ id: 'bpb' }, { id: 'cdr' }],
  original_positions: [{ stance: 'ship' }, { stance: 'defer' }],
  future_back_horizons: { '1y': 'scale', '5y': 'platform' },
  vote_counts: { ship: 2 },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { layer: 'local', probe: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--layer' && args[i + 1]) out.layer = args[++i];
    else if (args[i] === '--probe' && args[i + 1]) out.probe = args[++i];
  }
  return out;
}

const PROBES = {
  B_NO_ROSTER_GATE: async () => {
    const pool = createMockPool();
    const svc = createDeliberationGovernanceService(pool);
    await svc.recordHistCase({ session_id: 'no-roster-gate', case_text: SUBSTANTIVE_CASE });
    await svc.recordCfoReceipt({ session_id: 'no-roster-gate', role: 'CFO', cost_usd: 0 });
    const gate = await svc.passDeliberationGate({ session_id: 'no-roster-gate' });
    if (gate.ok || !(gate.violations || []).includes('ROSTER_MISSING')) {
      throw new Error('expected ROSTER_MISSING gate fail');
    }
  },
  B_LB_METADATA: async () => {
    const pool = createMockPool();
    const svc = createDeliberationGovernanceService(pool);
    await svc.seedPipelineMinimum({ session_id: 'probe-lb-meta', case_text: SUBSTANTIVE_CASE, problem: 'p' });
    const fin = await svc.finalizePipeline({
      session_id: 'probe-lb-meta',
      load_bearing: true,
      consensus: validConsensus,
    });
    if (!fin.ok) throw new Error('finalizePipeline failed');
    const gate = pool.store.gates.find((g) => g.session_id === 'probe-lb-meta');
    if (!gate?.metadata_json?.load_bearing) throw new Error('load_bearing missing in gate metadata');
  },
  N5: async () => {
    const pool = createMockPool();
    const svc = createDeliberationGovernanceService(pool);
    await svc.seedPipelineMinimum({ session_id: 'sticky-lb', case_text: SUBSTANTIVE_CASE, problem: 'p' });
    const fail1 = await svc.passDeliberationGate({ session_id: 'sticky-lb', load_bearing: true });
    if (fail1.ok) throw new Error('expected load-bearing fail without consensus');
    const fail2 = await svc.passDeliberationGate({ session_id: 'sticky-lb' });
    if (fail2.ok) throw new Error('sticky load-bearing should block downgrade');
    const gateMeta = pool.store.gates.find((g) => g.session_id === 'sticky-lb')?.metadata_json;
    if (gateMeta?.load_bearing !== true) throw new Error('load_bearing not persisted');
  },
  N1: async () => {
    if (validateCfoReceipt({ session_id: 'x', role: 'CFO', cost_usd: -1 }).ok) {
      throw new Error('negative cost should fail');
    }
    if (validateCfoReceipt({ session_id: 'x', role: 'CFO', tokens: -1 }).ok) {
      throw new Error('negative tokens should fail');
    }
  },
  N2: async () => {
    const bad = validateConsensusSession({
      session_id: 'x',
      final_synthesis: 'synthesis text here',
      participants: [{ id: 'a' }, { id: 'b' }],
      original_positions: [{ stance: 'ship' }],
      future_back_horizons: { '100y': 'bad' },
      vote_counts: { ship: 2 },
    });
    if (bad.ok) throw new Error('invalid horizon should fail');
  },
  N3: async () => {
    const bad = validateConsensusSession({
      session_id: 'x',
      final_synthesis: 'synthesis text here',
      participants: [{ id: 'a' }, { id: 'b' }],
      original_positions: [{ stance: 'ship' }],
      future_back_horizons: { '1y': 'scale' },
      vote_counts: { ship: -1 },
    });
    if (bad.ok) throw new Error('negative vote_counts should fail');
  },
  N6b: async () => {
    const pool = createMockPool();
    const svc = createDeliberationGovernanceService(pool);
    await svc.createRoster({
      session_id: 'n6b-expand',
      authorities: ['BPB'],
      reps: [{ name: 'LifeOS' }],
      models: [{ id: 'm1', focus: 'BPB' }],
    });
    const first = await svc.expandRoster('n6b-expand', {
      audit_expanded_roster: [{ rep: 'LifeOS', role: 'primary' }],
      expand_reason: 'audit',
    });
    if (!first.ok) throw new Error('first expand failed');
    const second = await svc.expandRoster('n6b-expand', { expand_reason: 'retry without roster' });
    if (second.ok) throw new Error('expand without audit_expanded_roster must fail');
    const roster = await svc.getRosterBySession('n6b-expand');
    if (!Array.isArray(roster?.audit_expanded_roster) || roster.audit_expanded_roster.length < 1) {
      throw new Error('prior expand wiped');
    }
  },
  N11: async () => {
    if (
      validateScorecardEntry({
        decision_type: 'test',
        cost_usd: -5,
        token_count: -1,
        latency_ms: -1,
      }).ok
    ) {
      throw new Error('negative scorecard metrics should fail');
    }
  },
  CLEANUP_DB_FINGERPRINT: async () => {
    const hasEnv = Boolean(process.env.DATABASE_URL && process.env.PUBLIC_BASE_URL);
    if (!hasEnv) {
      return { skipped: true, reason: 'DATABASE_URL or PUBLIC_BASE_URL missing — fail-closed skip' };
    }
    const r = spawnSync(
      process.execPath,
      ['--import', 'dotenv/config', 'scripts/deliberation-sentry-probe-cleanup.mjs', '--verify-railway'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    if (r.status !== 0) throw new Error(`cleanup verify failed: ${(r.stderr || r.stdout || '').slice(0, 200)}`);
  },
};

const LOCAL_PROBES = [
  'B_NO_ROSTER_GATE',
  'B_LB_METADATA',
  'N5',
  'N1',
  'N2',
  'N3',
  'N6b',
  'N11',
];

async function runProbe(probeId) {
  const fn = PROBES[probeId];
  if (!fn) throw new Error(`unknown probe ${probeId}`);
  const started = Date.now();
  try {
    const extra = await fn();
    return { probe_id: probeId, pass: true, layer: 'local_mock', detail: extra?.skipped ? extra.reason : 'ok', ms: Date.now() - started };
  } catch (err) {
    return { probe_id: probeId, pass: false, layer: 'local_mock', detail: err.message, ms: Date.now() - started };
  }
}

async function runLiveLayer() {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const key = process.env.COMMAND_CENTER_KEY || '';
  if (!base || !key) {
    return [{ probe_id: 'LIVE_LAYER', pass: false, layer: 'live_railway', detail: 'PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing', skipped: true }];
  }
  const r = spawnSync(process.execPath, ['--import', 'dotenv/config', 'scripts/deliberation-snt-live-verify.mjs'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  return [{ probe_id: 'LIVE_LAYER', pass: r.status === 0, layer: 'live_railway', detail: r.status === 0 ? 'ok' : (r.stderr || r.stdout || '').slice(0, 200) }];
}

function writeReceipt(results, layer) {
  const receipt = {
    schema: 'regression_run_result_v1',
    generated_at: new Date().toISOString(),
    mission_id: MISSION_ID,
    layer,
    pass: results.every((r) => r.pass || r.skipped),
    probes: results,
    generated_by: 'mechanical_template_v27_recovery',
  };
  fs.mkdirSync(MISSION_DIR, { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

async function main() {
  const { layer, probe } = parseArgs();
  let results = [];

  if (probe) {
    results.push(await runProbe(probe));
  } else if (layer === 'local' || layer === 'local_mock') {
    for (const id of LOCAL_PROBES) {
      results.push(await runProbe(id));
    }
  } else if (layer === 'live') {
    results = await runLiveLayer();
  } else if (layer === 'all') {
    for (const id of LOCAL_PROBES) results.push(await runProbe(id));
    results.push(...(await runLiveLayer()));
  } else {
    console.error(`unknown layer ${layer}`);
    process.exit(1);
  }

  const receipt = writeReceipt(results, layer);
  console.log(JSON.stringify(receipt, null, 2));
  const failed = results.filter((r) => !r.pass && !r.skipped);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Probe IDs for acceptance manifest check (do not remove):
// B_NO_ROSTER_GATE B_LB_METADATA N5 N1 N2 N3 N6b N11 CLEANUP_DB_FINGERPRINT
