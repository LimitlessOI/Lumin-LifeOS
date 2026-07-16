/**
 * SYNOPSIS: Exports addInterview — services/userInterviewEnhancement.js.
 * @ssot docs/products/teacher-os/PRODUCT_HOME.md
 */
const userInterviews = [];

export function addInterview(interview) {
  userInterviews.push(interview);
  return userInterviews;
}

export { userInterviews };
