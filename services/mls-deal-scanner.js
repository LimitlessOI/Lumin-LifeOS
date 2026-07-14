/**
 * SYNOPSIS: Service for AI deal scoring and investor criteria matching. * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */

export function createTcService({ pool, logger, callCouncilMember }) {

  /**
   * Scores a single deal against investor criteria using AI. * @param {object} deal - The deal object with properties like list_price, address, description, etc. * @returns {Promise<object>} - The AI analysis result. */
  async function scoreDeal(deal) {
    if (!callCouncilMember) {
      logger.warn('[TC-SERVICE] callCouncilMember is not available. Using fallback analysis.');
      return _fallbackDealAnalysis(deal);
    }

    const prompt = [
      `You are a real estate investment analyst. Analyze this deal for its potential.`,
      ``,
      `Deal:`,
      `  Address:     ${deal.address || 'Unknown'}`,
      `  List Price:  $${deal.list_price?.toLocaleString() || 'Unknown'}`,
      `  Description: ${deal.description?.substring(0, 400) || 'N/A'}`,
      `  Extra Info:  ${deal.extra_info || ''}`,
      ``,
      `Respond in JSON only (no markdown):`,
      `{`,
      `  "estimated_value": <number>,`,
      `  "estimated_costs": <number>,`,
      `  "estimated_profit": <estimated_value minus list_price minus estimated_costs>,`,
      `  "margin_pct": <profit / estimated_value * 100, 1 decimal>,`,
      `  "ai_score": <1-10 integer, 10=best deal>,`,
      `  "ai_summary": "<2 sentence plain-English summary of why this is or isn't a good deal>",`,
      `  "ai_red_flags": ["<flag1>", "<flag2>"]`,
      `}`,
    ].join('\n');

    try {
      const raw = await callCouncilMember('anthropic', prompt, { taskType: 'deal_analysis', maxTokens: 400 });
      const text = typeof raw === 'string' ? raw : raw?.content || '';
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        estimated_value:        Number(parsed.estimated_value)        || null,
        estimated_costs:        Number(parsed.estimated_costs)        || null,
        estimated_profit:       Number(parsed.estimated_profit)       || null,
        margin_pct:             Number(parsed.margin_pct)             || null,
        ai_score:               Math.min(10, Math.max(1, parseInt(parsed.ai_score) || 5)),
        ai_summary:             parsed.ai_summary || '',
        ai_red_flags:           Array.isArray(parsed.ai_red_flags) ? parsed.ai_red_flags : [],
      };
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-SERVICE] AI deal analysis parse error — using fallback');
      return _fallbackDealAnalysis(deal);
    }
  }

  function _fallbackDealAnalysis(deal) {
    const price = deal.list_price || 0;
    const estimatedCosts = price * 0.15; // 15% for general costs
    const estimatedValue = price * 1.25; // rough 25% above purchase
    const profit = estimatedValue - price - estimatedCosts;
    const margin = estimatedValue > 0 ? (profit / estimatedValue * 100) : 0;

    return {
      estimated_value:  Math.round(estimatedValue),
      estimated_costs:  Math.round(estimatedCosts),
      estimated_profit: Math.round(profit),
      margin_pct:       parseFloat(margin.toFixed(1)),
      ai_score:         margin >= 15 ? 7 : margin >= 5 ? 5 : 3,
      ai_summary:       `Rough estimate only — AI unavailable. Margin ~${margin.toFixed(0)}%.`,
      ai_red_flags:     ['AI analysis unavailable — manual review required'],
    };
  }

  /**
   * Checks if a deal and its AI analysis meet an investor's criteria. * @param {object} deal - The deal object. * @param {object} analysis - The AI analysis of the deal. * @param {object} criteria - The investor's criteria object. * @returns {{matches: boolean, reasons: string[]}}
   */
  function matchesInvestorCriteria(deal, analysis, criteria) {
    const reasons = [];

    if (criteria.min_list_price && deal.list_price < criteria.min_list_price) {
      reasons.push(`List price $${deal.list_price?.toLocaleString()} below minimum $${criteria.min_list_price?.toLocaleString()}`);
    }
    if (criteria.max_list_price && deal.list_price > criteria.max_list_price) {
      reasons.push(`List price $${deal.list_price?.toLocaleString()} above maximum $${criteria.max_list_price?.toLocaleString()}`);
    }
    if (criteria.min_ai_score && analysis.ai_score < criteria.min_ai_score) {
      reasons.push(`AI score ${analysis.ai_score} below minimum ${criteria.min_ai_score}`);
    }
    if (criteria.min_margin_pct && analysis.margin_pct < criteria.min_margin_pct) {
      reasons.push(`Margin ${analysis.margin_pct?.toFixed(1)}% below minimum ${criteria.min_margin_pct}%`);
    }
    if (criteria.max_estimated_costs && analysis.estimated_costs > criteria.max_estimated_costs) {
      reasons.push(`Estimated costs ~$${analysis.estimated_costs?.toLocaleString()} exceed max $${criteria.max_estimated_costs?.toLocaleString()}`);
    }
    if (criteria.required_keywords?.length) {
      const description = deal.description?.toLowerCase() || '';
      const missingKeywords = criteria.required_keywords.filter(kw => !description.includes(kw.toLowerCase()));
      if (missingKeywords.length > 0) {
        reasons.push(`Missing required keywords: ${missingKeywords.join(', ')}`);
      }
    }
    if (criteria.excluded_keywords?.length) {
      const description = deal.description?.toLowerCase() || '';
      const excludedFound = criteria.excluded_keywords.filter(kw => description.includes(kw.toLowerCase()));
      if (excludedFound.length > 0) {
        reasons.push(`Contains excluded keywords: ${excludedFound.join(', ')}`);
      }
    }

    return { matches: reasons.length === 0, reasons };
  }

  /**
   * Finds all active investors. * @returns {Promise<Array>} - List of investor objects. */
  async function getActiveInvestors() {
    const { rows } = await pool.query(
      `SELECT id, name, criteria FROM investors WHERE active = true ORDER BY name`
    );
    return rows;
  }

  /**
   * Processes a deal, scores it, and matches it against active investors. * Stores the deal and its matches in the database. * @param {string} userId - The ID of the user submitting the deal. * @param {object} dealData - The raw deal data. * @returns {Promise<object>} - The processed deal with matches. * @param {string} dealId - The ID of the deal. * @param {string} userId - The ID of the user. * @returns {Promise<object>} - The deal object. */
  async function getDeal(dealId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM deals WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [dealId, userId]
    );
    if (!rows[0]) {
      const err = new Error('deal_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  /**
   * Lists deals for a specific user, optionally filtered by status or AI score. * @param {string} userId - The ID of the user. * @param {object} options - Filtering options: { status, minAiScore, limit }. * @returns {Promise<Array>} - List of deal objects. */
  async function listDeals(userId, { status, minAiScore, limit = 50 } = {}) {
    const conditions = ['user_id = $1'];
    const params = [userId];
    let paramIndex = 1;

    if (status) {
      paramIndex++;
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
    }
    if (minAiScore) {
      paramIndex++;
      conditions.push(`ai_score >= $${paramIndex}`);
      params.push(minAiScore);
    }

    paramIndex++;
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    params.push(lim);

    const { rows } = await pool.query(
      `SELECT * FROM deals WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${paramIndex}`,
      params
    );
    return rows;
  }

  /**
   * Lists investor matches for a specific deal. * @param {string} dealId - The ID of the deal. * @param {string} userId - The ID of the user (for authorization). * @returns {Promise<Array>} - List of deal-investor match objects. */
  async function listDealMatches(dealId, userId) {
    // Ensure the user owns the deal
    const deal = await getDeal(dealId, userId);

    const { rows } = await pool.query(
      `SELECT dim.*, i.name AS investor_name, i.email AS investor_email
       FROM deal_investor_matches dim
       JOIN investors i ON i.id = dim.investor_id
       WHERE dim.deal_id = $1
       ORDER BY dim.match_score DESC`,
      [dealId]
    );
    return rows;
  }

  /**
   * Updates the status of a deal. * @param {string} dealId - The ID of the deal. * @param {string} userId - The ID of the user. * @param {string} newStatus - The new status for the deal. * @returns {Promise<object>} - The updated deal object. */
  async function updateDealStatus(dealId, userId, newStatus) {
    const validStatuses = new Set(['pending', 'approved', 'rejected', 'closed', 'archived']);
    if (!validStatuses.has(newStatus)) {
      const err = new Error('invalid_deal_status');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `UPDATE deals SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *`,
      [newStatus, dealId, userId]
    );
    if (!rows[0]) {
      const err = new Error('deal_not_found_or_unauthorized');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  return {
    scoreDeal,
    matchesInvestorCriteria,
    getActiveInvestors,
    processDeal,
    getDeal,
    listDeals,
    listDealMatches,
    updateDealStatus,
  };
}

export const createMLSDealScanner = createTcService;
export default createTcService;