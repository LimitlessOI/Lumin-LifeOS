/**
 * Adaptive layer for LifeOS.
 *
 * The common core stays stable. AI/policy can adapt what the user sees first,
 * how hard the system pushes, and which lane gets emphasis based on the
 * user's actual state. When an adaptation proves broadly useful, it should be
 * promoted into the product intentionally.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

function cleanObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function uniq(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function statusWeight(status) {
  switch (String(status || 'building')) {
    case 'off_track': return 0;
    case 'watch': return 1;
    case 'on_track': return 2;
    case 'strong': return 3;
    default: return 1;
  }
}

function choosePrimaryLane(scoreboard, adaptivePrefs = {}) {
  if (adaptivePrefs.primary_lane) return adaptivePrefs.primary_lane;
  const personal = Number(scoreboard?.lanes?.personal?.score);
  const business = Number(scoreboard?.lanes?.business?.score);
  if (Number.isFinite(personal) && Number.isFinite(business)) {
    if (Math.abs(personal - business) <= 5) return 'balanced';
    return business < personal ? 'business' : 'personal';
  }
  const personalStatus = scoreboard?.lanes?.personal?.status;
  const businessStatus = scoreboard?.lanes?.business?.status;
  if (statusWeight(businessStatus) < statusWeight(personalStatus)) return 'business';
  if (statusWeight(personalStatus) < statusWeight(businessStatus)) return 'personal';
  return 'balanced';
}

function choosePlanningMode(scoreboard, adaptivePrefs = {}) {
  if (adaptivePrefs.planning_mode) return adaptivePrefs.planning_mode;
  const focusScore = Number(scoreboard?.metrics?.focus?.score);
  const joyScore = Number(scoreboard?.metrics?.joy?.score);
  const healthScore = Number(scoreboard?.metrics?.health?.score);
  const businessScore = Number(scoreboard?.lanes?.business?.score);
  const personalScore = Number(scoreboard?.lanes?.personal?.score);

  if (Number.isFinite(focusScore) && focusScore < 60) return 'protect_focus';
  if ((Number.isFinite(joyScore) && joyScore < 55) || (Number.isFinite(healthScore) && healthScore < 60)) return 'restore_energy';
  if (Number.isFinite(businessScore) && businessScore < 65 && businessScore <= (Number.isFinite(personalScore) ? personalScore : 100)) return 'ship_work';
  return 'compound';
}

function chooseNotificationPosture(userPrefs = {}, adaptivePrefs = {}) {
  const quietUntil = userPrefs?.quiet_until ? Date.parse(userPrefs.quiet_until) : NaN;
  if (Number.isFinite(quietUntil) && quietUntil > Date.now()) return 'quiet';
  if (adaptivePrefs.notification_posture) return adaptivePrefs.notification_posture;
  return 'standard';
}

function chooseSurfaceOrder(primaryLane, planningMode, adaptivePrefs = {}) {
  if (Array.isArray(adaptivePrefs.surface_order) && adaptivePrefs.surface_order.length) return adaptivePrefs.surface_order;
  const base = ['today', 'mirror', 'engine', 'health', 'finance', 'family'];
  if (planningMode === 'protect_focus') return uniq(['today', 'engine', 'mirror', 'health', ...base]);
  if (planningMode === 'restore_energy') return uniq(['today', 'health', 'mirror', 'family', ...base]);
  if (planningMode === 'ship_work' || primaryLane === 'business') return uniq(['today', 'engine', 'finance', 'mirror', ...base]);
  if (primaryLane === 'personal') return uniq(['today', 'mirror', 'health', 'family', ...base]);
  return uniq(base);
}

function buildRecommendations(scoreboard, profile) {
  const out = [];
  if (profile.planning_mode === 'protect_focus') {
    out.push({
      key: 'protect_focus',
      title: 'Protect the next focus block',
      reason: 'Focus recovery is below target. Start with one protected block before adding more commitments.',
      target: 'today',
    });
  }
  if (profile.planning_mode === 'restore_energy') {
    out.push({
      key: 'restore_energy',
      title: 'Reduce load before pushing harder',
      reason: 'Joy or health is dragging the day. Energy repair should come before more task volume.',
      target: 'health',
    });
  }
  if (profile.primary_lane === 'business') {
    out.push({
      key: 'business_first',
      title: 'Lead with business execution',
      reason: 'The business lane is weaker than the personal lane right now. Clear follow-up debt first.',
      target: 'engine',
    });
  }
  if ((scoreboard?.blockers || []).length) {
    out.push({
      key: 'repair_blockers',
      title: 'Repair the visible blockers',
      reason: scoreboard.blockers[0],
      target: 'today',
    });
  }
  return out.slice(0, 3);
}

export function createLifeOSAdaptiveLayerService({ pool, scoreboard }) {
  async function getUserAdaptiveState(userId) {
    const { rows } = await pool.query(
      `SELECT user_handle, display_name, truth_style, flourishing_prefs, role, tier
         FROM lifeos_users
        WHERE id = $1
        LIMIT 1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    const prefs = cleanObject(row.flourishing_prefs);
    const adaptivePrefs = cleanObject(prefs.adaptive);
    const board = await scoreboard.getScoreboard(userId);
    const primaryLane = choosePrimaryLane(board, adaptivePrefs);
    const planningMode = choosePlanningMode(board, adaptivePrefs);
    const notificationPosture = chooseNotificationPosture(prefs, adaptivePrefs);
    const surfaceOrder = chooseSurfaceOrder(primaryLane, planningMode, adaptivePrefs);
    const profile = {
      user_handle: row.user_handle,
      display_name: row.display_name,
      truth_style: row.truth_style || 'direct',
      role: row.role || 'member',
      tier: row.tier || 'free',
      primary_lane: primaryLane,
      planning_mode: planningMode,
      notification_posture: notificationPosture,
      surface_order: surfaceOrder,
      adaptive_prefs: adaptivePrefs,
      recommendations: buildRecommendations(board, {
        primary_lane: primaryLane,
        planning_mode: planningMode,
        notification_posture: notificationPosture,
      }),
    };
    return {
      profile,
      scoreboard: board,
      flourishing_prefs: prefs,
    };
  }

  async function saveAdaptivePrefs(userId, patch = {}) {
    const adaptivePatch = cleanObject(patch);
    const { rows } = await pool.query(
      `UPDATE lifeos_users
          SET flourishing_prefs = jsonb_set(
                COALESCE(flourishing_prefs, '{}'::jsonb),
                '{adaptive}',
                COALESCE(flourishing_prefs->'adaptive', '{}'::jsonb) || $2::jsonb,
                true
              ),
              updated_at = NOW()
        WHERE id = $1
        RETURNING user_handle, flourishing_prefs`,
      [userId, JSON.stringify(adaptivePatch)],
    );
    return rows[0] || null;
  }

  return {
    getUserAdaptiveState,
    saveAdaptivePrefs,
  };
}
