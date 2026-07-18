/**
 * SYNOPSIS: services/creatorPartnerProgram.js
 */
// services/creatorPartnerProgram.js

// Configuration for the rev-share percentages
const config = {
  levels: [0.3, 0.2, 0.15, 0.1, 0.05], // percentages for each level
  maxRevShare: 10000, // maximum revenue share cap
};

// Helper function to calculate the rev-share for a single transaction
function calculateRevShare(transaction, level) {
  return Math.min(transaction.margin * config.levels[level], config.maxRevShare);
}

// Function to compute the rev-share ledger based on the eXp-style criteria
export function computeRevShare(transactions, frontlineActiveStatus) {
  const ledger = transactions.map((transaction) => {
    let totalRevShare = 0;
    let levelRevShares = [];

    for (let level = 0; level < config.levels.length; level++) {
      if (!frontlineActiveStatus[level]) break; // unlock-by-frontline and active-only condition

      const revShare = calculateRevShare(transaction, level);
      levelRevShares.push(revShare);
      totalRevShare += revShare;
    }

    return {
      transactionId: transaction.id,
      levelRevShares,
      totalRevShare,
    };
  });

  return ledger;
}
