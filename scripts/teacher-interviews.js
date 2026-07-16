/**
 * SYNOPSIS: Insights from teacher interviews
 */
// scripts/teacher-interviews.js

/**
 * Insights from teacher interviews
 * This module compiles insights from 5 teacher interviews focusing on student-facing platform needs.
 */

const teacherInterviews = [
  {
    name: "Teacher A",
    insights: [
      "Students need more interactive content.",
      "The platform should include real-time feedback."
    ]
  },
  {
    name: "Teacher B",
    insights: [
      "Integration with other learning tools is crucial.",
      "Better accessibility features are needed."
    ]
  },
  {
    name: "Teacher C",
    insights: [
      "Students appreciate gamified learning experiences.",
      "Enhanced data privacy is important."
    ]
  },
  {
    name: "Teacher D",
    insights: [
      "More customizable interfaces for diverse learning needs.",
      "Improved mobile compatibility."
    ]
  },
  {
    name: "Teacher E",
    insights: [
      "The platform should support collaborative projects.",
      "Regular updates to content keep students engaged."
    ]
  }
];

/**
 * Compile and retrieve insights from teacher interviews.
 * @returns {Array} Array of insights compiled from teacher interviews.
 */
export function getTeacherInsights() {
  return teacherInterviews.flatMap(interview => interview.insights);
}
