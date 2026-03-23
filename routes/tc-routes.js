/**
 * tc-routes.js
 * Transaction Coordinator API endpoints.
 *
 * Mounted at: /api/v1/tc
 * Deps: services/tc-coordinator.js
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const upload = multer({ dest: '/tmp/tc-uploads/' });

export function createTCRoutes(app, { pool, requireKey, coordinator, logger = console }) {
  const router = express.Router();

  // GET /api/v1/tc/dashboard — summary stats
  router.get('/dashboard', requireKey, async (req, res) => {
    try {
      const data = await coordinator.getDashboard();
      res.json({ ok: true, ...data });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] dashboard error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions — list all (filterable by ?status=)
  router.get('/transactions', requireKey, async (req, res) => {
    try {
      const status = req.query.status || null;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const where = status ? 'WHERE status=$1' : '';
      const params = status ? [status] : [];
      const { rows } = await pool.query(
        `SELECT * FROM tc_transactions ${where} ORDER BY close_date ASC NULLS LAST LIMIT ${limit}`,
        params
      );
      res.json({ ok: true, transactions: rows, count: rows.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id — single transaction + status report
  router.get('/transactions/:id', requireKey, async (req, res) => {
    try {
      const report = await coordinator.generateStatusReport(parseInt(req.params.id));
      if (!report) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      res.json({ ok: true, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions — manually create a transaction
  router.post('/transactions', requireKey, async (req, res) => {
    try {
      const {
        address, mls_number, purchase_price, agent_role, acceptance_date, close_date, parties,
        // fee fields
        waive_setup = false, setup_fee, closing_fee, closing_fee_note,
        client_name, client_email, client_phone,
      } = req.body || {};
      if (!address) return res.status(400).json({ ok: false, error: 'address is required' });

      const { computeKeyDates } = (await import('../services/tc-email-monitor.js')).createTCEmailMonitor?.({}) || {};
      const key_dates = acceptance_date
        ? { acceptance: acceptance_date, ...computeKeyDates?.(acceptance_date, close_date) || {} }
        : {};

      const row = await coordinator.insertTransaction({
        address, mls_number, purchase_price, agent_role,
        key_dates, close_date: close_date || key_dates.coe || null,
        parties: parties || {},
        notes: 'Manually created via API',
      });
      await coordinator.logEvent(row.id, 'created', { source: 'manual_api' });

      // Apply TC fees
      const { createTCPricing } = await import('../services/tc-pricing.js');
      const pricing = createTCPricing({ pool, logger });
      const fees = await pricing.applyToTransaction(row.id, {
        waivedSetup: !!waive_setup,
        customSetupFee:   setup_fee   != null ? parseFloat(setup_fee)   : undefined,
        customClosingFee: closing_fee != null ? parseFloat(closing_fee) : undefined,
        closingFeeNote: closing_fee_note,
        clientName: client_name, clientEmail: client_email, clientPhone: client_phone,
      });

      res.json({ ok: true, transaction: { ...row, ...fees } });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/process-email — parse email text and process as new contract
  router.post('/transactions/:id/process-email', requireKey, express.text({ limit: '500kb' }), async (req, res) => {
    try {
      const emailText = req.body;
      if (!emailText) return res.status(400).json({ ok: false, error: 'Email text required in body' });
      const result = await coordinator.processNewContract(emailText);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/process-email — process new contract from email text (no :id needed)
  router.post('/process-email', requireKey, express.text({ limit: '500kb' }), async (req, res) => {
    try {
      const emailText = req.body;
      if (!emailText) return res.status(400).json({ ok: false, error: 'Email text required in body' });
      const result = await coordinator.processNewContract(emailText);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/remind — manually trigger deadline reminder check
  router.post('/transactions/:id/remind', requireKey, async (req, res) => {
    try {
      const tx = await coordinator.getTransaction(parseInt(req.params.id));
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      const result = await coordinator.checkDeadlines();
      res.json({ ok: true, message: 'Deadline check triggered', ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/upload — upload document to TransactionDesk
  router.post('/transactions/:id/upload', requireKey, upload.single('document'), async (req, res) => {
    const tmpPath = req.file?.path;
    try {
      const tx = await coordinator.getTransaction(parseInt(req.params.id));
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      if (!tx.transaction_desk_id) {
        return res.status(400).json({ ok: false, error: 'Transaction not yet created in TransactionDesk' });
      }

      const docType = req.body?.docType || req.file?.originalname || 'document';
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const tcBrowser = createTCBrowserAgent({ accountManager: null, logger });

      const { session } = await tcBrowser.loginToGLVAR();
      await tcBrowser.navigateToTransactionDesk(session);
      const result = await tcBrowser.uploadDocument(session, tx.transaction_desk_id, tmpPath, docType);
      await session.close?.();

      await coordinator.logEvent(tx.id, 'doc_uploaded', { docType, ok: result.ok });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    } finally {
      if (tmpPath) await fs.unlink(tmpPath).catch(() => {});
    }
  });

  // POST /api/v1/tc/test-boldtrail — eXp Okta login → BoldTrail tile (same portal as SkySlope)
  router.post('/test-boldtrail', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createAccountManager } = await import('../services/account-manager.js');
      const accountManager = createAccountManager(pool);
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });

      const dryRun = req.body?.dryRun !== false;
      const loginResult = await tcBrowser.loginToExpOkta(dryRun);

      if (dryRun || !loginResult.ok) {
        await loginResult.session?.close?.();
        return res.json({ ok: loginResult.ok, dryRun: true, screenshots: loginResult.screenshots });
      }

      const navResult = await tcBrowser.navigateToBoldTrail(loginResult.session);
      await loginResult.session?.close?.();

      res.json({ ok: true, boldTrailUrl: navResult.url, screenshots: [...loginResult.screenshots, ...navResult.screenshots] });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] test-boldtrail error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Document Intake ───────────────────────────────────────────────────────

  // POST /api/v1/tc/intake/run — search email, find executed RPA, upload to SkySlope
  router.post('/intake/run', requireKey, async (req, res) => {
    try {
      const { days = 90, address, dry_run = true } = req.body || {};
      const { createTCDocIntake } = await import('../services/tc-doc-intake.js');
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createAccountManager } = await import('../services/account-manager.js');
      const accountManager = createAccountManager(pool);
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const intake = createTCDocIntake({ pool, tcBrowser, accountManager, logger });

      // Always dry_run=true first for safety unless explicitly set false
      const result = await intake.runFullIntake({ days, address, dryRun: dry_run !== false });
      res.json(result);
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] intake/run error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/intake/email-search — just search, don't upload
  router.post('/intake/email-search', requireKey, async (req, res) => {
    try {
      const { days = 90 } = req.body || {};
      const { createTCDocIntake } = await import('../services/tc-doc-intake.js');
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createAccountManager } = await import('../services/account-manager.js');
      const accountManager = createAccountManager(pool);
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const intake = createTCDocIntake({ pool, tcBrowser, accountManager, logger });
      const emails = await intake.findExecutedAgreements({ days });
      res.json({
        ok: true,
        found: emails.length,
        emails: emails.map(e => ({
          subject: e.subject, from: e.from, date: e.date,
          isRPA: e.isRPA, isListing: e.isListing,
          files: e.files.map(f => ({ filename: f.filename, docType: f.docType, size: f.size })),
        })),
      });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] email-search error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/intake/upload — manual file upload (scanned docs, photos)
  // Send as multipart/form-data with field "document" (file) + "doc_type" + "address"
  router.post('/intake/upload', requireKey, upload.single('document'), async (req, res) => {
    const tmpPath = req.file?.path;
    try {
      if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded. Use multipart field "document"' });

      const docType  = req.body?.doc_type || 'Transaction Document';
      const address  = req.body?.address  || null;
      const dryRun   = req.body?.dry_run === 'true';

      logger.info?.({ filename: req.file.originalname, docType, address, dryRun }, '[TC-ROUTES] Manual doc intake');

      if (dryRun) {
        return res.json({ ok: true, dryRun: true, filename: req.file.originalname, docType, size: req.file.size });
      }

      const { createTCDocIntake } = await import('../services/tc-doc-intake.js');
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createAccountManager } = await import('../services/account-manager.js');
      const accountManager = createAccountManager(pool);
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const intake = createTCDocIntake({ pool, tcBrowser, accountManager, logger });

      const result = await intake.uploadToSkySlope(
        [{ filePath: tmpPath, filename: req.file.originalname, docType }],
        { address }
      );

      res.json({ ok: true, filename: req.file.originalname, docType, ...result });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] intake/upload error');
      res.status(500).json({ ok: false, error: err.message });
    } finally {
      if (tmpPath) await fs.unlink(tmpPath).catch(() => {});
    }
  });

  // POST /api/v1/tc/test-glvar-login — dry-run GLVAR MLS login (screenshots, no form submit)
  router.post('/test-glvar-login', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createAccountManager } = await import('../services/account-manager.js');
      const accountManager = createAccountManager(pool);
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });

      const dryRun = req.body?.dryRun !== false; // default true — safe
      const result = await tcBrowser.loginToGLVAR(dryRun);
      await result.session?.close?.();

      res.json({ ok: true, dryRun: result.dryRun || false, screenshots: result.screenshots });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] test-glvar-login error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/test-skyslope-login — dry-run eXp Okta → SkySlope login
  router.post('/test-skyslope-login', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createAccountManager } = await import('../services/account-manager.js');
      const accountManager = createAccountManager(pool);
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });

      const dryRun = req.body?.dryRun !== false; // default true — safe
      const loginResult = await tcBrowser.loginToExpOkta(dryRun);

      if (dryRun || !loginResult.ok) {
        await loginResult.session?.close?.();
        return res.json({ ok: loginResult.ok, dryRun: true, screenshots: loginResult.screenshots });
      }

      // Full: navigate to SkySlope via Okta dashboard
      const navResult = await tcBrowser.navigateToSkySlope(loginResult.session);
      await loginResult.session?.close?.();

      res.json({ ok: true, skySlopeUrl: navResult.url, screenshots: [...loginResult.screenshots, ...navResult.screenshots] });
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] test-skyslope-login error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── TC Fees + Agent Clients ───────────────────────────────────────────────

  async function getPricing() {
    const { createTCPricing } = await import('../services/tc-pricing.js');
    return createTCPricing({ pool, logger });
  }

  // GET /api/v1/tc/plans — all available pricing plans
  router.get('/plans', async (req, res) => {
    try {
      const { PLAN_DETAILS } = await import('../services/tc-pricing.js');
      res.json({ ok: true, plans: PLAN_DETAILS });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Agent Client Registry ────────────────────────────────────────────────

  // GET /api/v1/tc/clients — all agent clients
  router.get('/clients', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const clients = await pricing.listAgentClients({ activeOnly: req.query.all !== 'true' });
      res.json({ ok: true, count: clients.length, clients });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/clients — enroll a new agent client
  router.post('/clients', requireKey, async (req, res) => {
    try {
      const { name, email, phone, plan, waive_setup, setup_fee, monthly_fee, notes } = req.body || {};
      if (!name || !email) return res.status(400).json({ ok: false, error: 'name and email required' });

      const pricing = await getPricing();
      const client = await pricing.createAgentClient({
        name, email, phone, plan,
        waivedSetup:      !!waive_setup,
        customSetupFee:   setup_fee   != null ? parseFloat(setup_fee)   : undefined,
        customMonthlyFee: monthly_fee != null ? parseFloat(monthly_fee) : undefined,
        notes,
      });
      res.status(201).json({ ok: true, client });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/clients/:id
  router.get('/clients/:id', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const client = await pricing.getAgentClient(
        isNaN(req.params.id) ? req.params.id : parseInt(req.params.id)
      );
      if (!client) return res.status(404).json({ ok: false, error: 'Client not found' });
      res.json({ ok: true, client });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/clients/:id/setup-paid — mark setup fee as received
  router.post('/clients/:id/setup-paid', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const client = await pricing.markSetupPaid(parseInt(req.params.id), {
        amountPaid: req.body?.amount ? parseFloat(req.body.amount) : undefined,
      });
      if (!client) return res.status(404).json({ ok: false, error: 'Client not found' });
      res.json({ ok: true, client });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/clients/:id/deactivate
  router.post('/clients/:id/deactivate', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const client = await pricing.deactivateClient(parseInt(req.params.id), req.body?.reason);
      if (!client) return res.status(404).json({ ok: false, error: 'Client not found' });
      res.json({ ok: true, client });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/fees/revenue — MRR, ARR, outstanding by plan
  router.get('/fees/revenue', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const summary = await pricing.getRevenueSummary();
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/fees/config — current default pricing
  router.get('/fees/config', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const config = await pricing.getConfig();
      res.json({ ok: true, config });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/fees/config — update default pricing
  router.patch('/fees/config', requireKey, async (req, res) => {
    try {
      const { default_setup_fee, default_closing_fee, waive_setup_allowed, min_closing_fee, notes } = req.body || {};
      const pricing = await getPricing();
      const config = await pricing.updateConfig({
        defaultSetupFee:   default_setup_fee   != null ? parseFloat(default_setup_fee)   : undefined,
        defaultClosingFee: default_closing_fee  != null ? parseFloat(default_closing_fee) : undefined,
        waiveSetupAllowed: waive_setup_allowed  != null ? !!waive_setup_allowed           : undefined,
        minClosingFee:     min_closing_fee      != null ? parseFloat(min_closing_fee)     : undefined,
        notes,
      });
      res.json({ ok: true, config });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/fees/summary — totals: earned, pending, outstanding
  router.get('/fees/summary', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const [summary, outstanding] = await Promise.all([
        pricing.getFeeSummary(),
        pricing.getOutstandingFees(),
      ]);
      res.json({ ok: true, summary, outstanding });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PATCH /api/v1/tc/transactions/:id/fees — update fees on an existing transaction
  router.patch('/transactions/:id/fees', requireKey, async (req, res) => {
    try {
      const { waive_setup, setup_fee, closing_fee, closing_fee_note, client_name, client_email, client_phone } = req.body || {};
      const pricing = await getPricing();
      const fees = await pricing.applyToTransaction(parseInt(req.params.id), {
        waivedSetup:      waive_setup  != null ? !!waive_setup                            : undefined,
        customSetupFee:   setup_fee    != null ? parseFloat(setup_fee)                    : undefined,
        customClosingFee: closing_fee  != null ? parseFloat(closing_fee)                  : undefined,
        closingFeeNote: closing_fee_note,
        clientName: client_name, clientEmail: client_email, clientPhone: client_phone,
      });
      if (!fees) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      res.json({ ok: true, fees });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/transactions/:id/fees/collect — mark closing fee collected
  router.post('/transactions/:id/fees/collect', requireKey, async (req, res) => {
    try {
      const { amount_collected, notes } = req.body || {};
      const pricing = await getPricing();
      const tx = await pricing.markCollected(parseInt(req.params.id), {
        amountCollected: amount_collected ? parseFloat(amount_collected) : undefined,
        notes,
      });
      if (!tx) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      await pool.query(
        `INSERT INTO tc_transaction_events (transaction_id, event_type, payload) VALUES ($1,'fee_collected',$2)`,
        [tx.id, JSON.stringify({ amount: amount_collected, notes })]
      ).catch(() => {});
      res.json({ ok: true, transaction: tx });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/transactions/:id/fees/statement — plain-text fee statement
  router.get('/transactions/:id/fees/statement', requireKey, async (req, res) => {
    try {
      const pricing = await getPricing();
      const statement = await pricing.generateFeeStatement(parseInt(req.params.id));
      if (!statement) return res.status(404).json({ ok: false, error: 'Transaction not found' });
      res.type('text/plain').send(statement);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GLVAR Dues Monitor ────────────────────────────────────────────────────

  // GET /api/v1/tc/glvar/dues — last scraped dues status (no browser needed)
  router.get('/glvar/dues', requireKey, async (req, res) => {
    try {
      const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
      const monitor = createGLVARMonitor({ pool, logger });
      const dues = await monitor.getDuesStatus();
      const overdue  = dues.filter(d => d.daysUntilDue !== null && d.daysUntilDue < 0 && !d.paid_at);
      const upcoming = dues.filter(d => d.daysUntilDue !== null && d.daysUntilDue >= 0 && d.daysUntilDue <= 30 && !d.paid_at);
      res.json({ ok: true, dues, overdue, upcoming });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/glvar/check-dues — login, scrape, store, alert if needed
  router.post('/glvar/check-dues', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createAccountManager } = await import('../services/account-manager.js');
      const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
      const accountManager = createAccountManager(pool);
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const { createNotificationService } = await import('../core/notification-service.js');
      const notificationService = createNotificationService();

      const monitor = createGLVARMonitor({ pool, tcBrowser, accountManager, notificationService, logger });
      const result = await monitor.checkDues();
      res.json(result);
    } catch (err) {
      logger.warn?.({ err: err.message }, '[TC-ROUTES] check-dues error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/glvar/dues/:id/mark-paid — mark a dues item as paid
  router.post('/glvar/dues/:id/mark-paid', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE glvar_dues_log SET paid_at = NOW(), notes = $2 WHERE id = $1 RETURNING *`,
        [parseInt(req.params.id), req.body?.notes || null]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Dues entry not found' });
      res.json({ ok: true, dues: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/tc/glvar/violations — recent violation notices detected
  router.get('/glvar/violations', requireKey, async (req, res) => {
    try {
      const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
      const monitor = createGLVARMonitor({ pool, logger });
      const violations = await monitor.getViolationsLog({ limit: parseInt(req.query.limit) || 50 });
      res.json({ ok: true, count: violations.length, violations });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/glvar/check-violations — run inbox scan now
  router.post('/glvar/check-violations', requireKey, async (req, res) => {
    try {
      const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
      const { createNotificationService } = await import('../core/notification-service.js');
      const notificationService = createNotificationService();
      const monitor = createGLVARMonitor({ pool, notificationService, logger });
      const result = await monitor.checkViolationEmails();
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/glvar/violations/:id/resolve — mark a violation as resolved
  router.post('/glvar/violations/:id/resolve', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE glvar_violations_log SET resolved_at=NOW(), notes=$2 WHERE id=$1 RETURNING *`,
        [parseInt(req.params.id), req.body?.notes || null]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Violation not found' });
      res.json({ ok: true, violation: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Email Triage ──────────────────────────────────────────────────────────

  // GET /api/v1/tc/email/triage — get triaged emails (filterable)
  router.get('/email/triage', requireKey, async (req, res) => {
    try {
      const { createEmailTriage } = await import('../services/email-triage.js');
      const triage = createEmailTriage({ pool, logger });
      const { category, action_required, limit, since } = req.query;
      const items = await triage.getTriagedEmails({
        category,
        actionRequired: action_required === 'true' ? true : action_required === 'false' ? false : undefined,
        limit: parseInt(limit) || 50,
        since,
      });
      const unactioned = items.filter(i => i.action_required && !i.actioned_at);
      res.json({ ok: true, count: items.length, unactioned: unactioned.length, items });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/email/scan — trigger inbox scan now
  router.post('/email/scan', requireKey, async (req, res) => {
    try {
      const { createEmailTriage } = await import('../services/email-triage.js');
      const { createNotificationService } = await import('../core/notification-service.js');
      const notificationService = createNotificationService();
      const triage = createEmailTriage({ pool, notificationService, callCouncilMember, logger });
      const result = await triage.scanInbox();
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/email/triage/:id/action — mark an email as handled
  router.post('/email/triage/:id/action', requireKey, async (req, res) => {
    try {
      const { createEmailTriage } = await import('../services/email-triage.js');
      const triage = createEmailTriage({ pool, logger });
      const item = await triage.markActioned(parseInt(req.params.id), req.body?.notes || null);
      if (!item) return res.status(404).json({ ok: false, error: 'Email not found' });
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/tc/test-glvar-mls — login to GLVAR then navigate to MLS
  router.post('/test-glvar-mls', requireKey, async (req, res) => {
    try {
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const { createAccountManager } = await import('../services/account-manager.js');
      const accountManager = createAccountManager(pool);
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });

      const dryRun = req.body?.dryRun !== false;
      const loginResult = await tcBrowser.loginToGLVAR(dryRun);

      if (dryRun || !loginResult.ok) {
        await loginResult.session?.close?.();
        return res.json({ ok: loginResult.ok, dryRun: true, screenshots: loginResult.screenshots });
      }

      const navResult = await tcBrowser.navigateToMLS(loginResult.session);
      await loginResult.session?.close?.();
      res.json({ ok: true, mlsUrl: navResult.url, screenshots: [...loginResult.screenshots, ...navResult.screenshots] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use('/api/v1/tc', router);
  logger.info?.('✅ [TC-ROUTES] Mounted at /api/v1/tc');
}

export default createTCRoutes;
