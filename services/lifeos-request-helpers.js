/**
 * services/lifeos-request-helpers.js
 *
 * Tiny shared helpers used across LifeOS route handlers to harden incoming
 * query/body/param values before they reach the database layer.
 *
 * Why this file exists:
 *   Many LifeOS routes historically wrote `parseInt(req.query.x)` without a
 *   NaN guard. When a caller passed a non-numeric value (e.g. `?days=abc`),
 *   NaN propagated into SQL as `$1 = NaN` or even into template-interpolated
 *   `LIMIT NaN` clauses, crashing the route with a Postgres error. This file
 *   provides a single, consistent way to clamp integer inputs.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/**
 * Parse `value` as a base-10 integer and clamp it into [min, max].
 * Returns `fallback` (default: null) if the value is missing or not a finite integer.
 *
 * @param {unknown} value
 * @param {{ min?: number, max?: number, fallback?: number|null }} [opts]
 * @returns {number|null}
 */
export function safeInt(value, { min = -Infinity, max = Infinity, fallback = null } = {}) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Like {@link safeInt} but with explicit clamp defaults tuned for pagination
 * windows used across LifeOS routes (limit=50, max=200).
 *
 * @param {unknown} value
 * @param {{ min?: number, max?: number, fallback?: number }} [opts]
 * @returns {number}
 */
export function safeLimit(value, { min = 1, max = 200, fallback = 50 } = {}) {
  return safeInt(value, { min, max, fallback });
}

/**
 * Like {@link safeInt} but for a day window (default 7, max 365).
 *
 * @param {unknown} value
 * @param {{ min?: number, max?: number, fallback?: number }} [opts]
 * @returns {number}
 */
export function safeDays(value, { min = 1, max = 365, fallback = 7 } = {}) {
  return safeInt(value, { min, max, fallback });
}

/**
 * Parse `value` as a positive integer id (e.g. for `req.params.id`).
 * Returns null if it is not a valid positive integer, so routes can short
 * circuit with a 400/404 instead of letting `NaN` reach the database.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
export function safeId(value) {
  return safeInt(value, { min: 1, max: Number.MAX_SAFE_INTEGER, fallback: null });
}
