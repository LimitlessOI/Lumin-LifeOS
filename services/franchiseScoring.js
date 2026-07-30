/**
 * SYNOPSIS: Service module — FranchiseScoring.
 */

// Simple in-memory store for user feedback history to detect patterns
const userFeedbackHistory = new Map(); // Map<userId, Array<{franchiseId: string, timestamp: number, rating: number}>>
const franchiseRatingHistory = new Map(); // Map<franchiseId, Array<{userId: string, timestamp: number, rating: number}>>
const userFranchiseSpecificAverage = new Map(); // Map<userId_franchiseId, {sum: number, count: number}>
const franchiseOverallAverage = new Map(); // Map<franchiseId, {sum: number, count: number}>

// Configuration for anti-abuse thresholds
const ANTI_ABUSE_CONFIG = {
  RECENT_ACTIVITY_THRESHOLD_MS: 3600000, // 1 hour
  MAX_REVIEWS_PER_USER_RECENT: 3, // Max reviews by same user in RECENT_ACTIVITY_THRESHOLD_MS across different franchises
  MAX_REVIEWS_PER_USER_PER_FRANCHISE_RECENT: 1, // Max reviews by same user for same franchise in RECENT_ACTIVITY_THRESHOLD_MS
  MIN_TIME_BETWEEN_REVIEWS_SAME_FRANCHISE_MS: 86400000, // 24 hours
  RAPID_NEGATIVE_REVIEW_COUNT: 3, // Number of consecutive low ratings to flag
  RAPID_NEGATIVE_REVIEW_TIME_MS: 86400000 * 7, // Within 7 days
  LOW_RATING_THRESHOLD: 2, // Rating considered 'low'
  HIGH_RATING_THRESHOLD: 4, // Rating considered 'high'
  ANOMALY_DETECTION_WINDOW_MS: 86400000 * 30, // 30 days for average rating comparison
  ANOMALY_RATING_DEVIATION_FACTOR: 0.5, // How much a new rating can deviate from the average to be suspicious
  // New: Thresholds for flagging a user based on their overall rating behavior
  USER_AVERAGE_RATING_DEVIATION_THRESHOLD: 1.0, // How much a user's average rating for a franchise can deviate from their overall average
  FRANCHISE_AVERAGE_RATING_DEVIATION_THRESHOLD: 1.0, // How much a user's rating can deviate from the franchise's overall average
  MIN_REVIEWS_FOR_AVERAGE_CALC: 3, // Minimum reviews needed to calculate a meaningful average
  COORDINATED_ATTACK_THRESHOLD_USERS: 3, // Min unique users for a potential coordinated attack
  COORDINATED_ATTACK_THRESHOLD_REVIEWS: 5, // Min reviews for a potential coordinated attack
  COORDINATED_ATTACK_TIME_WINDOW_MS: 86400000 * 3, // 3 days for coordinated attack detection
  SUSPICIOUS_RATING_WEIGHT_REDUCTION: 0.5, // Reduce weight of suspicious ratings
};

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
  // New: Workplace Safety Compliance (e.g., audits passed)
  if (employerData.safetyComplianceAuditsPassed > 0) {
    score += Math.min(10, employerData.safetyComplianceAuditsPassed * 2); // Max +10 for safety
  }
  // New: Diversity and Inclusion initiatives
  if (employerData.hasDiversityInitiatives) {
    score += 5;
  }

  // Community Feedback Integration with Anti-Fraud
  const feedbackScore = feedbackData.reduce((acc, feedback) => {
    // Basic anti-fraud: only consider feedback from verified users
    if (feedback.isVerified) {
      const isSus = isSuspiciousFeedback(feedback.userId, feedback.franchiseId, feedback.timestamp, feedback.rating);
      if (!isSus) {
        if (feedback.rating >= ANTI_ABUSE_CONFIG.HIGH_RATING_THRESHOLD) {
          acc += 5;
        } else if (feedback.rating <= ANTI_ABUSE_CONFIG.LOW_RATING_THRESHOLD) {
          acc -= 10;
        }
      } else {
        console.warn(`Suspicious feedback detected from user ${feedback.userId} for franchise ${feedback.franchiseId} (rating: ${feedback.rating}). Applying reduced weight.`);
        // Apply reduced weight for suspicious feedback
        if (feedback.rating >= ANTI_ABUSE_CONFIG.HIGH_RATING_THRESHOLD) {
          acc += (5 * ANTI_ABUSE_CONFIG.SUSPICIOUS_RATING_WEIGHT_REDUCTION);
        } else if (feedback.rating <= ANTI_ABUSE_CONFIG.LOW_RATING_THRESHOLD) {
          acc -= (10 * ANTI_ABUSE_CONFIG.SUSPICIOUS_RATING_WEIGHT_REDUCTION);
        }
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
  // Mock data now includes userId, timestamp, and rating for anti-fraud
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
    { id: 'fb8', userId: 'userF', franchiseId: franchiseId, rating: 1, comment: 'Still bad.', isVerified: true, timestamp: Date.now() - ANTI_ABUSE_CONFIG.MIN_TIME_BETWEEN_REVIEWS_SAME_FRANCHISE_MS * 2 },
    { id: 'fb9', userId: 'userF', franchiseId: franchiseId, rating: 1, comment: 'Still very bad.', isVerified: true, timestamp: Date.now() - ANTI_ABUSE_CONFIG.MIN_TIME_BETWEEN_REVIEWS_SAME_FRANCHISE_MS * 0.5 }, // This one should be suspicious
    // Example for a user leaving an anomalous rating
    { id: 'fb10', userId: 'userG', franchiseId: franchiseId, rating: 5, comment: 'Surprisingly good!', isVerified: true, timestamp: Date.now() - 86400000 * 15 },
    { id: 'fb11', userId: 'userG', franchiseId: franchiseId, rating: 1, comment: 'Awful experience.', isVerified: true, timestamp: Date.now() - 86400000 * 1 }, // Potentially anomalous if userG's average is high
    // Example for coordinated attack (multiple users, low ratings, short time)
    { id: 'fb12', userId: 'userH', franchiseId: franchiseId, rating: 1, comment: 'Worst ever.', isVerified: true, timestamp: Date.now() - 86400000 * 0.5 },
    { id: 'fb13', userId: 'userI', franchiseId: franchiseId, rating: 1, comment: 'Avoid!', isVerified: true, timestamp: Date.now() - 86400000 * 0.6 },
    { id: 'fb14', userId: 'userJ', franchiseId: franchiseId, rating: 1, comment: 'Terrible management.', isVerified: true, timestamp: Date.now() - 86400000 * 0.7 },
    { id: 'fb15', userId: 'userK', franchiseId: franchiseId, rating: 1, comment: 'Unfair practices.', isVerified: true, timestamp: Date.now() - 86400000 * 0.8 },
    { id: 'fb16', userId: 'userL', franchiseId: franchiseId, rating: 1, comment: 'Absolutely awful.', isVerified: true, timestamp: Date.now() - 86400000 * 0.9 },
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
 * 3. Rapid succession of low ratings for the same franchise by different users (potential coordinated attack).
 * 4. Anomalous ratings (e.g., a user's rating is significantly different from their past ratings for the same franchise, or from the overall franchise average).
 * 5. Coordinated attack detection: multiple new users leaving low ratings for the same franchise in a short window.
 *
 * @param {string} userId - The ID of the user leaving feedback.
 * @param {string} franchiseId - The ID of the franchise being reviewed.
 * @param {number} timestamp - The timestamp of the feedback submission.
 * @param {number} rating - The rating provided in the feedback.
 * @returns {boolean} True if the feedback is suspicious, false otherwise.
 */
const isSuspiciousFeedback = (userId, franchiseId, timestamp, rating) => {
  const currentTime = Date.now();

  // --- User-centric checks ---
  const userActivity = userFeedbackHistory.get(userId) || [];

  // Filter out activities older than the recentActivityThreshold
  const recentUserActivity = userActivity.filter(
    (activity) => currentTime - activity.timestamp < ANTI_ABUSE_CONFIG.RECENT_ACTIVITY_THRESHOLD_MS
  );

  // Check 1: Too many reviews in a short period by the same user (across different franchises)
  // Ensure we count unique franchises for this check
  const uniqueFranchisesReviewedRecently = new Set(recentUserActivity.map(activity => activity.franchiseId));
  if (uniqueFranchisesReviewedRecently.size >= ANTI_ABUSE_CONFIG.MAX_REVIEWS_PER_USER_RECENT) {
    console.log(`[Anti-Abuse] User ${userId} flagged: Too many recent reviews across different franchises.`);
    return true;
  }

  // Check 2: Multiple reviews by the same user for the same franchise within a short period
  const sameFranchiseRecentReviews = recentUserActivity.filter(
    (activity) => activity.franchiseId === franchiseId
  );
  if (sameFranchiseRecentReviews.length >= ANTI_ABUSE_CONFIG.MAX_REVIEWS_PER_USER_PER_FRANCHISE_RECENT) {
    console.log(`[Anti-Abuse] User ${userId} flagged: Multiple recent reviews for franchise ${franchiseId}.`);
    return true;
  }
  // More granular check: enforce minimum time between reviews for the same franchise
  const lastReviewForFranchise = userActivity
    .filter(activity => activity.franchiseId === franchiseId)
    .sort((a, b) => b.timestamp - a.timestamp)[0]; // Get most recent
  if (lastReviewForFranchise && (timestamp - lastReviewForFranchise.timestamp < ANTI_ABUSE_CONFIG.MIN_TIME_BETWEEN_REVIEWS_SAME_FRANCHISE_MS)) {
    console.log(`[Anti-Abuse] User ${userId} flagged: Review for franchise ${franchiseId} too soon after previous one.`);
    return true;
  }

  // Check 4 (part 1): Anomalous ratings for the user (compared to their past ratings for this specific franchise)
  const userFranchiseKey = `${userId}_${franchiseId}`;
  const userFranchiseAvgData = userFranchiseSpecificAverage.get(userFranchiseKey) || { sum: 0, count: 0 };

  if (userFranchiseAvgData.count >= ANTI_ABUSE_CONFIG.MIN_REVIEWS_FOR_AVERAGE_CALC) {
    const averageRating = userFranchiseAvgData.sum / userFranchiseAvgData.count;
    if (Math.abs(rating - averageRating) > ANTI_ABUSE_CONFIG.USER_AVERAGE_RATING_DEVIATION_THRESHOLD) {
      console.log(`[Anti-Abuse] User ${userId} flagged: Anomalous rating for franchise ${franchiseId} compared to user's past ratings. Current: ${rating}, Avg: ${averageRating.toFixed(2)}`);
      // This could be a legitimate change of opinion, so maybe a soft flag or higher threshold needed
      // For now, we'll make it suspicious
      return true;
    }
  }

  // Update user-franchise specific average
  userFranchiseAvgData.sum += rating;
  userFranchiseAvgData.count += 1;
  userFranchiseSpecificAverage.set(userFranchiseKey, userFranchiseAvgData);

  // Record the current feedback for future user-centric checks
  userActivity.push({ franchiseId, timestamp, rating });
  userFeedbackHistory.set(userId, userActivity);

  // --- Franchise-centric checks ---
  const franchiseActivity = franchiseRatingHistory.get(franchiseId) || [];

  // Filter activities within the anomaly detection window
  const recentFranchiseActivity = franchiseActivity.filter(
    (activity) => currentTime - activity.timestamp < ANTI_ABUSE_CONFIG.ANOMALY_DETECTION_WINDOW_MS
  );

  // Check 3: Rapid succession of low ratings for the same franchise by different users
  const recentLowRatings = recentFranchiseActivity.filter(
    (activity) => activity.rating <= ANTI_ABUSE_CONFIG.LOW_RATING_THRESHOLD &&
                  (currentTime - activity.timestamp < ANTI_ABUSE_CONFIG.RAPID_NEGATIVE_REVIEW_TIME_MS)
  );
  if (recentLowRatings.length >= ANTI_ABUSE_CONFIG.RAPID_NEGATIVE_REVIEW_COUNT) {
    // Check if these low ratings are from different users to avoid flagging one user's legitimate negative experience
    const uniqueUsersForLowRatings = new Set(recentLowRatings.map(activity => activity.userId));
    if (uniqueUsersForLowRatings.size >= ANTI_ABUSE_CONFIG.RAPID_NEGATIVE_REVIEW_COUNT) {
      console.log(`[Anti-Abuse] Franchise ${franchiseId} flagged: Rapid succession of low ratings from multiple users.`);
      return true;
    }
  }

  // Check 4 (part 2): Anomalous ratings for the franchise (compared to its overall average)
  const franchiseAvgData = franchiseOverallAverage.get(franchiseId) || { sum: 0, count: 0 };
  if (franchiseAvgData.count >= ANTI_ABUSE_CONFIG.MIN_REVIEWS_FOR_AVERAGE_CALC) {
    const averageFranchiseRating = franchiseAvgData.sum / franchiseAvgData.count;
    if (Math.abs(rating - averageFranchiseRating) > ANTI_ABUSE_CONFIG.FRANCHISE_AVERAGE_RATING_DEVIATION_THRESHOLD) {
      console.log(`[Anti-Abuse] Franchise ${franchiseId} flagged: New rating ${rating} is anomalous compared to franchise average ${averageFranchiseRating.toFixed(2)}.`);
      // This is also a soft flag, potentially legitimate, but worth scrutiny.
      return true;
    }
  }

  // Update franchise overall average
  franchiseAvgData.sum += rating;
  franchiseAvgData.count += 1;
  franchiseOverallAverage.set(franchiseId, franchiseAvgData);

  // New Check 5: Coordinated attack detection (multiple new users leaving low ratings for the same franchise in a short window)
  const recentLowRatingsForCoordinatedAttack = franchiseActivity.filter(
    (activity) => activity.rating <= ANTI_ABUSE_CONFIG.LOW_RATING_THRESHOLD &&
                  (currentTime - activity.timestamp < ANTI_ABUSE_CONFIG.COORDINATED_ATTACK_TIME_WINDOW_MS)
  );

  if (recentLowRatingsForCoordinatedAttack.length >= ANTI_ABUSE_CONFIG.COORDINATED_ATTACK_THRESHOLD_REVIEWS) {
    const uniqueUsersInAttackWindow = new Set(recentLowRatingsForCoordinatedAttack.map(activity => activity.userId));
    if (uniqueUsersInAttackWindow.size >= ANTI_ABUSE_CONFIG.COORDINATED_ATTACK_THRESHOLD_USERS) {
      console.log(`[Anti-Abuse] Franchise ${franchiseId} flagged: Potential coordinated attack detected with ${uniqueUsersInAttackWindow.size} users leaving low ratings.`);
      return true;
    }
  }

  // Record the current feedback for future franchise-centric checks
  franchiseActivity.push({ userId, timestamp, rating });
  franchiseRatingHistory.set(franchiseId, franchiseActivity);

  return false;
};


export { calculateFranchiseScore, getCommunityFeedback };