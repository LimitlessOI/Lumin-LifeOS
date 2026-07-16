/**
 * SYNOPSIS: Existing code
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 */
// Existing code
export function calculateLeadScore(lead) {
  // Placeholder function to calculate lead score based on lead data
  return lead.interestLevel * 10 + lead.engagementScore;
}

export const leadSegments = [
  {
    id: 1,
    description: 'Highly Engaged',
    minScore: 80,
  },
  {
    id: 2,
    description: 'Moderately Engaged',
    minScore: 50,
  },
  {
    id: 3,
    description: 'Low Engagement',
    minScore: 20,
  },
];

// New code to implement scoring rubric support
export function applyScoringRubric(leadSegments, rubric) {
  return leadSegments.map(segment => {
    const matchingRubric = rubric.find(r => r.description === segment.description);
    return {
      ...segment,
      rubric: matchingRubric ? matchingRubric.criteria : null
    };
  });
}
