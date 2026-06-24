#!/usr/bin/env node
/**
 * SYNOPSIS: Live BuilderOS operational proof — canonical build + compound log + gap classify.
 * Usage: node scripts/builderos-run-operational-proof.mjs [--skip-live-build] [--force-live-build]
 * @ssot builderos-reboot/BUILDEROS_WORKING_DEFINITION.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeCanonicalBlueprintStep } from '../services/builderos-canonical-executor.js';
import { recordCompoundImprovement } from '../services/builderos-compound-improvement.js';
import { classifyBuilderGap, summarizeGapFamilies } from '../services/builderos-gap-classifier.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'BUILDEROS-HARNESS-PROOF-0001';
const HARNESS_RECEIPT = 'builderos-reboot/MISSIONS/BUILDEROS-HARNESS-PROOF-0001/receipts/OPERATIONAL_PROOF.json';
const skipLiveBuild = process.argv.includes('--skip-live-build');
const forceLiveBuild = process.argv.includes('--force-live-build');

function resolveBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || '').replace(/\/$/, '');
}

function resolveCommandKey() {
  return process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
}

function harnessReceiptAlreadyProven() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, HARNESS_RECEIPT), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.ok === true && parsed.schema === 'builderos_operational_proof_v1';
  } catch {
    return false;
  }
}

async function fetchGaps(baseUrl, commandKey) {
  const res = await fetch(`${baseUrl}/api/v1/lifeos/builder/gaps?limit=50`, {
    headers: { 'x-command-key': commandKey },
  });
  const json = await res.json();
  const enriched = (json.gaps || []).map((row) => ({
    ...row,
    ...(row.failure_family && row.failure_family !== 'other' ? {} : classifyBuilderGap(row)),
  }));
  return { ok: res.ok, json, stats: summarizeGapFamilies(enriched) };
}

async function postBuildProbe(baseUrl, commandKey, body) {
  const res = await fetch(`${baseUrl}/api/v1/lifeos/builder/build`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-command-key': commandKey },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = { ok: false, error: 'non_json_response' };
  }
  return { httpStatus: res.status, json };
}

function probeFailed(probe, { requireMissingTarget = false } = {}) {
  if (probe.json?.committed === true) return false;
  if (probe.json?.ok === false) return true;
  if (probe.httpStatus >= 400) return true;
  const signal = [probe.json?.error, probe.json?.note, probe.json?.gap_recommendation?.reason]
    .filter(Boolean)
    .join(' ');
  if (requireMissingTarget && probe.json?.committed === false && /target_file/i.test(signal)) return true;
  if (probe.json?.error) return true;
  return false;
}

async function recordProbeFailure(source, probe, { stage = null, requireMissingTarget = false } = {}) {
  if (!probeFailed(probe, { requireMissingTarget })) {
    return { skipped: true, reason: 'probe did not fail — not logging compound noise' };
  }
  const blocker = probe.json?.error || probe.json?.blocker || probe.json?.failure_reason || `http_${probe.httpStatus}`;
  const gapClass = classifyBuilderGap({
    failure_stage: stage || probe.json?.gap_recommendation?.stage,
    failure_reason: blocker,
    gap_recommendation: probe.json?.gap_recommendation,
  });
  const classification =
    gapClass.playbook !== 'UNKNOWN'
      ? { playbook: gapClass.playbook, repairable: gapClass.repairable, severity: gapClass.severity }
      : undefined;
  return recordCompoundImprovement({
    source,
    blocker,
    code: probe.json?.code,
    error: probe.json?.error,
    builderResult: probe.json,
    httpStatus: probe.httpStatus,
    success: false,
    classification,
    failure_stage: stage || probe.json?.gap_recommendation?.stage,
    failure_reason: blocker,
  });
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const commandKey = resolveCommandKey();
  const report = {
    schema: 'builderos_operational_proof_run_v1',
    generated_at: new Date().toISOString(),
    mission_id: MISSION_ID,
    phases: {},
  };

  if (!baseUrl || !commandKey) {
    console.error(JSON.stringify({ ok: false, error: 'PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing' }, null, 2));
    process.exit(1);
  }

  const gapsBefore = await fetchGaps(baseUrl, commandKey);
  report.phases.gap_classify = {
    ok: gapsBefore.ok,
    stats: gapsBefore.stats,
  };

  const safeScopeProbe = await postBuildProbe(baseUrl, commandKey, {
    domain: 'builderos-platform',
    mode: 'code',
    task: 'Operational proof safe-scope probe',
    spec: 'Probe only — should be blocked by safe scope.',
    target_file: 'data/builderos-operational-proof-blocked.json',
    platform_gap_fill: true,
    platform_gap_fill_reason: 'GAP-FILL: BuilderOS operational proof — intentional safe-scope probe for compound classification.',
  });
  report.phases.safe_scope_probe = {
    httpStatus: safeScopeProbe.httpStatus,
    error: safeScopeProbe.json?.error,
    compound: await recordProbeFailure('operational_proof', safeScopeProbe, { stage: 'safe_scope' }),
  };

  const missingTargetProbe = await postBuildProbe(baseUrl, commandKey, {
    domain: 'builderos-platform',
    mode: 'code',
    task: 'Operational proof missing target probe',
    spec: 'Probe only — must not commit without explicit target_file.',
    platform_gap_fill: true,
    platform_gap_fill_reason: 'GAP-FILL: BuilderOS operational proof — intentional placement probe for compound classification.',
  });
  report.phases.missing_target_probe = {
    httpStatus: missingTargetProbe.httpStatus,
    committed: missingTargetProbe.json?.committed,
    error: missingTargetProbe.json?.error,
    compound: await recordProbeFailure('operational_proof', missingTargetProbe, {
      stage: 'placement',
      requireMissingTarget: true,
    }),
  };

  const shouldRunHarness = !skipLiveBuild && (forceLiveBuild || !harnessReceiptAlreadyProven());
  if (shouldRunHarness) {
    const build = await executeCanonicalBlueprintStep({
      missionId: MISSION_ID,
      stepId: 'BH001',
      maxRepairAttempts: 2,
    });
    report.phases.harness_build = build;
    if (build.committed) {
      recordCompoundImprovement({
        source: 'canonical_executor',
        mission_id: MISSION_ID,
        step_id: 'BH001',
        target_file: build.plan?.target_file,
        success: true,
        classification: { playbook: 'HARNESS_PROOF', repairable: false, severity: 'P3' },
      });
    }
  } else {
    report.phases.harness_build = {
      skipped: true,
      reason: skipLiveBuild ? '--skip-live-build' : 'harness receipt already proven',
    };
  }

  const gapsAfter = await fetchGaps(baseUrl, commandKey);
  report.phases.gap_classify_after = gapsAfter.stats;
  const harnessOk =
    report.phases.harness_build?.committed === true ||
    report.phases.harness_build?.skipped === true ||
    harnessReceiptAlreadyProven();
  report.ok =
    gapsAfter.stats.otherPct <= Number(process.env.BUILDEROS_MAX_GAP_OTHER_PCT || 25) && harnessOk;

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
