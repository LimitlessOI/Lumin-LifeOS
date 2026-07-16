/**
 * SYNOPSIS: Implementing the upsert route for the free-tier service
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import { Router } from 'express';
import * as freeTierAPI from '../services/freeTierAPI.js';

const router = Router();

export function registerFreeTierAPIRoutes(app) {
  app.use('/api/free-tier', router);
}

// Implementing the upsert route for the free-tier service
router.put('/upsert', async (req, res) => {
  try {
    const userData = req.body;
    const result = await freeTierAPI.upsertFreeTierUser(userData);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error upserting free-tier user:', error);
    res.status(500).json({ success: false, message: 'Failed to upsert free-tier user.' });
  }
});
