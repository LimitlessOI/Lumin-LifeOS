/**
 * SYNOPSIS: Go Vegas business network outreach API — discover, invite, follow up.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import { createGoVegasOutreach } from '../services/go-vegas-outreach.js';
import { getGoVegasOutreachSchedulerStatus } from '../services/go-vegas-outreach-scheduler.js';

function buildSendEmail(notificationService) {
  if (!notificationService) {
    return async () => ({ success: false, error: 'NotificationService not configured' });
  }
  return async ({ to, subject, html, text = '', from, metadata, campaignId }) => {
    const result = await notificationService.sendEmail({
      to,
      subject,
      html,
      text,
      from,
      campaignId: campaignId || 'go_vegas_network_invite_v1',
      metadata,
    });
    if (result?.success === false) {
      return { success: false, error: result.error || 'send failed' };
    }
    return { success: true, messageId: result.messageId || result.message_id };
  };
}

export function createGoVegasOutreachRoutes(app, deps = {}) {
  const { pool, requireKey, notificationService, logger = console } = deps;
  if (typeof requireKey !== 'function') {
    throw new Error('createGoVegasOutreachRoutes requires deps.requireKey');
  }

  const outreach = createGoVegasOutreach({
    pool,
    sendEmail: buildSendEmail(notificationService),
    logger,
  });

  app.get('/api/v1/go-vegas/status', requireKey, async (_req, res) => {
    try {
      if (!pool) return res.status(503).json({ ok: false, error: 'database unavailable' });
      const stats = await outreach.getPipelineStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/go-vegas/scheduler', requireKey, async (_req, res) => {
    res.json({ ok: true, ...getGoVegasOutreachSchedulerStatus() });
  });

  app.get('/api/v1/go-vegas/prospects', requireKey, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const status = req.query.status || null;
      const result = await outreach.listProspects({ limit, status });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/go-vegas/prospects/seed', requireKey, async (req, res) => {
    try {
      await outreach.ensureSchema();
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const list = Array.isArray(body.prospects) ? body.prospects : [body];
      const seeded = [];
      for (const row of list) {
        if (!row?.businessName) continue;
        const id = await outreach.upsertProspect({
          businessName: row.businessName,
          businessType: row.businessType || row.type || null,
          website: row.website || null,
          address: row.address || null,
          phone: row.phone || null,
          contactEmail: row.contactEmail || row.email || null,
          contactName: row.contactName || null,
          status: row.status || 'discovered',
          metadata: { ...(row.metadata || {}), seededAt: new Date().toISOString(), source: 'manual_seed' },
        });
        seeded.push({ id, businessName: row.businessName });
      }
      res.json({ ok: true, seeded, count: seeded.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/go-vegas/discover', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const result = await outreach.discoverBusinesses({
        city: body.city,
        type: body.type || 'restaurant',
        count: body.count || 10,
        enrichEmail: body.enrichEmail !== false,
      });
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/go-vegas/enrich', requireKey, async (req, res) => {
    try {
      const result = await outreach.enrichProspects({ limit: req.body?.limit || 20 });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/go-vegas/invite', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const dryRun = body.dryRun === true;
      if (body.prospectId) {
        const result = await outreach.sendInvite(body.prospectId, { dryRun });
        return res.status(result.ok ? 200 : 400).json(result);
      }
      const result = await outreach.inviteBatch({ limit: body.limit || 10, dryRun });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/go-vegas/follow-up', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      if (body.prospectId) {
        const result = await outreach.sendFollowUp(body.prospectId, body.followUpNumber || 1, {
          dryRun: body.dryRun === true,
        });
        return res.status(result.ok ? 200 : 400).json(result);
      }
      const result = await outreach.runFollowUpCron({ dryRun: body.dryRun === true });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.patch('/api/v1/go-vegas/prospects/:id', requireKey, async (req, res) => {
    try {
      const { status, note } = req.body || {};
      if (!status) return res.status(400).json({ ok: false, error: 'status required' });
      const result = await outreach.updateProspectStatus(req.params.id, { status, note });
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  logger.info?.('✅ [GO-VEGAS] Outreach routes mounted at /api/v1/go-vegas/*');
}

export default createGoVegasOutreachRoutes;
