/**
 * @fileoverview Decision Review Routes
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from "express";
import { requireLifeOSUser } from "./lifeos-auth-helpers.js";
import { createDecisionReviewService } from "../services/lifeos-decision-review.js";
import { safeInt } from "../services/lifeos-request-helpers.js";

export function createDecisionReviewRoutes({ pool }) {
  const router = express.Router();
  const svc = createDecisionReviewService({ pool });

  // GET /pending - Get pending reviews for user
  router.get("/pending", requireLifeOSUser, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const reviews = await svc.getPendingReviews(userId);
      res.json(reviews);
    } catch (err) {
      next(err);
    }
  });

  // POST /:id/complete - Complete a review
  router.post("/:id/complete", requireLifeOSUser, async (req, res, next) => {
    try {
      const reviewId = safeInt(req.params.id);
      const userId = req.user.id;
      const { hindsightNotes, outcomeRating } = req.body;

      const result = await svc.completeReview(reviewId, userId, {
        hindsightNotes,
        outcomeRating,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /:id/skip - Skip a review
  router.post("/:id/skip", requireLifeOSUser, async (req, res, next) => {
    try {
      const reviewId = safeInt(req.params.id);
      const userId = req.user.id;

      const result = await svc.skipReview(reviewId, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /history - Get review history
  router.get("/history", requireLifeOSUser, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const days = safeInt(req.query.days) || 30;

      const history = await svc.getReviewHistory(userId, days);
      res.json(history);
    } catch (err) {
      next(err);
    }
  });

  return router;
}