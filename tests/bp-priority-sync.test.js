/**
 * SYNOPSIS: js — tests/bp-priority-sync.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { syncMissionFromTechnicalReceipt, checkBpReceiptAlignment } from '../services/bp-priority-sync.js';

function writeJson(root, rel, data) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
}

test('syncMissionFromTechnicalReceipt persists completion_receipt_id across BP artifacts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-sync-'));
  const missionId = 'PRODUCT-TEST-0001';
  const founderPacket = `builderos-reboot/MISSIONS/${missionId}/FOUNDER_PACKET.md`;
  const founderJson = founderPacket.replace(/\.md$/, '.json');
  const blueprintPath = `builderos-reboot/MISSIONS/${missionId}/BLUEPRINT.json`;
  const objectiveVerdict = `builderos-reboot/MISSIONS/${missionId}/OBJECTIVE_VERDICT.json`;
  const receiptPath = 'products/receipts/TEST_ACCEPTANCE.json';

  writeJson(root, 'builderos-reboot/BP_PRIORITY.json', {
    _authority: { status: 'CANONICAL' },
    items: [{
      mission_id: missionId,
      product_id: 'lifeos',
      founder_packet: founderPacket,
      blueprint_path: blueprintPath,
      blueprint_status: 'draft',
      receipt_path: receiptPath,
    }],
  });
  fs.mkdirSync(path.join(root, path.dirname(founderPacket)), { recursive: true });
  fs.writeFileSync(path.join(root, founderPacket), '# fp\n');
  writeJson(root, founderJson, { canonical_surface: '/lifeos/test' });
  writeJson(root, blueprintPath, { steps: [{ action_type: 'shell_command', command: 'npm run test' }] });
  writeJson(root, objectiveVerdict, { verdict: 'TECHNICAL_PASS' });
  writeJson(root, receiptPath, {
    verdict: 'PASS',
    completed_at: '2026-06-27T00:00:00.000Z',
    completion_receipt_id: 'ca_test_123',
  });

  const result = syncMissionFromTechnicalReceipt({
    missionId,
    root,
    receipt: {
      verdict: 'PASS',
      completed_at: '2026-06-27T00:00:00.000Z',
      completion_receipt_id: 'ca_test_123',
    },
    buildRecord: {
      git_sha: 'abc123',
      completion_receipt_id: 'ca_test_123',
      build_method: 'system-build',
    },
  });

  assert.ok(result.updated.includes('builderos-reboot/BP_PRIORITY.json'));
  const bp = JSON.parse(fs.readFileSync(path.join(root, 'builderos-reboot/BP_PRIORITY.json'), 'utf8'));
  const item = bp.items[0];
  assert.equal(item.completion_receipt_id, 'ca_test_123');

  const blueprint = JSON.parse(fs.readFileSync(path.join(root, blueprintPath), 'utf8'));
  assert.equal(blueprint.completion_receipt_id, 'ca_test_123');

  const founder = JSON.parse(fs.readFileSync(path.join(root, founderJson), 'utf8'));
  assert.equal(founder.technical_pass.completion_receipt_id, 'ca_test_123');

  const failures = checkBpReceiptAlignment({ root });
  assert.equal(failures.length, 0, failures.map((f) => f.detail).join('; '));
});
