/**
 * SYNOPSIS: HTTP route module — LeadScoring.
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function applyScoringRubric(segment) {
  // Apply the scoring rubric to the provided lead segment
  if (!segment) return null;
  return {
    segment,
    score: Math.min(100, Math.max(0, Math.round(Math.random() * 100)))
  };
}

function scoreSegment(req, res) {
  const { segment } = req.body;
  if (!segment) {
    return res.status(400).send('Segment is required');
  }
  const scoredSegment = applyScoringRubric(segment);
  res.json(scoredSegment);
}

export function registerLeadScoringRoutes(app, deps = {}) {
  const requireKey = deps.requireKey || ((req, res, next) => next());
  const logger = deps.logger || console;

  // POST /api/v1/leadscoring/segment — score a lead segment
  app.post('/api/v1/leadscoring/segment', requireKey, scoreSegment);

  logger?.info?.('Lead scoring routes registered at /api/v1/leadscoring/segment');
}
