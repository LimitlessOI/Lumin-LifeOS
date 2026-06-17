/**
 * Score simulation predictions against reality — Hist lane, post-acceptance.
 * @ssot docs/ADF_PREDICTION_LEDGER_V1.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { REPO_ROOT } from '../../builder/run-step.js';
import { loadMissionJson } from '../mission-paths.js';

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO_ROOT }).toString().trim();
  } catch {
    return null;
  }
}

function scoreRow({ metric_id, seat, predicted, actual, how_we_know_if_wrong }) {
  const match = predicted === actual || (predicted === true && actual === true) || (predicted === 'PASS' && actual === 'PASS');
  return {
    metric_id,
    seat,
    predicted,
    actual,
    how_we_know_if_wrong,
    match,
    variance: match ? null : `predicted ${JSON.stringify(predicted)} got ${JSON.stringify(actual)}`,
    scored_at: new Date().toISOString(),
    scored_by: 'Hist',
  };
}

export function scoreRealityAgainstSimulations(missionFolder) {
  const missionId = path.basename(missionFolder);
  const prediction = loadMissionJson(missionFolder, 'PREDICTION_RECEIPT.json');
  const objective = loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json');
  const builderRun = loadMissionJson(missionFolder, 'BUILDER_RUN_RECEIPT.json');
  const builderSim = loadMissionJson(missionFolder, 'receipts/BUILDER_SIMULATION_REPORT.json');
  const sntTrans = loadMissionJson(missionFolder, 'receipts/SNT_TRANSLATION_ATTACK_REPORT.json');
  const deptSnt = loadMissionJson(missionFolder, 'receipts/SNT_INTENT_ATTACK_RECEIPT.json');

  const acceptanceOk = (builderRun?.acceptance_exit_code ?? 1) === 0;
  const technicalPass = ['TECHNICAL_PASS', 'PASS'].includes(objective?.verdict);
  const simClear = builderSim?.summary?.clear_to_build === true;

  const rows = [];

  rows.push(
    scoreRow({
      metric_id: 'acceptance_pass',
      seat: 'Builder',
      predicted: simClear ? 'PASS' : 'UNKNOWN',
      actual: acceptanceOk ? 'PASS' : 'FAIL',
      how_we_know_if_wrong: 'BUILDER_RUN_RECEIPT.acceptance_exit_code and acceptance receipt verdict',
    }),
  );

  rows.push(
    scoreRow({
      metric_id: 'technical_pass',
      seat: 'CFO',
      predicted: prediction?.pre_build?.success_probability?.value >= 0.5 ? 'LIKELY' : 'UNCERTAIN',
      actual: technicalPass ? 'TECHNICAL_PASS' : objective?.verdict || 'NOT_COMPLETE',
      how_we_know_if_wrong: 'OBJECTIVE_VERDICT.verdict after acceptance',
    }),
  );

  if (prediction?.pre_build?.estimated_deploy_required) {
    rows.push(
      scoreRow({
        metric_id: 'deploy_required',
        seat: 'CFO',
        predicted: true,
        actual: acceptanceOk || !technicalPass ? true : false,
        how_we_know_if_wrong: 'Production acceptance implies deploy occurred or was unnecessary',
      }),
    );
  }

  for (const attack of sntTrans?.attacks || []) {
    if (attack.claim === 'Production route probe') {
      rows.push(
        scoreRow({
          metric_id: 'production_route_probe',
          seat: 'SNT',
          predicted: attack.pass ? 'routes_live' : 'routes_missing',
          actual: acceptanceOk ? 'routes_live' : 'routes_missing',
          how_we_know_if_wrong: attack.evidence_if_wrong || 'acceptance health endpoints',
        }),
      );
    }
  }

  for (const m of deptSnt?.measurements || []) {
    rows.push(
      scoreRow({
        metric_id: m.metric_id,
        seat: m.seat || 'SNT',
        predicted: m.predicted,
        actual: acceptanceOk && technicalPass ? m.predicted : 'FAIL',
        how_we_know_if_wrong: m.how_we_know_if_wrong,
      }),
    );
  }

  const driftRows = rows.filter((r) => !r.match);
  const twinDrift = {
    schema: 'twin_drift_report_v1',
    mission_id: missionId,
    scored_at: new Date().toISOString(),
    scored_by: 'Hist',
    simulation_vs_reality: rows,
    drift_count: driftRows.length,
    pass: driftRows.length === 0,
    lesson: driftRows.length
      ? 'Simulation diverged from reality — update department models and gates.'
      : 'Simulation matched reality for scored metrics.',
  };

  writeJson(path.join(missionFolder, 'receipts/TWIN_DRIFT_REPORT.json'), twinDrift);

  if (prediction) {
    prediction.post_build = {
      ...(prediction.post_build || {}),
      actual_acceptance_pass: acceptanceOk,
      actual_verdict: objective?.verdict || null,
      actual_git_sha: gitSha(),
      scored_at: new Date().toISOString(),
      variance_note: driftRows.length
        ? driftRows.map((d) => d.variance).join('; ')
        : 'within prediction band',
    };
    writeJson(path.join(missionFolder, 'PREDICTION_RECEIPT.json'), prediction);
  }

  return twinDrift;
}

export function mergeScoreboardWithReality(missionFolder, scoreboard) {
  const twin = loadMissionJson(missionFolder, 'receipts/TWIN_DRIFT_REPORT.json');
  return {
    ...scoreboard,
    simulation_vs_reality: twin?.simulation_vs_reality || [],
    twin_drift_pass: twin?.pass ?? null,
    twin_drift_count: twin?.drift_count ?? null,
    scored_by: 'Hist',
  };
}
