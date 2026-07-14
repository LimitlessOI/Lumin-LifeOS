/**
 * SYNOPSIS: Exports processFeedback — services/lifeos-member-feedback.js.
 */
export function processFeedback(feedback) {
  // Queue for founder review
  return {
    queuedForFounderReview: true,
    feedback
  };
}