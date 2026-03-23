/**
 * mls-deal-scanner.js
 * Scores MLS listings against investor buy-box criteria.
 *
 * Flow:
 *   1. Receive listing data (manually submitted or browser-scraped)
 *   2. AI estimates ARV, repair cost, profit, score (1-10), red flags
 *   3. Match against all active investors whose criteria the listing meets
 *   4. Store matches in mls_deal_matches
 *   5. Return ranked matches for review
 *
 * Deps: services/council-service.js (AI), pool (Neon)
 * Exports: createMLSDealScanner(deps)
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 */

// Nevada average cost-per-sqft repair tiers (rough estimates for AI guidance)
const REPAIR_TIERS = {
  cosmetic:  20,   // paint, carpet, fixtures
  moderate:  45,   // kitchen, baths, flooring
  heavy:     80,   // roof, HVAC, structural
  gut:       120,  // full renovation
};

export function createMLSDealScanner({ pool, callCouncilMember, logger = console }) {

  // ── AI Analysis ────────────────────────────────────────────────────────────

  /**
   * Use AI to estimate ARV, repairs, profit, score, and red flags.
   * Returns structured analysis object.
   */
  async function analyzeListing(listing) {
    if (!callCouncilMember) {
      return _fallbackAnalysis(listing);
    }

    const prompt = [
      `You are a Las Vegas real estate investment analyst. Analyze this MLS listing for flip potential.`,
      ``,
      `Listing:`,
      `  Address:     ${listing.address}`,
      `  List Price:  $${listing.list_price?.toLocaleString() || 'Unknown'}`,
      `  Beds/Baths:  ${listing.beds || '?'} bed / ${listing.baths || '?'} bath`,
      `  Sqft:        ${listing.sqft?.toLocaleString() || 'Unknown'}`,
      `  Year Built:  ${listing.year_built || 'Unknown'}`,
      `  DOM:         ${listing.dom ?? 'Unknown'} days on market`,
      `  HOA:         ${listing.hoa_monthly ? `$${listing.hoa_monthly}/mo` : 'None/Unknown'}`,
      `  Status:      ${listing.status || 'Active'}`,
      `  Description: ${listing.description?.substring(0, 400) || 'N/A'}`,
      `  Extra:       ${listing.extra || ''}`,
      ``,
      `Respond in JSON only (no markdown):`,
      `{`,
      `  "estimated_arv": <number>,`,
      `  "estimated_repairs": <number>,`,
      `  "repair_tier": "cosmetic|moderate|heavy|gut",`,
      `  "estimated_profit": <arv minus list_price minus repairs>,`,
      `  "margin_pct": <profit / arv * 100, 1 decimal>,`,
      `  "offer_price_suggestion": <price that achieves 25% margin>,`,
      `  "ai_score": <1-10 integer, 10=best deal>,`,
      `  "ai_summary": "<2 sentence plain-English summary of why this is or isn't a good deal>",`,
      `  "ai_red_flags": ["<flag1>", "<flag2>"]`,
      `}`,
    ].join('\n');

    try {
      const raw = await callCouncilMember('anthropic', prompt, { taskType: 'analysis', maxTokens: 400 });
      const text = typeof raw === 'string' ? raw : raw?.content || '';
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        estimated_arv:          Number(parsed.estimated_arv)          || null,
        estimated_repairs:      Number(parsed.estimated_repairs)      || null,
        estimated_profit:       Number(parsed.estimated_profit)       || null,
        margin_pct:             Number(parsed.margin_pct)             || null,
        offer_price_suggestion: Number(parsed.offer_price_suggestion) || null,
        ai_score:               Math.min(10, Math.max(1, parseInt(parsed.ai_score) || 5)),
        ai_summary:             parsed.ai_summary || '',
        ai_red_flags:           Array.isArray(parsed.ai_red_flags) ? parsed.ai_red_flags : [],
      };
    } catch (err) {
      logger.warn?.({ err: err.message }, '[MLS-SCANNER] AI analysis parse error — using fallback');
      return _fallbackAnalysis(listing);
    }
  }

  function _fallbackAnalysis(listing) {
    const price = listing.list_price || 0;
    const sqft  = listing.sqft || 1200;
    const repairEstimate = sqft * REPAIR_TIERS.moderate;
    const arv = price * 1.35; // rough 35% above purchase
    const profit = arv - price - repairEstimate;
    const margin = arv > 0 ? (profit / arv * 100) : 0;

    return {
      estimated_arv:          Math.round(arv),
      estimated_repairs:      repairEstimate,
      estimated_profit:       Math.round(profit),
      margin_pct:             parseFloat(margin.toFixed(1)),
      offer_price_suggestion: Math.round(arv * 0.7 - repairEstimate), // 70% rule
      ai_score:               margin >= 20 ? 7 : margin >= 10 ? 5 : 3,
      ai_summary:             `Rough estimate only — AI unavailable. Margin ~${margin.toFixed(0)}%.`,
      ai_red_flags:           ['AI analysis unavailable — manual review required'],
    };
  }

  // ── Investor matching ───────────────────────────────────────────────────────

  /**
   * Check if a listing + AI analysis meets an investor's buy box.
   * Returns { matches: bool, reasons: string[] }
   */
  function matchesCriteria(listing, analysis, criteria) {
    const reasons = [];

    if (criteria.price_min && listing.list_price < criteria.price_min) {
      reasons.push(`Price $${listing.list_price?.toLocaleString()} below minimum $${criteria.price_min?.toLocaleString()}`);
    }
    if (criteria.price_max && listing.list_price > criteria.price_max) {
      reasons.push(`Price $${listing.list_price?.toLocaleString()} above maximum $${criteria.price_max?.toLocaleString()}`);
    }
    if (criteria.min_margin_pct && analysis.margin_pct < criteria.min_margin_pct) {
      reasons.push(`Margin ${analysis.margin_pct?.toFixed(1)}% below minimum ${criteria.min_margin_pct}%`);
    }
    if (criteria.max_repair_estimate && analysis.estimated_repairs > criteria.max_repair_estimate) {
      reasons.push(`Repairs ~$${analysis.estimated_repairs?.toLocaleString()} exceed max $${criteria.max_repair_estimate?.toLocaleString()}`);
    }
    if (criteria.min_beds && listing.beds < criteria.min_beds) {
      reasons.push(`${listing.beds} beds below minimum ${criteria.min_beds}`);
    }
    if (criteria.min_baths && listing.baths < criteria.min_baths) {
      reasons.push(`${listing.baths} baths below minimum ${criteria.min_baths}`);
    }
    if (criteria.min_sqft && listing.sqft < criteria.min_sqft) {
      reasons.push(`${listing.sqft} sqft below minimum ${criteria.min_sqft}`);
    }
    if (criteria.max_dom && listing.dom > criteria.max_dom) {
      reasons.push(`${listing.dom} DOM exceeds max ${criteria.max_dom}`);
    }
    if (criteria.avoid_hoa && listing.hoa_monthly > 0) {
      reasons.push(`Has HOA $${listing.hoa_monthly}/mo (investor avoids HOA)`);
    }
    if (criteria.max_hoa_monthly && listing.hoa_monthly > criteria.max_hoa_monthly) {
      reasons.push(`HOA $${listing.hoa_monthly}/mo exceeds max $${criteria.max_hoa_monthly}/mo`);
    }
    if (criteria.areas?.length) {
      const addr = listing.address?.toLowerCase() || '';
      const zip  = listing.zip || '';
      const inArea = criteria.areas.some(a =>
        addr.includes(a.toLowerCase()) || zip.includes(a)
      );
      if (!inArea) {
        reasons.push(`Area not in investor's target zones: ${criteria.areas.join(', ')}`);
      }
    }

    return { matches: reasons.length === 0, reasons };
  }

  // ── Main entry point ────────────────────────────────────────────────────────

  /**
   * Score one or more listings against all active investors.
   * listings: [{ mls_number, address, list_price, beds, baths, sqft,
   *              year_built, dom, hoa_monthly, description, status, extra }]
   * Returns: { matches: [...], skipped: [...] }
   */
  async function scoreListings(listings) {
    const { rows: investors } = await pool.query(
      `SELECT * FROM mls_investors WHERE active = true ORDER BY name`
    ).catch(() => ({ rows: [] }));

    if (!investors.length) {
      return { ok: false, error: 'No active investors in registry. Add investors first via POST /api/v1/mls/investors' };
    }

    const allMatches = [];
    const skipped    = [];

    for (const listing of listings) {
      if (!listing.list_price || !listing.mls_number) {
        skipped.push({ listing, reason: 'Missing list_price or mls_number' });
        continue;
      }

      logger.info?.({ mls: listing.mls_number }, '[MLS-SCANNER] Analyzing listing');
      const analysis = await analyzeListing(listing);

      for (const investor of investors) {
        const criteria = investor.criteria || {};
        const { matches, reasons } = matchesCriteria(listing, analysis, criteria);

        if (!matches) {
          logger.info?.({ mls: listing.mls_number, investor: investor.name, reasons }, '[MLS-SCANNER] No match');
          continue;
        }

        // Store match
        const { rows } = await pool.query(
          `INSERT INTO mls_deal_matches
             (investor_id, mls_number, address, list_price, beds, baths, sqft, dom,
              listing_data, estimated_arv, estimated_repairs, estimated_profit,
              margin_pct, ai_score, ai_summary, ai_red_flags, offer_price_suggestion)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (investor_id, mls_number) DO UPDATE SET
             ai_score               = EXCLUDED.ai_score,
             ai_summary             = EXCLUDED.ai_summary,
             estimated_arv          = EXCLUDED.estimated_arv,
             estimated_repairs      = EXCLUDED.estimated_repairs,
             estimated_profit       = EXCLUDED.estimated_profit,
             margin_pct             = EXCLUDED.margin_pct,
             offer_price_suggestion = EXCLUDED.offer_price_suggestion,
             listing_data           = EXCLUDED.listing_data
           RETURNING *`,
          [
            investor.id, listing.mls_number, listing.address, listing.list_price,
            listing.beds, listing.baths, listing.sqft, listing.dom,
            JSON.stringify(listing),
            analysis.estimated_arv, analysis.estimated_repairs, analysis.estimated_profit,
            analysis.margin_pct, analysis.ai_score, analysis.ai_summary, analysis.ai_red_flags,
            analysis.offer_price_suggestion,
          ]
        ).catch(() => ({ rows: [] }));

        if (rows[0]) {
          allMatches.push({ ...rows[0], investor_name: investor.name, investor_email: investor.email });
          logger.info?.({ mls: listing.mls_number, investor: investor.name, score: analysis.ai_score }, '[MLS-SCANNER] Match stored');
        }
      }
    }

    // Sort by score desc
    allMatches.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));

    return { ok: true, matched: allMatches.length, skipped: skipped.length, matches: allMatches };
  }

  // ── Offer drafting ─────────────────────────────────────────────────────────

  /**
   * Draft an offer in TransactionDesk for a deal match.
   * Returns the deal match row with transaction_desk_id populated.
   */
  async function draftOffer(matchId, { tcBrowser, overridePrice } = {}) {
    const { rows } = await pool.query(
      `SELECT m.*, i.name AS investor_name, i.email AS investor_email, i.phone AS investor_phone
       FROM mls_deal_matches m JOIN mls_investors i ON i.id = m.investor_id
       WHERE m.id = $1`,
      [matchId]
    );
    const match = rows[0];
    if (!match) throw new Error(`Deal match ${matchId} not found`);

    const offerPrice = overridePrice || match.offer_price_suggestion || match.list_price;

    if (!tcBrowser) {
      throw new Error('tcBrowser required to draft offer in TransactionDesk');
    }

    const { session } = await tcBrowser.loginToGLVAR(false);
    try {
      await tcBrowser.navigateToTransactionDesk(session);
      const result = await tcBrowser.createTransaction(session, {
        address:    match.address,
        mls_number: match.mls_number,
        // TransactionDesk form fields — price set to offer price
        extra: `Offer Price: $${offerPrice?.toLocaleString()} | Investor: ${match.investor_name}`,
      });

      await pool.query(
        `UPDATE mls_deal_matches
         SET status='offer_drafted', offer_drafted_at=NOW(), transaction_desk_id=$2, notes=$3
         WHERE id=$1`,
        [matchId, result.transactionDeskId, `Offer drafted at $${offerPrice?.toLocaleString()}`]
      );

      logger.info?.({ matchId, offerPrice, tdId: result.transactionDeskId }, '[MLS-SCANNER] Offer drafted in TransactionDesk');
      return { ok: true, offerPrice, transactionDeskId: result.transactionDeskId, screenshots: result.screenshots };
    } finally {
      await session?.close?.().catch(() => {});
    }
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async function getMatches({ investorId, status, minScore, limit = 50 } = {}) {
    const conditions = ['1=1'];
    const params = [];
    if (investorId) conditions.push(`m.investor_id=$${params.push(investorId)}`);
    if (status)     conditions.push(`m.status=$${params.push(status)}`);
    if (minScore)   conditions.push(`m.ai_score>=$${params.push(minScore)}`);

    const { rows } = await pool.query(
      `SELECT m.*, i.name AS investor_name, i.investor_type
       FROM mls_deal_matches m
       JOIN mls_investors i ON i.id = m.investor_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.ai_score DESC, m.created_at DESC
       LIMIT $${params.push(Math.min(limit, 200))}`,
      params
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  return { scoreListings, draftOffer, getMatches, analyzeListing };
}
