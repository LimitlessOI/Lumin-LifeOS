/**
 * SYNOPSIS: Exports processFeedback — services/lifeos-member-feedback.js.
 */
export function processFeedback(feedback) {
  return {
    queuedForFounderReview: true,
    feedback,
    processedAt: new Date().toISOString()
  };
}