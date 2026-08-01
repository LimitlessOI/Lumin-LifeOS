/**
 * SYNOPSIS: Manages explicit likeness consent for users.
 * @ssot docs/products/creator-media-os/PRODUCT_HOME.md
 */
export function registerLikenessConsentRoutes(app, deps) {
  app.post('/api/v1/likeness/consent', deps.requireKey, async (req, res, next) => {
    try {
      const { userId, consentGiven } = req.body;

      if (!userId || typeof consentGiven !== 'boolean') {
        return res.status(400).json({ error: 'User ID and consentGiven (boolean) are required.' });
      }

      const sql = `
        INSERT INTO likeness_consent (user_id, consent_given, consent_date)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET consent_given = $2, consent_date = NOW()
        RETURNING id, user_id, consent_given, consent_date;
      `;
      const result = await deps.pool.query(sql, [userId, consentGiven]);

      deps.logger.info({ userId, consentGiven }, 'Explicit likeness consent recorded');
      res.json(result.rows[0]);
    } catch (error) {
      deps.logger.error({ error }, 'Error in likenessConsent route');
      next(error);
    }
  });
}

export const registerLikenessConsent = registerLikenessConsentRoutes;
