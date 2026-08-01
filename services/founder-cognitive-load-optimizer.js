/**
 * SYNOPSIS: Decide when to ask Adam vs. act, based on cost_of_error and reversibility.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const REVERSIBILITY = {
  A: 'reversible_without_data_loss',
  B: 'reversible_with_backup',
  C: 'irreversible_or_money_or_auth',
};

export function decideInteraction({ reversibility = REVERSIBILITY.A, cost_of_error = 0, confidence = 0.8, can_auto_revert = true }) {
  if (reversibility === REVERSIBILITY.C || cost_of_error > 1000 || confidence < 0.5) {
    return { action: 'ask_founder', reason: 'high cost or low confidence' };
  }
  if (reversibility === REVERSIBILITY.B && !can_auto_revert) {
    return { action: 'ask_founder', reason: 'not safely reversible' };
  }
  return { action: 'act_and_report', reason: 'safe to proceed and report' };
}

export function shouldAskFounder(decision) {
  return decideInteraction(decision).action === 'ask_founder';
}
