/**
 * SYNOPSIS: js — tests/builderos-artifact-sync.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  syncTechnicalAcceptanceArtifacts,
  syncFounderUsabilityArtifacts,
} from '../services/builderos-artifact-sync.js';

function writeJson(root, rel, data) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
}

test('syncTechnicalAcceptanceArtifacts refreshes BP and readiness surfaces together', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-sync-tech-'));
  const missionId = 'PRODUCT-TEST-0002';
  const founderPacket = `builderos-reboot/MISSIONS/${missionId}/FOUNDER_PACKET.md`;
  const founderJson = founderPacket.replace(/\.md$/, '.json');
  const blueprintPath = `builderos-reboot/MISSIONS/${missionId}/BLUEPRINT.json`;
  const objectiveVerdict = `builderos-reboot/MISSIONS/${missionId}/OBJECTIVE_VERDICT.json`;
  const receiptPath = 'products/receipts/TEST_ACCEPTANCE_2.json';

  writeJson(root, 'builderos-reboot/BP_PRIORITY.json', {
    _authority: { status: 'CANONICAL' },
    updated_at: '2026-06-01',
    items: [{
      mission_id: missionId,
      product_id: 'PRODUCT-LIFERE-OS-V1',
      founder_packet: founderPacket,
      blueprint_path: blueprintPath,
      blueprint_status: 'draft',
      receipt_path: receiptPath,
      objective_verdict: objectiveVerdict,
    }],
  });
  fs.mkdirSync(path.join(root, path.dirname(founderPacket)), { recursive: true });
  fs.writeFileSync(path.join(root, founderPacket), '# fp\n');
  writeJson(root, founderJson, { canonical_surface: '/lifeos/test' });
  writeJson(root, blueprintPath, { steps: [{ action_type: 'shell_command', command: 'npm run test' }] });
  writeJson(root, objectiveVerdict, { verdict: 'TECHNICAL_PASS', founder_usability_pass: false });
  writeJson(root, receiptPath, {
    verdict: 'PASS',
    completed_at: '2026-06-27T00:00:00.000Z',
    completion_receipt_id: 'ca_test_234',
  });

  const out = syncTechnicalAcceptanceArtifacts({
    missionId,
    root,
    receipt: {
      verdict: 'PASS',
      completed_at: '2026-06-27T00:00:00.000Z',
      completion_receipt_id: 'ca_test_234',
    },
    buildRecord: { git_sha: 'abc123', completion_receipt_id: 'ca_test_234' },
  });

  assert.equal(out.ok, true);
  const bp = JSON.parse(fs.readFileSync(path.join(root, 'builderos-reboot/BP_PRIORITY.json'), 'utf8'));
  assert.equal(bp.items[0].artifact_sync.status, 'CURRENT');
  const readiness = JSON.parse(fs.readFileSync(path.join(root, 'builderos-reboot/PRODUCT_READINESS_REPORT.json'), 'utf8'));
  assert.equal(readiness.freshness.status, 'CURRENT');
});

test('syncFounderUsabilityArtifacts refreshes readiness after founder pass', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-sync-founder-'));
  const missionId = 'PRODUCT-LIFERE-OS-V1-0001';
  const verdictPath = `builderos-reboot/MISSIONS/${missionId}/OBJECTIVE_VERDICT.json`;
  writeJson(root, 'builderos-reboot/BP_PRIORITY.json', {
    _authority: { status: 'CANONICAL' },
    updated_at: '2026-06-01',
    items: [{
      mission_id: missionId,
      product_id: 'PRODUCT-LIFERE-OS-V1',
      founder_packet: `builderos-reboot/MISSIONS/${missionId}/FOUNDER_PACKET.md`,
      blueprint_path: `builderos-reboot/MISSIONS/${missionId}/BLUEPRINT.json`,
      blueprint_status: 'complete',
      founder_usability_pass: true,
      objective_verdict: verdictPath,
    }],
  });
  writeJson(root, verdictPath, {
    verdict: 'TECHNICAL_PASS',
    founder_usability_pass: true,
  });

  const out = syncFounderUsabilityArtifacts({
    missionId,
    pass: true,
    root,
    at: '2026-06-27T01:00:00.000Z',
  });

  assert.equal(out.ok, true);
  assert.equal(out.point_b_complete, true);
  const bp = JSON.parse(fs.readFileSync(path.join(root, 'builderos-reboot/BP_PRIORITY.json'), 'utf8'));
  assert.equal(bp.items[0].artifact_sync.mode, 'founder_usability');
  const readiness = JSON.parse(fs.readFileSync(path.join(root, 'builderos-reboot/PRODUCT_READINESS_REPORT.json'), 'utf8'));
  assert.equal(readiness.freshness.status, 'CURRENT');
});
