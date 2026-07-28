/**
 * SYNOPSIS: Cognitive Core Era-6 unit tests — Transmit Me marketplace/debt/trees (fake-pool).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCoreTransmit } from '../services/cognitive-core-transmit.js';

function fakeTransmitPool({ packages = [], listings = [] } = {}) {
  const state = {
    packages: [...packages],
    listings: [...listings],
    installs: [],
    debt: [],
    interrupts: [],
    trees: [],
    imports: [],
    transmissions: [],
  };
  return {
    state,
    async query(sql, params) {
      if (/FROM judgment_programs|FROM legacy_entries|FROM mental_models|FROM delegation_scopes|FROM judgment_values|FROM idea_nodes|FROM curiosity_prompts|FROM learning_style_profile|FROM judgment_trust_by_domain|FROM judgment_decisions|FROM judgment_predictions/.test(sql)) {
        return { rows: [] };
      }
      if (/SELECT \* FROM judgment_packages WHERE package_id/.test(sql)) {
        return { rows: state.packages.filter((p) => p.package_id === params[0]) };
      }
      if (/INSERT INTO capsule_marketplace_listings/.test(sql)) {
        const row = {
          listing_id: 'list-1',
          user_id: params[0],
          package_id: params[1],
          title: params[2],
          description: params[3],
          wear_ids: JSON.parse(params[4]),
          payload: JSON.parse(params[5]),
          visibility: params[6],
          status: 'published',
          install_count: 0,
        };
        state.listings.push(row);
        return { rows: [row] };
      }
      if (/FROM capsule_marketplace_listings WHERE listing_id/.test(sql)) {
        return { rows: state.listings.filter((l) => l.listing_id === params[0] && l.status === 'published') };
      }
      if (/FROM capsule_marketplace_listings/.test(sql)) {
        return { rows: state.listings.filter((l) => l.status === (params[0] || 'published')) };
      }
      if (/INSERT INTO capsule_marketplace_installs/.test(sql)) {
        const row = { install_id: 'inst-1', listing_id: params[0], user_id: params[1], worn: params[2] };
        state.installs.push(row);
        return { rows: [row] };
      }
      if (/UPDATE capsule_marketplace_listings/.test(sql) && /install_count/.test(sql)) {
        const l = state.listings.find((x) => x.listing_id === params[0]);
        if (l) l.install_count += 1;
        return { rows: l ? [l] : [] };
      }
      if (/INSERT INTO cognitive_debt_items/.test(sql)) {
        return { rows: [] };
      }
      if (/FROM cognitive_debt_items/.test(sql)) {
        return { rows: state.debt.filter((d) => d.user_id === params[0] && d.status === params[1]) };
      }
      if (/UPDATE cognitive_debt_items/.test(sql)) {
        const row = state.debt.find((d) => d.debt_id === params[0]);
        if (row) row.status = params[1];
        return { rows: row ? [row] : [] };
      }
      if (/INSERT INTO subconscious_interrupts/.test(sql)) {
        return { rows: [] };
      }
      if (/FROM subconscious_interrupts/.test(sql)) {
        return { rows: state.interrupts };
      }
      if (/INSERT INTO consequence_trees/.test(sql)) {
        const row = {
          tree_id: 'tree-1',
          user_id: params[0],
          decision_id: params[1],
          question: params[2],
          depth: params[3],
          nodes: JSON.parse(params[4]),
          confidence: params[5],
        };
        state.trees.push(row);
        return { rows: [row] };
      }
      if (/FROM consequence_trees/.test(sql)) {
        return { rows: state.trees.filter((t) => t.user_id === params[0]) };
      }
      if (/SELECT \* FROM judgment_transmissions WHERE transmission_id/.test(sql)) {
        return { rows: state.transmissions.filter((t) => t.transmission_id === params[0]) };
      }
      if (/INSERT INTO package_imports/.test(sql)) {
        const row = {
          import_id: 'imp-1',
          user_id: params[0],
          transmission_id: params[1],
          package_id: params[2],
          snapshot: JSON.parse(params[3]),
          provenance: JSON.parse(params[4]),
          status: 'accepted',
        };
        state.imports.push(row);
        return { rows: [row] };
      }
      if (/UPDATE judgment_transmissions SET status = 'accepted'/.test(sql)) {
        const t = state.transmissions.find((x) => x.transmission_id === params[0]);
        if (t) t.status = 'accepted';
        return { rows: t ? [t] : [] };
      }
      if (/FROM package_imports/.test(sql)) {
        return { rows: state.imports.filter((i) => i.user_id === params[0]) };
      }
      return { rows: [] };
    },
  };
}

test('publishListing requires sealed package when package_id set', async () => {
  const pool = fakeTransmitPool({
    packages: [{ package_id: 'p1', status: 'draft', label: 'x', snapshot: {}, confidence_map: {} }],
  });
  const tx = createCognitiveCoreTransmit({ pool, callAI: async () => '' });
  const out = await tx.publishListing({
    userId: '1',
    packageId: 'p1',
    title: 'My pack',
  });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'sealed_package_required');
});

test('publishListing from sealed package works', async () => {
  const pool = fakeTransmitPool({
    packages: [{
      package_id: 'p1',
      status: 'sealed',
      label: 'Adam judgment v1',
      snapshot: { legacy: [{ kind: 'principle', title: 'Ship', content: 'Ship daily', confidence: 0.8 }], programs: [] },
      confidence_map: { confident: [{ kind: 'legacy' }], extrapolated: [], unknown: [] },
    }],
  });
  const tx = createCognitiveCoreTransmit({ pool, callAI: async () => '' });
  const out = await tx.publishListing({
    userId: '1',
    packageId: 'p1',
    title: 'Adam judgment pack',
    visibility: 'private',
  });
  assert.equal(out.ok, true);
  assert.equal(out.listing.status, 'published');
  assert.match(out.listing.payload.framing_note, /not digital immortality/i);
});

test('buildConsequenceTree rule fallback without AI', async () => {
  const pool = fakeTransmitPool();
  const tx = createCognitiveCoreTransmit({
    pool,
    callAI: async () => { throw new Error('no model'); },
  });
  const out = await tx.buildConsequenceTree({
    userId: '1',
    question: 'Should I hire a VA?',
    depth: 5,
  });
  assert.equal(out.ok, true);
  assert.equal(out.tree.nodes.length, 5);
  assert.match(out.honesty, /GUESS|hypothesis/i);
});

test('acceptTransmission imports sealed package snapshot', async () => {
  const pool = fakeTransmitPool({
    packages: [{
      package_id: 'p1',
      status: 'sealed',
      label: 'src',
      snapshot: { programs: [{ label: 'ship' }] },
      confidence_map: {},
    }],
  });
  pool.state.transmissions.push({
    transmission_id: 'tx-1',
    package_id: 'p1',
    user_id: 'donor',
    status: 'sent',
  });
  const tx = createCognitiveCoreTransmit({ pool, callAI: async () => '' });
  const out = await tx.acceptTransmission({ userId: 'heir', transmissionId: 'tx-1' });
  assert.equal(out.ok, true);
  assert.equal(out.import.status, 'accepted');
  assert.equal(out.import.provenance.from_user_id, 'donor');
});
