/**
 * SYNOPSIS: Exports createVoluntaryProgressRoutes — routes/voluntary-progress-routes.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */

import { Router } from 'express';
import { proposeGoal, presentAlternativeFutures, confirmGoalDecision, compareExperimentOutcome } from '../services/voluntary-progress-slice-orchestrator.js';

export function createVoluntaryProgressRoutes({ pool, requireKey, logger }) {
  const router = Router();
  router.use(requireKey);

  router.post('/goals', async (req, res) => {
    try {
      const { user_id, goal_text, goal_category } = req.body;
      const goal = await proposeGoal(pool, { user_id, goal_text, goal_category });
      res.status(201).json({ ok: true, goal });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/goals/:goalId/alternatives', async (req, res) => {
    try {
      const { user_id, twinKey, moduleKey, tenantId, fields } = req.body;
      const result = await presentAlternativeFutures(pool, {
        user_id,
        goal_id: req.params.goalId,
        twinKey,
        moduleKey,
        tenantId,
        fields
      });
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/goals/:goalId/decision', async (req, res) => {
    try {
      const { user_id, decision_status, modified_goal_text, chosen_path_label, path_description } = req.body;
      const result = await confirmGoalDecision(pool, {
        user_id,
        goal_id: req.params.goalId,
        decision_status,
        modified_goal_text,
        chosen_path_label,
        path_description
      });
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/experiments/:experimentId/outcome', async (req, res) => {
    try {
      const { user_id, actual_option, captured_how, twin_subject, twin_proposed_value, truth_grade, evidence } = req.body;
      const result = await compareExperimentOutcome(pool, {
        user_id,
        goal_experiment_id: req.params.experimentId,
        actual_option,
        captured_how,
        twin_subject,
        twin_proposed_value,
        truth_grade,
        evidence
      });
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export function registerVoluntaryProgressRoutes(app, deps = {}) {
  const { pool, requireKey, logger } = deps;
  app.use('/api/v1/lifere/voluntary-progress', createVoluntaryProgressRoutes({ pool, requireKey, logger }));
  logger?.info?.('Voluntary Progress Routes registered successfully.');
}