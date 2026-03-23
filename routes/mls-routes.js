/**
 * mls-routes.js
 * MLS deal scanner + investor registry API.
 *
 * Mounted at: /api/v1/mls
 *
 * Investor registry:
 *   GET    /investors             — list all investors
 *   POST   /investors             — create investor with buy-box criteria
 *   GET    /investors/:id         — investor + their deal matches
 *   PATCH  /investors/:id         — update investor criteria
 *   DELETE /investors/:id         — deactivate investor
 *
 * Deal scanning:
 *   POST   /scan                  — score 1+ listings against all investors
 *   GET    /matches               — all deal matches (filterable)
 *   GET    /matches/:id           — single match with full AI analysis
 *   POST   /matches/:id/draft     — draft offer in TransactionDesk for review
 *   POST   /matches/:id/pass      — mark as passed (not pursuing)
 *   POST   /matches/:id/status    — update status (under_contract, closed, etc.)
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 */

import express from 'express';

export function createMLSRoutes(app, { pool, requireKey, callCouncilMember, logger = console }) {
  const router = express.Router();

  async function getScanner() {
    const { createMLSDealScanner } = await import('../services/mls-deal-scanner.js');
    return createMLSDealScanner({ pool, callCouncilMember, logger });
  }

  // ── Investor Registry ──────────────────────────────────────────────────────

  // GET /api/v1/mls/investors
  router.get('/investors', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT i.*,
           COUNT(m.id)                                          AS total_matches,
           COUNT(m.id) FILTER (WHERE m.status='new')           AS new_matches,
           COUNT(m.id) FILTER (WHERE m.status='offer_drafted') AS offers_out
         FROM mls_investors i
         LEFT JOIN mls_deal_matches m ON m.investor_id = i.id
         WHERE i.active = ${req.query.include_inactive === 'true' ? 'true OR true' : 'true'}
         GROUP BY i.id
         ORDER BY i.name`
      );
      res.json({ ok: true, count: rows.length, investors: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/mls/investors
  router.post('/investors', requireKey, async (req, res) => {
    try {
      const {
        name, email, phone, investor_type = 'flipper', criteria = {}, notes,
      } = req.body || {};

      if (!name) return res.status(400).json({ ok: false, error: 'name is required' });

      const { rows } = await pool.query(
        `INSERT INTO mls_investors (name, email, phone, investor_type, criteria, notes)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [name, email || null, phone || null, investor_type, JSON.stringify(criteria), notes || null]
      );
      res.status(201).json({ ok: true, investor: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/mls/investors/:id
  router.get('/investors/:id', requireKey, async (req, res) => {
    try {
      const { rows: inv } = await pool.query(
        `SELECT * FROM mls_investors WHERE id=$1`, [parseInt(req.params.id)]
      );
      if (!inv[0]) return res.status(404).json({ ok: false, error: 'Investor not found' });

      const { rows: matches } = await pool.query(
        `SELECT * FROM mls_deal_matches WHERE investor_id=$1 ORDER BY ai_score DESC, created_at DESC LIMIT 50`,
        [inv[0].id]
      );
      res.json({ ok: true, investor: inv[0], matches, match_count: matches.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/mls/investors/:id
  router.patch('/investors/:id', requireKey, async (req, res) => {
    try {
      const { name, email, phone, investor_type, criteria, notes, active } = req.body || {};
      const fields = [];
      const params = [parseInt(req.params.id)];
      const add = (col, val) => { params.push(val); fields.push(`${col}=$${params.length}`); };

      if (name           !== undefined) add('name',          name);
      if (email          !== undefined) add('email',         email);
      if (phone          !== undefined) add('phone',         phone);
      if (investor_type  !== undefined) add('investor_type', investor_type);
      if (criteria       !== undefined) add('criteria',      JSON.stringify(criteria));
      if (notes          !== undefined) add('notes',         notes);
      if (active         !== undefined) add('active',        active);
      fields.push(`updated_at=NOW()`);

      const { rows } = await pool.query(
        `UPDATE mls_investors SET ${fields.join(',')} WHERE id=$1 RETURNING *`, params
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Investor not found' });
      res.json({ ok: true, investor: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // DELETE /api/v1/mls/investors/:id — soft delete (deactivate)
  router.delete('/investors/:id', requireKey, async (req, res) => {
    try {
      await pool.query(`UPDATE mls_investors SET active=false WHERE id=$1`, [parseInt(req.params.id)]);
      res.json({ ok: true, message: 'Investor deactivated' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Deal Scanning ──────────────────────────────────────────────────────────

  /**
   * POST /api/v1/mls/scan
   * Body: { listings: [{ mls_number, address, list_price, beds, baths, sqft,
   *                      year_built, dom, hoa_monthly, description, status, extra }] }
   *
   * Scores each listing against all active investors and stores matches.
   */
  router.post('/scan', requireKey, async (req, res) => {
    try {
      const { listings } = req.body || {};
      if (!Array.isArray(listings) || listings.length === 0) {
        return res.status(400).json({ ok: false, error: 'listings array required' });
      }
      if (listings.length > 50) {
        return res.status(400).json({ ok: false, error: 'Max 50 listings per scan' });
      }

      const scanner = await getScanner();
      const result = await scanner.scoreListings(listings);
      res.json(result);
    } catch (err) {
      logger.warn?.({ err: err.message }, '[MLS-ROUTES] scan error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/mls/matches
  router.get('/matches', requireKey, async (req, res) => {
    try {
      const scanner = await getScanner();
      const matches = await scanner.getMatches({
        investorId: req.query.investor_id ? parseInt(req.query.investor_id) : undefined,
        status:     req.query.status,
        minScore:   req.query.min_score ? parseInt(req.query.min_score) : undefined,
        limit:      parseInt(req.query.limit) || 50,
      });
      res.json({ ok: true, count: matches.length, matches });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/mls/matches/:id
  router.get('/matches/:id', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT m.*, i.name AS investor_name, i.investor_type, i.criteria, i.email AS investor_email
         FROM mls_deal_matches m JOIN mls_investors i ON i.id=m.investor_id
         WHERE m.id=$1`,
        [parseInt(req.params.id)]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Match not found' });
      res.json({ ok: true, match: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/mls/matches/:id/draft — draft offer in TransactionDesk
  router.post('/matches/:id/draft', requireKey, async (req, res) => {
    try {
      const { override_price } = req.body || {};
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createAccountManager }  = await import('../services/account-manager.js');
      const accountManager = createAccountManager(pool);
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });

      const scanner = await getScanner();
      const result = await scanner.draftOffer(parseInt(req.params.id), {
        tcBrowser,
        overridePrice: override_price ? parseFloat(override_price) : undefined,
      });
      res.json(result);
    } catch (err) {
      logger.warn?.({ err: err.message }, '[MLS-ROUTES] draft-offer error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/mls/matches/:id/pass
  router.post('/matches/:id/pass', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE mls_deal_matches SET status='passed', actioned_at=NOW(), notes=$2 WHERE id=$1 RETURNING *`,
        [parseInt(req.params.id), req.body?.notes || 'Passed']
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Match not found' });
      res.json({ ok: true, match: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/mls/matches/:id/status
  router.post('/matches/:id/status', requireKey, async (req, res) => {
    try {
      const { status, notes } = req.body || {};
      const validStatuses = ['new','reviewed','offer_drafted','offer_sent','under_contract','closed','passed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ ok: false, error: `status must be one of: ${validStatuses.join(', ')}` });
      }
      const { rows } = await pool.query(
        `UPDATE mls_deal_matches SET status=$2, actioned_at=NOW(), notes=$3 WHERE id=$1 RETURNING *`,
        [parseInt(req.params.id), status, notes || null]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Match not found' });
      res.json({ ok: true, match: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use('/api/v1/mls', router);
  logger.info?.('✅ [MLS-ROUTES] Mounted at /api/v1/mls');
}

export default createMLSRoutes;
