/**
 * SYNOPSIS: Exports getParentInsights — scripts/parent-interviews.js.
 */
const parentInterviews = [
  {
    id: 1,
    insights: [
      "Desire for more flexible school hours.",
      "Concern about safety measures in schools.",
    ],
  },
  {
    id: 2,
    insights: [
      "Need for more extracurricular activities.",
      "Interest in personalized learning plans.",
    ],
  },
  {
    id: 3,
    insights: [
      "Emphasis on digital literacy.",
      "Require better communication from teachers.",
    ],
  },
  {
    id: 4,
    insights: [
      "More focus on mental health support.",
      "Need clearer academic expectations.",
    ],
  },
  {
    id: 5,
    insights: [
      "Desire for smaller class sizes.",
      "Support for hybrid learning models.",
    ],
  },
  {
    id: 6,
    insights: [
      "Request for more parent-teacher interactions.",
      "Interest in community involvement.",
    ],
  },
  {
    id: 7,
    insights: [
      "Need for a more inclusive curriculum.",
      "Desire for better technology infrastructure.",
    ],
  },
  {
    id: 8,
    insights: [
      "Focus on diversity and inclusion.",
      "Request for better nutrition programs.",
    ],
  },
  {
    id: 9,
    insights: [
      "Interest in project-based learning.",
      "Need for alternative assessment methods.",
    ],
  },
  {
    id: 10,
    insights: [
      "Desire for more art and music programs.",
      "Emphasis on life skills education.",
    ],
  },
];

export function getParentInsights() {
  /* Insights from parent interviews */
  return parentInterviews.map(interview => interview.insights).flat();
}