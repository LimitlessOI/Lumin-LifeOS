/**
 * SYNOPSIS: js — tests/studio-simulation.test.js.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runStudioSimulation } from '../factory-staging/factory-core/arc/foundation/studio-simulation.js';
import { evaluateStudioBlockingGate } from '../factory-staging/factory-core/arc/foundation/builder-entry-gate.js';

const LIFERE = `${process.cwd()}/builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001`;
const ACTION_INBOX = `${process.cwd()}/builderos-reboot/MISSIONS/PRODUCT-ACTION-INBOX-V1-0001`;

describe('studio simulation scope', () => {
  it('does not invent staging visibility friction for direct product-host missions', () => {
    const receipt = runStudioSimulation(LIFERE);
    assert.equal(receipt.in_scope, true);
    assert.equal(receipt.pass, true);
    assert.equal(receipt.verdict, 'experience_acceptable');
    assert.equal(
      receipt.checks.some((check) => check.check === 'Founder can see staged items in one place'),
      false,
    );
  });

  it('keeps staging visibility and approval checks for inbox-style approval workflows', () => {
    const receipt = runStudioSimulation(ACTION_INBOX);
    assert.equal(receipt.in_scope, true);
    assert.equal(
      receipt.checks.some((check) => check.check === 'Founder can see staged items in one place'),
      true,
    );
    assert.equal(
      receipt.checks.some((check) => check.check === 'Approval gate before action'),
      true,
    );
  });

  it('fails cutting-edge design asks when actual UI artifacts are still generic', () => {
    const missionFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-sim-'));
    const contentDir = path.join(missionFolder, 'CONTENT', 'S01');
    fs.mkdirSync(contentDir, { recursive: true });
    fs.writeFileSync(path.join(missionFolder, 'FOUNDER_PACKET.md'), [
      '# Founder Packet',
      'We need a cutting edge founder-facing UI that is not generic.',
      'Typography, color atmosphere, desktop, and mobile all matter.',
    ].join('\n'));
    fs.writeFileSync(path.join(missionFolder, 'INTENT_BASELINE.json'), JSON.stringify({
      outcome_statement: 'Ship a founder-facing dashboard that feels premium, not generic.',
      success_metrics: ['Founder immediately sees the UI as distinctive'],
    }, null, 2));
    fs.writeFileSync(path.join(contentDir, 'screen.html'), [
      '<style>',
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #111; color: #eee; }',
      '.card { background: #191919; }',
      '</style>',
      '<div class="card">generic</div>',
    ].join('\n'));
    fs.writeFileSync(path.join(missionFolder, 'BLUEPRINT.json'), JSON.stringify({
      steps: [
        {
          step_id: 'S01',
          target_file: 'public/overlay/fake-screen.html',
          exact_inputs: {
            content_source_path: path.relative(process.cwd(), path.join(contentDir, 'screen.html')),
          },
        },
      ],
    }, null, 2));

    const receipt = runStudioSimulation(missionFolder);
    assert.equal(receipt.in_scope, true);
    assert.equal(receipt.pass, false);
    assert.equal(receipt.verdict, 'STUDIO_CONCERNS');
    const packet = JSON.parse(fs.readFileSync(path.join(missionFolder, 'STUDIO_DESIGN_PACKET.json'), 'utf8'));
    assert.equal(typeof packet.surface, 'string');
    assert.equal(typeof packet.implementation_contract.required_css_variables['--studio-bg'], 'string');
    assert.equal(
      receipt.checks.some((check) => check.check === 'Typography is not default system-stack only' && check.pass === false),
      true,
    );
  });

  it('blocks builder entry when studio packet is missing for an in-scope mission', () => {
    const missionFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-gate-'));
    fs.mkdirSync(path.join(missionFolder, 'receipts'), { recursive: true });
    fs.writeFileSync(path.join(missionFolder, 'receipts/STUDIO_EXPERIENCE_SIMULATION_RECEIPT.json'), JSON.stringify({
      in_scope: true,
      pass: true,
      verdict: 'experience_acceptable',
      friction_points: [],
    }, null, 2));
    const gate = evaluateStudioBlockingGate(missionFolder);
    assert.equal(gate.pass, false);
    assert.equal(gate.violations.includes('studio:missing STUDIO_DESIGN_PACKET.json'), true);
  });
});
