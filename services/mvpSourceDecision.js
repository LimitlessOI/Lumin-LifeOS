/**
 * SYNOPSIS: Service module — MvpSourceDecision.
 */
export const selectMVPSource = () => {
  // For MVP, we'll decide between Plaid and CSV-only.
  // This decision is primarily based on development effort and immediate user value.

  // Current decision: Start with CSV-only for the MVP.
  // Rationale:
  // 1. Reduces initial integration complexity and time-to-market.
  // 2. Allows core application logic (transaction processing, categorization, budgeting)
  //    to be built and tested independently of a complex third-party API.
  // 3. Provides a clear path for users to onboard without immediate bank linking,
  //    catering to a broader initial audience or those hesitant to link accounts.
  // 4. Plaid integration can be a fast follow-up feature once the core product
  //    has proven value and stabilized.

  return 'CSV'; // Or 'PLAID' if the strategy changes
};