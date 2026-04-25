/**
 * services/lifeos-cycle.js
 *
 * LifeOS — Menstrual / Perimenopause Cycle Tracking Service
 *
 * Zero AI cost — pure SQL + date math.
 * Computes current cycle phase from period log entries and user settings,
 * then feeds that context into energy_patterns and decision-intelligence
 * context snapshots so the rest of LifeOS is cycle-aware.
 *
 * Phase definitions (scales with user's actual avg cycle length):
 *   menstrual     — days 1 → avg_period_length
 *   follicular    — avg_period_length+1 → ~day 12 (scaled)
 *   ovulation     — ~days 13-15 (scaled)
 *   luteal_early  — post-ovulation → ~day 22 (scaled)
 *   luteal_late   — ~day 22 → cycle end (scaled)
 *
 * Energy overlays (fed to energy_patterns + decision context):
 *   menstrual    → restore, low output, reflection
 *   follicular   → energy rising, new starts, social
 *   ovulation    → peak energy, hard conversations, big decisions
 *   luteal_early → detail work, planning, steady focus
 *   luteal_late  → protect capacity, avoid major commitments
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

// ── Phase computation ─────────────────────────────────────────────────────────

/**
 * Compute the cycle phase for a given day of cycle and user settings.
 * All boundaries scale linearly with the user's avg_cycle_length.
 *
 * @param {number} dayOfCycle  — 1-based day within current cycle
 * @param {object} settings    — { avg_cycle_length, avg_period_length }
 * @returns {{ phase, dayOfCycle, energyProfile, daysUntilNextPhase }}
 */
