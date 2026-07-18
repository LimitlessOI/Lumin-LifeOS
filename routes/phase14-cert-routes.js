/**
 * SYNOPSIS: Registers Phase14CertRoutes routes/handlers (routes/phase14-cert-routes.js).
 */
import { getPhase14Cert } from '../services/phase14-cert-service.js';

export function registerPhase14CertRoutes(app, { db }) {
  app.get('/api/v1/builder/cert/phase14', async (req, res) => {
    try {
      const result = await getPhase14Cert(db);
      res.set('Cache-Control', 'no-store');
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}