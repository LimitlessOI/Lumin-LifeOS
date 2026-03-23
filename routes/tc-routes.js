/**
 * tc-routes.js
 * Transaction Coordinator API endpoints.
 *
 * Mounted at: /api/v1/tc
 * Deps: services/tc-coordinator.js
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
      const { address, mls_number, purchase_price, agent_role, acceptance_date, close_date, parties } = req.body || {};
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

      res.json({ ok: true, transaction: row });
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

  app.use('/api/v1/tc', router);
  logger.info?.('✅ [TC-ROUTES] Mounted at /api/v1/tc');
}

export default createTCRoutes;
