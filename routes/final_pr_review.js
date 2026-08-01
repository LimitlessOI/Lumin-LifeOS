/**
 * SYNOPSIS: Exposes a POST endpoint for final pull request review and merge.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import { reviewBranch } from '../services/final_pr_review.js';

export function registerFinalPrReview(app, deps) {
  app.post('/api/v1/pr/review', deps.requireKey, async (req, res, next) => {
    try {
      const { branchName } = req.body; // Assuming branchName is sent in the request body
      // Validate branchName if necessary
      if (!branchName) {
        return res.status(400).json({ error: 'branchName is required for final review' });
      }
      const result = await reviewBranch(branchName);
      res.json({ message: `Final review and merge initiated for pull request branch: ${branchName}`, details: result });
    } catch (error) {
      deps.logger.error({ error }, 'Error in final_pr_review route for pull request');
      next(error);
    }
  });
}