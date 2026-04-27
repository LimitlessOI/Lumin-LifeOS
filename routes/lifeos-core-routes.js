/**
 * routes/lifeos-core-routes.js
 *
 * LifeOS Phase 1 — The Mirror API
 * Mounted at /api/v1/lifeos
 *
 * Endpoints:
 *
 * COMMITMENTS
 *   GET  /api/v1/lifeos/commitments             — open commitments for a user
 *   POST /api/v1/lifeos/commitments             — log a new commitment
 *   POST /api/v1/lifeos/commitments/:id/keep    — mark kept
 *   POST /api/v1/lifeos/commitments/:id/break   — mark broken
 *   POST /api/v1/lifeos/commitments/:id/snooze  — snooze the prod
 *   GET  /api/v1/lifeos/commitments/overdue     — overdue open commitments
 *
 * SCORES
 *   GET  /api/v1/lifeos/integrity               — latest integrity score + trend
 *   GET  /api/v1/lifeos/integrity/history       — score history (last 30d)
 *   POST /api/v1/lifeos/integrity/compute       — recompute and save now
 *   GET  /api/v1/lifeos/joy                     — latest joy score
 *   POST /api/v1/lifeos/joy/checkin             — log today's joy check-in
 *   GET  /api/v1/lifeos/joy/history             — check-in history
 *   GET  /api/v1/lifeos/joy/patterns            — what creates/drains joy over time
 *
 * HEALTH
 *   GET  /api/v1/lifeos/health/today            — today's health check-in
 *   POST /api/v1/lifeos/health/checkin          — log health check-in
 *
 * INNER WORK
 *   POST /api/v1/lifeos/inner-work              — log inner work entry
 *   GET  /api/v1/lifeos/inner-work              — recent inner work log
 *
 * THE MIRROR
 *   GET  /api/v1/lifeos/mirror                  — full daily mirror for a user
 *   POST /api/v1/lifeos/mirror/acknowledge      — mark mirror as acknowledged
 *   POST /api/v1/lifeos/mirror/intention        — set today's intention
 *
 * USERS
 *   GET  /api/v1/lifeos/users                   — list LifeOS users
 *   GET  /api/v1/lifeos/users/:handle           — user profile
 *   PUT  /api/v1/lifeos/users/:handle           — update Be-Do-Have + truth_style
 *   PATCH /api/v1/lifeos/users/:handle/flourishing-prefs — merge JSON prefs (backlog mechanics)
 *
 * STATUS
 *   GET  /api/v1/lifeos/status                  — DB probes + finance + scheduler config (ops)
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createCommitmentTracker }         from '../services/commitment-tracker.js';
import { createIntegrityScore }            from '../services/integrity-score.js';
import { createJoyScore }                  from '../services/joy-score.js';
import { createTruthDelivery }             from '../services/truth-delivery.js';
import { createChatGPTImport }             from '../services/chatgpt-import.js';
import { createLuminMemoryFetcher }        from '../services/lumin-memory-fetcher.js';
import { createLifeOSTwinBridge }          from '../core/lifeos-twin-bridge.js';
import { createLifeOSNotificationRouter }  from '../services/lifeos-notification-router.js';
import { createCommitmentSimulator }       from '../services/commitment-simulator.js';
import { createLifeOSFocusPrivacyService } from '../services/lifeos-focus-privacy.js';
import { createLifeOSCalendarService }     from '../services/lifeos-calendar.js';
import { createLifeOSEventStreamService }  from '../services/lifeos-event-stream.js';
import { makeLifeOSUserResolver }          from '../services/lifeos-user-resolver.js';
import { createLifeOSScoreboardService }   from '../services/lifeos-scoreboard.js';
import { createLifeOSAdaptiveLayerService } from '../services/lifeos-adaptive-layer.js';
import { safeDays, safeLimit, safeId }     from '../services/lifeos-request-helpers.js';
import { createCouncilPromptAdapter }     from '../services/council-prompt-adapter.js';

export function createLifeOSCoreRoutes({ pool, requireKey, callCouncilMember, logger, sendSMS, sendAlertCall = null, makePhoneCall = null }) {
  const router = express.Router();
  const log = logger || console;

  const callAI = callCouncilMember
    ? createCouncilPromptAdapter(callCouncilMember, {
        member:
          process.env.LIFEOS_CHAT_COUNCIL_MEMBER ||
          process.env.LUMIN_COUNCIL_MEMBER ||
          'anthropic',
        taskType: 'general',
      })
    : null;

  const commitments  = createCommitmentTracker(pool, callAI);
  const commitSim    = createCommitmentSimulator({ pool, callAI });
  const integrity    = createIntegrityScore(pool);
  const joy          = createJoyScore(pool);
  const truthSvc     = createTruthDelivery({ pool, callAI });
  const chatgptSvc   = createChatGPTImport({ pool, callAI, logger: log });
  const memFetcher   = createLuminMemoryFetcher({ pool, callAI, logger: log });
  const twinBridge   = createLifeOSTwinBridge({ pool, callAI, logger: log });
  const notifier     = createLifeOSNotificationRouter({
    pool,
    sendSMS: sendSMS ?? null,
    sendAlertCall,
    makePhoneCall,
    logger: log,
  });
  const focusPrivacy = createLifeOSFocusPrivacyService(pool);
  const calendar     = createLifeOSCalendarService(pool);
  const eventStream  = createLifeOSEventStreamService({
    pool,
    callAI,
    commitments,
    calendar,
    focusPrivacy,
    logger: log,
  });
  const scoreboard   = createLifeOSScoreboardService({ pool, integrity, joy, focusPrivacy });
  const adaptive     = createLifeOSAdaptiveLayerService({ pool, scoreboard });

  // Helper: resolve user_id from handle or id (shared + case-insensitive)
  const resolveUserId = makeLifeOSUserResolver(pool);

  // ── STATUS (ops / overlays) ───────────────────────────────────────────────
  router.get('/status', requireKey, async (_req, res) => {
    try {
      const probes = ['lifeos_users', 'commitments', 'daily_mirror_log'];
      const table_counts = {};
      for (const t of probes) {
        try {
          const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
          table_counts[t] = rows[0]?.c ?? 0;
        } catch {
          table_counts[t] = null;
        }
      }
      let finance_ok = null;
      try {
        const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM lifeos_finance_transactions`);
        finance_ok = rows[0]?.c ?? 0;
      } catch {
        finance_ok = null;
      }
      res.json({
        ok: true,
        api: 'lifeos',
        scheduled_jobs_enabled:
          process.env.LIFEOS_ENABLE_SCHEDULED_JOBS === '1' || process.env.LIFEOS_ENABLE_SCHEDULED_JOBS === 'true',
        table_counts,
        finance_transactions_count: finance_ok,
        backlog_hints: {
          flourishing_prefs_keys:
            'ambivalence_until, quiet_until, depletion_tags, accountability_onepager_url (merge via PATCH .../flourishing-prefs)',
          finance: '/api/v1/lifeos/finance/disclaimer',
        },
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── USERS ─────────────────────────────────────────────────────────────────

  router.get('/users', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, user_handle, display_name, be_statement, do_statement, have_vision, truth_style, active FROM lifeos_users ORDER BY id'
      );
      res.json({ ok: true, users: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/users/:handle', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM lifeos_users WHERE LOWER(user_handle) = LOWER($1)',
        [req.params.handle]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, user: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/users', requireKey, async (req, res) => {
    try {
      const handleRaw = String(req.body.user || req.body.user_handle || '').trim().toLowerCase();
      if (!handleRaw) return res.status(400).json({ ok: false, error: 'user or user_handle is required' });

      const displayName = String(req.body.display_name || handleRaw).trim() || handleRaw;
      const beStatement = req.body.be_statement ?? null;
      const doStatement = req.body.do_statement ?? null;
      const haveVision = req.body.have_vision ?? req.body.have_statement ?? null;
      const truthStyle = req.body.truth_style ?? 'direct';
      const timezone = req.body.timezone ?? 'America/Los_Angeles';

      const { rows } = await pool.query(
        `INSERT INTO lifeos_users
           (user_handle, display_name, timezone, be_statement, do_statement, have_vision, truth_style)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_handle) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           timezone = EXCLUDED.timezone,
           be_statement = COALESCE(EXCLUDED.be_statement, lifeos_users.be_statement),
           do_statement = COALESCE(EXCLUDED.do_statement, lifeos_users.do_statement),
           have_vision = COALESCE(EXCLUDED.have_vision, lifeos_users.have_vision),
           truth_style = COALESCE(EXCLUDED.truth_style, lifeos_users.truth_style),
           active = TRUE,
           updated_at = NOW()
         RETURNING *`,
        [handleRaw, displayName, timezone, beStatement, doStatement, haveVision, truthStyle]
      );
      res.status(201).json({ ok: true, user: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.put('/users/:handle', requireKey, async (req, res) => {
    try {
      const { be_statement, do_statement, have_vision, truth_style, display_name, timezone } = req.body;
      const { rows } = await pool.query(`
        UPDATE lifeos_users
        SET
          be_statement  = COALESCE($2, be_statement),
          do_statement  = COALESCE($3, do_statement),
          have_vision   = COALESCE($4, have_vision),
          truth_style   = COALESCE($5, truth_style),
          display_name  = COALESCE($6, display_name),
          timezone      = COALESCE($7, timezone),
          updated_at    = NOW()
        WHERE LOWER(user_handle) = LOWER($1)
        RETURNING *
      `, [req.params.handle, be_statement, do_statement, have_vision, truth_style, display_name, timezone]);
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, user: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.patch('/users/:handle/flourishing-prefs', requireKey, async (req, res) => {
    try {
      const patch = req.body;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return res.status(400).json({ ok: false, error: 'JSON object body required' });
      }
      const { rows } = await pool.query(
        `UPDATE lifeos_users
         SET flourishing_prefs = COALESCE(flourishing_prefs, '{}'::jsonb) || $2::jsonb,
             updated_at = NOW()
         WHERE LOWER(user_handle) = LOWER($1)
         RETURNING id, user_handle, flourishing_prefs`,
        [req.params.handle, JSON.stringify(patch)],
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, user: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/users/:handle/adaptive-prefs', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.params.handle);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const state = await adaptive.getUserAdaptiveState(userId);
      res.json({ ok: true, adaptive: state?.profile?.adaptive_prefs || {}, profile: state?.profile || null });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.put('/users/:handle/adaptive-prefs', requireKey, async (req, res) => {
    try {
      const patch = req.body;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return res.status(400).json({ ok: false, error: 'JSON object body required' });
      }
      const userId = await resolveUserId(req.params.handle);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const saved = await adaptive.saveAdaptivePrefs(userId, patch);
      if (!saved) return res.status(404).json({ ok: false, error: 'User not found' });
      const state = await adaptive.getUserAdaptiveState(userId);
      res.json({ ok: true, user: saved, adaptive: state?.profile?.adaptive_prefs || {}, profile: state?.profile || null });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── COMMITMENTS ───────────────────────────────────────────────────────────

  router.get('/commitments', requireKey, async (req, res) => {
    try {
      const { user = 'adam', limit = 50 } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const open = await commitments.getOpen(userId, { limit: safeLimit(limit, { fallback: 50, max: 200 }) });
      res.json({ ok: true, commitments: open, count: open.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/commitments/overdue', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const overdue = await commitments.getOverdue(userId);
      res.json({ ok: true, commitments: overdue, count: overdue.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/commitments', requireKey, async (req, res) => {
    try {
      const { user = 'adam', title, description, committed_to, due_at, weight, is_public } = req.body;
      if (!title?.trim()) return res.status(400).json({ ok: false, error: 'title is required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const c = await commitments.logCommitment({ userId, title, description, committedTo: committed_to, dueAt: due_at, weight, isPublic: is_public });
      res.status(201).json({ ok: true, commitment: c });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/commitments/:id/keep', requireKey, async (req, res) => {
    try {
      const c = await commitments.markKept(req.params.id);
      if (!c) return res.status(404).json({ ok: false, error: 'Commitment not found or already resolved' });
      res.json({ ok: true, commitment: c });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/commitments/:id/break', requireKey, async (req, res) => {
    try {
      const { reason } = req.body;
      const c = await commitments.markBroken(req.params.id, reason);
      if (!c) return res.status(404).json({ ok: false, error: 'Commitment not found or already resolved' });
      res.json({ ok: true, commitment: c });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/commitments/:id/snooze', requireKey, async (req, res) => {
    try {
      const c = await commitments.snooze(req.params.id);
      if (!c) return res.status(404).json({ ok: false, error: 'Commitment not found' });
      res.json({ ok: true, commitment: c });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // AI extraction from freeform text
  router.post('/commitments/extract', requireKey, async (req, res) => {
    try {
      const { user = 'adam', text, source_ref, auto_log = false } = req.body;
      if (!text?.trim()) return res.status(400).json({ ok: false, error: 'text is required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      if (auto_log) {
        const logged = await commitments.ingestFromMessage({ userId, messageText: text, sourceRef: source_ref });
        res.json({ ok: true, logged, count: logged.length });
      } else {
        const extracted = await commitments.extractCommitments(text, userId);
        res.json({ ok: true, extracted, count: extracted.length });
      }
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── COMMITMENT SIMULATOR ─────────────────────────────────────────────────
  // POST /api/v1/lifeos/commitments/simulate — see the full cost before committing
  // Body: { user?, title, description?, estimatedMinutesPerDay, estimatedDaysPerWeek?, durationWeeks? }
  router.post('/commitments/simulate', requireKey, async (req, res) => {
    try {
      const {
        user = 'adam',
        title,
        description,
        estimatedMinutesPerDay,
        estimatedDaysPerWeek = 7,
        durationWeeks = 12,
      } = req.body || {};

      if (!title?.trim()) return res.status(400).json({ ok: false, error: 'title is required' });
      if (estimatedMinutesPerDay == null) {
        return res.status(400).json({ ok: false, error: 'estimatedMinutesPerDay is required' });
      }

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const result = await commitSim.simulate(userId, {
        title,
        description,
        estimatedMinutesPerDay: parseInt(estimatedMinutesPerDay),
        estimatedDaysPerWeek:   parseInt(estimatedDaysPerWeek),
        durationWeeks:          parseInt(durationWeeks),
      });

      res.json({ ok: true, simulation: result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/lifeos/commitments/load — current commitment load summary
  router.get('/commitments/load', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const summary = await commitSim.getLoadSummary(userId);
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── INTEGRITY SCORE ───────────────────────────────────────────────────────

  router.get('/integrity', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const [latest, trend] = await Promise.all([
        integrity.getLatest(userId),
        integrity.getTrend(userId),
      ]);
      res.json({ ok: true, score: latest, trend });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/integrity/history', requireKey, async (req, res) => {
    try {
      const { user = 'adam', days = 30 } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const history = await integrity.getHistory(userId, { days: safeDays(days, { fallback: 30 }) });
      res.json({ ok: true, history });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/integrity/compute', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await integrity.computeAndSave(userId);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── JOY SCORE ─────────────────────────────────────────────────────────────

  router.get('/joy', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const [latest, today] = await Promise.all([
        joy.getLatestScore(userId),
        joy.getTodayCheckin(userId),
      ]);
      res.json({ ok: true, score: latest, today_checkin: today });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/joy/checkin', requireKey, async (req, res) => {
    try {
      const { user = 'adam', joy_score, peace_score, energy_score, joy_sources, joy_drains, notes } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const checkin = await joy.logCheckin({ userId, joyScore: joy_score, peaceScore: peace_score, energyScore: energy_score, joySources: joy_sources, joyDrains: joy_drains, notes });
      const computed = await joy.computeAndSave(userId);
      res.status(201).json({ ok: true, checkin, computed });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/joy/history', requireKey, async (req, res) => {
    try {
      const { user = 'adam', days = 30 } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const history = await joy.getCheckinHistory(userId, { days: safeDays(days, { fallback: 30 }) });
      res.json({ ok: true, history });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/joy/patterns', requireKey, async (req, res) => {
    try {
      const { user = 'adam', days = 90 } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const patterns = await joy.getJoyPatterns(userId, { days: safeDays(days, { fallback: 90 }) });
      res.json({ ok: true, patterns });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── HEALTH CHECK-IN ───────────────────────────────────────────────────────

  router.get('/health/today', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { rows } = await pool.query(
        'SELECT * FROM health_checkins WHERE user_id = $1 AND checkin_date = CURRENT_DATE',
        [userId]
      );
      res.json({ ok: true, checkin: rows[0] || null });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Legacy alias kept for existing overlay pages that still request /health/latest.
  router.get('/health/latest', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { rows } = await pool.query(
        `SELECT *,
                CASE
                  WHEN resting_hr >= 120 OR mood_score <= 2 OR energy_score <= 2
                    THEN 'Check body state today'
                  ELSE NULL
                END AS emergency_alert
           FROM health_checkins
           WHERE user_id = $1
           ORDER BY checkin_date DESC, created_at DESC
           LIMIT 1`,
        [userId]
      );
      res.json({ ok: true, ...(rows[0] || {}) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/health/checkin', requireKey, async (req, res) => {
    try {
      const { user = 'adam', sleep_hours, sleep_quality, resting_hr, hrv, weight_lbs, water_oz, alcohol_drinks, foods_logged, energy_score, mood_score, medications_taken, notes, glucose_notes } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { rows } = await pool.query(`
        INSERT INTO health_checkins
          (user_id, sleep_hours, sleep_quality, resting_hr, hrv, weight_lbs,
           water_oz, alcohol_drinks, foods_logged, energy_score, mood_score,
           medications_taken, notes, glucose_notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (user_id, checkin_date) DO UPDATE SET
          sleep_hours       = EXCLUDED.sleep_hours,
          sleep_quality     = EXCLUDED.sleep_quality,
          resting_hr        = EXCLUDED.resting_hr,
          hrv               = EXCLUDED.hrv,
          weight_lbs        = EXCLUDED.weight_lbs,
          water_oz          = EXCLUDED.water_oz,
          alcohol_drinks    = EXCLUDED.alcohol_drinks,
          foods_logged      = EXCLUDED.foods_logged,
          energy_score      = EXCLUDED.energy_score,
          mood_score        = EXCLUDED.mood_score,
          medications_taken = EXCLUDED.medications_taken,
          notes             = EXCLUDED.notes,
          glucose_notes     = EXCLUDED.glucose_notes
        RETURNING *
      `, [userId, sleep_hours, sleep_quality, resting_hr, hrv, weight_lbs,
          water_oz, alcohol_drinks || 0, foods_logged || [], energy_score, mood_score,
          medications_taken || [], notes, glucose_notes]);
      res.status(201).json({ ok: true, checkin: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── FOCUS + PRIVACY ──────────────────────────────────────────────────────

  router.get('/focus/active', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const session = await focusPrivacy.getActiveFocusSession(userId);
      res.json({ ok: true, session });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/focus/today', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const summary = await focusPrivacy.getTodayFocusSummary(userId);
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/dashboard/scoreboard', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const data = await scoreboard.getScoreboard(userId);
      res.json({ ok: true, ...data });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/dashboard/adaptive', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const data = await adaptive.getUserAdaptiveState(userId);
      res.json({ ok: true, adaptive: data?.profile || null, scoreboard: data?.scoreboard || null });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/focus/start', requireKey, async (req, res) => {
    try {
      const { user = 'adam', intention, planned_minutes = 60, source = 'manual', notes = null } = req.body || {};
      if (!String(intention || '').trim()) return res.status(400).json({ ok: false, error: 'intention is required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const session = await focusPrivacy.startFocusSession({ userId, intention: String(intention).trim(), plannedMinutes: planned_minutes, source, notes });
      res.status(201).json({ ok: true, session });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/focus/stop', requireKey, async (req, res) => {
    try {
      const { user = 'adam', session_id = null, status = 'completed', notes = null } = req.body || {};
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const active = session_id ? null : await focusPrivacy.getActiveFocusSession(userId);
      const targetId = session_id || active?.id;
      if (!targetId) return res.status(404).json({ ok: false, error: 'No active focus session' });
      const session = await focusPrivacy.endFocusSession({ sessionId: targetId, userId, status, notes });
      res.json({ ok: true, session });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/focus/intervene', requireKey, async (req, res) => {
    try {
      const {
        user = 'adam',
        session_id = null,
        kind = 'nudge',
        message = null,
        effectiveness = null,
        recovered_focus = null,
      } = req.body || {};
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const active = session_id ? null : await focusPrivacy.getActiveFocusSession(userId);
      const targetId = session_id || active?.id;
      if (!targetId) return res.status(404).json({ ok: false, error: 'No active focus session' });
      const intervention = await focusPrivacy.logIntervention({
        sessionId: targetId,
        userId,
        kind,
        message,
        effectiveness,
        recoveredFocus: recovered_focus,
      });
      res.status(201).json({ ok: true, intervention });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/privacy/active', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const window = await focusPrivacy.getActivePrivacyWindow(userId);
      res.json({ ok: true, window });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/privacy/windows', requireKey, async (req, res) => {
    try {
      const { user = 'adam', days = 7 } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const windows = await focusPrivacy.listPrivacyWindows(userId, { days });
      res.json({ ok: true, windows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/privacy/start', requireKey, async (req, res) => {
    try {
      const { user = 'adam', duration_minutes = 120, reason = null, source = 'manual' } = req.body || {};
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const window = await focusPrivacy.startPrivacyWindow({ userId, durationMinutes: duration_minutes, reason, source });
      res.status(201).json({ ok: true, window, spoken_confirmation: `Privacy mode on for ${window.duration_minutes} minutes.` });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/privacy/stop', requireKey, async (req, res) => {
    try {
      const { user = 'adam', window_id = null, reason = null } = req.body || {};
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const window = await focusPrivacy.stopPrivacyWindow({ userId, windowId: window_id, reason });
      if (!window) return res.status(404).json({ ok: false, error: 'No active privacy window' });
      res.json({ ok: true, window, spoken_confirmation: 'Privacy mode off.' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/privacy/redact', requireKey, async (req, res) => {
    try {
      const { user = 'adam', hours = null, minutes = null, start_at = null, end_at = null, reason = null } = req.body || {};
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const durationMinutes = minutes != null ? parseInt(minutes, 10) : hours != null ? parseInt(hours, 10) * 60 : 120;
      const endAt = end_at ? new Date(end_at) : new Date();
      const startAt = start_at ? new Date(start_at) : new Date(endAt.getTime() - durationMinutes * 60 * 1000);
      const result = await focusPrivacy.queueRedactionJob({ userId, startAt, endAt, reason: reason || `Retro privacy dump for ${durationMinutes} minutes`, source: 'manual' });
      res.status(201).json({ ok: true, ...result, spoken_confirmation: `Queued a privacy dump for the last ${durationMinutes} minutes.` });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/commands/interpret', requireKey, async (req, res) => {
    try {
      const { user = 'adam', text } = req.body || {};
      if (!String(text || '').trim()) return res.status(400).json({ ok: false, error: 'text is required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await focusPrivacy.executeCommand({ userId, text: String(text).trim() });
      if (!result.ok) return res.status(400).json(result);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── EVENT STREAM / CAPTURE ───────────────────────────────────────────────

  router.get('/events', requireKey, async (req, res) => {
    try {
      const { user = 'adam', limit = 30 } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const events = await eventStream.listEvents(userId, { limit });
      res.json({ ok: true, events, count: events.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/events/ingest-status', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const status = await eventStream.getIngestStatus(userId);
      res.json({ ok: true, status });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/events/capture', requireKey, async (req, res) => {
    try {
      const { user = 'adam', text, source = 'manual', channel = 'text', metadata = {}, auto_apply = false } = req.body || {};
      if (!String(text || '').trim()) return res.status(400).json({ ok: false, error: 'text is required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await eventStream.captureEvent({
        userId,
        text,
        source,
        channel,
        metadata,
        autoApply: Boolean(auto_apply),
      });
      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/events/ingest-conversations', requireKey, async (req, res) => {
    try {
      const { user = 'adam', limit = 50, auto_apply = false } = req.body || {};
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await eventStream.ingestConversationMessages({
        userId,
        limit,
        autoApply: Boolean(auto_apply),
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/events/:id/apply', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body || {};
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const eventId = safeId(req.params.id);
      if (!eventId) return res.status(400).json({ ok: false, error: 'invalid event id' });
      const result = await eventStream.applyEvent(userId, eventId);
      if (!result) return res.status(404).json({ ok: false, error: 'Event not found' });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── INNER WORK ────────────────────────────────────────────────────────────

  router.post('/inner-work', requireKey, async (req, res) => {
    try {
      const { user = 'adam', practice_type, duration_min, notes, insight } = req.body;
      if (!practice_type) return res.status(400).json({ ok: false, error: 'practice_type is required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { rows } = await pool.query(`
        INSERT INTO inner_work_log (user_id, practice_type, duration_min, notes, insight)
        VALUES ($1,$2,$3,$4,$5) RETURNING *
      `, [userId, practice_type, duration_min || null, notes || null, insight || null]);
      res.status(201).json({ ok: true, entry: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/inner-work', requireKey, async (req, res) => {
    try {
      const { user = 'adam', days = 14 } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { rows } = await pool.query(`
        SELECT * FROM inner_work_log
        WHERE user_id = $1 AND work_date >= CURRENT_DATE - $2
        ORDER BY work_date DESC, created_at DESC
      `, [userId, safeDays(days, { fallback: 14 })]);
      res.json({ ok: true, entries: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── CHATGPT IMPORT ────────────────────────────────────────────────────────

  router.post('/import/chatgpt', requireKey, async (req, res) => {
    try {
      const { user = 'adam', conversations, dry_run = false, max_conversations = 100 } = req.body;
      if (!conversations) return res.status(400).json({ ok: false, error: 'conversations (ChatGPT export JSON) is required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const results = await chatgptSvc.importToLifeOS({
        userId,
        conversations,
        options: { dryRun: dry_run, maxConversations: max_conversations },
      });
      res.json({ ok: true, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── LUMIN MEMORY GITHUB IMPORT ────────────────────────────────────────────

  // Trigger full import of all dump files from • Lumin-Memory/00_INBOX/raw/
  // POST /api/v1/lifeos/import/lumin-memory
  router.post('/import/lumin-memory', requireKey, async (req, res) => {
    try {
      const { dry_run = false, skip_already_imported = true, max_files = 50 } = req.body || {};
      const results = await memFetcher.importFromGitHub({
        dryRun: dry_run,
        skipAlreadyImported: skip_already_imported,
        maxFiles: max_files,
      });
      res.json(results);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Get history of past import runs
  // GET /api/v1/lifeos/import/lumin-memory/history
  router.get('/import/lumin-memory/history', requireKey, async (_req, res) => {
    try {
      const history = await memFetcher.getImportHistory({ limit: 20 });
      res.json({ ok: true, history });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Search stored chunks
  // GET /api/v1/lifeos/import/lumin-memory/search?q=...
  router.get('/import/lumin-memory/search', requireKey, async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) return res.status(400).json({ ok: false, error: 'q parameter required' });
      const results = await memFetcher.searchChunks({ query: q, limit: 20 });
      res.json({ ok: true, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── TWIN BRIDGE ───────────────────────────────────────────────────────────

  router.post('/twin/sync', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      await twinBridge.syncToUserProfile(userId);
      const insights = await twinBridge.getTwinInsights(userId);
      res.json({ ok: true, insights });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/twin/purpose-signals', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const signals = await twinBridge.getPurposeSignals(userId);
      res.json({ ok: true, signals });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────

  router.get('/notifications', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const pending = await notifier.getPendingForUser(userId);
      res.json({ ok: true, notifications: pending, count: pending.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/notifications/:id/acknowledge', requireKey, async (req, res) => {
    try {
      await notifier.acknowledge(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/notifications/escalation', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const policy = await notifier.getEscalationPolicy(userId);
      res.json({ ok: true, policy });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.put('/notifications/escalation', requireKey, async (req, res) => {
    try {
      const { user = 'adam', ...policy } = req.body || {};
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const saved = await notifier.setEscalationPolicy(userId, policy);
      res.json({ ok: true, policy: saved });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/notifications/escalate-test', requireKey, async (req, res) => {
    try {
      const { user = 'adam', message = 'LifeOS escalation test', priority = 2 } = req.body || {};
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await notifier.queueEscalationChain({
        userId,
        type: 'attention_test',
        message,
        priority,
        metadata: { source: 'manual_test' },
      });
      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── TRUTH DELIVERY ────────────────────────────────────────────────────────

  router.get('/truth/effectiveness', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const effectiveness = await truthSvc.getStyleEffectiveness(userId);
      res.json({ ok: true, effectiveness });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/truth/:deliveryId/acknowledge', requireKey, async (req, res) => {
    try {
      const { engaged = true } = req.body;
      await truthSvc.recordAcknowledgment(req.params.deliveryId, { engaged });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Calibration report — shows the user what the system learned about how
  // they receive hard truths: best style, best hour, best emotional state,
  // best topic. This is the surface of the learning loop.
  router.get('/truth/calibration', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const days = safeDays(req.query.days, { fallback: 90 });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const report = await truthSvc.getCalibrationReport(userId, { days });
      res.json({ ok: true, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── THE MIRROR ────────────────────────────────────────────────────────────

  router.get('/mirror', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const [
        userProfile,
        openCommitments,
        overdueCommitments,
        integrityScore,
        integrityTrend,
        joyScore,
        todayJoy,
        todayHealth,
        existingMirror,
      ] = await Promise.allSettled([
        pool.query('SELECT * FROM lifeos_users WHERE id = $1', [userId]).then(r => r.rows[0]),
        commitments.getOpen(userId, { limit: 10 }),
        commitments.getOverdue(userId),
        integrity.getLatest(userId),
        integrity.getTrend(userId),
        joy.getLatestScore(userId),
        joy.getTodayCheckin(userId),
        pool.query('SELECT * FROM health_checkins WHERE user_id=$1 AND checkin_date=CURRENT_DATE', [userId]).then(r => r.rows[0]),
        pool.query('SELECT * FROM daily_mirror_log WHERE user_id=$1 AND mirror_date=CURRENT_DATE', [userId]).then(r => r.rows[0]),
      ]);

      const val = (settled, fallback = null) =>
        settled.status === 'fulfilled' ? settled.value : fallback;

      const profile    = val(userProfile);
      const open       = val(openCommitments, []);
      const overdue    = val(overdueCommitments, []);
      const iScore     = val(integrityScore);
      const iTrend     = val(integrityTrend, 'building');
      const jScore     = val(joyScore);
      const jToday     = val(todayJoy);
      const health     = val(todayHealth);
      const mirror     = val(existingMirror);

      // Generate hard truth if no mirror exists for today
      let hardTruth = mirror?.hard_truth || null;
      let hardTruthTopic = mirror?.hard_truth_topic || null;

      if (!mirror && callCouncilMember) {
        const truthContext = buildTruthContext({ profile, open, overdue, iScore, iTrend, jScore, health });
        try {
          const raw = await callCouncilMember('anthropic', truthContext);
          const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
          hardTruth = text.trim().slice(0, 500);
          hardTruthTopic = inferTopic({ overdue, iScore, jScore, health });
        } catch { /* non-fatal */ }

        // Save mirror
        try {
          await pool.query(`
            INSERT INTO daily_mirror_log
              (user_id, integrity_score, joy_score, open_commitments,
               overdue_commitments, hard_truth, hard_truth_topic)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (user_id, mirror_date) DO NOTHING
          `, [
            userId,
            iScore?.total_score || null,
            jScore?.avg_joy_7d || null,
            open.length,
            overdue.length,
            hardTruth,
            hardTruthTopic,
          ]);
        } catch { /* non-fatal */ }
      }

      res.json({
        ok: true,
        mirror: {
          user: profile ? {
            handle: profile.user_handle,
            name: profile.display_name,
            be_statement: profile.be_statement,
            do_statement: profile.do_statement,
            have_vision: profile.have_vision,
          } : null,
          integrity: {
            score: iScore?.total_score || null,
            trend: iTrend,
            components: iScore ? {
              commitments: iScore.commitment_score,
              health: iScore.health_score,
              inner_work: iScore.inner_work_score,
              generosity: iScore.generosity_score,
              repair: iScore.repair_score,
            } : null,
          },
          joy: {
            score_7d: jScore?.avg_joy_7d || null,
            peace_7d: jScore?.avg_peace_7d || null,
            trend: jScore?.trend || 'building',
            today: jToday ? {
              joy: jToday.joy_score,
              peace: jToday.peace_score,
              energy: jToday.energy_score,
            } : null,
          },
          commitments: {
            open_count: open.length,
            overdue_count: overdue.length,
            open: open.slice(0, 5),
            overdue,
          },
          health: health ? {
            sleep_hours: health.sleep_hours,
            sleep_quality: health.sleep_quality,
            energy: health.energy_score,
            mood: health.mood_score,
          } : null,
          hard_truth: hardTruth,
          hard_truth_topic: hardTruthTopic,
          intention: mirror?.intention || null,
          date: new Date().toISOString().split('T')[0],
        },
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/mirror/acknowledge', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      await pool.query(`
        UPDATE daily_mirror_log
        SET acknowledged_at = NOW()
        WHERE user_id = $1 AND mirror_date = CURRENT_DATE
      `, [userId]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/mirror/intention', requireKey, async (req, res) => {
    try {
      const { user = 'adam', intention } = req.body;
      if (!intention?.trim()) return res.status(400).json({ ok: false, error: 'intention is required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      await pool.query(`
        INSERT INTO daily_mirror_log (user_id, intention)
        VALUES ($1, $2)
        ON CONFLICT (user_id, mirror_date) DO UPDATE SET
          intention = EXCLUDED.intention,
          viewed_at = COALESCE(daily_mirror_log.viewed_at, NOW())
      `, [userId, intention]);
      res.json({ ok: true, intention });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function buildTruthContext({ profile, open, overdue, iScore, iTrend, jScore, health }) {
    const style = profile?.truth_style || 'direct';
    const name  = profile?.display_name || 'the user';
    const be    = profile?.be_statement || '(not yet set)';

    const styleGuide = {
      direct:   'Be direct and clear. No softening. State the truth plainly.',
      gentle:   'Be compassionate but honest. Acknowledge the difficulty before naming the truth.',
      coaching: 'Ask a powerful question that helps them see it themselves rather than telling them.',
    }[style] || 'Be direct and clear.';

    return `You are the honest mirror in a personal operating system for a person named ${name}.

Core framing: never moralize, never judge. The question is never "is this right or wrong?" — it is "is this working for ${name}, or not?" Frame the truth in terms of outcomes and alignment with their stated goals, never in terms of what they should or shouldn't do.

Their stated identity: "${be}"

Current state:
- Open commitments: ${open.length}
- Overdue commitments: ${overdue.length}${overdue.length > 0 ? ` (${overdue.map(c => `"${c.title}"`).slice(0, 3).join(', ')})` : ''}
- Integrity score: ${iScore?.total_score ?? 'no data yet'} (trend: ${iTrend})
- Joy score (7-day avg): ${jScore?.avg_joy_7d ?? 'no data yet'}
- Sleep last night: ${health?.sleep_hours ?? 'not logged'} hours

Deliver ONE hard truth — one thing this person may be avoiding or not seeing clearly right now. Frame it as: is this pattern working for them, given who they say they want to be? Specific to their current state, not generic.

${styleGuide}

Maximum 2–3 sentences. No preamble. Start with the truth.`;
  }

  function inferTopic({ overdue, iScore, jScore, health }) {
    if (overdue?.length > 2) return 'commitments';
    if (iScore?.commitment_score < 50) return 'commitments';
    if (health?.sleep_hours < 6) return 'health';
    if (jScore?.avg_joy_7d < 4) return 'purpose';
    return 'integrity';
  }

  return router;
}
