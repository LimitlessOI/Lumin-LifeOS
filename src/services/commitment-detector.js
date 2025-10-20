// Commitment Detector Service

const { extractCommitment } = require('../utils/extraction');
const commitmentTracker = require('./commitment-tracker');

class CommitmentDetector {
  constructor() {
    this.conversations = [];
  }

  processConversation(conversation) {
    const commitment = extractCommitment(conversation);
    if (commitment) {
      this.confirmCommitment(commitment);
    }
  }

  confirmCommitment(commitment) {
    // Confirmation logic here - ask for verification and add to tracker
    commitmentTracker.addCommitment(commitment);
  }
}

module.exports = new CommitmentDetector();