/**
 * SYNOPSIS: Proves the Founder Escalation Threshold — that implementation questions
 * are refused and routed back, that policy questions still get through, and that
 * the internal resolvers only remove dependency edges the blueprint's own contracts
 * show to be unnecessary.
 *
 * The failure under test is real and recent: on 2026-08-11 the loop asked the
 * founder to pick a dependency-cycle repair and to define seven database schemas.
 * Both were work the Offices could do. The risk in fixing it is the mirror image —
 * a system that resolves everything internally will eventually resolve something
 * that was genuinely his to decide — so roughly half of these assertions exist to
 * prove the gate still opens.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mayEscalateToFounder,
  policyBearing,
  ESCALATION_CRITERION,
  IMPLEMENTATION_DELEGATION,
} from '../config/founder-escalation-threshold.js';
import { applyEscalationGate } from '../scripts/escalation-gate.mjs';
import { classifyEdge, resolveCycles } from '../scripts/architect-resolve-cycle.mjs';
import { resolveStore, findReuseCandidates } from '../scripts/architect-resolve-stores.mjs';

test('a question with no named criterion is refused as unfinished work', () => {
  const out = mayEscalateToFounder({
    subject: 'TaskStore',
    asks: 'What are the columns and types of TaskStore?',
    owning_office: 'architect',
  });
  assert.equal(out.allowed, false);
  assert.equal(out.reason, 'NO_CRITERION_NAMED');
  assert.equal(out.route_back_to, 'architect');
});

test('naming a criterion is not enough — it has to be shown', () => {
  const out = mayEscalateToFounder({
    subject: 'TaskStore',
    escalation_criterion: ESCALATION_CRITERION.CHANGES_USER_RIGHTS,
  });
  assert.equal(out.allowed, false);
  assert.equal(out.reason, 'CRITERION_WITHOUT_EVIDENCE');
});

test('an invented criterion is refused rather than accepted as a new one', () => {
  const out = mayEscalateToFounder({
    escalation_criterion: 'the_system_would_like_reassurance',
    criterion_evidence: 'it would help',
  });
  assert.equal(out.allowed, false);
  assert.equal(out.reason, 'UNKNOWN_CRITERION');
});

test('a deadlock claim must carry the office positions that prove it', () => {
  const withoutPositions = mayEscalateToFounder({
    escalation_criterion: ESCALATION_CRITERION.OFFICES_CANNOT_AGREE,
    criterion_evidence: 'we disagree',
  });
  assert.equal(withoutPositions.allowed, false);
  assert.equal(withoutPositions.reason, 'CONSENSUS_FAILURE_UNPROVEN');
  assert.equal(withoutPositions.route_back_to, 'conductor');

  const withPositions = mayEscalateToFounder({
    escalation_criterion: ESCALATION_CRITERION.OFFICES_CANNOT_AGREE,
    criterion_evidence: 'architect and sentry hold incompatible positions after two rounds',
    office_positions: [
      { office: 'architect', position: 'reuse memory_capsules' },
      { office: 'sentry', position: 'a new table, the sensitivity mixing is unsafe' },
    ],
  });
  assert.equal(withPositions.allowed, true);
});

test('the ownership question the Chair named as genuinely his does get through', () => {
  const out = mayEscalateToFounder({
    subject: 'CapsuleStore',
    asks: 'Do users own and export this data, or does the system retain it as proprietary intelligence?',
    escalation_criterion: ESCALATION_CRITERION.CHANGES_USER_RIGHTS,
    criterion_evidence:
      'option A grants export rights over personal memory; option B retains it — the two commit the product to different positions on ownership',
  });
  assert.equal(out.allowed, true);
  assert.equal(out.criterion, ESCALATION_CRITERION.CHANGES_USER_RIGHTS);
});

test('policy-bearing subjects are detected; a column list is not policy', () => {
  assert.equal(policyBearing({ question: 'can the user export and delete their capsules?' }).policy_bearing, true);
  assert.equal(policyBearing({ question: 'how long do we retain receipts before deletion?' }).policy_bearing, true);
  assert.equal(policyBearing({ question: 'what price do we charge for this?' }).policy_bearing, true);
  assert.equal(policyBearing({ question: 'should the id column be uuid or bigserial?' }).policy_bearing, false);
  assert.equal(policyBearing({ question: 'which wave should step 12 build in?' }).policy_bearing, false);
});

test('delegation permits schemas and signatures but never ownership or retention', () => {
  assert.equal(IMPLEMENTATION_DELEGATION.delegated_to, 'architect');
  assert.deepEqual(IMPLEMENTATION_DELEGATION.requires_consensus_from, ['builder', 'sentry', 'conductor']);
  assert.ok(IMPLEMENTATION_DELEGATION.may_specify.some((s) => s.includes('column names')));
  assert.ok(IMPLEMENTATION_DELEGATION.may_never_specify.some((s) => s.includes('owns data')));
  assert.ok(IMPLEMENTATION_DELEGATION.may_never_specify.some((s) => s.includes('retained')));
});

test('the gate compresses a set of implementation questions to nothing', () => {
  const out = applyEscalationGate([
    { subject: 'TaskStore', asks: 'define the columns', owning_office: 'architect' },
    { subject: 'DEPENDENCY_CYCLE', asks: 'pick CR-1 through CR-4', owning_office: 'architect' },
    {
      subject: 'CapsuleStore ownership',
      escalation_criterion: ESCALATION_CRITERION.CHANGES_USER_RIGHTS,
      criterion_evidence: 'export rights versus proprietary retention',
    },
  ]);
  assert.equal(out.admitted.length, 1);
  assert.equal(out.admitted[0].subject, 'CapsuleStore ownership');
  assert.equal(out.routed_back.length, 2);
  assert.ok(out.routed_back.every((r) => r.route_back_to === 'architect'));
});

test('an edge is removable only when the target is absent from the dependent step\'s signature', () => {
  const router = {
    id: 'A',
    type: 'esm',
    contract: { factory_signature: 'export function createRouter({ pool, logger, authorityLedger })' },
  };
  const verification = { id: 'B', type: 'esm', contract: { exports: ['VerificationService'] }, file: 'services/verification-service.js' };
  const authority = { id: 'C', type: 'esm', contract: { exports: ['AuthorityLedger'] }, file: 'services/authority-ledger.js' };

  const spurious = classifyEdge(router, verification);
  assert.equal(spurious.required, false);
  assert.equal(spurious.basis, 'absent_from_signature');

  const genuine = classifyEdge(router, authority);
  assert.equal(genuine.required, true);
  assert.equal(genuine.basis, 'injected_collaborator');
});

test('a step with no signature evidence keeps its edges — the resolver fails closed', () => {
  const noSignature = { id: 'A', type: 'esm', contract: {} };
  const target = { id: 'B', type: 'esm', contract: { exports: ['Thing'] } };
  const verdict = classifyEdge(noSignature, target);
  assert.equal(verdict.required, true);
  assert.equal(verdict.basis, 'no_signature_evidence');
});

test('the resolver only touches edges inside the cycle and escalates when none is removable', () => {
  // Every edge in this knot is an injected collaborator, so no lawful removal
  // exists and the decision becomes genuinely architectural.
  const blueprint = {
    steps: [
      { id: 'A', type: 'esm', deps: ['B'], contract: { exports: ['A'], factory_signature: 'createA({ b })' } },
      { id: 'B', type: 'esm', deps: ['A'], contract: { exports: ['B'], factory_signature: 'createB({ a })' } },
    ],
  };
  const out = resolveCycles(blueprint);
  assert.equal(out.resolved, false);
  assert.equal(out.removed_edges.length, 0);
  assert.equal(out.repair_class, 'NO_LAWFUL_REPAIR_FOUND');
  assert.equal(out.escalation_required, true);
});

test('an acyclic graph is left alone', () => {
  const out = resolveCycles({ steps: [{ id: 'A', deps: [] }, { id: 'B', deps: ['A'] }] });
  assert.equal(out.resolved, true);
  assert.equal(out.removed_edges.length, 0);
});

test('reuse requires column evidence, not just a matching name', () => {
  const tables = new Map([
    ['memory_capsules', {
      table: 'memory_capsules',
      migration: '001.sql',
      columns: ['id uuid', 'fact text', 'source text', 'trust_level text', 'sensitivity text', 'review_by date'],
      column_names: ['id', 'fact', 'source', 'trust_level', 'sensitivity', 'review_by'],
    }],
    ['capsule_ui_prefs', {
      table: 'capsule_ui_prefs',
      migration: '002.sql',
      columns: ['id int', 'colour text'],
      column_names: ['id', 'colour'],
    }],
  ]);
  const candidates = findReuseCandidates('CapsuleStore', tables);
  assert.equal(candidates[0].table, 'memory_capsules');

  const resolved = resolveStore('CapsuleStore', tables);
  assert.equal(resolved.disposition, 'REUSE_EXISTING');
  assert.equal(resolved.escalates, false);
  // Reuse is a proposal about an existing asset, not a fact — Builder still has to
  // confirm the table can carry the work and Sentry the data implications.
  assert.deepEqual(resolved.requires_consensus_from, ['builder', 'sentry', 'conductor']);
});

test('a name match with no purpose evidence does not earn reuse', () => {
  const tables = new Map([
    ['template_click_counts', {
      table: 'template_click_counts',
      migration: '003.sql',
      columns: ['id int', 'clicks int'],
      column_names: ['id', 'clicks'],
    }],
  ]);
  const resolved = resolveStore('TemplateStore', tables);
  assert.notEqual(resolved.disposition, 'REUSE_EXISTING');
  assert.equal(resolved.escalates, false);
  assert.equal(resolved.disposition, 'ARCHITECT_SPECIFIES');
});
