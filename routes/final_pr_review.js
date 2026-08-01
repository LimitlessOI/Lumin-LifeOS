/**
 * SYNOPSIS: HTTP route module — Final PR Review.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import express from 'express';

export function registerFinalPrReviewRoutes(app, deps) {
  app.post('/api/v1/pr/review', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      // Assuming payload contains a 'branchName' property for the service function
      const result = await reviewBranch(payload.branchName);
      res.json({
        ok: true,
        message: 'Final PR review and merge initiated.',
        details: result,
        pullRequest: payload,
      });
    } catch (error) {
      deps.logger.error({ error }, 'Error in final_pr_review route for pull request final review');
      next(error);
    }
  });
}