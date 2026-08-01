/**
 * SYNOPSIS: Seeds initial commitments into the database.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export async function seedCommitments(deps, payload) {
  const { pool, logger } = deps;
  try {
    const commitmentsToSeed = [
      { id: 26, mission_id: 'MISSION-0001', owner: 'Adam', status: 'active', title: 'Review Q3 Financials', description: 'Analyze the Q3 financial report for discrepancies and opportunities.', due_at: '2024-10-15', urgency: 5, importance: 5, energy_cost: 3, money_impact: 10000, relationship_impact: 2, opportunity_cost_note: 'Missing key insights' },
      { id: 27, mission_id: 'MISSION-0001', owner: 'Adam', status: 'active', title: 'Prepare Board Meeting Deck', description: 'Create a compelling presentation for the upcoming board meeting.', due_at: '2024-10-20', urgency: 4, importance: 5, energy_cost: 4, money_impact: 5000, relationship_impact: 3, opportunity_cost_note: 'Poor board impression' },
      { id: 28, mission_id: 'MISSION-0001', owner: 'Adam', status: 'active', title: 'Onboard New Sales Lead', description: 'Facilitate the onboarding process for the new sales lead, ensuring they have all resources.', due_at: '2024-10-10', urgency: 3, importance: 4, energy_cost: 2, money_impact: 2000, relationship_impact: 4, opportunity_cost_note: 'Slow ramp-up for lead' },
      { id: 29, mission_id: 'MISSION-0001', owner: 'Adam', status: 'active', title: 'Optimize Marketing Funnel', description: 'Work with the marketing team to identify and implement funnel optimizations.', due_at: '2024-10-25', urgency: 4, importance: 4, energy_cost: 3, money_impact: 8000, relationship_impact: 2, opportunity_cost_note: 'Lost revenue opportunities' },
      { id: 30, mission_id: 'MISSION-0001', owner: 'Sherry', status: 'active', title: 'Develop Q4 Product Roadmap', description: 'Outline key features and initiatives for the product roadmap in Q4.', due_at: '2024-10-18', urgency: 5, importance: 5, energy_cost: 4, money_impact: 15000, relationship_impact: 3, opportunity_cost_note: 'Delayed product launches' },
      { id: 31, mission_id: 'MISSION-0001', owner: 'Sherry', status: 'active', title: 'Conduct User Research Interviews', description: 'Interview 5 key users to gather feedback on new features.', due_at: '2024-10-12', urgency: 3, importance: 4, energy_cost: 2, money_impact: 1000, relationship_impact: 4, opportunity_cost_note: 'Misguided feature development' },
      { id: 32, mission_id: 'MISSION-0001', owner: 'Sherry', status: 'active', title: 'Refine Design System Documentation', description: 'Update and expand the internal design system documentation for consistency.', due_at: '2024-10-30', urgency: 2, importance: 3, energy_cost: 2, money_impact: 500, relationship_impact: 1, opportunity_cost_note: 'Inconsistent UI/UX' },
      { id: 33, mission_id: 'MISSION-0001', owner: 'Sherry', status: 'pending approval', title: 'Evaluate New AI Tools', description: 'Research and evaluate potential new AI tools to integrate into the platform.', due_at: '2024-11-05', urgency: 3, importance: 4, energy_cost: 3, money_impact: 3000, relationship_impact: 2, approval_required: true, opportunity_cost_note: 'Missed competitive advantage' }
    ];

    const insertedCommitments = [];
    for (const commitment of commitmentsToSeed) {
      const { rows } = await pool.query(
        `INSERT INTO commitments (id, mission_id, owner, status, title, description, due_at, urgency, importance, energy_cost, money_impact, relationship_impact, approval_required, opportunity_cost_note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
            mission_id = EXCLUDED.mission_id,
            owner = EXCLUDED.owner,
            status = EXCLUDED.status,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            due_at = EXCLUDED.due_at,
            urgency = EXCLUDED.urgency,
            importance = EXCLUDED.importance,
            energy_cost = EXCLUDED.energy_cost,
            money_impact = EXCLUDED.money_impact,
            relationship_impact = EXCLUDED.relationship_impact,
            approval_required = EXCLUDED.approval_required,
            opportunity_cost_note = EXCLUDED.opportunity_cost_note
         RETURNING *`,
        [
          commitment.id,
          commitment.mission_id,
          commitment.owner,
          commitment.status,
          commitment.title,
          commitment.description,
          commitment.due_at,
          commitment.urgency,
          commitment.importance,
          commitment.energy_cost,
          commitment.money_impact,
          commitment.relationship_impact,
          commitment.approval_required || false,
          commitment.opportunity_cost_note
        ]
      );
      insertedCommitments.push(rows[0]);
    }
    logger.info(`Seeded ${insertedCommitments.length} commitments.`);
    return insertedCommitments;
  } catch (error) {
    logger.error({ error }, 'Error in seedCommitments');
    throw new Error('Failed to seed commitments');
  }
}