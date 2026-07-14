/**
 * SYNOPSIS: Exports processFeedback — services/lifeos-member-feedback.js.
 */
export function processFeedback(feedback) {
  return {
    queued: true,
    status: "queued_for_founder_review",
    feedback,
    reviewedBy: null,
    reviewedAt: null
  };
}