/**
 * SYNOPSIS: clientcare-billing-routes.js
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 * clientcare-billing-routes.js
 * ClientCare billing rescue, browser fallback readiness, and claim action queue.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createClientCareBillingService } from '../services/clientcare-billing-service.js';
import { createClientCareBrowserService } from '../services/clientcare-browser-service.js';
import { createClientCareOpsService } from '../services/clientcare-ops-service.js';
import { createClientCareSellableService } from '../services/clientcare-sellable-service.js';
import { createClientCareSyncService } from '../services/clientcare-sync-service.js';
import { createConversationStore } from '../services/conversation-store.js';
import { listBillingScenarios, pregnancyIdFromHref as stagePregnancyIdFromHref } from '../config/clientcare-billing-stages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CC_FILE_HCFA_SCRIPT = path.join(__dirname, '../scripts/clientcare-file-hcfa-once.mjs');
const CC_SITE_MAP_SCRIPT = path.join(__dirname, '../scripts/clientcare-site-map-once.mjs');
const CC_REPAIR_FEED = path.join(__dirname, '../products/receipts/SENTRY_FINDINGS_FEED.clientcare-billing-recovery.json');
const CC_REPAIR_DEDUPE = new Map(); // errorCode -> last escalated ms

function runFileSuperBillClaimChild(args, { timeoutMs = 120000, onProgress = null, logger = console } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      try { if (timer) clearTimeout(timer); } catch (_) { /* ignore */ }
      resolve(payload);
    };
    const child = spawn(process.execPath, [CC_FILE_HCFA_SCRIPT], {
      env: { ...process.env, CC_FILE_ARGS: JSON.stringify(args || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
      // Tip: detached process groups on Railway often survive SIGKILL while CDP is wedged.
      // Keep in-tree so child.kill('SIGKILL') reaps node+chromium.
      detached: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => {
      const line = String(chunk);
      stderr += line;
      const m = line.match(/\[cc-file-hcfa:progress\]\s*(\{.*\})\s*$/m);
      if (m && typeof onProgress === 'function') {
        try { onProgress(JSON.parse(m[1])); } catch (_) { /* ignore */ }
      }
    });
    const killTree = () => {
      try { child.kill('SIGKILL'); } catch (_) { /* ignore */ }
      try { if (child.pid) process.kill(child.pid, 'SIGKILL'); } catch (_) { /* ignore */ }
    };
    timer = setTimeout(() => {
      killTree();
      // Tip: don't wait for child 'close' — wedged Chromium may never emit it.
      finish({
        ok: false,
        error: `child_timeout after ${timeoutMs}ms (Chromium killed)`,
        stderr: stderr.slice(-500),
        phase_hint: 'child_timeout',
      });
      // Reap later so we don't leak the handle.
      setTimeout(killTree, 2000);
    }, Math.max(30000, Number(timeoutMs) || 120000));
    child.on('error', (err) => {
      finish({ ok: false, error: String(err?.message || err).slice(0, 200) });
    });
    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout.trim() || '{}');
        finish({ ...parsed, child_exit: code });
      } catch {
        finish({
          ok: false,
          error: `child_bad_json exit=${code}`,
          stdout: stdout.slice(0, 400),
          stderr: stderr.slice(-400),
        });
      }
    });
    logger.info?.({ pid: child.pid, timeoutMs }, '[CLIENTCARE-BILLING] file-hcfa child started');
  });
}

function runSiteMapCrawlChild(args, { timeoutMs = 360000, onProgress = null, logger = console } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      try { if (timer) clearTimeout(timer); } catch (_) { /* ignore */ }
      resolve(payload);
    };
    const child = spawn(process.execPath, [CC_SITE_MAP_SCRIPT], {
      env: { ...process.env, CC_SITE_MAP_ARGS: JSON.stringify(args || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => {
      const line = String(chunk);
      stderr += line;
      const m = line.match(/\[cc-site-map:progress\]\s*(\{.*\})\s*$/m);
      if (m && typeof onProgress === 'function') {
        try { onProgress(JSON.parse(m[1])); } catch (_) { /* ignore */ }
      }
    });
    const killTree = () => {
      try { child.kill('SIGKILL'); } catch (_) { /* ignore */ }
      try { if (child.pid) process.kill(child.pid, 'SIGKILL'); } catch (_) { /* ignore */ }
    };
    timer = setTimeout(() => {
      killTree();
      finish({
        ok: false,
        error: `site_map_child_timeout after ${timeoutMs}ms (Chromium killed)`,
        stderr: stderr.slice(-500),
        phase_hint: 'child_timeout',
      });
      setTimeout(killTree, 2000);
    }, Math.max(60000, Number(timeoutMs) || 360000));
    child.on('error', (err) => {
      finish({ ok: false, error: String(err?.message || err).slice(0, 200) });
    });
    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout.trim() || '{}');
        finish({ ...parsed, child_exit: code });
      } catch {
        finish({
          ok: false,
          error: `site_map_child_bad_json exit=${code}`,
          stdout: stdout.slice(0, 400),
          stderr: stderr.slice(-400),
        });
      }
    });
    logger.info?.({ pid: child.pid, timeoutMs }, '[CLIENTCARE-BILLING] site-map child started');
  });
}

