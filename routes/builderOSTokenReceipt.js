/**
 * SYNOPSIS: routes/builderOSTokenReceipt.js
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
// routes/builderOSTokenReceipt.js
import express from 'express';
import * as builderOSTokenReceiptService from '../services/builderOSTokenReceipt.js'; // Assuming the service is in a 'services' directory

const router = express.Router();

// POST route to trigger token receipt generation
router.post('/builderos/token-receipt', async (req, res) => {
  try {
    // Assuming the request body contains necessary data for token receipt generation
    // e.g., { buildId: '...', projectId: '...' }
    const result = await builderOSTokenReceiptService.generateTokenReceipt(req.body);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    console.error('Error generating BuilderOS token receipt:', error); // Log for debugging
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Registers BuilderOS token receipt routes with the provided Express app.
 * @param {express.Application} app The Express application instance.
 */
export const registerBuilderOSTokenReceiptRoutes = (app) => {
  app.use('/', router); // Mount the router
};
