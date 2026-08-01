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

  router.post('/api/v1/credentials/verify', requireKey, async (req, res, next) => {
    try {
      const { credentialId, provider } = req.body;
      const result = await pool.query(
        `
          INSERT INTO credential_verification_results (credential_id, provider, verification_status, verification_details, last_verified_at)
          VALUES ($1, $2, 'pending', 'pending', NOW())
          RETURNING *
        `,
        [credentialId, provider]
      );

      const verificationDetails = await callCouncilMember('credentialVerification', `Verify credential ${credentialId} from ${provider}`);
      const updatedResult = await pool.query(
        `
          UPDATE credential_verification_results
          SET verification_status = 'verified',
              verification_details = $1,
              last_verified_at = NOW()
          WHERE id = $2
        `,
        [verificationDetails, result.rows[0].id]
      );

      res.json({ ...result.rows[0], ...updatedResult.rows[0] });
    } catch (error) {
      logger.error({ error }, 'Error verifying credential');
      next(error);
    }
  });

  app.use('/api/v1/credentials/verify', router);
}