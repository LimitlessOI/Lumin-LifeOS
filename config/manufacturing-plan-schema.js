/**
 * SYNOPSIS: Typed contract for the Manufacturing Plan and the FACTORY_READY
 * state. Closed enums and required-field sets, so a machine can decide whether a
 * plan is complete without asking a model whether it "seems complete".
 *
 * This is the stage the founder identified as missing between "Factory Ready" and
 * "put it in the queue": the Queue must EXECUTE an authorized plan, never invent
 * one. Founder: "cut twice, build once."
 *
 * Three offices must each exercise their own jurisdiction before manufacturing,
 * and none of them can substitute for another:
 *   Conductor — decomposition, sequencing, dependencies, assignment
 *   Architect — will these pieces, assembled in this order, produce the specified
 *               system?
 *   Builder   — manufacturability: can this be built as specified WITHOUT making
 *               unstated technical or design decisions?
 *
 * The Builder's seat exists because it knows things about manufacturability the
 * other two can miss. Its seal is a required input, never an authorization on its
 * own: one office cannot reach FACTORY_READY alone.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/** Offices that must each seal a manufacturing plan. All three, always. */
export const REQUIRED_CONSENSUS_OFFICES = Object.freeze(['conductor', 'architect', 'builder']);

/**
 * Typed gate states, replacing the single overloaded `ready_to_execute` flag that
 * meant "the graph parses" and was read as "safe to build".
 */
export const GATE_STATE = Object.freeze({
  DRAFT: 'DRAFT',
  ARC_STRUCTURALLY_VALID: 'ARC_STRUCTURALLY_VALID',
  BUILDER_REVIEW_COMPLETE: 'BUILDER_REVIEW_COMPLETE',
  DEFECTS_OUTSTANDING: 'DEFECTS_OUTSTANDING',
  FACTORY_READY: 'FACTORY_READY',
  MANUFACTURING_PLAN_DRAFTED: 'MANUFACTURING_PLAN_DRAFTED',
  MANUFACTURING_AUTHORIZED: 'MANUFACTURING_AUTHORIZED',
});

/** What a slice must do when it fails. No slice may leave this unstated. */
export const FAILURE_DISPOSITION = Object.freeze({
  HALT_WAVE: 'halt_wave',
  HALT_MISSION: 'halt_mission',
  ROLLBACK_SLICE: 'rollback_slice',
  RETRY_THEN_HALT: 'retry_then_halt',
  CONTINUE_ISOLATED: 'continue_isolated',
});

/**
 * Three inconsistent partial-failure behaviors were found live in the execution
 * path. This is the single default: stop the wave. Continuing past a failed slice
 * is only correct when the plan says so explicitly and proves the slice has no
 * dependents, which the verifier checks rather than trusts.
 */
export const DEFAULT_FAILURE_DISPOSITION = FAILURE_DISPOSITION.HALT_WAVE;

export const REQUIRED_PLAN_FIELDS = Object.freeze([
  'schema',
  'plan_id',
  'blueprint_id',
  'blueprint_hash',
  'product_id',
  'slices',
  'waves',
  'integration_points',
  'collision_risks',
  'factory_assignment',
  'terminology_version',
]);

export const REQUIRED_SLICE_FIELDS = Object.freeze([
  'slice_id',
  'steps',
  'depends_on',
  'target_files',
  'acceptance',
  'verification',
  'failure_disposition',
  'assigned_factory',
]);

/**
 * Reasons a plan can be refused. Closed set: a verifier that can emit arbitrary
 * prose reasons cannot be regression-tested, and an unnamed refusal cannot be
 * routed to an office.
 */
export const PLAN_DEFECT = Object.freeze({
  MISSING_FIELD: 'MISSING_FIELD',
  MISSING_SLICE_FIELD: 'MISSING_SLICE_FIELD',
  STEP_NOT_COVERED: 'STEP_NOT_COVERED',
  STEP_COVERED_TWICE: 'STEP_COVERED_TWICE',
  UNKNOWN_STEP_IN_SLICE: 'UNKNOWN_STEP_IN_SLICE',
  DEPENDENCY_CYCLE: 'DEPENDENCY_CYCLE',
  UNRESOLVED_DEPENDENCY: 'UNRESOLVED_DEPENDENCY',
  WAVE_ORDER_VIOLATION: 'WAVE_ORDER_VIOLATION',
  PARALLEL_WRITE_COLLISION: 'PARALLEL_WRITE_COLLISION',
  INVALID_FAILURE_DISPOSITION: 'INVALID_FAILURE_DISPOSITION',
  UNSAFE_CONTINUE_ISOLATED: 'UNSAFE_CONTINUE_ISOLATED',
  BLUEPRINT_HASH_MISMATCH: 'BLUEPRINT_HASH_MISMATCH',
  MISSING_CONSENSUS_SEAL: 'MISSING_CONSENSUS_SEAL',
  UNAUTHORIZED_SEAL_ISSUER: 'UNAUTHORIZED_SEAL_ISSUER',
  SEAL_PLAN_HASH_MISMATCH: 'SEAL_PLAN_HASH_MISMATCH',
  DUPLICATE_OFFICE_SEAL: 'DUPLICATE_OFFICE_SEAL',
  BLUEPRINT_DEFECTS_OUTSTANDING: 'BLUEPRINT_DEFECTS_OUTSTANDING',
  CONTRADICTORY_DEPENDENCY_KEYS: 'CONTRADICTORY_DEPENDENCY_KEYS',
  UNASSIGNED_SLICE: 'UNASSIGNED_SLICE',
});

/** Which office must resolve each defect. A flag with no owner is not routable. */
export const PLAN_DEFECT_AUTHORITY = Object.freeze({
  [PLAN_DEFECT.MISSING_FIELD]: 'conductor',
  [PLAN_DEFECT.MISSING_SLICE_FIELD]: 'conductor',
  [PLAN_DEFECT.STEP_NOT_COVERED]: 'conductor',
  [PLAN_DEFECT.STEP_COVERED_TWICE]: 'conductor',
  [PLAN_DEFECT.UNKNOWN_STEP_IN_SLICE]: 'conductor',
  [PLAN_DEFECT.DEPENDENCY_CYCLE]: 'architect',
  [PLAN_DEFECT.UNRESOLVED_DEPENDENCY]: 'architect',
  [PLAN_DEFECT.WAVE_ORDER_VIOLATION]: 'architect',
  [PLAN_DEFECT.PARALLEL_WRITE_COLLISION]: 'conductor',
  [PLAN_DEFECT.INVALID_FAILURE_DISPOSITION]: 'conductor',
  [PLAN_DEFECT.UNSAFE_CONTINUE_ISOLATED]: 'architect',
  [PLAN_DEFECT.BLUEPRINT_HASH_MISMATCH]: 'conductor',
  [PLAN_DEFECT.MISSING_CONSENSUS_SEAL]: 'conductor',
  [PLAN_DEFECT.UNAUTHORIZED_SEAL_ISSUER]: 'conductor',
  [PLAN_DEFECT.SEAL_PLAN_HASH_MISMATCH]: 'conductor',
  [PLAN_DEFECT.DUPLICATE_OFFICE_SEAL]: 'conductor',
  [PLAN_DEFECT.BLUEPRINT_DEFECTS_OUTSTANDING]: 'architect',
  [PLAN_DEFECT.CONTRADICTORY_DEPENDENCY_KEYS]: 'architect',
  [PLAN_DEFECT.UNASSIGNED_SLICE]: 'conductor',
});
