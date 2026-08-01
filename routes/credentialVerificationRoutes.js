/**
 * SYNOPSIS: Registers CredentialVerificationRoutes routes/handlers (routes/credentialVerificationRoutes.js).
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */

import { verifyCredential } from '../services/credentialVerification.js';

export function registerCredentialVerificationRoutes(app, deps) {
  app.post('/api/v1/credentials/verify', deps.requireKey, async (req, res, next) => {
    try {
      const { credentialId } = req.body;
      const result = await verifyCredential(deps, { credentialId });
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in credential verification route');
      next(error);
    }
  });
}