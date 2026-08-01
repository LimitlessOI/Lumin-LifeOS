/**
 * SYNOPSIS: This object will be replaced by database persistence for production,
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { Router } from 'express';

const router = Router();

// This object will be replaced by database persistence for production,
// but for now, it simulates the storage of user layout preferences.
// It's scoped to this module.
const flourishing_prefs = {};

/**
 * Retrieves the adaptive layout settings for the current user.
 * In a full implementation, this would fetch from a database based on user ID.
 * For now, it returns the in-memory state.
 * @returns {object} The adaptive layout settings.
 */
export function getAdaptiveLayoutSettings() {
  return flourishing_prefs.adaptiveLayout || {};
}

/**
 * Saves the adaptive layout settings for the current user.
 * In a full implementation, this would persist to a database based on user ID.
 * For now, it updates the in-memory state.
 * @param {object} settings - The settings object to save.
 */
export function saveAdaptiveLayoutSettings(settings) {
  flourishing_prefs.adaptiveLayout = settings;
}

/**
 * Express handler to adapt (save) user layout preferences.
 * This function will interact with the database to store the preferences.
 *
 * @param {object} deps - Injected dependencies (pool, requireKey, logger).
 * @returns {Router} The Express router with the preference adaptation route.
 */
export function adaptLayoutPreferences(deps) {
  router.post('/preferences/layout/adapt', deps.requireKey, async (req, res) => {
    const { userId, preferences } = req.body;

    if (!userId || !preferences) {
      deps.logger.warn({ message: 'Missing userId or preferences in request body', body: req.body });
      return res.status(400).json({ error: 'Missing userId or preferences' });
    }

    try {
      // Upsert logic: try to update, if no rows affected, then insert.
      const updateSql = `
        UPDATE user_preference
        SET preference_value = $1, created_at = NOW()
        WHERE owner_id = $2 AND preference_key = 'adaptiveLayout'
        RETURNING *;
      `;
      const updateResult = await deps.pool.query(updateSql, [JSON.stringify(preferences), userId]);

      if (updateResult.rowCount === 0) {
        // No existing preference found, so insert a new one
        const insertSql = `
          INSERT INTO user_preference (owner_id, preference_key, preference_value)
          VALUES ($1, 'adaptiveLayout', $2)
          RETURNING *;
        `;
        const insertResult = await deps.pool.query(insertSql, [userId, JSON.stringify(preferences)]);
        deps.logger.info({ message: 'Inserted new layout preferences', userId, preferenceId: insertResult.rows[0].id });
        return res.status(201).json(insertResult.rows[0]);
      } else {
        deps.logger.info({ message: 'Updated existing layout preferences', userId, preferenceId: updateResult.rows[0].id });
        return res.status(200).json(updateResult.rows[0]);
      }
    } catch (error) {
      deps.logger.error({ message: 'Failed to adapt layout preferences', error: error.message, userId });
      return res.status(500).json({ error: 'Failed to save layout preferences' });
    }
  });

  return router;
}