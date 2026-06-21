/**
 * SYNOPSIS: SNT Review #2 — Translation attack per founder doctrine.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readFounderText } from './coverage-map.js';

function blueprintHasRouteTargets(blueprint) {
  return (blueprint?.steps || []).some((s) => {
    const t = String(s.target_file || '');
    return t.startsWith('routes/') || t.includes('register-runtime-routes.js');
  });
}

function probeProductionRouteHealthSync(blueprint) {
  const base = (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || '').replace(/\/$/, '');
  const key =
    process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || process.env.LIFEOS_KEY || '';
  if (!base || !key) {
    return {
      pass: false,
      evidence_if_wrong: 'Set PUBLIC_BASE_URL + COMMAND_CENTER_KEY to probe production routes',
      probe: 'skipped_missing_env',
    };
  }

  const healthPaths = [];
  for (const step of blueprint?.steps || []) {
    const t = String(step.target_file || '');
    if (t.includes('capture-pipeline-routes')) healthPaths.push('/api/v1/lifeos/capture-pipeline/health');
    if (t.includes('commitment-route-routes')) healthPaths.push('/api/v1/lifeos/commitment-route/health');
    if (t.includes('action-inbox-routes')) healthPaths.push('/api/v1/lifeos/action-inbox/health');
  }
  const unique = [...new Set(healthPaths)];
  if (!unique.length) {
    return {
      pass: true,
      evidence_if_wrong: `Run ${blueprint?.acceptance_command || 'acceptance_command'} against ${base}`,
      probe: 'acceptance_command_only',
    };
  }

  const failures = [];
  for (const p of unique) {
    const script = `
      fetch(${JSON.stringify(`${base}${p}`)}, { headers: { 'x-command-key': ${JSON.stringify(key)} } })
        .then(r => process.stdout.write(String(r.status)))
        .catch(e => { process.stdout.write('ERR'); process.exit(1); });
    `;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      timeout: 15000,
    });
    const status = String(r.stdout || '').trim();
    if (status !== '200') failures.push(`${p} http=${status || r.stderr?.slice(0, 80) || 'ERR'}`);
  }

  return {
    pass: failures.length === 0,
    evidence_if_wrong: failures.length
      ? failures.join('; ')
      : `All probed routes 200 on ${base}`,
    probe: unique.join(','),
  };
}

export function runSntTranslationAttack(missionFolder, { blueprint, simulation } = {}) {
  const missionId = path.basename(missionFolder);
  const founderText = readFounderText(missionFolder);
  const attacks = [];

  const add = (claim, pass, failure_scenario, severity = 'blocking', evidence_if_wrong = null) => {
    const evidence =
      evidence_if_wrong
      ?? (pass ? null : 'Builder simulation or acceptance failure');
    attacks.push({
      claim,
      pass,
      failure_scenario,
      severity,
      evidence_if_wrong: evidence,
      recommended_action: pass ? 'none' : 'ARC revises blueprint',
    });
  };

  add(
    'ARC preserved intent sources',
    Boolean(blueprint?.intent_sources?.length),
    'ARC invented scope',
    'blocking',
    blueprint?.intent_sources?.length
      ? `intent_sources=${blueprint.intent_sources.length} in BLUEPRINT.json`
      : 'missing intent_sources in BLUEPRINT.json',
  );
  add(
    'Blueprint has acceptance command',
    Boolean(blueprint?.acceptance_command),
    'No measurable Alpha bar',
    'blocking',
    blueprint?.acceptance_command
      ? `npm run ${String(blueprint.acceptance_command).replace(/^npm run /, '')}`
      : 'acceptance_command missing on blueprint',
  );
  add(
    'All steps are write_file_exact',
    (blueprint?.steps || []).every((s) => s.action_type === 'write_file_exact'),
    'Builder forced to decide',
    'blocking',
    `steps=${(blueprint?.steps || []).length} write_file_exact=${(blueprint?.steps || []).filter((s) => s.action_type === 'write_file_exact').length}`,
  );
  add(
    'Auto-execution rule preserved',
    !/auto.?execut/i.test(JSON.stringify(blueprint || {})) || /never auto/i.test(founderText),
    'Intent drift on staging rule',
    'blocking',
    /never auto/i.test(founderText) ? 'founder packet contains never auto rule' : 'blueprint JSON has no auto-execute drift',
  );
  add(
    'Simulation clear to build',
    simulation?.summary?.clear_to_build !== false && (simulation?.steps?.length || 0) > 0,
    'Blocking decision gaps remain or empty builder sim',
    'blocking',
    `sim steps=${simulation?.steps?.length || 0} blocking_gaps=${simulation?.summary?.blocking_gaps ?? 'unknown'}`,
  );

  if (blueprintHasRouteTargets(blueprint)) {
    const probe = probeProductionRouteHealthSync(blueprint);
    add(
      'Production route probe',
      probe.pass,
      'Routes not live on production base URL',
      'blocking',
      probe.evidence_if_wrong,
    );
  }

  for (const attack of attacks) {
    if (attack.severity === 'blocking' && attack.pass && !attack.evidence_if_wrong) {
      attack.pass = false;
      attack.evidence_if_wrong = 'blocking claim passed without falsifiable evidence';
      attack.recommended_action = 'SNT must attach evidence_if_wrong before clearance';
    }
  }

  const blocking = attacks.filter((a) => !a.pass && a.severity === 'blocking');
  const receipt = {
    schema: 'snt_translation_attack_v2',
    mission_id: missionId,
    seat: 'SNT',
    review: 'translation_attack',
    simulated_at: new Date().toISOString(),
    simulated_by: 'factory-core/arc/foundation/snt-translation-attack.js',
    core_question: 'If this claim is wrong, how would we know?',
    attacks_run: attacks.length,
    attacks,
    blocking_count: blocking.length,
    verdict: blocking.length ? 'builder_clearance_no' : 'builder_clearance_yes',
    pass: blocking.length === 0,
  };

  const out = path.join(missionFolder, 'receipts/SNT_TRANSLATION_ATTACK_REPORT.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}
