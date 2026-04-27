/**
 * @fileoverview Conflict interrupt routes for LifeOS
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * @module routes/lifeos-conflict-interrupt-routes
 */

import express from "express";
import { requireLifeOSUser } from "./lifeos-auth-helpers.js";
import { createConflictInterruptService } from "../services/lifeos-conflict-interrupt.js";

/**
 * Create conflict interrupt routes
 * @param {Object} deps - Dependencies
 * @param {Object} deps.pool - Database connection pool
 * @returns {express.Router} Express router
 */
export function createConflictInterruptRoutes({ pool }) {
  const router = express.Router();
  const svc = createConflictInterruptService({ pool });

  /**
   * POST / - Trigger a conflict interrupt
   * Body: { triggerSource, conflictContext, interruptType, partnerId? }
   */
  router.post("/", requireLifeOSUser, async (req, res, next) => {
    try {
      const { triggerSource, conflictContext, interruptType, partnerId } = req.body;
      const userId = req.user.id;

      if (!triggerSource || !conflictContext || !interruptType) {
        return res.status(400).json({
          error: "Missing required fields: triggerSource, conflictContext, interruptType"
        });
      }

      const result = await svc.triggerInterrupt({
        userId,
        triggerSource,
        conflictContext,
        interruptType,
        partnerId
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /active - Get active interrupt for current user
   */
  router.get("/active", requireLifeOSUser, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const activeInterrupt = await svc.getActiveInterrupt(userId);
      res.json(activeInterrupt);
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /:id/resolve - Resolve an interrupt
   * Body: { notes? }
   */
  router.post("/:id/resolve", requireLifeOSUser, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user.id;

      const result = await svc.resolveInterrupt({
        interruptId: id,
        userId,
        notes
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /:id/escalate - Escalate an interrupt
   */
  router.post("/:id/escalate", requireLifeOSUser, async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await svc.escalateInterrupt({
        interruptId: id,
        userId
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /history - Get interrupt history
   * Query: days (optional, defaults to 30)
   */
  router.get("/history", requireLifeOSUser, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days) || 30;

      const history = await svc.getInterruptHistory({
        userId,
        days
      });

      res.json(history);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /pattern - Get escalation pattern for user
   */
  router.get("/pattern", requireLifeOSUser, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const pattern = await svc.getEscalationPattern(userId);
      res.json(pattern);
    } catch (err) {
      next(err);
    }
  });

  return router;
}