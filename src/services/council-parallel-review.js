const logReviewDecision = (prId, decision) => {
    console.log(`PR ${prId} reviewed with decision: ${decision}`);
};

const reviewPR = (prId) => {
    // Simulate parallel review
    setTimeout(() => {
        const decision = Math.random() >= 0.5 ? 'approved' : 'rejected';
        logReviewDecision(prId, decision);
    }, 1000);
};

module.exports = { reviewPR };
