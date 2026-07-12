/**
 * SYNOPSIS: Registers Phase14CertRoutes routes/handlers (routes/phase14-cert-routes.js).
 */
import { getPhase14Cert } from '../services/phase14-cert-service.js';

export function registerPhase14CertRoutes(app, deps = {}) {
  const db = deps.db ?? deps.pool;

  app.get('/api/v1/builder/cert/phase14', async (req, res) => {
    try {
      const result = await getPhase14Cert(db);
      res.set('Cache-Control', 'no-store');
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: message });
    }
  });
}

export default registerPhase14CertRoutes;