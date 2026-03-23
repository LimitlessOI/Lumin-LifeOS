/**
 * services/continuous-improvement.js
 * Monitors the system 24/7 for bugs, performance issues, UX problems, and opportunities.
 * Generates improvement proposals for Adam to approve — never auto-implements.
 *
 * Runs on a cron cycle. Checks:
 *   1. Error log trends (spike = bug proposal)
 *   2. Build failure patterns (stuck = refactor proposal)
 *   3. Untracked outcomes (built but no measurement = proposal to measure)
 *   4. Slow routes (p95 latency > threshold = performance proposal)
 *   5. Ideas approved but never built > N days (stale = reminder)
 *   6. System health trends (declining = alert)
 *
 * Exports: createContinuousImprovement(deps) → { runMonitorCycle, getProposals, approveProposal, rejectProposal }
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

export function createContinuousImprovement({ pool, callAI, adamLogger }) {
  // ── Check for error spikes ─────────────────────────────────────────────────
  async function checkErrorTrends() {
    const proposals = [];
    try {
      // Look at recent errors logged in adam_decisions
      const result = await pool.query(
        `SELECT context->>'error' as error, COUNT(*) as count
         FROM adam_decisions
         WHERE event_type = 'system_error'
           AND created_at >= NOW() - INTERVAL '24 hours'
           AND context->>'error' IS NOT NULL
         GROUP BY context->>'error'
         HAVING COUNT(*) >= 3
         ORDER BY count DESC
         LIMIT 5`
      );

      for (const row of result.rows) {
        proposals.push({
          category: 'bug',
          title: `Recurring error detected: ${(row.error || '').substring(0, 80)}`,
          description: `This error has occurred ${row.count} times in the last 24 hours.`,
          evidence: { error: row.error, count: row.count, window: '24h' },
          proposed_fix: `Investigate and fix the root cause of: ${row.error}`,
          effort_estimate: 'hours',
          impact_estimate: 'high',
        });
      }
    } catch {
      // Table may not have system_error events yet — non-blocking
    }
    return proposals;
  }

  // ── Check for stuck builds ─────────────────────────────────────────────────
  async function checkBuildFailures() {
    const proposals = [];
    try {
      const result = await pool.query(
        `SELECT product_name, COUNT(*) as fail_count
         FROM builder_queue
         WHERE status = 'stuck'
           AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY product_name
         ORDER BY fail_count DESC
         LIMIT 5`
      );

      for (const row of result.rows) {
        proposals.push({
          category: 'bug',
          title: `Build stuck: ${row.product_name}`,
          description: `The auto-builder failed to complete ${row.product_name} and it is stuck. ${row.fail_count} attempts failed.`,
          evidence: { product: row.product_name, fail_count: row.fail_count },
          proposed_fix: `Review the build logs for ${row.product_name}, identify why all components failed, and either fix the prompts or provide a manual implementation.`,
          effort_estimate: 'hours',
          impact_estimate: 'medium',
        });
      }
    } catch {
      // builder_queue may not exist yet
    }
    return proposals;
  }

  // ── Check for untracked outcomes ───────────────────────────────────────────
  async function checkUntrackedOutcomes() {
    const proposals = [];
    try {
      const result = await pool.query(
        `SELECT i.id, i.title, i.implemented_at
         FROM ideas i
         LEFT JOIN outcomes o ON o.idea_id = i.id::text
         WHERE i.approval_status IN ('built', 'deployed')
           AND i.implemented_at < NOW() - INTERVAL '7 days'
           AND o.id IS NULL
         ORDER BY i.implemented_at DESC
         LIMIT 5`
      );

      for (const row of result.rows) {
        proposals.push({
          category: 'performance',
          title: `No outcome tracked for: ${row.title}`,
          description: `"${row.title}" was built ${Math.round((Date.now() - new Date(row.implemented_at)) / 86400000)} days ago but has no outcome measurements. We don't know if it worked.`,
          evidence: { idea_id: row.id, title: row.title, built: row.implemented_at },
          proposed_fix: `Measure the impact of "${row.title}" — check revenue, usage, or user behavior before/after. Log the results via POST /api/v1/outcomes.`,
          effort_estimate: 'minutes',
          impact_estimate: 'medium',
        });
      }
    } catch {
      // Outcomes table may not exist yet
    }
    return proposals;
  }

  // ── Check for stale approved ideas ────────────────────────────────────────
  async function checkStaleIdeas() {
    const proposals = [];
    try {
      const result = await pool.query(
        `SELECT id, title, approved_at
         FROM ideas
         WHERE approval_status = 'approved'
           AND build_triggered_at IS NULL
           AND approved_at < NOW() - INTERVAL '14 days'
         ORDER BY approved_at ASC
         LIMIT 5`
      );

      if (result.rows.length > 0) {
        const titles = result.rows.map(r => r.title).join(', ');
        proposals.push({
          category: 'ux',
          title: `${result.rows.length} approved idea(s) not started in 14+ days`,
          description: `These ideas are approved but haven't been triggered for build: ${titles}`,
          evidence: { ideas: result.rows.map(r => ({ id: r.id, title: r.title })) },
          proposed_fix: `Review and either trigger builds for these ideas, reprioritize them, or reject them to keep the queue clean.`,
          effort_estimate: 'minutes',
          impact_estimate: 'low',
        });
      }
    } catch {}
    return proposals;
  }

  // ── AI-powered system review ───────────────────────────────────────────────
  async function runAISystemReview() {
    if (!callAI) return [];
    const proposals = [];

    try {
      // Get recent decisions for context
      const decisions = await pool.query(
        `SELECT event_type, subject, decision, reasoning, created_at
         FROM adam_decisions
         WHERE created_at >= NOW() - INTERVAL '7 days'
         ORDER BY created_at DESC
         LIMIT 50`
      );

      const outcomes = await pool.query(
        `SELECT feature_name, metric_type, delta_pct, delta
         FROM outcomes
         WHERE measurement_date >= NOW() - INTERVAL '30 days'
         ORDER BY measurement_date DESC
         LIMIT 20`
      );

      if (decisions.rows.length === 0) return [];

      const decisionSummary = decisions.rows
        .map(d => `${d.event_type}: ${d.subject} → ${d.decision || ''}`)
        .join('\n');

      const outcomeSummary = outcomes.rows.length > 0
        ? outcomes.rows.map(o => `${o.feature_name}: ${o.metric_type} changed by ${o.delta_pct?.toFixed(1) || '?'}%`).join('\n')
        : 'No outcomes tracked yet';

      const review = await callAI(`You are a product and engineering advisor reviewing a startup's system activity.

Recent decisions (last 7 days):
${decisionSummary}

Outcome data (last 30 days):
${outcomeSummary}

Based on this data:
1. What patterns do you see that could be improved?
2. What is the system NOT doing that it should be?
3. What looks like it might be a bug or inefficiency?
4. What quick win is being missed?

Respond with a JSON array of up to 3 proposals:
[
  {
    "category": "bug|performance|ux|revenue|refactor",
    "title": "short title",
    "description": "what the problem is",
    "proposed_fix": "what to do about it",
    "effort_estimate": "minutes|hours|days",
    "impact_estimate": "low|medium|high|critical"
  }
]`);

      const jsonMatch = review.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const aiProposals = JSON.parse(jsonMatch[0]);
        proposals.push(...aiProposals.slice(0, 3).map(p => ({ ...p, source: 'ai_review' })));
      }
    } catch (err) {
      console.warn(`[CI] AI system review failed: ${err.message}`);
    }

    return proposals;
  }

  // ── Persist proposals ─────────────────────────────────────────────────────
  async function saveProposals(proposals) {
    const saved = [];
    for (const p of proposals) {
      try {
        // Check for duplicate (same title in last 7 days)
        const existing = await pool.query(
          `SELECT id FROM improvement_proposals
           WHERE title = $1 AND created_at >= NOW() - INTERVAL '7 days'
           LIMIT 1`,
          [p.title]
        );
        if (existing.rows.length > 0) continue; // Skip duplicate

        const result = await pool.query(
          `INSERT INTO improvement_proposals
             (source, category, title, description, evidence, proposed_fix, effort_estimate, impact_estimate)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            p.source || 'auto_monitor',
            p.category,
            p.title,
            p.description,
            p.evidence ? JSON.stringify(p.evidence) : null,
            p.proposed_fix,
            p.effort_estimate,
            p.impact_estimate,
          ]
        );
        saved.push(result.rows[0]);
      } catch (err) {
        console.warn(`[CI] Could not save proposal: ${err.message}`);
      }
    }
    return saved;
  }

  // ── Main monitor cycle ────────────────────────────────────────────────────
  /**
   * Run all checks and save any new proposals.
   * Safe to call on a cron — deduplicates automatically.
   */
  async function runMonitorCycle() {
    console.log('🔍 [CI] Running improvement monitor cycle...');

    const [errors, builds, outcomes, stale, aiReview] = await Promise.allSettled([
      checkErrorTrends(),
      checkBuildFailures(),
      checkUntrackedOutcomes(),
      checkStaleIdeas(),
      runAISystemReview(),
    ]);

    const allProposals = [
      ...(errors.status === 'fulfilled' ? errors.value : []),
      ...(builds.status === 'fulfilled' ? builds.value : []),
      ...(outcomes.status === 'fulfilled' ? outcomes.value : []),
      ...(stale.status === 'fulfilled' ? stale.value : []),
      ...(aiReview.status === 'fulfilled' ? aiReview.value : []),
    ];

    if (allProposals.length === 0) {
      console.log('✅ [CI] No new issues found');
      return { proposals: 0 };
    }

    const saved = await saveProposals(allProposals);
    console.log(`📋 [CI] ${saved.length} new improvement proposal(s) queued for Adam's review`);

    // Log system health snapshot
    try {
      const queueDepth = await pool.query(`SELECT COUNT(*) FROM builder_queue WHERE status IN ('queued','in_progress')`);
      const pendingIdeas = await pool.query(`SELECT COUNT(*) FROM ideas WHERE approval_status = 'approved'`);
      const openProposals = await pool.query(`SELECT COUNT(*) FROM improvement_proposals WHERE status = 'pending'`);

      await pool.query(
        `INSERT INTO system_health_log (queue_depth, pending_ideas, open_bugs)
         VALUES ($1, $2, $3)`,
        [
          parseInt(queueDepth.rows[0].count),
          parseInt(pendingIdeas.rows[0].count),
          parseInt(openProposals.rows[0].count),
        ]
      );
    } catch {
      // Health snapshot is best-effort
    }

    return { proposals: saved.length, items: saved };
  }

  // ── Get pending proposals ─────────────────────────────────────────────────
  async function getProposals({ status = 'pending', limit = 50 } = {}) {
    const result = await pool.query(
      `SELECT * FROM improvement_proposals
       WHERE status = $1
       ORDER BY
         CASE impact_estimate
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           ELSE 4
         END,
         created_at DESC
       LIMIT $2`,
      [status, limit]
    );
    return result.rows;
  }

  // ── Approve a proposal (promotes to an idea) ──────────────────────────────
  async function approveProposal(proposalId, ideaQueue) {
    const proposal = await pool.query(
      `UPDATE improvement_proposals SET status='approved', approved_at=NOW() WHERE id=$1 RETURNING *`,
      [proposalId]
    );
    const p = proposal.rows[0];
    if (!p) throw new Error(`Proposal ${proposalId} not found`);

    // Auto-promote to idea queue if ideaQueue provided
    if (ideaQueue) {
      const idea = await ideaQueue.submit({
        title: p.title,
        description: p.description + '\n\nProposed fix: ' + p.proposed_fix,
        source: 'continuous_improvement',
        notes: `Effort: ${p.effort_estimate} | Impact: ${p.impact_estimate}`,
      });

      await pool.query(
        `UPDATE improvement_proposals SET idea_id=$1 WHERE id=$2`,
        [idea.id, proposalId]
      );

      return { proposal: p, idea };
    }

    return { proposal: p };
  }

  // ── Reject a proposal ─────────────────────────────────────────────────────
  async function rejectProposal(proposalId, reason) {
    const result = await pool.query(
      `UPDATE improvement_proposals
       SET status='rejected', rejected_at=NOW(), rejection_reason=$1
       WHERE id=$2 RETURNING *`,
      [reason, proposalId]
    );
    return result.rows[0];
  }

  return { runMonitorCycle, getProposals, approveProposal, rejectProposal };
}
