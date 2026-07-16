/**
 * SYNOPSIS: js — backups/sandbox_backup_20260102/opp_1765165991012_3vzikp/routes/api/market_research.js.
 */
const express = require('express');
const router = new express.Router();

router.get('/', async (req, res) => {
  // Fetch market research data related to subscriber interests in niche markets
  const response = await MarketResearchService.fetchData(req);
  return res.json(response);
});

router.put('/:userId/market-research', async (req, res) => {
  // Update market research data related to subscriber interests in niche markets for the given userId
  const response = await MarketResearchService.updateData(req.params.userId, req);
  return res.json(response);
});

module.exports = router;