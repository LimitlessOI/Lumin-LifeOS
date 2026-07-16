/**
 * SYNOPSIS: Registers PASSQuoteRoutes routes/handlers (routes/passQuoteRoutes.js).
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import express from 'express';
import { confirmPASSQuote } from '../services/passQuoteService.js';

const router = express.Router();

router.post('/confirm-pass-quote', async (req, res) => {
  try {
    const confirmationResult = await confirmPASSQuote(req.body);
    res.status(200).json(confirmationResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export function registerPASSQuoteRoutes(app) {
  app.use('/api', router);
}
