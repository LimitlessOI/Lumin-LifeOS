/**
 * SYNOPSIS: The Architect write-back allowlist (blueprint §18, B2). This is the
 * anti-invention-laundering contract, and it is deliberately narrow.
 *
 * "Builder may not invent" is worthless if the fix is "Architect invents whatever
 * Builder asks for". So when a specification is missing, the Architect has exactly
 * three legal moves and no fourth:
 *
 *   CITE_EXISTING   — the thing already exists in the repository; cite its real
 *                     columns. This is reuse, not authorship: the Architect is
 *                     reporting a fact, not making a decision.
 *   MARK_NON_GOAL   — the blueprint itself places this outside the current phase;
 *                     drop it from scope rather than build it blind.
 *   FOUNDER_QUESTION— everything else. A structured question routed to the office
 *                     with actual authority.
 *
 * Drafting new columns or types is FORBIDDEN. That move is what turns "route it
 * upward" into "launder it through a second office", and it is the single failure
 * this whole repair exists to prevent.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const RESOLUTION_KIND = Object.freeze({
  CITE_EXISTING: 'cite_existing',
  MARK_NON_GOAL: 'mark_non_goal',
  FOUNDER_QUESTION: 'founder_question',
});

/** Only these may change the authoritative blueprint's substance. */
export const WRITE_BACK_PERMITTED = Object.freeze([
  RESOLUTION_KIND.CITE_EXISTING,
  RESOLUTION_KIND.MARK_NON_GOAL,
]);

/**
 * Named so a reader sees what was ruled out, not just what was allowed. A future
 * agent looking for "how do I unblock this" must find the refusal, not a gap.
 */
export const FORBIDDEN_WRITE_BACK = Object.freeze({
  draft_new_columns: 'designing a schema the source never specified is invention wearing the Architect\'s badge',
  draft_new_types: 'same as above, at column granularity',
  infer_columns_from_table_name: 'a plausible guess is still a guess, and it would be indistinguishable from the original defect',
  copy_columns_from_a_similar_table: 'similar is not the same; this is the most tempting laundering path and therefore the most dangerous',
});

/**
 * Jurisdiction split (blueprint §18, Class A vs Class B).
 * Class A the Architect may resolve. Class B it may not, at any confidence.
 */
export const CLASS_B_SUBJECTS = Object.freeze([
  'product behavior',
  'user experience',
  'business policy',
  'pricing',
  'privacy policy',
  'safety policy',
  'constitutional meaning',
  'founder intent',
  'data retention',
]);

/**
 * Citation must be verifiable. A resolution that says "this exists" without
 * naming where is indistinguishable from an assertion, so the shape is enforced.
 */
export const REQUIRED_CITATION_FIELDS = Object.freeze(['source_file', 'source_kind', 'columns']);

export const CITATION_SOURCE_KIND = Object.freeze({
  MIGRATION: 'db_migration',
  LIVE_SCHEMA: 'live_schema_scan',
  EXISTING_BLUEPRINT: 'existing_authoritative_blueprint',
});
