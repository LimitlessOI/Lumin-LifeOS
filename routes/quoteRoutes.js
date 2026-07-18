/**
 * SYNOPSIS: Registers QuoteRoutes routes/handlers (routes/quoteRoutes.js).
 */
import express from 'express';

export function registerQuoteRoutes(app) {
  const router = express.Router();

  router.post('/quotes/confirm', (req, res) => {
    // Logic to confirm a PASS quote
    res.status(200).send({ message: 'Quote confirmed' });
  });

  app.use('/api', router);
}