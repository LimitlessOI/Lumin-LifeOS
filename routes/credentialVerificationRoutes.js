/**
 * SYNOPSIS: Registers CredentialVerificationRoutes routes/handlers (routes/credentialVerificationRoutes.js).
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */

import { Pool } from 'pg';
import { Router, Request, Response, NextFunction } from 'express';
import { requireKey } from './requireKey.js';
import { callCouncilMember } from './callCouncilMember.js';
import { logger } from './logger.js';

export function registerCredentialVerificationRoutes(app, deps) {
  const pool = deps.pool;
  const router = Router();

  router.post('/verify-credential', requireKey, async (req, res, next) => {
    try {
      const { credentialId, provider, verificationStatus, verificationDetails } = req.body;
      const result = await pool.query(
        `
          INSERT INTO credential_verification_results (credential_id, provider, verification_status, verification_details, last_verified_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING *
        `,
        [credentialId, provider, verificationStatus, verificationDetails]
      );
      res.json(result.rows[0]);
    } catch (error) {
      logger.error({ error }, 'Error verifying credential');
      next(error);
    }
  });

  app.use('/credential-verification', router);
}