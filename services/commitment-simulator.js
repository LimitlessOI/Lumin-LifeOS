/**
 * services/commitment-simulator.js
 *
 * Commitment Simulator — "Before you commit, see the full cost."
 *
 * Success is more often about elimination than addition. Before a person
 * takes on a new commitment, this service calculates their true available
 * capacity, surfaces collision points with existing commitments, and
 * gives them an honest AI assessment of whether this is achievable.
 *
 * Assumes 16 waking hours (960 minutes) per day as the base capacity.
 *
 * Exports: createCommitmentSimulator({ pool, callAI })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const WAKING_MINUTES_PER_DAY = 960;  // 16 hours

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createCommitmentSimulator({ pool, callAI }) {

  // ── Load calculation ──────────────────────────────────────────────────────

  async function fetchCurrentCommitments(userId) {
    try {
      const { rows } = await pool.query(
        `SELECT id, title, description, status,
                COALESCE((metadata->>'minutes_per_day')::numeric, 0) AS minutes_per_day,
                COALESCE((metadata->>'days_per_week')::numeric, 7)   AS days_per_week,
                due_at, created_at
         FROM commitments
         WHERE user_id = $1
           AND status = 'open'
         ORDER BY created_at DESC`,
        [userId],
      );
      return rows;
    } catch {
      return [];
    }
  }

  function computeLoad(commitments) {
    let totalMinutesPerDay = 0;
    for (const c of commitments) {
      const minsPerDay  = parseFloat(c.minutes_per_day) || 0;
      const daysPerWeek = parseFloat(c.days_per_week) || 7;
      // Pro-rate to daily average
      totalMinutesPerDay += minsPerDay * (daysPerWeek / 7);
    }
    return Math.round(totalMinutesPerDay);
  }

  function detectCollisions(existing, newMinutesPerDay, newDaysPerWeek) {
    // Commitments that are already near or above a sustainable daily load
    const collisions = [];
    const newDailyAvg = newMinutesPerDay * (newDaysPerWeek / 7);

    for (const c of existing) {
      const existingMins = parseFloat(c.minutes_per_day) || 0;
      if (existingMins >= 30) {
        collisions.push({
          title:           c.title,
          minutes_per_day: existingMins,
          note:            'High-load commitment — will compete for same energy/time block',
        });
      }
    }

    return collisions;
  }

  // ── AI analysis ───────────────────────────────────────────────────────────

  async function analyzeWithAI({ title, description, newMinutesPerDay, newDaysPerWeek, durationWeeks, currentLoadMinutesPerDay, capacityRemaining, collisionPoints }) {
    if (!callAI) {
      return buildFallbackAnalysis({ newMinutesPerDay, capacityRemaining });
    }

    const prompt =
      `You are an honest capacity advisor. A person wants to add a new commitment. Your job is to give them the honest cost — not cheerleading, not discouragement, just reality.

New commitment: "${title}"
Description: ${description || '(none given)'}
Requires: ${newMinutesPerDay} minutes/day, ${newDaysPerWeek} days/week, for ${durationWeeks} weeks

Their current picture:
- Daily capacity (waking hours): ${WAKING_MINUTES_PER_DAY} minutes
- Already committed: ${currentLoadMinutesPerDay} minutes/day
- Remaining capacity: ${capacityRemaining} minutes/day
- Collision risks: ${collisionPoints.length > 0 ? collisionPoints.map(c => `"${c.title}"`).join(', ') : 'none identified'}

Provide a realistic assessment. Return JSON:
{
  "feasibilityScore": 0-100,
  "honest_cost": "What does this actually cost them in time, energy, and trade-offs? Be specific.",
  "risks": ["risk 1", "risk 2"],
  "recommendation": "What is the honest recommendation? If they should take it on, say so. If they're at capacity and something needs to go first, say that.",
  "alternatives": ["alternative 1", "alternative 2"]
}`;

    try {
      const raw    = await callAI(prompt);
      const text   = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
      return {
        feasibilityScore: typeof parsed.feasibilityScore === 'number' ? parsed.feasibilityScore : 70,
        honest_cost:      parsed.honest_cost      || '',
        risks:            Array.isArray(parsed.risks) ? parsed.risks : [],
        recommendation:   parsed.recommendation   || '',
        alternatives:     Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
      };
    } catch {
      return buildFallbackAnalysis({ newMinutesPerDay, capacityRemaining });
    }
  }

  function buildFallbackAnalysis({ newMinutesPerDay, capacityRemaining }) {
    const feasibilityScore = capacityRemaining >= newMinutesPerDay
      ? Math.min(100, Math.round(70 + (capacityRemaining - newMinutesPerDay) / 10))
      : Math.max(0, Math.round(50 - (newMinutesPerDay - capacityRemaining) / 5));

    return {
      feasibilityScore,
      honest_cost:    `This commitment requires ${newMinutesPerDay} minutes/day. You have approximately ${capacityRemaining} minutes of unallocated daily capacity.`,
      risks:          capacityRemaining < newMinutesPerDay ? ['Current capacity may be insufficient'] : [],
      recommendation: capacityRemaining >= newMinutesPerDay
        ? 'Capacity appears sufficient. Monitor closely.'
        : 'Consider what existing commitment could be reduced or paused first.',
      alternatives:   [],
    };
  }

  // ── Public methods ────────────────────────────────────────────────────────

  /**
   * Simulate adding a new commitment — see the full cost before deciding.
   */
  async function simulate(userId, { title, description, estimatedMinutesPerDay, estimatedDaysPerWeek, durationWeeks }) {
    const existing                = await fetchCurrentCommitments(userId);
    const currentLoadMinutesPerDay = computeLoad(existing);
    const newDailyAvg             = (estimatedMinutesPerDay || 0) * ((estimatedDaysPerWeek || 7) / 7);
    const capacityRemaining        = Math.max(0, WAKING_MINUTES_PER_DAY - currentLoadMinutesPerDay);
    const collisionPoints          = detectCollisions(existing, estimatedMinutesPerDay || 0, estimatedDaysPerWeek || 7);

    const aiAnalysis = await analyzeWithAI({
      title:                    title || 'New commitment',
      description:              description || '',
      newMinutesPerDay:         estimatedMinutesPerDay || 0,
      newDaysPerWeek:           estimatedDaysPerWeek || 7,
      durationWeeks:            durationWeeks || 12,
      currentLoadMinutesPerDay,
      capacityRemaining,
      collisionPoints,
    });

    return {
      feasibilityScore:          aiAnalysis.feasibilityScore,
      currentLoadMinutesPerDay,
      capacityRemaining,
      newCommitmentDailyAvg:     Math.round(newDailyAvg),
      remainingAfterAdding:      Math.max(0, capacityRemaining - newDailyAvg),
      collisionPoints,
      aiAnalysis: {
        honest_cost:   aiAnalysis.honest_cost,
        risks:         aiAnalysis.risks,
        recommendation: aiAnalysis.recommendation,
        alternatives:  aiAnalysis.alternatives,
      },
    };
  }

  /**
   * Create a commitment with a simulation snapshot attached.
   */
  async function createCommitment(userId, { title, description, minutesPerDay, daysPerWeek, startDate, endDate, purpose }) {
    // Run simulation first so the snapshot is attached to the commitment
    const sim = await simulate(userId, {
      title,
      description,
      estimatedMinutesPerDay: minutesPerDay || 0,
      estimatedDaysPerWeek:   daysPerWeek || 7,
      durationWeeks:          endDate ? Math.ceil((new Date(endDate) - new Date(startDate || Date.now())) / (7 * 24 * 60 * 60 * 1000)) : 12,
    });

    const metadata = {
      minutes_per_day:   minutesPerDay   || 0,
      days_per_week:     daysPerWeek     || 7,
      purpose:           purpose         || null,
      simulation_snapshot: {
        feasibility_score:           sim.feasibilityScore,
        capacity_remaining_at_create: sim.capacityRemaining,
        collision_count:             sim.collisionPoints.length,
      },
    };

    const { rows } = await pool.query(
      `INSERT INTO commitments
         (user_id, title, description, due_at, status, metadata)
       VALUES ($1, $2, $3, $4, 'open', $5)
       RETURNING *`,
      [userId, title, description || null, endDate || null, JSON.stringify(metadata)],
    );

    return { commitment: rows[0], simulation: sim };
  }

  /**
   * Get a summary of the user's current commitment load.
   */
  async function getLoadSummary(userId) {
    const existing                = await fetchCurrentCommitments(userId);
    const currentLoadMinutesPerDay = computeLoad(existing);
    const capacityRemaining        = Math.max(0, WAKING_MINUTES_PER_DAY - currentLoadMinutesPerDay);
    const utilizationPct           = Math.round((currentLoadMinutesPerDay / WAKING_MINUTES_PER_DAY) * 100);

    const top5 = [...existing]
      .sort((a, b) => parseFloat(b.minutes_per_day) - parseFloat(a.minutes_per_day))
      .slice(0, 5)
      .map(c => ({
        id:             c.id,
        title:          c.title,
        minutes_per_day: parseFloat(c.minutes_per_day) || 0,
        days_per_week:  parseFloat(c.days_per_week) || 7,
      }));

    return {
      total_commitments:         existing.length,
      currentLoadMinutesPerDay,
      capacityRemaining,
      utilizationPct,
      waking_minutes_per_day:    WAKING_MINUTES_PER_DAY,
      top_commitments_by_load:   top5,
      status: utilizationPct >= 90 ? 'overloaded' : utilizationPct >= 70 ? 'high' : utilizationPct >= 40 ? 'moderate' : 'available',
    };
  }

  /**
   * Quick check: can they add this many minutes/day without breaking something?
   */
  async function checkBeforeAdding(userId, proposedMinutesPerDay) {
    const load = await getLoadSummary(userId);
    const canTakeOn = load.capacityRemaining >= proposedMinutesPerDay;
    return {
      canTakeOn,
      capacityRemaining: load.capacityRemaining,
      proposedMinutesPerDay,
      remainingAfterAdding: Math.max(0, load.capacityRemaining - proposedMinutesPerDay),
      utilizationAfterAdding: Math.round(
        ((load.currentLoadMinutesPerDay + proposedMinutesPerDay) / WAKING_MINUTES_PER_DAY) * 100
      ),
      recommendation: canTakeOn
        ? 'Capacity available.'
        : `Over capacity by ${Math.round(proposedMinutesPerDay - load.capacityRemaining)} min/day. Consider what to pause or reduce first.`,
    };
  }

  return {
    simulate,
    createCommitment,
    getLoadSummary,
    checkBeforeAdding,
  };
}
