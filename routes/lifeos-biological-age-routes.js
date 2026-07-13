/**
 * SYNOPSIS: Registers LifeosBiologicalAgeRoutes routes/handlers (routes/lifeos-biological-age-routes.js).
 */
export async function fetchBiologicalAge(userId, deps) {
  const pool = deps?.pool;
  if (!pool) {
    throw new Error('Missing deps.pool');
  }

  const result = await pool.query(
    `SELECT id, user_id, user_handle, display_name, timezone, be_statement, created_at, updated_at, tier, do_statement, have_vision, truth_style, flourishing_prefs, active, owner_id, email, name
     FROM lifeos_users
     WHERE id = $1`,
    [userId]
  );

  const user = result.rows[0];
  if (!user) {
    return { ok: false, error: 'User not found', userId: String(userId) };
  }

  const scoreParts = [
    user.active ? 0 : 5,
    user.have_vision ? 0 : 2,
    user.be_statement ? 0 : 1,
    user.do_statement ? 0 : 1,
    user.truth_style ? 0 : 1,
    user.flourishing_prefs ? 0 : 1
  ];

  const biologicalAge = 25 + scoreParts.reduce((sum, part) => sum + part, 0);

  return {
    ok: true,
    userId: user.id,
    displayName: user.display_name,
    biologicalAge,
    factors: {
      active: !!user.active,
      haveVision: !!user.have_vision,
      hasBeStatement: !!user.be_statement,
      hasDoStatement: !!user.do_statement,
      hasTruthStyle: !!user.truth_style,
      hasFlourishingPrefs: !!user.flourishing_prefs
    }
  };
}

export function registerLifeosBiologicalAgeRoutes(app, deps) {
  app.get('/api/biological-age/:userId', async (req, res, next) => {
    try {
      const data = await fetchBiologicalAge(req.params.userId, deps);
      if (!data.ok) {
        return res.status(404).json(data);
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  });
}

export default {
  fetchBiologicalAge,
  registerLifeosBiologicalAgeRoutes
};