/**
 * SYNOPSIS: Calculates a priority score for a single prospect based on defined criteria.
 * Calculates a priority score for a single prospect based on defined criteria.
 * @param {object} prospect - The prospect object, typically from the `prospect_sites` table.
 * @returns {number} The priority score (0-100).
 */
export function scoreProspect(prospect) {
  let priorityScore = 0;

  // 1. Quality Opportunity (40%)
  // Lower quality score of the generated* site means more opportunity for improvement.
  // qualityReport.scorePct is 0-100, higher is better. We want lower to be better for opportunity.
  const qualityReport = prospect.metadata?.qualityReport;
  const qualityScorePct = qualityReport?.scorePct;
  let qualityOpportunityPoints = 0;
  if (typeof qualityScorePct === 'number') {
    // Invert the score: 100 - scorePct means a lower quality site gets a higher opportunity score.
    qualityOpportunityPoints = (100 - qualityScorePct) * 0.4;
  } else {
    // If quality score is unknown, assume average opportunity for this component.
    qualityOpportunityPoints = 50 * 0.4; // 20 points
  }
  priorityScore += qualityOpportunityPoints;

  // 2. Business Value (30%)
  // Wellness/spa/fitness = highest affiliate value.
  const industry = prospect.industry?.toLowerCase() || prospect.metadata?.businessInfo?.industry?.toLowerCase();
  const posPartner = prospect.pos_partner?.toLowerCase();
  const highValueIndustries = [
    'wellness', 'health', 'spa', 'yoga', 'fitness', 'chiropractic', 'dentist',
    'medspa', 'massage', 'acupuncture', 'physical therapy', 'salon'
  ];
  let businessValuePoints = 0;
  if (
    (posPartner && ['jane', 'mindbody', 'square'].includes(posPartner)) ||
    (industry && highValueIndustries.some(val => industry.includes(val)))
  ) {
    businessValuePoints = 30; // Max points for high value
  } else {
    businessValuePoints = 15; // Medium points for other service businesses
  }
  priorityScore += businessValuePoints;

  // 3. Contact Completeness (20%)
  // Phone + email = easier to reach.
  const hasEmail = !!prospect.contact_email;
  const hasPhone = !!prospect.metadata?.businessInfo?.phone;
  let contactCompletenessPoints = 0;
  if (hasEmail && hasPhone) {
    contactCompletenessPoints = 20;
  } else if (hasEmail || hasPhone) {
    contactCompletenessPoints = 10;
  } else {
    contactCompletenessPoints = 0;
  }
  priorityScore += contactCompletenessPoints;

  // 4. Recency (10%)
  // Avoid re-contacting too soon.
  const lastContactedAt = prospect.last_contacted_at ? new Date(prospect.last_contacted_at) : null;
  const now = new Date();
  let recencyPoints = 0;
  if (!lastContactedAt) {
    recencyPoints = 10; // Never contacted, high priority
  } else {
    const daysSinceLastContact = (now.getTime() - lastContactedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastContact > 90) {
      recencyPoints = 10; // Contacted long ago, high priority
    } else if (daysSinceLastContact > 30) {
      recencyPoints = 5; // Contacted somewhat recently
    } else {
      recencyPoints = 0; // Contacted recently, low priority
    }
  }
  priorityScore += recencyPoints;

  // Ensure score is within 0-100 range
  return Math.min(100, Math.max(0, Math.round(priorityScore)));
}

/**
 * Determines the recommended action for a prospect based on their status and priority score.
 * @param {object} prospect - The prospect object, including `priority_score` (from `scoreProspect`).
 * @returns {'send_outreach'|'follow_up'|'skip'|'high_priority'} The recommended action.
 */
export function getRecommendedAction(prospect) {
  const status = prospect.status?.toLowerCase();
  const followUpCount = prospect.follow_up_count || 0;
  const priorityScore = prospect.priority_score; // Assumes scoreProspect has been run

  if (['converted', 'lost', 'expired', 'replied'].includes(status)) {
    return 'skip'; // Already converted, lost, expired, or engaged
  }

  if (status === 'qa_hold') {
    return 'skip'; // Needs manual review before any action
  }

  if (['sent', 'viewed'].includes(status)) {
    if (followUpCount < 3) { // Max 3 follow-ups (initial + 2)
      return 'follow_up';
    }
    return 'skip'; // Max follow-ups reached
  }

  // For 'built' or new prospects
  if (priorityScore >= 85) { // High priority threshold
    return 'high_priority';
  }

  return 'send_outreach';
}

/**
 * Ranks a list of prospects by their conversion likelihood and ROI.
 * Adds `priority_score` and `recommended_action` to each prospect.
 * @param {Array<object>} prospects - An array of prospect objects.
 * @returns {Array<object>} The prospects array, sorted descending by `priority_score`, with added fields.
 */
export function rankProspects(prospects) {
  if (!Array.isArray(prospects)) {
    return [];
  }

  const ranked = prospects.map(prospect => {
    const priority_score = scoreProspect(prospect);
    const prospectWithScore = { ...prospect, priority_score };
    const recommended_action = getRecommendedAction(prospectWithScore);
    return { ...prospectWithScore, recommended_action };
  });

  // Sort in descending order by priority_score
  ranked.sort((a, b) => b.priority_score - a.priority_score);

  return ranked;
}