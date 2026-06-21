#!/usr/bin/env node
/**
 * SYNOPSIS: Install regression harness + schema + package script (factory_local_runner recovery strategy). Install regression harness + schema + package script (factory_local_runner recovery strategy). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, missionDir } from './mission-lib.mjs';

const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates/mechanical-regression-harness.mjs');

export function installMechanicalRegressionHarness(objectiveId = 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001') {
  const dir = missionDir(objectiveId);
  const harnessDest = path.join(REPO_ROOT, 'scripts/deliberation-sentry-regression-harness.mjs');
  fs.mkdirSync(path.dirname(harnessDest), { recursive: true });
  fs.copyFileSync(TEMPLATE, harnessDest);

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'REGRESSION_RUN_RESULT',
    type: 'object',
    required: ['schema', 'mission_id', 'layer', 'pass', 'probes', 'generated_at'],
    properties: {
      schema: { const: 'regression_run_result_v1' },
      mission_id: { type: 'string' },
      layer: { type: 'string' },
      pass: { type: 'boolean' },
      probes: {
        type: 'array',
        items: {
          type: 'object',
          required: ['probe_id', 'pass'],
          properties: {
            probe_id: { type: 'string' },
            pass: { type: 'boolean' },
            layer: { type: 'string' },
            detail: { type: 'string' },
          },
        },
      },
      generated_at: { type: 'string', format: 'date-time' },
    },
  };
  const schemaPath = path.join(dir, 'REGRESSION_RUN_RECEIPT.schema.json');
  fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);

  const pkgPath = path.join(REPO_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['lifeos:deliberation:regression'] =
    'node scripts/deliberation-sentry-regression-harness.mjs';
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  const readmePath = path.join(dir, 'README.md');
  const commands = [
    'npm run lifeos:deliberation:regression',
    'npm run lifeos:deliberation:regression -- --layer=local',
    'npm run lifeos:deliberation:regression -- --layer=live',
    'node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs --verify-railway',
    `node builderos-reboot/scripts/run-mission-acceptance.mjs ${objectiveId}`,
  ];
  let readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : `# ${objectiveId}\n`;
  if (!readme.includes('lifeos:deliberation:regression -- --layer=local')) {
    readme += `\n## Exact commands (BLUEPRINT)\n\n${commands.map((c) => `- \`${c}\``).join('\n')}\n`;
    fs.writeFileSync(readmePath, readme);
  }

  return { harnessDest, schemaPath, commands_added: commands.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const objectiveId = process.argv[2] || 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001';
  const result = installMechanicalRegressionHarness(objectiveId);
  console.log(JSON.stringify({ ok: true, objective_id: objectiveId, ...result }, null, 2));
}
