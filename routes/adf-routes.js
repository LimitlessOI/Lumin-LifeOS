/**
 * SYNOPSIS: Exports createAdfRoutes — routes/adf-routes.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import express from 'express';
import { createAdfPredictionLedger } from '../services/adf-prediction-ledger.js';

export function createAdfRoutes({ requireKey }) {
  const router = express.Router();
  const ledger = createAdfPredictionLedger();

  router.get('/status', requireKey, async (_req, res) => {
    try {
      const summary = await ledger.getAccuracySummary();
      const lessons = await ledger.loadLessons();
      res.json({ ok: true, summary, lessons });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/predictions', requireKey, async (req, res) => {
    try {
      const items = await ledger.listPredictions(req.query.status ? { status: req.query.status } : {});
      res.json({
        ok: true,
        count: items.length,
        predictions: items.map(({ receipt }) => receipt),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/predictions', requireKey, async (req, res) => {
    try {
      const result = await ledger.filePrediction(req.body || {});
      res.json({ ok: true, prediction: result.receipt, path: result.filePath });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/predictions/:id/actual', requireKey, async (req, res) => {
    try {
      const result = await ledger.recordActual(req.params.id, req.body || {});
      res.json({ ok: true, prediction: result.receipt });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/predictions/:id/score', requireKey, async (req, res) => {
    try {
      const result = await ledger.scorePrediction(req.params.id, req.body || {});
      res.json({ ok: true, prediction: result.receipt });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/predictions/:id/ingest-message', requireKey, async (req, res) => {
    try {
      const { quote, ...opts } = req.body || {};
      if (!quote) return res.status(400).json({ ok: false, error: 'quote required' });
      const result = await ledger.recordAndScoreFromMessage(req.params.id, quote, opts);
      res.json({ ok: true, prediction: result.receipt });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
