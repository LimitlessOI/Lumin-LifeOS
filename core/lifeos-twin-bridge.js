/**
 * core/lifeos-twin-bridge.js
 *
 * Bridge between the Digital Twin (adam_profile / adam_decisions) and LifeOS.
 *
 * What this does:
 *   - Pulls the twin's current profile and extracts identity signals for the Mirror
 *   - Feeds LifeOS Integrity Score with twin decision patterns (consistency, follow-through)
 *   - Pushes commitment outcomes back into adam_decisions so the twin learns from them
 *   - Surfaces twin-observed purpose patterns to the Joy Score / Purpose Discovery engine
 *
 * The twin is the memory. LifeOS is the action layer. This bridge keeps them in sync.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createLifeOSTwinBridge({ pool, callAI, logger }) {

  // ── Pull twin insights for a user ─────────────────────────────────────────

  async function getTwinInsights(userId) {
    // Map lifeos user_handle back to twin data (twin is adam-specific for now)
    const { rows: uRows } = await pool.query(
      'SELECT user_handle FROM lifeos_users WHERE id=$1', [userId]
    );
    const handle = uRows[0]?.user_handle;
    if (handle !== 'adam') return null; // twin only exists for adam today

    try {
      const { rows: [profile] } = await pool.query(
        `SELECT profile, summary, decision_count FROM adam_profile WHERE is_current=true LIMIT 1`
      );
      if (!profile) return null;

      const p = typeof profile.profile === 'string' ? JSON.parse(profile.profile) : profile.profile;

      return {
        summary:          profile.summary,
        decision_count:   profile.decision_count,
        values:           p?.values || [],
        patterns:         p?.patterns || [],
        preferences:      p?.preferences || [],
        strengths:        p?.strengths || [],
        growth_areas:     p?.growth_areas || [],
        decision_style:   p?.decision_style || null,
        communication:    p?.communication_style || null,
      };
    } catch {
      return null;
    }
  }

  // ── Enrich Be-Do-Have profile from twin ───────────────────────────────────

  async function suggestBeDoHave(userId) {
    const insights = await getTwinInsights(userId);
    if (!insights || !callAI) return null;

    const prompt = `Based on what the Digital Twin has observed about this person, suggest a Be-Do-Have identity profile for their LifeOS mirror.

Twin profile summary: ${insights.summary || 'not available'}
Observed values: ${insights.values?.join(', ') || 'not extracted'}
Observed patterns: ${insights.patterns?.join(', ') || 'not extracted'}
Growth areas: ${insights.growth_areas?.join(', ') || 'not extracted'}

Generate three statements:
- BE: Who they ARE at their best (identity, not behavior) — "I am someone who..."
- DO: What they consistently DO as that person — "I consistently..."
- HAVE: What their life LOOKS LIKE as a result — "My life is characterized by..."

Each statement should be: authentic to observed patterns, aspirational but grounded, first person, 1–2 sentences max.

Return JSON: { be, do, have }`;

    try {
      const raw = await callAI(prompt);
      const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  // ── Push commitment outcomes to twin decisions ────────────────────────────

  async function pushCommitmentOutcome({ commitment, outcome }) {
    // outcome: 'kept' | 'broken'
    try {
      await pool.query(`
        INSERT INTO adam_decisions (event_type, subject, input_text, decision, context, tags)
        VALUES ('feedback', $1, $2, $3, $4, $5)
      `, [
        'commitment_outcome',
        `Commitment: "${commitment.title}" — ${outcome}`,
        outcome,
        JSON.stringify({
          commitment_id: commitment.id,
          committed_to: commitment.committed_to,
          weight: commitment.weight,
          days_to_complete: commitment.kept_at
            ? Math.round((new Date(commitment.kept_at) - new Date(commitment.created_at)) / (1000 * 60 * 60 * 24))
            : null,
        }),
        ['commitment', outcome, 'integrity'],
      ]);
    } catch { /* non-fatal */ }
  }

  // ── Pull purpose signals from twin for Purpose Discovery ─────────────────

  async function getPurposeSignals(userId) {
    const insights = await getTwinInsights(userId);
    if (!insights) return [];

    const signals = [];
    for (const v of (insights.values || [])) {
      signals.push({ type: 'value', observation: v, source: 'twin' });
    }
    for (const s of (insights.strengths || [])) {
      signals.push({ type: 'strength', observation: s, source: 'twin' });
    }
    for (const g of (insights.growth_areas || [])) {
      signals.push({ type: 'growth_area', observation: g, source: 'twin' });
    }
    if (insights.decision_style) {
      signals.push({ type: 'decision_style', observation: insights.decision_style, source: 'twin' });
    }
    return signals;
  }

  // ── Sync twin profile data to lifeos_users be/do/have (if not set) ────────

  async function syncToUserProfile(userId) {
    const { rows: uRows } = await pool.query(
      `SELECT be_statement FROM lifeos_users WHERE id=$1`, [userId]
    );
    if (uRows[0]?.be_statement) return; // already set — don't overwrite

    const suggested = await suggestBeDoHave(userId);
    if (!suggested) return;

    await pool.query(`
      UPDATE lifeos_users
      SET be_statement = $2,
          do_statement = $3,
          have_vision  = $4,
          updated_at   = NOW()
      WHERE id = $1 AND (be_statement IS NULL OR be_statement = '')
    `, [userId, suggested.be || null, suggested.do || null, suggested.have || null]);

    logger?.info?.(`[TWIN-BRIDGE] Synced Be-Do-Have for user ${userId} from twin profile`);
  }

  return {
    getTwinInsights,
    suggestBeDoHave,
    pushCommitmentOutcome,
    getPurposeSignals,
    syncToUserProfile,
  };
}