export function createClientCareBillingRoutes({ pool, requireKey, logger = console, callCouncilMember, callCouncilWithFailover = null, notificationService = null, sendSMS = null }) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
  const billingService = createClientCareBillingService({ pool, logger });
  const syncService = createClientCareSyncService({ billingService, logger });
  const sellableService = createClientCareSellableService({ pool, logger });
  const conversationStore = createConversationStore(pool);
  const browserService = createClientCareBrowserService({
    logger,
    syncService,
    resolveTenantCredentials: async (tenantId) => sellableService.getTenantCredentials(tenantId),
  });
  const opsService = createClientCareOpsService({ pool, billingService, browserService, syncService, callCouncilMember, callCouncilWithFailover, logger });

  async function withDeadline(task, ms, label = 'request') {
    let timer = null;
    try {
      return await Promise.race([
        Promise.resolve().then(task),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function createOutreachTask({
    userId,
    channel,
    recipientName,
    recipientEmail,
    recipientPhone,
    subject,
    body,
    source,
    sourceRef,
  }) {
    try {
      const { rows } = await pool.query(`
        INSERT INTO lifeos_outreach_tasks
          (user_id, channel, recipient_name, recipient_email, recipient_phone, subject, body, source, source_ref, approved)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
        RETURNING *
      `, [
        userId,
        channel,
        recipientName || null,
        recipientEmail || null,
        recipientPhone || null,
        subject || null,
        body,
        source || 'clientcare_billing',
        sourceRef || null,
      ]);
      return rows[0] || null;
    } catch (error) {
      logger.warn?.({ err: error.message }, '[CLIENTCARE-BILLING] outreach task insert skipped');
      return null;
    }
  }

  async function executeOutreachTask(task) {
    const delivery = {
      ok: false,
      channel: task.channel,
      recipient_email: task.recipient_email || null,
      recipient_phone: task.recipient_phone || null,
    };

    if (task.channel === 'email') {
      if (!notificationService?.sendEmail) {
        throw new Error('Email delivery is not configured');
      }
      const result = await notificationService.sendEmail({
        to: task.recipient_email,
        subject: task.subject || 'Following up',
        html: task.body,
        text: task.body,
      });
      delivery.ok = true;
      delivery.provider = 'notificationService';
      delivery.result = result || null;
    } else if (task.channel === 'sms') {
      if (!sendSMS) {
        throw new Error('SMS delivery is not configured');
      }
      const result = await sendSMS(task.recipient_phone, task.body);
      delivery.ok = true;
      delivery.provider = 'sendSMS';
      delivery.result = result || null;
    } else {
      throw new Error(`Unsupported outreach channel: ${task.channel}`);
    }

    if (task.id) {
      try {
        await pool.query(
          `UPDATE lifeos_outreach_tasks
           SET status = 'awaiting_response', attempts = COALESCE(attempts, 0) + 1, last_attempt_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [task.id],
        );
      } catch (error) {
        logger.warn?.({ err: error.message, taskId: task.id }, '[CLIENTCARE-BILLING] outreach task status update skipped');
      }
    }

    return delivery;
  }

  function getTenantId(req) {
    return req.headers['x-clientcare-tenant-id'] || req.body?.tenant_id || req.query?.tenant_id || null;
  }

  function getOperatorEmail(req) {
    return req.headers['x-operator-email'] || req.body?.operator_email || req.body?.updated_by || req.body?.requested_by || req.body?.owner || null;
  }

  async function resolveLifeOSUserId(handleOrId = 'adam') {
    if (!handleOrId) return null;
    if (!Number.isNaN(Number(handleOrId))) {
      const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE id = $1 LIMIT 1', [Number(handleOrId)]);
      return rows[0]?.id || null;
    }
    const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE user_handle = $1 LIMIT 1', [String(handleOrId)]);
    return rows[0]?.id || null;
  }

  async function enforceOperatorAccess(req, roles = []) {
    const tenantId = getTenantId(req);
    const operatorEmail = getOperatorEmail(req);
    return sellableService.assertOperatorAccess({ tenantId, operatorEmail, roles });
  }

  router.use(express.json({ limit: '5mb' }));

  // Public BirthBill sales surface — no command key (midwife landing → signup → Stripe).
  router.get('/public/offer', async (_req, res) => {
    try {
      res.json({ ok: true, ...sellableService.getPublicOffer() });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] public offer failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/public/signup', async (req, res) => {
    try {
      const result = await sellableService.signupPracticeLead({
        practiceName: req.body?.practice_name || req.body?.practiceName,
        contactName: req.body?.contact_name || req.body?.contactName,
        contactEmail: req.body?.contact_email || req.body?.contactEmail,
        contactPhone: req.body?.contact_phone || req.body?.contactPhone,
        region: req.body?.region,
        notes: req.body?.notes,
      });
      if (!result.ok) return res.status(400).json(result);
      res.status(201).json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] public signup failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/public/checkout', async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const result = await sellableService.createPilotCheckoutSession({
        tenantId: req.body?.tenant_id || req.body?.tenantId,
        practiceName: req.body?.practice_name || req.body?.practiceName,
        contactEmail: req.body?.contact_email || req.body?.contactEmail,
        baseUrl: req.body?.base_url || process.env.PUBLIC_BASE_URL || baseUrl,
      });
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] public checkout failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/public/checkout/success', async (req, res) => {
    try {
      const result = await sellableService.verifyPilotCheckoutSession({
        tenantId: req.query?.tenant_id || req.query?.tenantId,
        sessionId: req.query?.session_id || req.query?.sessionId,
      });
      const wantsJson = String(req.headers.accept || '').includes('application/json')
        || String(req.query?.format || '') === 'json';
      if (wantsJson) return res.json(result);
      const q = new URLSearchParams({
        paid: result.paid ? '1' : '0',
        tenant_id: String(result.tenant_id || ''),
        session_id: String(result.session_id || req.query?.session_id || ''),
      });
      return res.redirect(302, `/birthbill/welcome?${q.toString()}`);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] public checkout success failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/public/onboarding-status', async (req, res) => {
    try {
      const tenantId = req.query?.tenant_id || req.query?.tenantId;
      if (!tenantId) return res.status(400).json({ ok: false, error: 'tenant_id required' });
      const tenants = await sellableService.listTenants();
      const tenant = (tenants || []).find((t) => String(t.id) === String(tenantId));
      const creds = await sellableService.getTenantCredentialStatus(tenantId);
      const onboarding = await sellableService.getOnboarding(tenantId);
      res.json({
        ok: true,
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          contact_email: tenant.contact_email,
        } : null,
        credentials: creds,
        onboarding,
        next: creds.connected
          ? 'Credentials connected — seed forever-chase for this tenant.'
          : 'Connect ClientCare username/password to finish onboard.',
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] onboarding-status failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/public/connect-clientcare', async (req, res) => {
    try {
      const result = await sellableService.connectClientCareAfterPay({
        tenantId: req.body?.tenant_id || req.body?.tenantId,
        sessionId: req.body?.session_id || req.body?.sessionId,
        baseUrl: req.body?.base_url || req.body?.baseUrl,
        username: req.body?.username,
        password: req.body?.password,
        mfaMode: req.body?.mfa_mode || req.body?.mfaMode,
        mfaSecret: req.body?.mfa_secret || req.body?.mfaSecret,
      });
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] connect-clientcare failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.use(requireKey);

  /** Long Puppeteer jobs — tip edge ~30–60s; return 202 + poll. Persist so multi-instance tip doesn't lose jobs. */
  const browserJobs = new Map();
  let clientcareBrowserJobsSchemaReady = false;
  async function ensureClientcareBrowserJobsSchema() {
    if (clientcareBrowserJobsSchemaReady || !pool?.query) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientcare_browser_jobs (
        id UUID PRIMARY KEY,
        kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued'
          CHECK (status IN ('queued', 'running', 'completed', 'failed')),
        request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `);
    clientcareBrowserJobsSchemaReady = true;
  }
  async function persistClientcareBrowserJob(job) {
    if (!pool?.query || !job?.id) return;
    try {
      await ensureClientcareBrowserJobsSchema();
      await pool.query(
        `INSERT INTO clientcare_browser_jobs
           (id, kind, status, request_json, result_json, error, updated_at, completed_at)
         VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,NOW(),$7)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           result_json = EXCLUDED.result_json,
           error = EXCLUDED.error,
           updated_at = NOW(),
           completed_at = EXCLUDED.completed_at`,
        [
          job.id,
          job.kind || 'unknown',
          job.status || 'queued',
          JSON.stringify(job.request || {}),
          JSON.stringify(job.result || {}, (_k, v) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ') : v)),
          job.error || null,
          ['completed', 'failed'].includes(job.status) ? new Date().toISOString() : null,
        ]
      );
    } catch (err) {
      logger.warn?.({ err: err.message }, '[CLIENTCARE-BILLING] job persist failed');
    }
  }
  const BROWSER_JOB_TIMEOUT_MS = {
    map_charge_slip: 360000,
    // Transmit child (~50s) + Sent Bills probe child (~45s) + login twice — need headroom past Generate freeze.
    file_superbill_claim: 240000,
    charge_slip_from_billing: 180000,
    prepare_claim_status: 180000,
    birth_activity: 180000,
    backlog_summary: 180000,
    forever_chase_sync: 600000,
    // Tip 2026-07-15: 900s let wedged directory/birth scans block FILE NOW for a quarter hour.
    hands_off_file: 240000,
    site_map_crawl: 420000,
  };

  function parseClientcareJobTime(raw) {
    if (!raw) return 0;
    if (raw instanceof Date) return raw.getTime();
    const s = String(raw).trim();
    // Neon often returns "2026-07-14 14:14:16.77634+00" which Date.parse treats as NaN.
    const normalized = s
      .replace(' ', 'T')
      .replace(/\+00$/, '+00:00')
      .replace(/([+-]\d{2})$/, '$1:00');
    const ms = Date.parse(normalized);
    return Number.isFinite(ms) ? ms : 0;
  }

  async function markStaleClientcareBrowserJob(job) {
    if (!job || !['queued', 'running'].includes(job.status)) return job;
    const timeoutMs = BROWSER_JOB_TIMEOUT_MS[job.kind] || 120000;
    // Prefer real child progress (_progress_at). Heartbeat/parentPulse refresh updated_at
    // without advancing work — using updated_at alone left tip Denise "running" forever mid-wedge.
    const progressAt = parseClientcareJobTime(job.result?._progress_at);
    const createdAt = parseClientcareJobTime(job.created_at) || 0;
    const updatedAt = parseClientcareJobTime(job.updated_at) || 0;
    const startedAt = progressAt || Math.max(updatedAt, createdAt);
    // Absolute age from create — catch recycled instances that never wrote progress.
    const ageFromCreateMs = createdAt ? Date.now() - createdAt : 0;
    // If timestamps are unparsable, fail closed after absolute age guess from string length presence.
    if (!startedAt) {
      const stale = {
        ...job,
        status: 'failed',
        error: job.error || 'browser job timestamps unparsable — marked failed fail-closed',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };
      browserJobs.set(job.id, stale);
      void persistClientcareBrowserJob(stale);
      return stale;
    }
    const ageMs = Date.now() - startedAt;
    // Heartbeat is 8s. Fail once kind timeout + 45s with no fresh progress — don't wait 5m
    // while Chromium is already wedged (tip Denise goto_claim_editor stale).
    const heartbeatDeadMs = Math.max(90000, timeoutMs + 45000);
    const fullStaleMs = timeoutMs + 60000;
    if (ageFromCreateMs >= fullStaleMs && job.status === 'running') {
      const stale = {
        ...job,
        status: 'failed',
        error: job.error || `browser job stale after ${timeoutMs}ms (instance likely recycled mid-run)`,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };
      browserJobs.set(job.id, stale);
      void persistClientcareBrowserJob(stale);
      return stale;
    }
    if (ageMs < heartbeatDeadMs) return job;
    if (ageMs < fullStaleMs && job.status === 'queued') return job;
    // running + no heartbeat → fail; or past full timeout
    if (job.status === 'running' || ageMs >= fullStaleMs) {
      const stale = {
        ...job,
        status: 'failed',
        error: job.error || (ageMs >= fullStaleMs
          ? `browser job stale after ${timeoutMs}ms (instance likely recycled mid-run)`
          : `browser job heartbeat dead after ${ageMs}ms (wedged mid-run)`),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };
      browserJobs.set(job.id, stale);
      void persistClientcareBrowserJob(stale);
      return stale;
    }
    return job;
  }

  async function loadClientcareBrowserJob(jobId) {
    const mem = browserJobs.get(jobId);
    if (mem) return markStaleClientcareBrowserJob(mem);
    if (!pool?.query) return null;
    try {
      await ensureClientcareBrowserJobsSchema();
      const { rows } = await pool.query(
        `SELECT id, kind, status, request_json, result_json, error, created_at, updated_at, completed_at
         FROM clientcare_browser_jobs WHERE id = $1 LIMIT 1`,
        [jobId]
      );
      const row = rows[0];
      if (!row) return null;
      return markStaleClientcareBrowserJob({
        id: row.id,
        kind: row.kind,
        status: row.status,
        request: row.request_json || {},
        result: row.result_json || null,
        error: row.error,
        created_at: row.created_at,
        updated_at: row.updated_at,
        completed_at: row.completed_at,
        from_db: true,
      });
    } catch {
      return null;
    }
  }
  function enqueueBrowserJob(kind, runner, request = {}) {
    const id = randomUUID();
    const job = {
      id,
      kind,
      status: 'queued',
      request,
      result: null,
      error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    browserJobs.set(id, job);
    void persistClientcareBrowserJob(job);
    const timeoutMs = BROWSER_JOB_TIMEOUT_MS[kind] || 120000;
    const reportProgress = async (partial) => {
      job.result = { ...(job.result && typeof job.result === 'object' ? job.result : {}), ...partial, _progress_at: new Date().toISOString() };
      job.updated_at = new Date().toISOString();
      try { await persistClientcareBrowserJob(job); } catch (_) { /* ignore */ }
    };
    // Serialize Puppeteer work — parallel browser jobs OOM / recycle Railway mid-run (tip Denise stale).
    if (!globalThis.__clientcareBrowserJobChain) {
      globalThis.__clientcareBrowserJobChain = Promise.resolve();
    }
    // Tip: a hung prior link never settles — cap wait for the chain slot itself.
    const chainWaitMs = Math.min(timeoutMs, 90000);
    const prior = globalThis.__clientcareBrowserJobChain;
    globalThis.__clientcareBrowserJobChain = Promise.race([
      prior.catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, chainWaitMs)),
    ]).then(async () => {
        job.status = 'running';
        job.updated_at = new Date().toISOString();
        await persistClientcareBrowserJob(job);
        let timer = null;
        const heartbeat = setInterval(() => {
          job.updated_at = new Date().toISOString();
          void persistClientcareBrowserJob(job).catch(() => {});
        }, 8000);
        try {
          job.result = await Promise.race([
            Promise.resolve().then(() => runner(reportProgress)),
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error(`browser job timed out after ${timeoutMs}ms`)), timeoutMs);
            }),
          ]);
          job.status = 'completed';
        } catch (err) {
          job.status = 'failed';
          job.error = err.message;
          logger.warn?.({ err: err.message, kind, id }, '[CLIENTCARE-BILLING] browser job failed');
        } finally {
          clearInterval(heartbeat);
          if (timer) clearTimeout(timer);
        }
        job.updated_at = new Date().toISOString();
        await persistClientcareBrowserJob(job);
      })
      .catch((err) => {
        logger.warn?.({ err: err.message, kind, id }, '[CLIENTCARE-BILLING] browser job chain error');
      });
    return job;
  }

  router.get('/browser/jobs/:jobId', async (req, res) => {
    const job = await loadClientcareBrowserJob(req.params.jobId);
    if (!job) return res.status(404).json({ ok: false, error: 'Job not found or expired' });
    res.json({ ok: true, job });
  });

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

  router.get('/reimbursement-intelligence', async (_req, res) => {
    try {
      const intelligence = await billingService.getReimbursementIntelligence();
      res.json({ ok: true, intelligence });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] reimbursement intelligence failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/payer-playbooks', async (req, res) => {
    try {
      const playbooks = await billingService.getPayerPlaybooks({ limit: req.query?.limit });
      res.json({ ok: true, ...playbooks });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] payer playbooks failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/payer-rules', async (_req, res) => {
    try {
      const rules = await billingService.listPayerRuleOverrides();
      res.json({ ok: true, rules });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] payer rules failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/payer-rules', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const rule = await billingService.savePayerRuleOverride(req.body || {});
      await sellableService.logAudit({
        actor: String(req.body?.updated_by || 'overlay'),
        actionType: 'payer_rule_save',
        entityType: 'payer_rule',
        entityId: String(rule.payer_name || ''),
        details: rule,
      });
      res.json({ ok: true, rule });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] save payer rule failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/era-insights', async (req, res) => {
    try {
      const insights = await billingService.getEraInsights({ limit: req.query?.limit });
      res.json({ ok: true, ...insights });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] era insights failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/underpayments', async (req, res) => {
    try {
      const underpayments = await billingService.getUnderpaymentQueue({ limit: req.query?.limit });
      res.json({ ok: true, ...underpayments });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] underpayment queue failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/forever-chase', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const tenantId = getTenantId(req);
      const queue = await billingService.getForeverChaseQueue({ limit: req.query?.limit, tenantId });
      res.json({ ok: true, ...queue });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] forever-chase queue failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/stages', async (_req, res) => {
    res.json({
      ok: true,
      doctrine: 'every_client_every_scenario_with_clocks',
      global_file_spine: '59400',
      scenarios: listBillingScenarios(),
    });
  });

  router.get('/stages/due', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const tenantId = getTenantId(req);
      const due = await billingService.getDueChaseWork({
        limit: req.query?.limit || 50,
        tenantId,
        dueOnly: String(req.query?.due_only || '1') !== '0',
        mode: req.query?.mode || 'all',
      });
      res.json({ ok: true, ...due });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] stages/due failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/stages/sync-clocks', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const tenantId = getTenantId(req) || req.body?.tenant_id || null;
      const result = await billingService.syncAllOpenStageClocks({
        tenantId,
        limit: req.body?.limit || 500,
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] stages/sync-clocks failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/stages/advance/:claimId', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const result = await billingService.advanceClaimStage(
        Number(req.params.claimId),
        req.body?.event || 'advance',
        { notes: req.body?.notes || null },
      );
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] stages/advance failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/stages/execute-due', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const tenantId = getTenantId(req) || req.body?.tenant_id || null;
      const mode = req.body?.mode || 'file_now';
      const job = enqueueBrowserJob(
        'hands_off_file',
        () => runHandsOffFileCycle({
          limit: req.body?.limit ?? 2,
          tenantId,
          preferQuery: req.body?.prefer_query || null,
          visitDate: req.body?.visit_date || null,
          fromDueQueue: true,
          mode,
        }),
        { ...(req.body || {}), tenant_id: tenantId, source: 'stages_execute_due', mode },
      );
      res.status(202).json({
        ok: true,
        started: true,
        job_id: job.id,
        poll_url: `/api/v1/clientcare-billing/browser/jobs/${job.id}`,
        message: mode === 'follow_up'
          ? 'Executing follow-up clocks only'
          : 'FILE NOW — burning through open capture queue as fast as possible (clocks are follow-ups only)',
        doctrine: 'file_as_fast_as_possible_clocks_are_followups_only',
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] stages/execute-due failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/forever-chase/seed', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const tenantId = getTenantId(req) || req.body?.tenant_id || null;
      const seeded = await billingService.seedForeverChaseFromInventory({
        births: req.body?.births || [],
        accounts: req.body?.accounts || [],
        tenantId,
        midwifeLabel: req.body?.midwife_label || req.body?.midwifeLabel || null,
        evidence: {
          operator_note: req.body?.operator_note
            || 'Direct forever-chase seed (the midwife did the work; prior billing neglect is not a write-off).',
          midwife_label: req.body?.midwife_label || req.body?.midwifeLabel || null,
        },
      });
      const queue = await billingService.getForeverChaseQueue({ limit: 100, tenantId });
      res.json({
        ok: true,
        seeded,
        queue_summary: queue.summary,
        sample: queue.items.slice(0, 8),
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] forever-chase seed failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/forever-chase/sync', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const dryRun = req.body?.dry_run === true;
      const tenantId = getTenantId(req) || req.body?.tenant_id || null;
      const job = enqueueBrowserJob(
        'forever_chase_sync',
        async () => {
          const birthLimit = Math.max(5, Math.min(Number(req.body?.birth_limit || 40), 80));
          const accountLimit = Math.max(10, Math.min(Number(req.body?.account_limit || 50), 100));
          const evidence = {
            operator_note: req.body?.operator_note || 'Tip forever-chase sync from birth activity + billing notes backlog.',
            midwife_label: req.body?.midwife_label || null,
          };
          // Sequential: dual Puppeteer Promise.all OOMs / recycles Railway mid-run and leaves jobs stuck.
          let births = [];
          let accounts = [];
          let birthError = null;
          let backlogError = null;
          try {
            const birthsResult = await browserService.scanBirthActivity({ maxRows: birthLimit, tenantId });
            births = birthsResult?.births || [];
          } catch (err) {
            birthError = err.message;
          }
          let seededBirths = null;
          if (!dryRun && births.length) {
            seededBirths = await billingService.seedForeverChaseFromInventory({
              births, accounts: [], evidence, tenantId, midwifeLabel: evidence.midwife_label,
            });
          }
          try {
            const backlogResult = await browserService.buildBacklogSummary({ accountLimit, tenantId });
            accounts = backlogResult?.accounts || [];
          } catch (err) {
            backlogError = err.message;
          }
          if (dryRun) {
            return {
              ok: true,
              dry_run: true,
              births: births.length,
              accounts: accounts.length,
              resolved_births: births.filter((b) => b.billingHref).length,
              birth_error: birthError,
              backlog_error: backlogError,
              doctrine: 'forever_chase_until_paid_or_written_denial',
            };
          }
          const seeded = await billingService.seedForeverChaseFromInventory({
            births,
            accounts,
            evidence,
            tenantId,
            midwifeLabel: evidence.midwife_label,
          });
          const queue = await billingService.getForeverChaseQueue({ limit: 100, tenantId });
          return {
            ok: true,
            partial_seed_after_births: seededBirths,
            birth_error: birthError,
            backlog_error: backlogError,
            seeded,
            queue_summary: queue.summary,
            sample: queue.items.slice(0, 8).map((item) => ({
              id: item.id,
              patient_name: item.patient_name,
              chase_lane: item.chase_lane,
              rescue_bucket: item.rescue_bucket,
              date_of_service: item.date_of_service,
              next_action: item.next_action,
            })),
          };
        },
        { ...(req.body || {}), tenant_id: tenantId },
      );
      res.status(202).json({
        ok: true,
        started: true,
        job_id: job.id,
        poll_url: `/api/v1/clientcare-billing/browser/jobs/${job.id}`,
        message: 'Forever-chase sync queued (births + backlog → claims ledger)',
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] forever-chase sync failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/appeals/queue', async (req, res) => {
    try {
      const appeals = await billingService.getAppealsQueue({ limit: req.query?.limit });
      res.json({ ok: true, ...appeals });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] appeals queue failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/ops/overview', async (_req, res) => {
    try {
      const overview = await opsService.buildOperationsOverview();
      res.json({ ok: true, overview });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] ops overview failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/ops/checklist', async (_req, res) => {
    try {
      const checklist = await opsService.getOptimizationChecklist();
      res.json({ ok: true, checklist });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] ops checklist failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/packaging/overview', async (req, res) => {
    try {
      const overview = await sellableService.getPackagingOverview({
        tenantId: req.query?.tenant_id || null,
        auditLimit: req.query?.audit_limit || 20,
      });
      res.json({ ok: true, overview });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] packaging overview failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/packaging/readiness-report', async (req, res) => {
    try {
      const report = await sellableService.getReadinessReport({
        tenantId: req.query?.tenant_id || null,
      });
      res.json({ ok: true, report });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] readiness report failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/packaging/validate', async (req, res) => {
    try {
      const tenantId = req.body?.tenant_id || req.query?.tenant_id || null;
      const report = await sellableService.buildLiveValidation({
        tenantId,
        browserReadiness: browserService.getReadiness(),
        dashboard: await billingService.getDashboard(),
        reimbursement: await billingService.getReimbursementIntelligence(),
      });
      await sellableService.logAudit({
        tenantId: tenantId || report.tenant?.id || null,
        actor: String(req.body?.actor || 'overlay'),
        actionType: 'packaging_validate',
        entityType: 'tenant',
        entityId: String(report.tenant?.id || report.tenant?.slug || ''),
        details: report.summary,
      });
      res.json({ ok: true, report });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] packaging validation failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/packaging/validation-history', async (req, res) => {
    try {
      const history = await sellableService.getValidationHistory({
        tenantId: req.query?.tenant_id || null,
        limit: req.query?.limit || 20,
      });
      res.json({ ok: true, history });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] packaging validation history failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/tenants', async (_req, res) => {
    try {
      const tenants = await sellableService.listTenants();
      res.json({ ok: true, tenants });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] list tenants failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/tenants', async (req, res) => {
    try {
      if (req.body?.id || req.body?.tenant_id) await enforceOperatorAccess(req, ['manager']);
      const tenant = await sellableService.saveTenant(req.body || {});
      await sellableService.logAudit({
        tenantId: tenant.id || null,
        actor: String(req.body?.actor || 'overlay'),
        actionType: 'tenant_save',
        entityType: 'tenant',
        entityId: String(tenant.id || tenant.slug || ''),
        details: tenant,
      });
      res.json({ ok: true, tenant });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] save tenant failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/tenants/:tenantId/onboarding', async (req, res) => {
    try {
      const onboarding = await sellableService.getOnboarding(req.params.tenantId);
      res.json({ ok: true, onboarding });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] onboarding fetch failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/tenants/:tenantId/onboarding', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['manager']);
      const onboarding = await sellableService.saveOnboarding(req.params.tenantId, req.body || {});
      await sellableService.logAudit({
        tenantId: req.params.tenantId,
        actor: String(req.body?.actor || 'overlay'),
        actionType: 'onboarding_save',
        entityType: 'onboarding',
        entityId: String(req.params.tenantId),
        details: onboarding,
      });
      res.json({ ok: true, onboarding });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] onboarding save failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/tenants/:tenantId/operators', async (req, res) => {
    try {
      const operators = await sellableService.listOperatorAccess(req.params.tenantId);
      res.json({ ok: true, operators });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] operator list failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/tenants/:tenantId/operators', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['manager']);
      const operator = await sellableService.saveOperatorAccess(req.params.tenantId, req.body || {});
      await sellableService.logAudit({
        tenantId: req.params.tenantId,
        actor: String(req.body?.actor || 'overlay'),
        actionType: 'operator_access_save',
        entityType: 'operator_access',
        entityId: String(operator.id || operator.operator_email || ''),
        details: operator,
      });
      res.json({ ok: true, operator });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] operator save failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/audit-log', async (req, res) => {
    try {
      const audit = await sellableService.listAuditLog({
        tenantId: req.query?.tenant_id || null,
        limit: req.query?.limit || 50,
      });
      res.json({ ok: true, audit });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] audit log failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/audit-log/export', async (req, res) => {
    try {
      const audit = await sellableService.listAuditLog({
        tenantId: req.query?.tenant_id || null,
        limit: req.query?.limit || 200,
      });
      const csv = sellableService.exportAuditLogCsv(audit);
      res.setHeader('content-type', 'text/csv; charset=utf-8');
      res.setHeader('content-disposition', 'attachment; filename="clientcare-audit-log.csv"');
      res.status(200).send(csv);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] audit export failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/ops/capability-requests', async (req, res) => {
    try {
      const requests = await opsService.listCapabilityRequests({
        status: req.query?.status || null,
        limit: req.query?.limit,
      });
      res.json({ ok: true, requests });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] capability request list failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.patch('/ops/capability-requests/:id', async (req, res) => {
    try {
      const request = await opsService.updateCapabilityRequest(req.params.id, req.body || {});
      if (!request) return res.status(404).json({ ok: false, error: 'Capability request not found or no patch fields supplied' });
      res.json({ ok: true, request });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] capability request update failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/ops/run-workflow', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const workflowId = String(req.body?.workflow_id || '').trim();
      if (!workflowId) return res.status(400).json({ ok: false, error: 'workflow_id required' });
      const result = await opsService.runWorkflow(workflowId, {
        requestedBy: String(req.body?.requested_by || 'overlay'),
      });
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] run workflow failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/ops/repair-account', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const billingHref = String(req.body?.billing_href || '').trim();
      if (!billingHref) return res.status(400).json({ ok: false, error: 'billing_href required' });
      const result = await opsService.repairAccount({
        billingHref,
        account: req.body?.account || null,
        updates: req.body?.updates || {},
        dryRun: req.body?.dry_run !== false,
        requestedBy: String(req.body?.requested_by || 'overlay'),
      });
      if (!result.ok) return res.status(500).json(result);
      await sellableService.logAudit({
        actor: String(req.body?.requested_by || 'overlay'),
        actionType: result.dryRun ? 'repair_preview' : 'repair_apply',
        entityType: 'billing_account',
        entityId: String(billingHref),
        details: { updates: req.body?.updates || {}, dry_run: req.body?.dry_run !== false },
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] repair account failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/insurance/verification-preview', async (req, res) => {
    try {
      const preview = await opsService.getInsuranceVerificationPreview(req.body || {});
      res.json({ ok: true, preview });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] insurance verification preview failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /** Payer-call notes → structured VOB synopsis (Norton-style sections), Neon row, optional raw discard, optional ClientCare billing-note via browser. */
  router.post('/insurance/vob-transcript', async (req, res) => {
    try {
      const body = req.body || {};
      const transcript = String(body.transcript_text || body.transcript || '').trim();
      if (!transcript) {
        return res.status(400).json({ ok: false, error: 'transcript_text required' });
      }
      const applyCc = body.apply_to_clientcare === true || String(body.apply_to_clientcare || '').toLowerCase() === 'true';
      if (applyCc) {
        await enforceOperatorAccess(req, ['operator', 'manager']);
        const href = String(body.client_href || '').trim();
        if (!href) {
          return res.status(400).json({ ok: false, error: 'client_href required when apply_to_clientcare is true' });
        }
      }
      const result = await withDeadline(
        () => opsService.ingestVobCallTranscript({
          transcriptText: transcript,
          clientHref: String(body.client_href || '').trim() || null,
          clientName: String(body.client_name || body.full_name || '').trim() || null,
          payerName: String(body.payer_name || '').trim() || null,
          memberId: String(body.member_id || '').trim() || null,
          groupNumber: String(body.group_number || '').trim() || null,
          requestedBy: String(body.requested_by || 'overlay'),
          discardRawTranscript: body.discard_raw_transcript === true || String(body.discard_raw_transcript || '').toLowerCase() === 'true',
          applyToClientcare: applyCc,
          applyFieldUpdates: (body.apply_field_updates === true || String(body.apply_field_updates || '').toLowerCase() === 'true') || applyCc,
          insuranceSlot: Math.max(0, Number(body.insurance_slot || 0) || 0),
        }),
        180000,
        'VOB transcript ingest',
      );
      if (!result.ok) {
        const status = result.error === 'council_unavailable' ? 503
          : result.error === 'transcript_text_required' ? 400
            : result.error === 'council_parse_failed' ? 502
              : 500;
        return res.status(status).json(result);
      }
      if (!result.saved) {
        return res.status(503).json({
          ok: false,
          error: 'Could not save VOB transcript to history. Confirm migration db/migrations/20260403_clientcare_vob_prospects.sql is applied.',
          extracted: result.extracted,
          preview_result: result.preview_result,
          clientcare_note_suggestion: result.clientcare_note_suggestion,
        });
      }
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] VOB transcript ingest failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/insurance/card-intake', upload.array('card', 16), async (req, res) => {
    try {
      const uploadedFiles = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      if (!uploadedFiles.length) return res.status(400).json({ ok: false, error: 'insurance card image required' });
      const files = uploadedFiles.map((f) => ({ fileBuffer: f.buffer, fileName: f.originalname || 'insurance-card' }));
      const result = await opsService.intakeInsuranceCard({
        files,
        prospect: req.body || {},
        requestedBy: String(req.body?.requested_by || 'overlay'),
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] insurance card intake failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/insurance/clientcare-pipeline', upload.array('card', 16), async (req, res) => {
    try {
      const clientHref = String(req.body?.client_href || '').trim();
      if (!clientHref) {
        return res.status(400).json({ ok: false, error: 'client_href required — select a client on the board or paste the billing URL' });
      }
      const apply = String(req.body?.apply || 'true').toLowerCase() !== 'false';
      if (apply) await enforceOperatorAccess(req, ['operator', 'manager']);
      const uploadedFiles = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      const result = await withDeadline(() => opsService.runFullClientcareCardVobPipeline({
        clientHref,
        files: uploadedFiles.map((f) => ({ fileBuffer: f.buffer, fileName: f.originalname || 'insurance-card' })),
        supplementalNotes: String(req.body?.supplemental_notes || ''),
        insuranceSlot: Number(req.body?.insurance_slot || 0) || 0,
        apply,
        requestedBy: String(req.body?.requested_by || 'overlay'),
      }), 210000, 'Real ClientCare VOB');
      if (!result.ok) {
        const status = result.step === 'inspect_clientcare' || result.step === 'reinspect_after_vob' ? 502 : 400;
        return res.status(status).json(result);
      }
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] ClientCare pipeline failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/insurance/reconcile-clientcare', upload.single('card'), async (req, res) => {
    try {
      const clientHref = String(req.body?.client_href || '').trim();
      if (!clientHref) {
        return res.status(400).json({
          ok: false,
          error: 'client_href required — paste the client billing URL from ClientCare (e.g. …/Pregnancy/Billing/…)',
        });
      }
      const apply = String(req.body?.apply || 'false').toLowerCase() === 'true';
      if (apply) await enforceOperatorAccess(req, ['operator', 'manager']);
      const result = await opsService.reconcileInsuranceWithClientcare({
        clientHref,
        fileBuffer: req.file?.buffer?.length ? req.file.buffer : null,
        fileName: req.file?.originalname || null,
        supplementalNotes: String(req.body?.supplemental_notes || ''),
        insuranceSlot: Number(req.body?.insurance_slot || 0) || 0,
        apply,
        requestedBy: String(req.body?.requested_by || 'overlay'),
      });
      if (!result.ok) {
        const status = result.step === 'inspect_clientcare' ? 502 : 400;
        return res.status(status).json(result);
      }
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] reconcile ClientCare failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/insurance/prospects', async (req, res) => {
    try {
      const items = await opsService.listSavedVobProspects({ limit: Number(req.query.limit) || 25 });
      res.json({ ok: true, items });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] list saved VOB prospects failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/insurance/prospects', async (req, res) => {
    try {
      const body = req.body || {};
      const preview = await opsService.getInsuranceVerificationPreview(body);
      const formSnapshot = {
        coverage_active: body.coverage_active,
        in_network: body.in_network,
        auth_required: body.auth_required,
        billed_amount: body.billed_amount,
        copay: body.copay,
        deductible_remaining: body.deductible_remaining,
        coinsurance_pct: body.coinsurance_pct,
      };
      const previewForStore = { ...preview, _form_snapshot: formSnapshot };
      const matchedClient = await opsService.findExistingClientMatch?.({
        fullName: String(body.full_name || '').trim(),
        memberId: String(body.member_id || '').trim(),
      });
      const saved = await opsService.saveVobProspect({
        sourceType: matchedClient ? 'matched_existing_client' : 'prospect_manual',
        fullName: String(body.full_name || '').trim(),
        phone: String(body.phone || '').trim(),
        email: String(body.email || '').trim(),
        payerName: String(body.payer_name || '').trim(),
        memberId: String(body.member_id || '').trim(),
        groupNumber: String(body.group_number || '').trim(),
        subscriberName: String(body.subscriber_name || '').trim(),
        supportPhone: String(body.support_phone || '').trim(),
        preview: previewForStore,
        extractedText: '',
        matchedClient,
        requestedBy: String(body.requested_by || 'overlay'),
        fileMeta: { source: 'manual_vob_save' },
      });
      if (!saved) {
        return res.status(503).json({
          ok: false,
          error: 'Could not save VOB to history. Confirm migration db/migrations/20260403_clientcare_vob_prospects.sql is applied on the server.',
          preview,
          matched_client: matchedClient || null,
        });
      }
      res.json({ ok: true, preview, saved, matched_client: matchedClient || null });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] save VOB prospect failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/insurance/prospects/:id/promote', async (req, res) => {
    try {
      const result = await opsService.promoteSavedVobProspect(req.params.id, {
        requestedBy: String(req.body?.requested_by || 'overlay'),
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] promote saved VOB prospect failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/ops/outreach-request', async (req, res) => {
    try {
      const channel = String(req.body?.channel || '').trim().toLowerCase();
      const body = String(req.body?.body || '').trim();
      const subject = String(req.body?.subject || '').trim();
      const recipientName = String(req.body?.recipient_name || '').trim();
      const recipientEmail = String(req.body?.recipient_email || '').trim();
      const recipientPhone = String(req.body?.recipient_phone || '').trim();
      const sourceRef = String(req.body?.source_ref || 'clientcare_vob').trim();
      const requestedBy = String(req.body?.requested_by || 'overlay');
      if (!['sms', 'email'].includes(channel)) return res.status(400).json({ ok: false, error: 'channel must be sms or email' });
      if (!body) return res.status(400).json({ ok: false, error: 'body is required' });
      if (channel === 'sms' && !recipientPhone) return res.status(400).json({ ok: false, error: 'recipient_phone is required for sms' });
      if (channel === 'email' && !recipientEmail) return res.status(400).json({ ok: false, error: 'recipient_email is required for email' });

      const userId = await resolveLifeOSUserId('adam');
      if (!userId) return res.status(500).json({ ok: false, error: 'Could not resolve LifeOS user for outreach logging' });

      const task = await createOutreachTask({
        userId,
        channel,
        recipientName,
        recipientEmail: recipientEmail || null,
        recipientPhone: recipientPhone || null,
        subject: subject || null,
        body,
        source: 'clientcare_billing',
        sourceRef,
      });
      const execution = await executeOutreachTask(task || {
        channel,
        recipient_name: recipientName,
        recipient_email: recipientEmail || null,
        recipient_phone: recipientPhone || null,
        subject: subject || null,
        body,
      });
      res.status(201).json({ ok: true, task, execution });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] outreach request failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/patient-ar/summary', async (_req, res) => {
    try {
      const summary = await opsService.getPatientArSummary();
      res.json({ ok: true, summary });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] patient AR summary failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/patient-ar/policy', async (_req, res) => {
    try {
      const policy = await opsService.getPatientArPolicy();
      res.json({ ok: true, policy });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] patient AR policy failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/patient-ar/policy', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['manager']);
      const policy = await opsService.savePatientArPolicy(req.body || {}, {
        updatedBy: String(req.body?.updated_by || 'overlay'),
      });
      await sellableService.logAudit({
        actor: String(req.body?.updated_by || 'overlay'),
        actionType: 'patient_ar_policy_save',
        entityType: 'patient_ar_policy',
        entityId: 'default',
        details: policy,
      });
      res.json({ ok: true, policy });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] save patient AR policy failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/patient-ar/escalation-queue', async (req, res) => {
    try {
      const queue = await opsService.getPatientArEscalationQueue({ limit: req.query?.limit });
      res.json({ ok: true, ...queue });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] patient AR escalation queue failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/patient-ar/:claimId/queue-action', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const result = await opsService.queuePatientArAction(req.params.claimId, {
        owner: req.body?.owner || 'overlay',
        actionType: req.body?.action_type || 'patient_ar_followup',
      });
      if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
      await sellableService.logAudit({
        actor: String(req.body?.owner || 'overlay'),
        actionType: req.body?.action_type || 'patient_ar_followup',
        entityType: 'claim_action',
        entityId: String(result.action?.id || req.params.claimId),
        details: result,
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] patient AR queue action failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/login-test', async (_req, res) => {
    try {
      const result = await browserService.login({ dryRun: false });
      await result.session.close().catch(() => {});
      res.json({
        ok: true,
        page: result.page,
        screenshots: result.screenshots,
        loginSelectors: result.loginSelectors,
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser login test failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/discover', async (req, res) => {
    try {
      const result = await browserService.discoverBillingSurface({
        maxCandidates: req.body?.max_candidates,
        includeScreenshots: Boolean(req.body?.include_screenshots),
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser discover failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/inspect-page', async (req, res) => {
    try {
      const result = await browserService.inspectPage({
        href: req.body?.href,
        includeScreenshots: Boolean(req.body?.include_screenshots),
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser inspect page failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/site-map-crawl', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const args = {
        scope: req.body?.scope || 'billing',
        maxPages: req.body?.max_pages || req.body?.maxPages || 20,
        includeScreenshots: Boolean(req.body?.include_screenshots),
        pageTimeoutMs: req.body?.page_timeout_ms || 20000,
        seedHrefs: req.body?.seed_hrefs || req.body?.seedHrefs || null,
      };
      if (req.body?.sync === true || req.query?.sync === '1') {
        const result = await runSiteMapCrawlChild(args, { timeoutMs: 300000, logger });
        return res.json({ ok: Boolean(result?.ok), result });
      }
      const job = enqueueBrowserJob(
        'site_map_crawl',
        async (onProgress) => runSiteMapCrawlChild(args, {
          timeoutMs: 360000,
          onProgress,
          logger,
        }),
        args,
      );
      res.status(202).json({ ok: true, job_id: job.id, status: job.status });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] site-map-crawl failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/billing-overview', async (req, res) => {
    try {
      const result = await browserService.buildBillingOverview({
        includeScreenshots: String(req.query?.include_screenshots || '').toLowerCase() === 'true',
        pageTimeoutMs: req.query?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser billing overview failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/billing-notes-transport', async (req, res) => {
    try {
      const result = await browserService.inspectBillingNotesTransport({
        pageTimeoutMs: req.query?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] billing notes transport failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/inspect-client-account', async (req, res) => {
    try {
      const result = await browserService.inspectClientBillingAccount({
        clientHref: req.body?.client_href,
        includeScreenshots: Boolean(req.body?.include_screenshots),
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] inspect client account failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/scan-client-accounts', async (req, res) => {
    try {
      const result = await browserService.scanClientBillingAccounts({
        limit: req.body?.limit,
        offset: req.body?.offset,
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] scan client accounts failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/scan-billing-notes', async (req, res) => {
    try {
      const result = await browserService.scanBillingNotes({
        pageTimeoutMs: req.query?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] scan billing notes failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/account-report', async (req, res) => {
    try {
      const result = await browserService.buildAccountRescueReport({
        limit: req.query?.limit,
        offset: req.query?.offset,
        pageTimeoutMs: req.query?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] account report failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/full-account-report', async (req, res) => {
    try {
      const result = await browserService.buildFullAccountRescueReport({
        maxPages: req.query?.max_pages,
        pageTimeoutMs: req.query?.page_timeout_ms,
        accountLimit: req.query?.account_limit,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] full account report failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/backlog-summary', async (req, res) => {
    try {
      const asyncMode = String(req.query?.async || '').toLowerCase() === 'true' || req.query?.async === '1';
      const args = {
        maxPages: req.query?.max_pages,
        pageTimeoutMs: req.query?.page_timeout_ms,
        accountLimit: req.query?.account_limit,
      };
      if (asyncMode) {
        const job = enqueueBrowserJob('backlog_summary', () => browserService.buildBacklogSummary(args), args);
        return res.status(202).json({
          ok: true,
          started: true,
          job_id: job.id,
          poll_url: `/api/v1/clientcare-billing/browser/jobs/${job.id}`,
        });
      }
      const result = await browserService.buildBacklogSummary(args);
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] backlog summary failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/birth-activity', async (req, res) => {
    try {
      const asyncMode = String(req.query?.async || 'true').toLowerCase() !== 'false';
      const args = {
        maxRows: req.query?.max_rows,
        pageTimeoutMs: req.query?.page_timeout_ms,
        maxNameResolves: req.query?.max_name_resolves,
      };
      if (asyncMode) {
        const job = enqueueBrowserJob('birth_activity', () => browserService.scanBirthActivity(args), args);
        return res.status(202).json({
          ok: true,
          started: true,
          job_id: job.id,
          poll_url: `/api/v1/clientcare-billing/browser/jobs/${job.id}`,
        });
      }
      res.json(await browserService.scanBirthActivity(args));
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] birth activity failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/map-charge-slip', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const job = enqueueBrowserJob(
        'map_charge_slip',
        () => browserService.mapChargeSlip({
          pregnancyId: req.body?.pregnancy_id || req.body?.pregnancyId,
          patientQuery: req.body?.patient_query || req.body?.patientQuery,
          careType: req.body?.care_type || req.body?.careType,
          visitDate: req.body?.visit_date || req.body?.visitDate,
          visitDates: req.body?.visit_dates || req.body?.visitDates || [],
          scanDays: req.body?.scan_days ?? req.body?.scanDays,
          dryRun: req.body?.dry_run !== false && req.body?.dryRun !== false,
          pageTimeoutMs: req.body?.page_timeout_ms,
        }),
        req.body || {}
      );
      res.status(202).json({
        ok: true,
        started: true,
        job_id: job.id,
        poll_url: `/api/v1/clientcare-billing/browser/jobs/${job.id}`,
        message: 'Charge Slip map queued',
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] map-charge-slip failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/file-superbill-claim', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const args = {
        patientQuery: req.body?.patient_query || req.body?.patientQuery || 'Alvarado',
        visitDate: req.body?.visit_date || req.body?.visitDate,
        pregnancyId: req.body?.pregnancy_id || req.body?.pregnancyId || null,
        pageTimeoutMs: req.body?.page_timeout_ms,
      };
      // Sync path avoids multi-instance job recycle (tip: async file_superbill_claim stale empty @180s).
      if (req.body?.sync === true || req.query?.sync === '1') {
        const result = await browserService.fileSuperBillClaim(args);
        return res.json({ ok: Boolean(result?.ok || result?.filed), result });
      }
      // Tip: in-process Puppeteer can wedge CDP so heartbeats freeze. Run HCFA file in a
      // killable child process (SIGKILL after 120s) so the parent job always completes.
      const job = enqueueBrowserJob(
        'file_superbill_claim',
        async (onProgress) => {
          const transmit = await runFileSuperBillClaimChild(args, {
            // Tip: Generate freezes Chromium — kill after Ally-wait + staged Save/Generate; always probe after.
            timeoutMs: 75000,
            onProgress,
            logger,
          });
          if (transmit?.filed) return transmit;
          onProgress?.({ phase: 'sent_bills_probe_child' });
          const probe = await Promise.race([
            runFileSuperBillClaimChild({
              ...args,
              mode: 'sent_bills_only',
            }, {
              timeoutMs: 35000,
              onProgress,
              logger,
            }),
            new Promise((resolve) => setTimeout(() => resolve({
              ok: false,
              error: 'probe_parent_deadline_35s',
              filed: false,
            }), 38000)),
          ]);
          return {
            ...transmit,
            filed: Boolean(probe?.filed || probe?.sentBillsProbe?.nameHit),
            needs_sent_bills_probe: Boolean(transmit?.needs_sent_bills_probe || transmit?.ok || transmit?.error),
            sentBillsProbe: probe?.sentBillsProbe || null,
            probe_child: {
              ok: probe?.ok,
              filed: probe?.filed,
              error: probe?.error || null,
              message: probe?.message || null,
            },
            transmit_child: {
              ok: transmit?.ok,
              filed: transmit?.filed,
              error: transmit?.error || null,
              needs: transmit?.needs_sent_bills_probe || null,
              message: transmit?.message || null,
            },
            message: probe?.sentBillsProbe?.nameHit
              ? `Sent Bills shows ${args.patientQuery || 'patient'}`
              : (transmit.message || 'Transmit attempted; Sent Bills probe completed without name hit'),
          };
        },
        req.body || {}
      );
      res.status(202).json({
        ok: true,
        started: true,
        job_id: job.id,
        poll_url: `/api/v1/clientcare-billing/browser/jobs/${job.id}`,
        message: 'SuperBill HCFA/Invoice file queued (isolated child)',
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] file-superbill-claim failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/charge-slip-from-billing', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const billingHref = String(req.body?.billing_href || req.body?.billingHref || '').trim();
      if (!billingHref) return res.status(400).json({ ok: false, error: 'billing_href required' });
      const job = enqueueBrowserJob(
        'charge_slip_from_billing',
        () => browserService.openChargeSlipFromBilling({
          billingHref,
          careType: req.body?.care_type || req.body?.careType,
          dryRun: req.body?.dry_run !== false && req.body?.dryRun !== false,
          pageTimeoutMs: req.body?.page_timeout_ms,
        }),
        req.body || {}
      );
      res.status(202).json({
        ok: true,
        started: true,
        job_id: job.id,
        poll_url: `/api/v1/clientcare-billing/browser/jobs/${job.id}`,
        message: 'Charge Slip-from-billing queued',
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] charge-slip-from-billing failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/prepare-claim-status', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const hrefs = Array.isArray(req.body?.billing_hrefs)
        ? req.body.billing_hrefs.map((h) => String(h || '').trim()).filter(Boolean)
        : [String(req.body?.billing_href || '').trim()].filter(Boolean);
      if (!hrefs.length) return res.status(400).json({ ok: false, error: 'billing_href or billing_hrefs required' });
      const dryRun = req.body?.dry_run === true;
      const clientBillingStatus = req.body?.client_billing_status || 'Claims Processing';
      const billProviderType = req.body?.bill_provider_type || 'CPM';
      const job = enqueueBrowserJob(
        'prepare_claim_status',
        async () => {
          const results = [];
          for (const billingHref of hrefs.slice(0, 25)) {
            try {
              const r = await browserService.prepareClaimStatus({
                billingHref,
                clientBillingStatus,
                billProviderType,
                dryRun,
              });
              results.push({
                billingHref,
                ok: r.ok,
                dryRun: r.dryRun,
                saveResult: r.saveResult,
                operations: r.operations,
                before: r.before?.accountSummary,
                after: r.after?.accountSummary,
                error: r.error,
              });
            } catch (err) {
              results.push({ billingHref, ok: false, error: err.message });
            }
          }
          return { ok: true, dryRun, count: results.length, results };
        },
        { hrefs, dryRun, clientBillingStatus, billProviderType }
      );
      res.status(202).json({
        ok: true,
        started: true,
        job_id: job.id,
        poll_url: `/api/v1/clientcare-billing/browser/jobs/${job.id}`,
        message: dryRun ? 'Dry-run claim-status prep queued' : 'Live claim-status prep queued (Claims Processing + CPM)',
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] prepare-claim-status failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/browser/operator-catalog', async (_req, res) => {
    res.json({
      ok: true,
      mode: 'browser_ui_as_api',
      note: 'ClientCare has no public billing API. Use these tip routes. Long jobs: async=true or POST prepare-claim-status.',
      auth: { header: 'x-command-key' },
      map_doc: 'docs/products/clientcare-billing-recovery/BILLING_UI_MAP.md',
      login_probes: [
        { method: 'POST', path: '/api/v1/clientcare-billing/browser/login-test' },
        { method: 'GET', path: '/api/v1/clientcare-billing/clientcare/readiness' },
      ],
      money_path: [
        { method: 'POST', path: '/api/v1/clientcare-billing/forever-chase/sync', summary: 'Seed forever-chase ledger from births + billing notes' },
        { method: 'POST', path: '/api/v1/clientcare-billing/forever-chase/seed', summary: 'Seed forever-chase from provided births/accounts inventory' },
        { method: 'GET', path: '/api/v1/clientcare-billing/forever-chase', summary: 'Open unpaid/underpaid chase queue (never ages out)' },
        { method: 'GET', path: '/api/v1/clientcare-billing/stages', summary: 'Billing scenario stage map + clocks' },
        { method: 'GET', path: '/api/v1/clientcare-billing/stages/due', summary: 'Due-now stage clock work queue' },
        { method: 'POST', path: '/api/v1/clientcare-billing/stages/sync-clocks', summary: 'Stamp scenario/stage/next_due_at on open claims' },
        { method: 'POST', path: '/api/v1/clientcare-billing/stages/execute-due', summary: 'Execute due stage workers (file/chase)' },
        { method: 'POST', path: '/api/v1/clientcare-billing/stages/advance/:claimId', summary: 'Advance claim stage on prove/pay/deny event' },
        { method: 'GET', path: '/api/v1/clientcare-billing/underpayments', summary: 'Short-paid claims vs allowed' },
        { method: 'GET', path: '/api/v1/clientcare-billing/browser/birth-activity?async=true', summary: 'Recent births → billing hrefs' },
        { method: 'GET', path: '/api/v1/clientcare-billing/browser/backlog-summary?async=true&account_limit=50', summary: 'Billing notes rescue queue (newest first)' },
        { method: 'POST', path: '/api/v1/clientcare-billing/browser/prepare-claim-status', body: { billing_hrefs: ['…'], dry_run: false }, summary: 'Set Claims Processing + CPM' },
        { method: 'POST', path: '/api/v1/clientcare-billing/browser/map-charge-slip', body: { pregnancy_id: '…', patient_query: 'Lastname' }, summary: 'Map Charge Slip create surface' },
        { method: 'POST', path: '/api/v1/clientcare-billing/ops/repair-account', summary: 'Field repair (dry_run default true)' },
        { method: 'GET', path: '/api/v1/clientcare-billing/browser/jobs/:jobId', summary: 'Poll async browser job' },
      ],
      vendor_ai: {
        embedded: 'AI-assisted charting only — not a billing API',
        our_path: 'Puppeteer + Tiller/council for VOB and claim coaching',
      },
    });
  });

  router.get('/browser/client-directory-search', async (req, res) => {
    try {
      const result = await withDeadline(() => browserService.searchClientDirectory({
        query: req.query?.query,
        limit: req.query?.limit,
        pageTimeoutMs: req.query?.page_timeout_ms,
        maxDirectoryItems: req.query?.max_directory_items,
      }), 20000, 'ClientCare directory search');
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] client directory search failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/browser/extract-claims', async (req, res) => {
    try {
      const result = await browserService.extractClaimTables({
        importIntoQueue: Boolean(req.body?.import_into_queue),
        maxCandidates: req.body?.max_candidates,
        includeScreenshots: Boolean(req.body?.include_screenshots),
        pageTimeoutMs: req.body?.page_timeout_ms,
      });
      res.json(result);
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] browser extract failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/assistant/session', async (_req, res) => {
    try {
      const sessionId = `clientcare-${randomUUID()}`;
      const metadata = {
        channel: 'clientcare_billing_overlay',
        created_at: new Date().toISOString(),
        archived_count: 0,
      };
      await conversationStore.save({
        sessionId,
        source: 'clientcare_overlay',
        project: 'clientcare_billing',
        messages: [],
        metadata,
        startedAt: new Date(),
      });
      res.status(201).json({ ok: true, session_id: sessionId, metadata });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] create assistant session failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/assistant/session/:sessionId', async (req, res) => {
    try {
      const conv = await conversationStore.get(req.params.sessionId);
      if (!conv) return res.status(404).json({ ok: false, error: 'Session not found' });
      const messages = Array.isArray(conv.messages) ? conv.messages : [];
      const recentWindow = 16;
      const archivedCount = Math.max(0, messages.length - recentWindow);
      const archived = messages.slice(0, archivedCount);
      const recent = messages.slice(archivedCount);
      const archive_preview = archived
        .filter((m) => m.role === 'user')
        .slice(-8)
        .map((m) => String(m.content || '').slice(0, 160))
        .join(' | ');
      res.json({
        ok: true,
        session_id: conv.session_id,
        archived_count: archivedCount,
        archive_preview,
        recent_messages: recent,
        metadata: conv.metadata || {},
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] get assistant session failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/assistant/message', async (req, res) => {
    try {
      const sessionId = String(req.body?.session_id || '').trim();
      const message = String(req.body?.message || '').trim();
      if (!sessionId) return res.status(400).json({ ok: false, error: 'session_id required' });
      if (!message) return res.status(400).json({ ok: false, error: 'message required' });
      const existing = await conversationStore.get(sessionId);
      if (!existing) return res.status(404).json({ ok: false, error: 'Session not found' });
      const priorMessages = Array.isArray(existing.messages) ? existing.messages : [];
      const result = await opsService.ask(message, {
        requestedBy: 'sherry_console',
        billingContext: req.body?.billing_context || null,
      });
      const capReq = result.capability_request || result.data?.capability_request || null;
      const mergedData =
        result.data && typeof result.data === 'object'
          ? { ...result.data, ...(capReq ? { capability_request: capReq } : {}) }
          : capReq
            ? { capability_request: capReq }
            : null;
      const parsed = {
        reply: result.reply || result.error || 'No response generated.',
        intent: result.type || 'question',
        scope: result.scope || 'unclear',
        should_apply_systemwide: Boolean(result.should_apply_systemwide),
        suggested_actions: result.suggested_actions || [],
        notes: result.notes || [],
        data: mergedData,
      };

      const messages = [
        ...priorMessages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          metadata: m.metadata,
        })),
        { role: 'user', content: message, timestamp: new Date().toISOString(), metadata: { channel: 'clientcare_billing_overlay' } },
        { role: 'assistant', content: parsed.reply, timestamp: new Date().toISOString(), metadata: { intent: parsed.intent, scope: parsed.scope, should_apply_systemwide: parsed.should_apply_systemwide, suggested_actions: parsed.suggested_actions || [], notes: parsed.notes || [], data: parsed.data } },
      ];

      const archivedCount = Math.max(0, messages.length - 16);
      await conversationStore.save({
        sessionId,
        source: 'clientcare_overlay',
        project: 'clientcare_billing',
        messages,
        metadata: {
          ...(existing.metadata || {}),
          archived_count: archivedCount,
          last_intent: parsed.intent,
          last_scope: parsed.scope,
          last_should_apply_systemwide: Boolean(parsed.should_apply_systemwide),
        },
        startedAt: existing.started_at,
        endedAt: new Date(),
      });

      res.json({
        ok: true,
        session_id: sessionId,
        assistant: parsed,
        archived_count: archivedCount,
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] assistant message failed');
      res.status(500).json({ ok: false, error: error.message });
    }
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

  router.post('/history/import-csv', async (req, res) => {
    try {
      const csv = String(req.body?.csv || '');
      if (!csv.trim()) return res.status(400).json({ ok: false, error: 'csv required' });
      const result = await billingService.importPaymentHistoryCsv(csv, { source: req.body?.source || 'payment_history_csv' });
      if (!result.parsed) return res.status(400).json({ ok: false, error: 'No payment-history rows parsed from csv' });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] payment history csv import failed');
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

  router.get('/appeals/:claimId/packet', async (req, res) => {
    try {
      const packet = await billingService.buildAppealPacketPreview(req.params.claimId);
      if (!packet) return res.status(404).json({ ok: false, error: 'Claim not found' });
      res.json({ ok: true, ...packet });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] appeal packet failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/appeals/:claimId/queue-action', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const result = await billingService.queueAppealAction(req.params.claimId, {
        owner: req.body?.owner || null,
        actionType: req.body?.action_type || 'appeal_followup',
      });
      if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
      await sellableService.logAudit({
        actor: String(req.body?.owner || 'overlay'),
        actionType: req.body?.action_type || 'appeal_followup',
        entityType: 'claim_action',
        entityId: String(result.action?.id || req.params.claimId),
        details: result,
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] queue appeal action failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/underpayments/:claimId/queue-action', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const result = await billingService.queueUnderpaymentAction(req.params.claimId, {
        owner: req.body?.owner || null,
        actionType: req.body?.action_type || 'underpayment_review',
      });
      if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
      await sellableService.logAudit({
        actor: String(req.body?.owner || 'overlay'),
        actionType: req.body?.action_type || 'underpayment_review',
        entityType: 'claim_action',
        entityId: String(result.action?.id || req.params.claimId),
        details: result,
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] queue underpayment action failed');
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

  /**
   * Founder mandate 2026-07-14: Sherry/midwife does zero billing ops.
   * System prepares claim status + files ChargeSlip/HCFA for recent resolved births.
   */
  function pregnancyIdFromBillingHref(href) {
    const m = String(href || '').match(/Pregnancy\/Billing\/([0-9a-f-]{36})/i)
      || String(href || '').match(/ShowDefaultClientScreen\/([0-9a-f-]{36})/i);
    return m?.[1] || null;
  }

  function formatVisitDate(value) {
    if (!value) return null;
    const s = String(value).trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  function pickDirectoryCandidate(patientName, candidates = []) {
    const parts = String(patientName || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!parts.length || !candidates.length) return null;
    const first = parts[0];
    const last = parts[parts.length - 1];
    const ranked = candidates.map((c) => {
      let score = Number(c.score || 0) || 0;
      const name = String(c.client || '').toLowerCase();
      const np = name.split(/\s+/).filter(Boolean);
      const cFirst = np[0] || '';
      const cLast = np[np.length - 1] || '';
      if (first && cFirst.startsWith(first.slice(0, Math.min(4, first.length)))) score += 25;
      if (last && last.length >= 2 && cLast.startsWith(last)) score += 45;
      if (first && last && name.includes(first) && cLast.startsWith(last.slice(0, Math.min(3, last.length)))) score += 20;
      return { ...c, score };
    }).sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best || best.score < 55) return null;
    return best;
  }

  async function escalateFileBlastRepair({
    errorCode,
    detail,
    proposedSolution,
    evidence = {},
  } = {}) {
    const code = String(errorCode || 'CLIENTCARE_FILE_BLAST_FAILURE').slice(0, 80);
    const nowMs = Date.now();
    const last = CC_REPAIR_DEDUPE.get(code) || 0;
    if (nowMs - last < 30 * 60 * 1000) {
      return { ok: true, deduped: true, code };
    }
    CC_REPAIR_DEDUPE.set(code, nowMs);

    const finding = {
      code,
      detail: String(detail || code).slice(0, 400),
      proposed_solution: String(proposedSolution || 'Fix ClientCare file-blast resolve/file path and re-prove Sent Bills.').slice(0, 500),
      evidence,
      at: new Date().toISOString(),
    };

    // BuilderOS intake — SENTRY findings feed (SO-002 self-fix).
    try {
      let feed = { product: 'clientcare-billing-recovery', findings: [] };
      try {
        if (fs.existsSync(CC_REPAIR_FEED)) {
          feed = JSON.parse(fs.readFileSync(CC_REPAIR_FEED, 'utf8'));
        }
      } catch (_) { /* fresh feed */ }
      const findings = Array.isArray(feed.findings) ? feed.findings : [];
      const filtered = findings.filter((f) => String(f?.code) !== code);
      filtered.unshift(finding);
      feed = {
        product: 'clientcare-billing-recovery',
        updated_at: finding.at,
        findings: filtered.slice(0, 40),
      };
      fs.mkdirSync(path.dirname(CC_REPAIR_FEED), { recursive: true });
      fs.writeFileSync(CC_REPAIR_FEED, JSON.stringify(feed, null, 2));
    } catch (err) {
      logger.warn?.({ err: err.message, code }, '[CLIENTCARE-BILLING] repair feed write failed');
    }

    // Capability queue — never silent.
    let capability = null;
    try {
      capability = await opsService.createCapabilityRequest(
        `BUILDEROS REPAIR: ${code} — ${finding.detail}`,
        {
          requestedBy: 'clientcare_file_blast',
          priority: 'high',
          normalizedIntent: 'builderos_auto_repair',
          metadata: {
            product: 'clientcare-billing-recovery',
            error_code: code,
            proposed_solution: finding.proposed_solution,
            evidence,
            silent_failure_forbidden: true,
          },
        },
      );
    } catch (err) {
      logger.error?.({ err: err.message, code }, '[CLIENTCARE-BILLING] repair capability request failed');
    }

    logger.error?.({
      code,
      detail: finding.detail,
      proposed_solution: finding.proposed_solution,
      capability_id: capability?.id || null,
    }, '[CLIENTCARE-BILLING] FILE BLAST FAILURE — repair requested (not silent)');

    return { ok: true, deduped: false, code, capability_id: capability?.id || null, finding };
  }

  async function resolvePregnancyViaDirectory(patientName) {
    const name = String(patientName || '').trim();
    if (!name) return { ok: false, error: 'empty_name' };
    const parts = name.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1] || name;
    const queries = Array.from(new Set([
      name,
      parts.length >= 2 ? `${parts[0]} ${last}` : null,
      last.length >= 3 ? last : null,
      parts[0] && last.length >= 2 ? parts[0] : null,
    ].filter(Boolean))).slice(0, 2); // cap logins — tip hung on 4× directory searches per patient

    const run = async () => {
      let lastResult = null;
      for (const q of queries) {
        try {
          const searched = await browserService.searchClientDirectory({ query: q, limit: 12 });
          lastResult = searched;
          const pick = pickDirectoryCandidate(name, searched?.candidates || []);
          if (pick?.billingHref || pick?.href) {
            const billingHref = pick.billingHref
              || (pick.href ? String(pick.href).replace(/\/ShowDefaultClientScreen\//i, '/Pregnancy/Billing/') : null);
            const pregnancyId = pregnancyIdFromBillingHref(billingHref)
              || pregnancyIdFromBillingHref(pick.href)
              || stagePregnancyIdFromHref(billingHref);
            if (pregnancyId) {
              return {
                ok: true,
                pregnancyId,
                billingHref,
                matchedName: pick.client,
                score: pick.score,
                query: q,
                from: 'client_directory',
              };
            }
          }
        } catch (err) {
          lastResult = { ok: false, error: String(err?.message || err).slice(0, 160) };
        }
      }
      return {
        ok: false,
        error: 'directory_no_pregnancy_match',
        queries,
        directoryCount: lastResult?.directoryCount || 0,
        candidates: (lastResult?.candidates || []).slice(0, 5).map((c) => ({
          client: c.client, score: c.score, billingHref: c.billingHref || null,
        })),
      };
    };

    try {
      return await Promise.race([
        run(),
        new Promise((resolve) => setTimeout(() => resolve({ ok: false, error: 'directory_resolve_timeout_45s' }), 45000)),
      ]);
    } catch (err) {
      return { ok: false, error: String(err?.message || err).slice(0, 160) };
    }
  }

  async function fileClaimWithProveChild(args = {}) {
    const transmit = await runFileSuperBillClaimChild(args, {
      timeoutMs: 75000,
      logger,
    });
    if (transmit?.filed) return transmit;
    const probe = await Promise.race([
      runFileSuperBillClaimChild({
        ...args,
        mode: 'sent_bills_only',
      }, {
        timeoutMs: 35000,
        logger,
      }),
      new Promise((resolve) => setTimeout(() => resolve({
        ok: false,
        error: 'probe_parent_deadline_35s',
        filed: false,
      }), 38000)),
    ]);
    return {
      ...transmit,
      filed: Boolean(probe?.filed || probe?.sentBillsProbe?.nameHit),
      needs_sent_bills_probe: Boolean(transmit?.needs_sent_bills_probe || transmit?.ok || transmit?.error),
      sentBillsProbe: probe?.sentBillsProbe || null,
      probe_child: {
        ok: probe?.ok,
        filed: probe?.filed,
        error: probe?.error || null,
        message: probe?.message || null,
      },
      transmit_child: {
        ok: transmit?.ok,
        filed: transmit?.filed,
        error: transmit?.error || null,
        message: transmit?.message || null,
      },
      message: probe?.sentBillsProbe?.nameHit
        ? `Sent Bills shows ${args.patientQuery || 'patient'}`
        : (transmit?.message || 'Transmit attempted; Sent Bills probe completed without name hit'),
    };
  }

  async function runHandsOffFileCycle({
    limit = 8,
    tenantId = null,
    preferQuery = null,
    visitDate = null,
    fromDueQueue = true,
    mode = 'file_now',
  } = {}) {
    const results = [];
    const maxN = Math.max(1, Math.min(Number(limit) || 8, 15));

    if (fromDueQueue) {
      // FILE NOW — clocks do not stagger capture. Pull large file_now set and burn through it.
      const due = await billingService.getDueChaseWork({
        limit: Math.max(maxN * 30, 200),
        tenantId,
        dueOnly: true,
        mode: mode === 'follow_up' ? 'follow_up' : 'file_now',
      });
      let items = due.items || [];
      const fileRank = (i) => {
        if ((i.pregnancy_id || i.billing_href) && ['file_claim', 'prove_sent_bills', 'prepare_claim_status'].includes(i.worker)) return 0;
        if ((i.pregnancy_id || i.billing_href) && (i.scenario === 'unpaid_birth_file' || i.scenario === 'transport_prenatal_claim')) return 1;
        if (i.scenario === 'unpaid_birth_file' || i.scenario === 'transport_prenatal_claim') return 2;
        if (i.worker === 'resolve_billing_href') return 3;
        if (i.worker === 'notes_repair') return 4;
        return 5;
      };
      items = [...items].sort((a, b) => {
        const ra = fileRank(a) - fileRank(b);
        if (ra !== 0) return ra;
        return (Number(a.resolve_fail_count || 0) || 0) - (Number(b.resolve_fail_count || 0) || 0);
      });
      if (preferQuery) {
        const needle = String(preferQuery).toLowerCase();
        items = [
          ...items.filter((i) => String(i.patient_name || '').toLowerCase().includes(needle)),
          ...items.filter((i) => !String(i.patient_name || '').toLowerCase().includes(needle)),
        ];
      }

      // One birth-activity pass to attach missing pregnancy IDs (not N directory logins).
      let birthLinkByName = new Map();
      if (mode !== 'follow_up' && items.some((i) => !(i.pregnancy_id || i.billing_href))) {
        try {
          const scanned = await browserService.scanBirthActivity({ maxRows: 80, tenantId });
          for (const b of scanned?.births || []) {
            const name = String(b.resolve?.matchedName || b.motherNameGuess || '').toLowerCase().trim();
            const href = b.billingHref || null;
            const pid = pregnancyIdFromBillingHref(href);
            if (name && (href || pid)) birthLinkByName.set(name, { billingHref: href, pregnancyId: pid });
          }
        } catch (_) { /* continue filing linked ones */ }
      }

      for (const item of items.slice(0, maxN)) {
        const step = {
          source: 'file_now',
          claim_id: item.claim_id,
          patient: item.patient_name,
          pregnancy_id: item.pregnancy_id || null,
          billing_href: item.billing_href || null,
          scenario: item.scenario,
          stage: item.stage,
          worker: item.worker,
          prepare: null,
          file: null,
          followup: null,
          prove: null,
          resolve: null,
          repair: null,
          proved_filed: false,
        };
        try {
          let pregnancyId = item.pregnancy_id
            || stagePregnancyIdFromHref(item.billing_href)
            || pregnancyIdFromBillingHref(item.billing_href);
          let billingHref = item.billing_href || null;

          if (!pregnancyId && item.patient_name) {
            const key = String(item.patient_name).toLowerCase().trim();
            const hit = birthLinkByName.get(key)
              || [...birthLinkByName.entries()].find(([n]) => key.includes(n) || n.includes(key.split(/\s+/).pop() || key))?.[1];
            if (hit) {
              billingHref = hit.billingHref || billingHref;
              pregnancyId = hit.pregnancyId || stagePregnancyIdFromHref(billingHref) || pregnancyIdFromBillingHref(billingHref);
              step.billing_href = billingHref;
              step.pregnancy_id = pregnancyId;
              step.resolve = { ok: Boolean(pregnancyId), from: 'birth_activity' };
            }
          }

          // Notes often embed PregnancyID / billing href — use before directory login.
          if (!pregnancyId && item.claim_id) {
            try {
              const full = await billingService.getClaimById(item.claim_id);
              const blob = [
                full?.notes,
                full?.metadata?.billing_href,
                full?.metadata?.pregnancy_id,
                ...(Array.isArray(full?.metadata?.note_previews) ? full.metadata.note_previews : []),
              ].filter(Boolean).join('\n');
              const hrefHit = String(blob).match(/\/Pregnancy\/Billing\/([0-9a-f-]{36})/i);
              const idHit = String(blob).match(/PregnancyID[=:\s"']+([0-9a-f-]{36})/i)
                || String(blob).match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
              if (hrefHit) {
                billingHref = hrefHit[0].startsWith('http') ? hrefHit[0] : `https://clientcarewest.net${hrefHit[0]}`;
                pregnancyId = hrefHit[1];
              } else if (idHit?.[1]) {
                pregnancyId = idHit[1];
                billingHref = billingHref || `https://clientcarewest.net/Pregnancy/Billing/${pregnancyId}`;
              }
              if (pregnancyId) {
                step.resolve = { ok: true, from: 'notes_text', pregnancyId, billingHref };
                step.pregnancy_id = pregnancyId;
                step.billing_href = billingHref;
                await billingService.attachPregnancyLink(item.claim_id, {
                  pregnancyId,
                  billingHref,
                  source: 'notes_text',
                  matchedName: item.patient_name,
                }).catch(() => null);
              }
            } catch (_) { /* fall through to directory */ }
          }

          // Directory fallback — notes queue names often missing from Birth Activity.
          if (!pregnancyId && item.patient_name && mode !== 'follow_up') {
            const dir = await resolvePregnancyViaDirectory(item.patient_name);
            step.resolve = dir;
            if (dir.ok && dir.pregnancyId) {
              pregnancyId = dir.pregnancyId;
              billingHref = dir.billingHref || billingHref;
              step.pregnancy_id = pregnancyId;
              step.billing_href = billingHref;
              try {
                await billingService.attachPregnancyLink(item.claim_id, {
                  pregnancyId,
                  billingHref,
                  source: 'client_directory',
                  matchedName: dir.matchedName,
                });
              } catch (err) {
                step.resolve = { ...dir, persist_error: String(err?.message || err).slice(0, 120) };
              }
            }
          } else if (pregnancyId && step.resolve?.from === 'birth_activity') {
            try {
              await billingService.attachPregnancyLink(item.claim_id, {
                pregnancyId,
                billingHref,
                source: 'birth_activity',
                matchedName: item.patient_name,
              });
            } catch (_) { /* non-fatal */ }
          }

          const shouldFile = Boolean(pregnancyId);

          if (shouldFile && pregnancyId) {
            if (billingHref) {
              try {
                step.prepare = await browserService.prepareClaimStatus({
                  billingHref,
                  dryRun: false,
                });
              } catch (err) {
                step.prepare = { ok: false, error: String(err?.message || err).slice(0, 160) };
              }
            }
            step.file = await fileClaimWithProveChild({
              pregnancyId,
              patientQuery: item.patient_name,
              visitDate: visitDate || formatVisitDate(item.date_of_service) || null,
            });
            const sentHit = Boolean(
              step.file?.filed
              || step.file?.dailySuperBill?.sentBillsProbe?.nameHit
              || step.file?.sentBillsProbe?.nameHit
            );
            step.proved_filed = sentHit;
            if (sentHit) {
              await billingService.advanceClaimStage(item.claim_id, 'proved_sent', {
                notes: 'SYSTEM: Sent Bills nameHit — follow-up clock starts (7d await ERA). File path does not stagger.',
              });
            } else {
              const errCode = step.file?.error || step.file?.transmit_child?.error || 'sent_bills_no_name_hit';
              await billingService.recordResolveFailure(item.claim_id, errCode, step.file?.message || null).catch(() => null);
              step.repair = await escalateFileBlastRepair({
                errorCode: `FILE_${String(errCode).replace(/[^A-Za-z0-9_]/g, '_').slice(0, 48).toUpperCase()}`,
                detail: `Filed attempt for ${item.patient_name} did not prove Sent Bills nameHit (${errCode}).`,
                proposedSolution: 'Harden HCFA→EDI→Sent Bills prove path in clientcare-file-hcfa-once / fileSuperBillClaim; retry this pregnancy_id.',
                evidence: {
                  claim_id: item.claim_id,
                  patient: item.patient_name,
                  pregnancy_id: pregnancyId,
                  file: {
                    ok: step.file?.ok,
                    error: step.file?.error || null,
                    filed: step.file?.filed || false,
                    message: step.file?.message || null,
                  },
                },
              });
            }
          } else if (mode === 'follow_up' || ['ask_insurer', 'status_followup', 'underpay_packet', 'await_era'].includes(item.worker)) {
            step.followup = { ok: true, worker: item.worker, note: 'follow-up clock touch' };
            await billingService.advanceClaimStage(item.claim_id, 'advance', {
              notes: `SYSTEM follow-up clock ${item.worker}`,
            });
          } else {
            step.file = { ok: false, error: 'pregnancy_id_missing_after_resolve' };
            await billingService.recordResolveFailure(
              item.claim_id,
              'pregnancy_id_missing_after_resolve',
              step.resolve?.error || null,
            ).catch(() => null);
            step.repair = await escalateFileBlastRepair({
              errorCode: 'PREGNANCY_ID_MISSING_AFTER_RESOLVE',
              detail: `Cannot file ${item.patient_name}: birth activity + client directory did not yield pregnancy_id.`,
              proposedSolution: 'Improve directory/name matching for truncated billing-notes names; extract PregnancyID from notes API; skip thrash and rotate queue.',
              evidence: {
                claim_id: item.claim_id,
                patient: item.patient_name,
                resolve: step.resolve || null,
                resolve_fail_count: Number(item.resolve_fail_count || 0) + 1,
              },
            });
          }
        } catch (err) {
          step.error = String(err?.message || err).slice(0, 200);
          if (item.claim_id) {
            await billingService.recordResolveFailure(item.claim_id, 'file_blast_exception', step.error).catch(() => null);
          }
          step.repair = await escalateFileBlastRepair({
            errorCode: 'FILE_BLAST_EXCEPTION',
            detail: `Exception filing ${item.patient_name}: ${step.error}`,
            proposedSolution: 'Catch and fix the thrown ClientCare browser path; never fail silent.',
            evidence: { claim_id: item.claim_id, patient: item.patient_name, error: step.error },
          });
        }
        results.push(step);
        // Do NOT stop after one prove — burn through the batch as fast as possible.
      }
    }

    const dueProved = results.filter((r) => r.proved_filed).length;
    const dueLinkedAttempts = results.filter((r) => r.pregnancy_id).length;
    // If due-queue was empty OR only unlinked thrash, file from Birth Activity (recent charted births).
    if (!results.length || (dueProved === 0 && dueLinkedAttempts === 0)) {
      const birthLimit = Math.max(10, Math.min(maxN * 10, 60));
      const scanned = await browserService.scanBirthActivity({ maxRows: birthLimit, tenantId });
      if (!scanned?.ok || !(scanned?.births || []).length) {
        await escalateFileBlastRepair({
          errorCode: 'BIRTH_ACTIVITY_EMPTY',
          detail: `Birth Activity returned ${scanned?.count ?? 0} rows (ok=${scanned?.ok}). Cannot discover chart-linked births to file.`,
          proposedSolution: 'Fix BirthActivityPartial scrape (Babies Born widget / date range); seed unpaid births with billingHref.',
          evidence: {
            url: scanned?.url || null,
            headings: scanned?.page?.headings || null,
            directoryCount: scanned?.directoryCount ?? null,
            error: scanned?.error || null,
          },
        });
      }
      let births = (scanned?.births || []).filter((b) => b.billingHref);
      if (preferQuery) {
        const needle = String(preferQuery).toLowerCase();
        births = [
          ...births.filter((b) => String(b.motherNameGuess || b.resolve?.matchedName || '').toLowerCase().includes(needle)),
          ...births.filter((b) => !String(b.motherNameGuess || b.resolve?.matchedName || '').toLowerCase().includes(needle)),
        ];
      }
      // Skip already proved clients.
      const provedNames = new Set(
        (await billingService.getForeverChaseQueue({ limit: 200, tenantId })).items
          ?.filter((i) => i.metadata?.last_stage_event === 'proved_sent')
          .map((i) => String(i.patient_name || '').toLowerCase().split(/\s+/)[0])
          || [],
      );
      births = births.filter((b) => {
        const n = String(b.resolve?.matchedName || b.motherNameGuess || '').toLowerCase();
        const first = n.split(/\s+/)[0];
        return first && !provedNames.has(first);
      });
      for (const birth of births.slice(0, maxN)) {
        const pregnancyId = pregnancyIdFromBillingHref(birth.billingHref);
        const patientQuery = birth.resolve?.matchedName || birth.motherNameGuess || preferQuery || '';
        const bornGuess = Array.isArray(birth.cells)
          ? (birth.cells.find((c) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(String(c || ''))) || null)
          : null;
        const step = {
          source: 'birth_activity_file_now',
          patient: patientQuery,
          pregnancy_id: pregnancyId,
          billing_href: birth.billingHref,
          prepare: null,
          file: null,
          proved_filed: false,
        };
        try {
          if (birth.billingHref) {
            step.prepare = await browserService.prepareClaimStatus({ billingHref: birth.billingHref, dryRun: false });
          }
        } catch (err) {
          step.prepare = { ok: false, error: String(err?.message || err).slice(0, 160) };
        }
        if (pregnancyId) {
          try {
            step.file = await fileClaimWithProveChild({
              pregnancyId,
              patientQuery,
              visitDate: visitDate || bornGuess || null,
            });
            step.proved_filed = Boolean(step.file?.filed || step.file?.sentBillsProbe?.nameHit);
            if (!step.proved_filed) {
              step.repair = await escalateFileBlastRepair({
                errorCode: 'BIRTH_ACTIVITY_SENT_BILLS_MISS',
                detail: `Birth-activity file for ${patientQuery} did not prove Sent Bills.`,
                proposedSolution: 'Prove HCFA EDI path for this pregnancy_id; check ChargeSlip lines exist.',
                evidence: { patient: patientQuery, pregnancy_id: pregnancyId, file: step.file },
              });
            }
          } catch (err) {
            step.file = { ok: false, error: String(err?.message || err).slice(0, 160) };
          }
        } else {
          step.file = { ok: false, error: 'pregnancy_id_missing_from_billing_href' };
        }
        results.push(step);
      }
      return {
        ok: true,
        doctrine: 'file_as_fast_as_possible_clocks_are_followups_only',
        mode: 'birth_activity_file_now',
        scanned: scanned?.count || 0,
        attempted: results.length,
        proved_any: results.some((r) => r.proved_filed),
        proved_count: results.filter((r) => r.proved_filed).length,
        results,
        due_queue_prefix: dueLinkedAttempts || dueProved ? undefined : 'unlinked_due_fell_through',
      };
    }

    return {
      ok: true,
      doctrine: 'file_as_fast_as_possible_clocks_are_followups_only',
      mode: mode || 'file_now',
      attempted: results.length,
      proved_any: results.some((r) => r.proved_filed),
      proved_count: results.filter((r) => r.proved_filed).length,
      results,
    };
  }

  router.post('/hands-off/run', async (req, res) => {
    try {
      await enforceOperatorAccess(req, ['operator', 'manager']);
      const tenantId = getTenantId(req) || req.body?.tenant_id || null;
      const job = enqueueBrowserJob(
        'hands_off_file',
        () => runHandsOffFileCycle({
          limit: req.body?.limit ?? 2,
          tenantId,
          preferQuery: req.body?.prefer_query || req.body?.patient_query || null,
          visitDate: req.body?.visit_date || req.body?.visitDate || null,
          fromDueQueue: req.body?.from_due_queue !== false,
          mode: req.body?.mode || 'file_now',
        }),
        { ...(req.body || {}), tenant_id: tenantId },
      );
      res.status(202).json({
        ok: true,
        started: true,
        job_id: job.id,
        poll_url: `/api/v1/clientcare-billing/browser/jobs/${job.id}`,
        message: 'FILE NOW batch queued — clocks do not delay capture',
        doctrine: 'file_as_fast_as_possible_clocks_are_followups_only',
      });
    } catch (error) {
      logger.error?.({ err: error.message }, '[CLIENTCARE-BILLING] hands-off run failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/hands-off/status', async (_req, res) => {
    res.json({
      ok: true,
      doctrine: 'file_as_fast_as_possible_clocks_are_followups_only',
      enabled: String(process.env.CLIENTCARE_HANDS_OFF || '1') !== '0',
      file_blast_interval_ms: Number(process.env.CLIENTCARE_FILE_BLAST_INTERVAL_MS || 2 * 60 * 1000),
      followup_clock_interval_ms: Number(process.env.CLIENTCARE_STAGE_CLOCK_INTERVAL_MS || 15 * 60 * 1000),
      note: 'Clocks = next follow-up after file only. Failures escalate to BuilderOS repair (capability + SENTRY feed) — never silent.',
      repair_feed: 'products/receipts/SENTRY_FINDINGS_FEED.clientcare-billing-recovery.json',
    });
  });

  // FILE BLAST — as fast as tip can take; clocks do NOT gate capture.
  if (String(process.env.CLIENTCARE_HANDS_OFF || '1') !== '0' && !globalThis.__clientcareHandsOffStarted) {
    globalThis.__clientcareHandsOffStarted = true;
    const fileBlastMs = Math.max(60 * 1000, Number(process.env.CLIENTCARE_FILE_BLAST_INTERVAL_MS || 2 * 60 * 1000));
    const kickFile = () => {
      try {
        const busy = [...browserJobs.values()].some((j) => ['queued', 'running'].includes(j.status));
        if (busy) {
          logger.info?.('[CLIENTCARE-BILLING] file-blast skip — browser job already active');
          return;
        }
        enqueueBrowserJob(
          'hands_off_file',
          () => runHandsOffFileCycle({
            limit: Number(process.env.CLIENTCARE_FILE_BLAST_LIMIT || 2),
            preferQuery: process.env.CLIENTCARE_HANDS_OFF_PREFER || null,
            fromDueQueue: true,
            mode: 'file_now',
          }),
          { source: 'file_blast_scheduler' },
        );
        logger.info?.({ fileBlastMs }, '[CLIENTCARE-BILLING] FILE NOW blast queued');
      } catch (err) {
        logger.warn?.({ err: err.message }, '[CLIENTCARE-BILLING] file-blast enqueue failed');
      }
    };
    // Start ASAP — do not wait 15 minutes to begin filing the open queue.
    setTimeout(kickFile, Number(process.env.CLIENTCARE_FILE_BLAST_BOOT_DELAY_MS || 20 * 1000));
    setInterval(kickFile, fileBlastMs);
    logger.info?.({ fileBlastMs }, '[CLIENTCARE-BILLING] FILE NOW blast armed (clocks are follow-ups only)');
  }

  // Follow-up clocks only — after claims are filed.
  if (String(process.env.CLIENTCARE_STAGE_CLOCKS || '1') !== '0' && !globalThis.__clientcareStageClocksStarted) {
    globalThis.__clientcareStageClocksStarted = true;
    const clockMs = Math.max(5 * 60 * 1000, Number(process.env.CLIENTCARE_STAGE_CLOCK_INTERVAL_MS || 15 * 60 * 1000));
    const tickFollowUps = async () => {
      try {
        await billingService.syncAllOpenStageClocks({ limit: 300 });
        const due = await billingService.getDueChaseWork({ limit: 30, dueOnly: true, mode: 'follow_up' });
        logger.info?.({ follow_up_due: due.summary?.follow_up_due || due.summary?.due_now }, '[CLIENTCARE-BILLING] follow-up clocks tick');
        const busy = [...browserJobs.values()].some((j) => ['queued', 'running'].includes(j.status));
        if (!busy && (due.items || []).length > 0) {
          enqueueBrowserJob(
            'hands_off_file',
            () => runHandsOffFileCycle({ limit: 5, fromDueQueue: true, mode: 'follow_up' }),
            { source: 'followup_clock_tick' },
          );
        }
      } catch (err) {
        logger.warn?.({ err: err.message }, '[CLIENTCARE-BILLING] follow-up clock tick failed');
      }
    };
    setTimeout(tickFollowUps, Number(process.env.CLIENTCARE_STAGE_CLOCK_BOOT_DELAY_MS || 10 * 60 * 1000));
    setInterval(tickFollowUps, clockMs);
    logger.info?.({ clockMs }, '[CLIENTCARE-BILLING] follow-up clock scheduler armed');
  }

  return router;
}
