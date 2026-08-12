/**
 * SYNOPSIS: Factory identity and allocation policy. Factories are PEERS: neither
 * outranks the other, and a role like integration owner is an assignment for one
 * build, not constitutional superiority. Next build the roles may reverse.
 *
 * Identity exists so trust has an actor. Without a `factory_id` there is nobody to
 * hold capable, and "hold each other capable" — the founder's phrase — is forward
 * looking rather than punitive: I see something that may prevent your work from
 * succeeding, and I am obliged to surface it.
 *
 * The architecture must reach N factories without redesign, so nothing here
 * hardcodes two. Two is the laboratory.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { CAPABILITY_DIMENSIONS } from './trust-scoring.js';
import { isProvisioned, workspaceRootFor } from './factory-workspace.js';

/**
 * Identity only. A factory declares who it is here; whether it can actually
 * build is answered by `factoryStatus()` against the filesystem, because a
 * config field claiming `active` is precisely the dormant-enforcement pattern
 * this repair exists to eliminate.
 */
export const FACTORIES = Object.freeze([
  Object.freeze({
    factory_id: 'factory-1',
    kind: 'governed_codegen',
    entrypoint: '/factory/ship-queue',
    note: 'The existing governed factory, and the repository working tree itself. Historical ledger rows belong to it.',
  }),
  Object.freeze({
    factory_id: 'factory-2',
    kind: 'governed_codegen',
    entrypoint: '/factory/ship-queue',
    note: 'Second lane. Provisioned as its own git worktree so it has an independent index — two factories sharing one index is the git-lock and staging-contamination failure this repo has already hit.',
  }),
]);

/** Capacity is observed, never declared. */
export function factoryStatus(factoryId) {
  return isProvisioned(factoryId) ? 'active' : 'registered_not_provisioned';
}

export function factoryWorkspace(factoryId) {
  return workspaceRootFor(factoryId);
}

/** How the Conductor may spend additional compute on a slice. */
export const ALLOCATION_MODE = Object.freeze({
  /** Different slices to different factories. Speed. */
  PARALLEL_SPLIT: 'parallel_split',
  /** Same slice to multiple factories, independently, results compared. Reliability. */
  REDUNDANT_INDEPENDENT: 'redundant_independent',
  /** One factory builds, another attacks the result. Verification. */
  ADVERSARIAL_REVIEW: 'adversarial_review',
});

/**
 * Redundancy is for work where being wrong is expensive, not for everything: it
 * costs N times as much. These are the risk markers that justify it.
 */
export const HIGH_RISK_MARKERS = Object.freeze([
  'authority',
  'auth',
  'security',
  'payment',
  'billing',
  'migration',
  'governance',
  'gate',
  'seal',
  'trust',
  'privacy',
]);

export function activeFactories() {
  return FACTORIES.filter((f) => factoryStatus(f.factory_id) === 'active');
}

export function knownFactoryIds() {
  return FACTORIES.map((f) => f.factory_id);
}

export function isKnownFactory(id) {
  return knownFactoryIds().includes(String(id));
}

/** Peers by default — this is asserted rather than assumed. */
export const FACTORY_HIERARCHY = Object.freeze({
  model: 'peer',
  permanent_superiority: false,
  temporary_roles_allowed: ['integration_owner', 'component_manufacturer', 'adversarial_reviewer'],
  note: 'A temporary role is scoped to one manufacturing plan and confers no standing authority over the peer.',
});

/**
 * Isolation rule. A factory may read a peer's record and may raise a finding
 * against it; it may never write one. Concealment and self-serving edits are the
 * two ways a trust ledger stops meaning anything.
 */
export const ISOLATION_RULES = Object.freeze({
  may_read_peer_record: true,
  may_write_peer_record: false,
  may_challenge_peer_output: true,
  may_alter_own_history: false,
  enforcement:
    'recordRealityOutcome writes only the (model_tier, role) row for the acting factory_id; a challenge is a new finding routed for adjudication, never an edit to the peer row',
});

export const CAPABILITY_KEYS = CAPABILITY_DIMENSIONS;
