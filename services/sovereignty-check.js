/**
 * services/sovereignty-check.js
 *
 * Middleware and utility: validates LifeOS actions against user's stated direction.
 *
 * CONSTITUTIONAL RULE: The system never pushes against stated user direction.
 * This is a structural gate — certain actions are blocked at the architecture level,
 * not via LLM judgment or policy that can be overridden by a prompt.
 *
 * Exports:
 *   createSovereigntyCheck({ pool }) → SovereigntyCheck
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createConsentRegistry } from './consent-registry.js';

/** Actions that are always allowed without additional checks */
const ALWAYS_ALLOWED = new Set(['read']);

/** Actions that require explicit user approval on the task record */
const REQUIRES_TASK_APPROVAL = new Set(['execute_outreach']);

/** Actions that require explicit consent for a named feature */
const REQUIRES_CONSENT = {
  propose_fulfillment: 'fulfillment',
  share_data: null, // share_data always requires a consent check — feature checked in context
};

/** Actions that must NEVER be allowed through this check */
const NEVER_ALLOWED = new Set(['amend_ethics']);

export function createSovereigntyCheck({ pool }) {
  const consentReg = createConsentRegistry({ pool });

  /**
   * Validate that the proposed action aligns with the user's stated direction
   * and the system's constitutional rules.
   *
   * @param {object} p
   * @param {number|string} p.userId
   * @param {string}        p.action   e.g. 'read', 'remind', 'execute_outreach', ...
   * @param {object}        [p.context]  Additional context (task record, feature name, etc.)
   * @returns {Promise<{allowed: boolean, reason: string}>}
   */
  async function check({ userId, action, context = {} }) {
    // 1. Actions that are never allowed through this path
    if (NEVER_ALLOWED.has(action)) {
      return {
        allowed: false,
        reason: `Action "${action}" cannot be authorized through sovereignty-check. Constitutional amendments require multi-party consensus via constitutional-lock.`,
      };
    }

    // 2. Actions that are always allowed
    if (ALWAYS_ALLOWED.has(action)) {
      return { allowed: true, reason: 'read actions are always permitted' };
    }

    // 3. Reminders / prods — always allowed (user opted into commitment tracking)
    if (action === 'remind') {
      return { allowed: true, reason: 'commitment prods are always permitted for opted-in users' };
    }

    // 4. execute_outreach — only allowed if the specific task has been explicitly approved
    if (REQUIRES_TASK_APPROVAL.has(action)) {
      const approved = context?.task?.approved === true;
      if (!approved) {
        return {
          allowed: false,
          reason: `Action "execute_outreach" requires the task to be explicitly approved (task.approved === true). Current value: ${context?.task?.approved ?? 'undefined'}`,
        };
      }
      return { allowed: true, reason: 'outreach task has been explicitly approved' };
    }

    // 5. propose_fulfillment — requires consent for 'fulfillment' feature
    if (action === 'propose_fulfillment') {
      const uid = parseInt(userId, 10);
      const hasConsent = await consentReg.hasConsent(uid, 'fulfillment');
      if (!hasConsent) {
        return {
          allowed: false,
          reason: 'Action "propose_fulfillment" requires user consent for the "fulfillment" feature. No current consent on record.',
        };
      }
      return { allowed: true, reason: 'user has consented to fulfillment feature' };
    }

    // 6. share_data — requires consent check for the specific feature in context
    if (action === 'share_data') {
      const feature = context?.feature;
      if (!feature) {
        return {
          allowed: false,
          reason: 'Action "share_data" requires context.feature to specify which feature\'s data is being shared.',
        };
      }
      const uid = parseInt(userId, 10);
      const hasConsent = await consentReg.hasConsent(uid, feature);
      if (!hasConsent) {
        return {
          allowed: false,
          reason: `Action "share_data" for feature "${feature}" is not permitted. User has not granted consent for this feature.`,
        };
      }
      return { allowed: true, reason: `user has consented to share ${feature} data` };
    }

    // Default: unknown action types are denied
    return {
      allowed: false,
      reason: `Unknown action type: "${action}". Only explicitly permitted actions are allowed.`,
    };
  }

  /**
   * Returns an Express middleware function that reads sovereignty headers and
   * enforces the check before the request proceeds.
   *
   * Headers:
   *   x-lifeos-action:  the action being performed (e.g. 'read', 'execute_outreach')
   *   x-lifeos-user-id: the LifeOS user ID performing or being acted upon
   *   x-lifeos-context: optional JSON-encoded context object
   *
   * @returns {Function} Express middleware (req, res, next)
   */
  function expressMiddleware() {
    return async function sovereigntyMiddleware(req, res, next) {
      const action = req.headers['x-lifeos-action'];
      const rawUserId = req.headers['x-lifeos-user-id'];
      const rawContext = req.headers['x-lifeos-context'];

      // If no sovereignty headers present, this route doesn't require the check — pass through
      if (!action && !rawUserId) return next();

      if (!action) {
        return res.status(400).json({
          error: 'sovereignty_check',
          message: 'x-lifeos-user-id provided but x-lifeos-action is missing',
        });
      }

      if (!rawUserId) {
        return res.status(400).json({
          error: 'sovereignty_check',
          message: 'x-lifeos-action provided but x-lifeos-user-id is missing',
        });
      }

      let context = {};
      if (rawContext) {
        try {
          context = JSON.parse(rawContext);
        } catch {
          return res.status(400).json({
            error: 'sovereignty_check',
            message: 'x-lifeos-context must be valid JSON',
          });
        }
      }

      try {
        const result = await check({ userId: rawUserId, action, context });
        if (!result.allowed) {
          return res.status(403).json({
            error: 'sovereignty_violation',
            action,
            message: result.reason,
          });
        }
        // Attach sovereignty result for downstream handlers
        req.sovereigntyCheck = result;
        return next();
      } catch (err) {
        return res.status(500).json({
          error: 'sovereignty_check_error',
          message: err.message,
        });
      }
    };
  }

  return {
    check,
    expressMiddleware,
  };
}
