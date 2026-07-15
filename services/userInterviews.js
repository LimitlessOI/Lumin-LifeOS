/**
 * SYNOPSIS: Exports summarizeInterviews — services/userInterviews.js.
 */
const teacherFeedbacks = [
  "The curriculum is comprehensive and well-structured, but more practical examples are needed.",
  "Students are engaged, but additional interactive sessions could enhance learning.",
  "The pace of the course is appropriate, but some students might benefit from supplementary material.",
  "Assessment methods are effective, but more frequent feedback would be beneficial.",
  "Resources provided are excellent, though expanding the digital library could be helpful."
];

export function summarizeInterviews(feedbacks = teacherFeedbacks) {
  const summary = {
    positive: [],
    improvements: []
  };

  feedbacks.forEach(feedback => {
    if (feedback.includes("comprehensive") || feedback.includes("engaged") || feedback.includes("appropriate") || feedback.includes("effective") || feedback.includes("excellent")) {
      summary.positive.push(feedback);
    } else {
      summary.improvements.push(feedback);
    }
  });

  return summary;
}