function computePhase(dayOfCycle, settings) {
  const { avg_cycle_length: len = 28, avg_period_length: pLen = 5 } = settings;
  const scale = len / 28;

  const boundaries = {
    menstrual:    [1, pLen],
    follicular:   [pLen + 1, Math.round(12 * scale)],
    ovulation:    [Math.round(12 * scale) + 1, Math.round(15 * scale)],
    luteal_early: [Math.round(15 * scale) + 1, Math.round(22 * scale)],
    luteal_late:  [Math.round(22 * scale) + 1, len],
  };

  const energyProfiles = {
    menstrual:    { energy: 'low',    focus: 'restore',       decision_guidance: 'Delay non-urgent decisions. Rest and reflect.' },
    follicular:   { energy: 'rising', focus: 'new_starts',    decision_guidance: 'Good time for new projects and social commitments.' },
    ovulation:    { energy: 'peak',   focus: 'connection',    decision_guidance: 'Peak clarity. Best window for hard conversations and major decisions.' },
    luteal_early: { energy: 'steady', focus: 'detail_work',   decision_guidance: 'Strong focus and planning capacity. Good for follow-through.' },
    luteal_late:  { energy: 'dipping', focus: 'protect',      decision_guidance: 'Energy dropping. Protect capacity. Avoid overcommitting.' },
  };

  let currentPhase = 'luteal_late';
  let daysUntilNextPhase = 1;

  for (const [phase, [start, end]] of Object.entries(boundaries)) {
    if (dayOfCycle >= start && dayOfCycle <= end) {
      currentPhase = phase;
      daysUntilNextPhase = end - dayOfCycle + 1;
      break;
    }
  }

  return {
    phase: currentPhase,
    dayOfCycle,
    cycleLength: len,
    daysUntilNextPeriod: Math.max(0, len - dayOfCycle + 1),
    daysUntilNextPhase,
    energyProfile: energyProfiles[currentPhase],
  };
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createCycleService({ pool, logger }) {
  const log = logger || console;

  // ── Settings ────────────────────────────────────────────────────────────────

  async function getSettings(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM cycle_settings WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || {
      user_id: userId,
      avg_cycle_length: 28,
      avg_period_length: 5,
      tracking_enabled: true,
      notify_phase_change: false,
      perimenopause_mode: false,
    };
  }

  async function updateSettings(userId, patch) {
    const allowed = ['avg_cycle_length','avg_period_length','tracking_enabled',
                     'notify_phase_change','perimenopause_mode'];
    const fields = Object.keys(patch).filter(k => allowed.includes(k));
    if (!fields.length) return getSettings(userId);

    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const vals = fields.map(f => patch[f]);
    await pool.query(
      `INSERT INTO cycle_settings (user_id, ${fields.join(', ')}, updated_at)
       VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')}, NOW())
       ON CONFLICT (user_id) DO UPDATE SET ${sets}, updated_at = NOW()`,
      [userId, ...vals]
    );
    return getSettings(userId);
  }

  // ── Log entry ────────────────────────────────────────────────────────────────

  async function logEntry(userId, { entry_type, flow_level, symptoms, notes, source, logged_at }) {
    const ts = logged_at ? new Date(logged_at) : new Date();
    const { rows } = await pool.query(
      `INSERT INTO cycle_entries (user_id, entry_type, flow_level, symptoms, notes, source, logged_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, entry_type, flow_level || null, symptoms || null, notes || null,
       source || 'manual', ts]
    );
    const entry = rows[0];

    // When a new period starts, upsert a cycle_phases row
    if (entry_type === 'period_start') {
      const startDate = ts.toISOString().slice(0, 10);
      await pool.query(
        `INSERT INTO cycle_phases (user_id, cycle_start_date)
         VALUES ($1, $2)
         ON CONFLICT (user_id, cycle_start_date) DO NOTHING`,
        [userId, startDate]
      );
      // Close out the previous open cycle with its actual length
      await _closePreviousCycle(userId, startDate);
      // Immediately push new phase context into energy_patterns
      await _syncEnergyPatterns(userId).catch(() => {});
    }

    log.info({ userId, entry_type }, '[CYCLE] Entry logged');
    return entry;
  }

  async function _closePreviousCycle(userId, newStartDate) {
    // Find the cycle before this one (latest start_date before newStartDate)
    const { rows } = await pool.query(
      `SELECT id, cycle_start_date FROM cycle_phases
       WHERE user_id = $1 AND cycle_start_date < $2
       ORDER BY cycle_start_date DESC LIMIT 1`,
      [userId, newStartDate]
    );
    if (!rows[0]) return;
    const prev = rows[0];
    const prevStart = new Date(prev.cycle_start_date);
    const newStart  = new Date(newStartDate);
    const actualLen = Math.round((newStart - prevStart) / (1000 * 60 * 60 * 24));
    if (actualLen > 0 && actualLen <= 60) {
      await pool.query(
        `UPDATE cycle_phases SET cycle_length = $1 WHERE id = $2`,
        [actualLen, prev.id]
      );
    }
  }

  // ── Current phase ────────────────────────────────────────────────────────────

  async function getCurrentPhase(userId) {
    const settings = await getSettings(userId);
    if (!settings.tracking_enabled) {
      return { tracking_enabled: false };
    }

    // Find most recent period_start
    const { rows } = await pool.query(
      `SELECT logged_at FROM cycle_entries
       WHERE user_id = $1 AND entry_type = 'period_start'
       ORDER BY logged_at DESC LIMIT 1`,
      [userId]
    );
    if (!rows[0]) {
      return { phase: null, message: 'No period logged yet. Log a period start to begin tracking.' };
    }

    const lastStart = new Date(rows[0].logged_at);
    const now = new Date();
    const dayOfCycle = Math.floor((now - lastStart) / (1000 * 60 * 60 * 24)) + 1;

    // If past expected cycle length, flag as potentially late / irregular
    if (dayOfCycle > settings.avg_cycle_length + 7) {
      return {
        phase: 'unknown',
        dayOfCycle,
        message: 'Period is later than expected. Consider logging a new period start or updating your settings.',
        lastPeriodStart: lastStart.toISOString(),
      };
    }

    const result = computePhase(dayOfCycle, settings);
    return {
      ...result,
      lastPeriodStart: lastStart.toISOString(),
      tracking_enabled: true,
    };
  }

  // ── Context snapshot (consumed by decision intelligence + Lumin) ─────────────

  /**
   * Returns a compact phase context block for injection into other AI prompts.
   * Called by decision-intelligence and Lumin chat context builders.
   */
  async function getContextSnapshot(userId) {
    try {
      const phase = await getCurrentPhase(userId);
      if (!phase.phase || phase.phase === 'unknown') return null;
      return {
        cycle_phase: phase.phase,
        day_of_cycle: phase.dayOfCycle,
        energy: phase.energyProfile?.energy,
        focus: phase.energyProfile?.focus,
        decision_guidance: phase.energyProfile?.decision_guidance,
        days_until_next_period: phase.daysUntilNextPeriod,
      };
    } catch {
      return null;
    }
  }

  // ── Cycle history ────────────────────────────────────────────────────────────

  async function getCycleHistory(userId, limit = 6) {
    const { rows: cycles } = await pool.query(
      `SELECT cycle_start_date, cycle_length FROM cycle_phases
       WHERE user_id = $1
       ORDER BY cycle_start_date DESC LIMIT $2`,
      [userId, limit]
    );

    const { rows: entries } = await pool.query(
      `SELECT entry_type, flow_level, symptoms, logged_at
       FROM cycle_entries
       WHERE user_id = $1
       ORDER BY logged_at DESC LIMIT 50`,
      [userId]
    );

    const avgLength = cycles.filter(c => c.cycle_length).length > 0
      ? Math.round(cycles.filter(c => c.cycle_length)
          .reduce((s, c) => s + c.cycle_length, 0) / cycles.filter(c => c.cycle_length).length)
      : null;

    return { cycles, recent_entries: entries, computed_avg_length: avgLength };
  }

  // ── Sync to energy_patterns ──────────────────────────────────────────────────

  async function _syncEnergyPatterns(userId) {
    const phase = await getCurrentPhase(userId);
    if (!phase.phase || phase.phase === 'unknown') return;
    // Tag all energy_patterns rows for this user with current cycle phase
    // (we set it for the current hour and adjacent hours as context)
    const hour = new Date().getHours();
    const hours = [hour - 1, hour, hour + 1].map(h => ((h % 24) + 24) % 24);
    for (const h of hours) {
      await pool.query(
        `INSERT INTO energy_patterns (user_id, hour_of_day, cycle_phase, sample_count, updated_at)
         VALUES ($1, $2, $3, 0, NOW())
         ON CONFLICT (user_id, hour_of_day)
         DO UPDATE SET cycle_phase = $3, updated_at = NOW()`,
        [userId, h, phase.phase]
      ).catch(() => {});
    }
  }

  return {
    getSettings,
    updateSettings,
    logEntry,
    getCurrentPhase,
    getContextSnapshot,
    getCycleHistory,
  };
}
