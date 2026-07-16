/**
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Exports scoreLeads — services/leadScoringAlgorithm.js.
 */
export function scoreLeads(leads) {
  return leads.map(lead => ({
    ...lead,
    score: calculateLeadScore(lead)
  }));
}

export function calculateLeadScore(lead) {
  let score = 0;

  // Example scoring rubric
  // Age: +5 points for 18-25, +10 points for 26-35, +5 points for 36-45
  if (lead.age >= 18 && lead.age <= 25) {
    score += 5;
  } else if (lead.age >= 26 && lead.age <= 35) {
    score += 10;
  } else if (lead.age >= 36 && lead.age <= 45) {
    score += 5;
  }

  // Income: +10 points for income > $50,000
  if (lead.income > 50000) {
    score += 10;
  }

  // Employment Status: +15 points if employed
  if (lead.employmentStatus === 'employed') {
    score += 15;
  }

  // Add more criteria as needed
  return score;
}
