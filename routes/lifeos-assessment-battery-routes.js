/**
 * @fileoverview Assessment Battery Routes
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * 
 * Provides REST endpoints for managing assessment battery results,
 * compatibility profiles, and battery completion status.
 */

import express from "express";
import { requireLifeOSUser } from "../middleware/lifeos-auth-middleware.js";
import { createAssessmentBatteryService } from "../services/lifeos-assessment-battery.js";

/**
 * Creates assessment battery routes
 * @param {Object} params
 * @param {import('pg').Pool} params.pool - PostgreSQL connection pool
 * @returns {express.Router}
 */
export function createAssessmentBatteryRoutes({ pool }) {
  const router = express.Router();
  const svc = createAssessmentBatteryService({ pool });

  // Save assessment result
  router.post("/result", requireLifeOSUser, async (req, res, next) => {
    try {
      const { assessmentType, resultKey, resultLabel, score, rawAnswers, version } = req.body;
      const userId = req.lifeosUser.sub;

      if (!assessmentType || !resultKey || !resultLabel) {
        return res.status(400).json({ 
          error: "Missing required fields: assessmentType, resultKey, resultLabel" 
        });
      }

      const result = await svc.saveResult({
        userId,
        assessmentType,
        resultKey,
        resultLabel,
        score,
        rawAnswers,
        version,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // Get specific assessment result by type
  router.get("/result/:type", requireLifeOSUser, async (req, res, next) => {
    try {
      const userId = req.lifeosUser.sub;
      const assessmentType = req.params.type;
      const version = parseInt(req.query.version) || 1;

      const result = await svc.getResult(userId, assessmentType, version);

      if (!result) {
        return res.status(404).json({ error: "Assessment result not found" });
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Get all assessment results for user
  router.get("/results", requireLifeOSUser, async (req, res, next) => {
    try {
      const userId = req.lifeosUser.sub;
      const results = await svc.getAllResults(userId);
      res.json(results);
    } catch (err) {
      next(err);
    }
  });

  // Get compatibility profile
  router.get("/profile", requireLifeOSUser, async (req, res, next) => {
    try {
      const userId = req.lifeosUser.sub;
      const profile = await svc.getCompatibilityProfile(userId);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  });

  // Check battery completion status
  router.get("/complete", requireLifeOSUser, async (req, res, next) => {
    try {
      const userId = req.lifeosUser.sub;
      const complete = await svc.hasCompletedBattery(userId);
      res.json({ complete });
    } catch (err) {
      next(err);
    }
  });

  return router;
}