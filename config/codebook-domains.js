/**
 * Optional LCL domain overlays — merged after global `CODE_SYMBOLS` in
 * `services/prompt-translator.js` when `translate(..., { domain })` is set.
 * Keep each list **longest-match-first** (same rule as codebook-v1).
 *
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

/** @type {Record<string, [string, string][]>} */
export const DOMAIN_CODE_SYMBOLS = {
  lifeos: [
    ['lifeos_users', '*lusr'],
    ['/api/v1/lifeos/', '*lapi'],
    ['createUsefulWorkGuard', '*uwg'],
    ['callCouncilMember', '*ccm'],
  ],
  tc: [
    ['transaction_coordinator', '*tcoord'],
    ['glvar_mls', '*glv'],
  ],
  clientcare: [
    ['clientcare_', '*ccr'],
    ['vob_pipeline', '*vobp'],
  ],
};
