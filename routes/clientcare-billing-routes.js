/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-billing-routes.js
 * ClientCare billing rescue, browser fallback readiness, and claim action queue.
 */

import express from 'express';
import { createClientCareBillingService } from '../services/clientcare-billing-service.js';
import { createClientCareBrowserService } from '../services/clientcare-browser-service.js';
import { createClientCareSyncService } from '../services/clientcare-sync-service.js';

export function createClientCareBillingRoutes({ pool, requireKey, logger = console }) {
  const router = express.Router();
  const billingService = createClientCareBillingService({ pool, logger });
  const browserService = createClientCareBrowserService({});
  const syncService = createClientCareSyncService({ billingService, logger });

  router.use(express.json({ limit: '5mb' }));
  router.use(requireKey);

  router.get('/dashboard', async (_req, res) => {
    try {
      res.json({ ok: true, dashboard: await billingService.getDashboard() });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] dashboard failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/clientcare/readiness', async (_req, res) => {
    res.json({ ok: true, readiness: browserService.getReadiness() });
  });

  router.get('/claims/import-template', async (_req, res) => {
    res.json({ ok: true, fields: billingService.getImportTemplate() });
  });

  router.post('/snapshots/parse', async (req, res) => {
    try {
      const claims = syncService.parseSnapshot(req.body || {});
      const preview = claims.slice(0, 50);
      res.json({ ok: true, parsed: claims.length, preview });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] parse snapshot failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/snapshots/import', async (req, res) => {
    try {
      const result = await syncService.importSnapshot(req.body || {});
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] import snapshot failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/reconciliation', async (req, res) => {
    try {
      const reconciliation = await syncService.buildReconciliationSummary(req.query || {});
      res.json({ ok: true, ...reconciliation });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] reconciliation failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/claims', async (req, res) => {
    try {
      const claims = await billingService.listClaims(req.query || {});
      res.json({ ok: true, claims });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] list claims failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/claims/import', async (req, res) => {
    try {
      const claims = Array.isArray(req.body?.claims) ? req.body.claims : [];
      if (!claims.length) return res.status(400).json({ ok: false, error: 'claims[] required' });
      const results = await billingService.importClaims(claims, { source: req.body?.source || 'manual_import' });
      const imported = results.filter((item) => !item.error).length;
      const failed = results.filter((item) => item.error).length;
      res.json({ ok: true, imported, failed, results });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] import failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/claims/import-csv', async (req, res) => {
    try {
      const csv = String(req.body?.csv || '');
      if (!csv.trim()) return res.status(400).json({ ok: false, error: 'csv required' });
      const claims = billingService.parseClaimsCsv(csv);
      if (!claims.length) return res.status(400).json({ ok: false, error: 'No claim rows parsed from csv' });
      const results = await billingService.importClaims(claims, { source: req.body?.source || 'csv_import' });
      const imported = results.filter((item) => !item.error).length;
      const failed = results.filter((item) => item.error).length;
      res.json({ ok: true, parsed: claims.length, imported, failed, results });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] csv import failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/claims/:claimId', async (req, res) => {
    try {
      const plan = await billingService.buildClaimPlan(req.params.claimId);
      if (!plan) return res.status(404).json({ ok: false, error: 'Claim not found' });
      res.json({ ok: true, ...plan });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] get claim failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/claims/:claimId/reclassify', async (req, res) => {
    try {
      const result = await billingService.reclassifyClaim(req.params.claimId);
      if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] reclassify failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/actions', async (req, res) => {
    try {
      const actions = await billingService.listActions(req.query?.claimId || null);
      res.json({ ok: true, actions });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] list actions failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.patch('/actions/:actionId', async (req, res) => {
    try {
      const action = await billingService.updateAction(req.params.actionId, req.body || {});
      if (!action) return res.status(404).json({ ok: false, error: 'Action not found or no patch fields supplied' });
      res.json({ ok: true, action });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] update action failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}
