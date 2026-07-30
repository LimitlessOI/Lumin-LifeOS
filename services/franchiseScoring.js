/**
 * SYNOPSIS: Service module — FranchiseScoring.
 */

// Simple in-memory store for user feedback history to detect patterns
const userFeedbackHistory = new Map(); // Map<userId, Array<{franchiseId: string, timestamp: number}>>

const calculateFranchiseScore = (employerData, feedbackData) => {
  let score = 0;

  // Employer Score Logic
  // Example: Increase score for positive employer attributes
  if (employerData.onTimePayments) {
    score += 20;
  }
  if (employerData.goodCommunication) {
    score += 15;
  }
  if (employerData.providesBenefits) {
    score += 25;
  }
  // Deduct points for negative attributes
  if (employerData.hasComplaints) {
    score -= 30;
  }
  // New: Employer responsiveness to issues
  if (employerData.respondsToComplaints) {
    score += 10;
  }
  // New: Employee retention rate (higher is better)
  if (employerData.employeeRetentionRate > 0.7) { // Example threshold
    score += 15;
  } else if (employerData.employeeRetentionRate < 0.3) {
    score -= 10;
  }

  // Community Feedback Integration with Anti-Fraud
  const feedbackScore = feedbackData.reduce((acc, feedback) => {
    // Basic anti-fraud: only consider feedback from verified users
    if (feedback.isVerified) {
      // Advanced anti-fraud: check for suspicious feedback patterns
      if (!isSuspiciousFeedback(feedback.userId, feedback.franchiseId, feedback.timestamp)) {
        if (feedback.rating >= 4) {
          acc += 5;
        } else if (feedback.rating <= 2) {
          acc -= 10;
        }
      } else {
        console.warn(`Suspicious feedback detected and ignored from user ${feedback.userId} for franchise ${feedback.franchiseId}`);
      }
    }
    return acc;
  }, 0);

  score += feedbackScore;

  // Apply a cap or floor to the score
  return Math.max(0, Math.min(100, score));
};

const getCommunityFeedback = (franchiseId) => {
  // In a real application, this would fetch feedback from a database
  // For this example, we return mock data
  console.log(`Fetching community feedback for franchise ID: ${franchiseId}`);
  // Mock data now includes userId and timestamp for anti-fraud
  return [
    { id: 'fb1', userId: 'userA', franchiseId: franchiseId, rating: 5, comment: 'Great place to work!', isVerified: true, timestamp: Date.now() - 86400000 * 30 }, // 30 days ago
    { id: 'fb2', userId: 'userB', franchiseId: franchiseId, rating: 1, comment: 'Never paid on time.', isVerified: true, timestamp: Date.now() - 86400000 * 20 }, // 20 days ago
    { id: 'fb3', userId: 'userC', franchiseId: franchiseId, rating: 4, comment: 'Good management.', isVerified: false, timestamp: Date.now() - 86400000 * 10 }, // Unverified feedback
    { id: 'fb4', userId: 'userD', franchiseId: franchiseId, rating: 5, comment: 'Highly recommend!', isVerified: true, timestamp: Date.now() - 86400000 * 5 }, // 5 days ago
    // Example for suspicious feedback: same user rating many franchises quickly
    { id: 'fb5', userId: 'userE', franchiseId: 'franchiseX', rating: 1, comment: 'Bad experience.', isVerified: true, timestamp: Date.now() - 1000 }, // Recent feedback
    { id: 'fb6', userId: 'userE', franchiseId: 'franchiseY', rating: 1, comment: 'Very bad.', isVerified: true, timestamp: Date.now() - 2000 }, // Even more recent
    { id: 'fb7', userId: 'userE', franchiseId: 'franchiseZ', rating: 1, comment: 'Terrible.', isVerified: true, timestamp: Date.now() - 3000 }, // Most recent
    // Example for a user leaving many low ratings for the same franchise
    { id: 'fb8', userId: 'userF', franchiseId: franchiseId, rating: 1, comment: 'Still bad.', isVerified: true, timestamp: Date.now() - 86400000 * 2 },
    { id: 'fb9', userId: 'userF', franchiseId: franchiseId, rating: 1, comment: 'Still very bad.', isVerified: true, timestamp: Date.now() - 86400000 * 1 },
  ];
};

/**
 * Anti-Fraud Mechanism: Detects suspicious feedback patterns.
 * This is a simplified in-memory check. A real system would use a persistent store
 * and more sophisticated algorithms (e.g., machine learning, graph analysis).
 *
 * Current checks:
 * 1. Too many reviews in a short period by the same user for different franchises.
 * 2. Multiple reviews by the same user for the same franchise within a short period.
 *
 * @param {string} userId - The ID of the user leaving feedback.
 * @param {string} franchiseId - The ID of the franchise being reviewed.
 * @param {number} timestamp - The timestamp of the feedback submission.
 * @returns {boolean} True if the feedback is suspicious, false otherwise.
 */
const isSuspiciousFeedback = (userId, franchiseId, timestamp) => {
  const userActivity = userFeedbackHistory.get(userId) || [];

  const currentTime = Date.now();
  const recentActivityThreshold = 3600000; // 1 hour in milliseconds
  const maxReviewsInTimeframe = 3; // Max reviews by same user in recentActivityThreshold

  // Filter out activities older than the recentActivityThreshold
  const recentUserActivity = userActivity.filter(
    (activity) => currentTime - activity.timestamp < recentActivityThreshold
  );

  // Check 1: Too many reviews in a short period by the same user (across different franchises)
  if (recentUserActivity.length >= maxReviewsInTimeframe) {
    return true;
  }

  // Check 2: Multiple reviews by the same user for the same franchise within a short period
  const sameFranchiseRecentReviews = recentUserActivity.filter(
    (activity) => activity.franchiseId === franchiseId
  );
  if (sameFranchiseRecentReviews.length > 0) { // Allowing only one review per user per franchise within the threshold
    return true;
  }

  // Record the current feedback for future checks
  userActivity.push({ franchiseId, timestamp });
  userFeedbackHistory.set(userId, userActivity);

  return false;
};


export { calculateFranchiseScore, getCommunityFeedback };