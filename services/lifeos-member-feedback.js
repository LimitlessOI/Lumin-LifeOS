/**
 * SYNOPSIS: Exports processFeedback — services/lifeos-member-feedback.js.
 */
export function processFeedback(feedback) {
  return {
    status: 'queued',
    queue: 'founder-review',
    receivedAt: new Date().toISOString(),
    feedback,
  };
}