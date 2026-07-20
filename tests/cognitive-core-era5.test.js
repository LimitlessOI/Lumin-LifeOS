/**
 * SYNOPSIS: Cognitive Core Era-5 unit tests — Preserve Me packages/transmission (fake-pool).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCorePreserve } from '../services/cognitive-core-preserve.js';

function fakePreservePool({ packages = [], transmissions = [] } = {}) {
  const state = { packages: [...packages], transmissions: [...transmissions] };
  return {
    state,
    async query(sql, params) {
      if (/FROM judgment_programs|FROM legacy_entries|FROM mental_models|FROM delegation_scopes|FROM judgment_values|FROM idea_nodes|FROM curiosity_prompts|FROM learning_style_profile|FROM judgment_trust_by_domain/.test(sql)) {
        return { rows: [] };
      }
      if (/INSERT INTO judgment_packages/.test(sql)) {
        const row = {
          package_id: 'pkg-1',
          user_id: params[0],
          label: params[1],
          version: 1,
          status: params[2],
          snapshot: JSON.parse(params[3]),
          confidence_map: JSON.parse(params[4]),
          framing_note: params[5],
          source_counts: JSON.parse(params[6]),
          sealed_at: params[7],
        };
        state.packages.push(row);
        return { rows: [row] };
      }
      if (/UPDATE judgment_packages/.test(sql) && /status = 'sealed'/.test(sql)) {
        const row = state.packages.find((p) => p.package_id === params[0]);
        if (!row || !['draft', 'sealed'].includes(row.status)) return { rows: [] };
        Object.assign(row, {
          status: 'sealed',
          snapshot: JSON.parse(params[1]),
          confidence_map: JSON.parse(params[2]),
          source_counts: JSON.parse(params[3]),
          framing_note: params[4],
          sealed_at: new Date().toISOString(),
        });
        return { rows: [row] };
      }
      if (/SELECT \* FROM judgment_packages WHERE package_id/.test(sql)) {
        return { rows: state.packages.filter((p) => p.package_id === params[0]) };
      }
      if (/FROM judgment_packages WHERE user_id/.test(sql)) {
        return { rows: state.packages.filter((p) => p.user_id === params[0]) };
      }
      if (/INSERT INTO judgment_transmissions/.test(sql)) {
        const row = {
          transmission_id: 'tx-1',
          package_id: params[0],
          user_id: params[1],
          recipient_label: params[2],
          purpose: params[3],
          consent_attested: true,
          status: 'sent',
          payload_summary: JSON.parse(params[4]),
        };
        state.transmissions.push(row);
        return { rows: [row] };
      }
      if (/FROM judgment_transmissions WHERE user_id/.test(sql)) {
        return { rows: state.transmissions.filter((t) => t.user_id === params[0]) };
      }
      return { rows: [] };
    },
  };
}

test('FRAMING rejects digital-immortality marketing language', () => {
  const p = createCognitiveCorePreserve({ pool: fakePreservePool() });
  assert.match(p.FRAMING, /not digital immortality/i);
  assert.doesNotMatch(p.FRAMING, /^digital immortality/i);
});

test('createPackage seals when seal=true', async () => {
  const pool = fakePreservePool();
  const preserve = createCognitiveCorePreserve({ pool });
  const out = await preserve.createPackage({ userId: '1', label: 'legacy-v1', seal: true });
  assert.equal(out.ok, true);
  assert.equal(out.package.status, 'sealed');
  assert.ok(out.package.confidence_map);
});

test('transmitPackage requires sealed + consent', async () => {
  const pool = fakePreservePool({
    packages: [{
      package_id: 'pkg-draft',
      user_id: '1',
      label: 'x',
      status: 'draft',
      snapshot: {},
      confidence_map: { confident: [], extrapolated: [], unknown: [] },
      source_counts: {},
    }],
  });
  const preserve = createCognitiveCorePreserve({ pool });
  const draft = await preserve.transmitPackage({
    packageId: 'pkg-draft',
    userId: '1',
    recipientLabel: 'heir',
    purpose: 'pass judgment',
    consentAttested: true,
  });
  assert.equal(draft.ok, false);
  assert.equal(draft.error, 'package_must_be_sealed');

  pool.state.packages[0].status = 'sealed';
  const noConsent = await preserve.transmitPackage({
    packageId: 'pkg-draft',
    userId: '1',
    recipientLabel: 'heir',
    purpose: 'pass judgment',
    consentAttested: false,
  });
  assert.equal(noConsent.ok, false);
  assert.equal(noConsent.error, 'consent_required');

  const ok = await preserve.transmitPackage({
    packageId: 'pkg-draft',
    userId: '1',
    recipientLabel: 'heir',
    purpose: 'pass judgment',
    consentAttested: true,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.transmission.status, 'sent');
});
