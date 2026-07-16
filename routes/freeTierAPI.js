/**
 * SYNOPSIS: TGT: routes/freeTierAPI.js
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
// TGT: routes/freeTierAPI.js
import { Router } from 'express';
import * as freeTierAPI from '../services/freeTierAPI.js'; // ESM:EXPORTS

const router = Router();

// REQX: registerFreeTierAPIRoutes
export function registerFreeTierAPIRoutes(app) { // MUST:EXPORT
  app.use('/api/free-tier', router);
}

// TSK: implement route for free-tier upsert API
// SPC: Provide an HTTP endpoint that allows clients to upsert user data for the free-tier service.
//      It should interact with the freeTierAPI service to perform upsert operations.
router.post('/upsert', async (req, res) => {
  try {
    const userData = req.body;
    const result = await freeTierAPI.upsertFreeTierUser(userData);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error upserting free-tier user:', error);
    res.status(500).json({ success: false, message: 'Failed to upsert free-tier user.' });
  }
});
