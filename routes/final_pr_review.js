/**
 * SYNOPSIS: HTTP route module — Final PR Review.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import { reviewBranch } from '../services/final_pr_review.js';

const router = express.Router();

// pull request final review endpoint
function finalReviewHandler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'Final PR review and merge for branch phase7-railway-probe',
    pullRequest: req.body || {},
  });
}

// POST /api/v1/pr/review
router.post('/review', finalReviewHandler);

export function registerFinalPrReviewRoutes(app) {
  app.use('/api/v1/pr', router);
}
