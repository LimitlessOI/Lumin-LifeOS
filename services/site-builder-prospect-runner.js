/**
 * SYNOPSIS: Async Site Builder prospect jobs — accept fast, build+email in background.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import logger from './logger.js';

const activeJobs = new Set();

export function createProspectClientId() {
  return `prev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function isProspectJobActive(clientId) {
  return activeJobs.has(String(clientId));
}

export function getActiveProspectJobCount() {
  return activeJobs.size;
}

/**
 * Reserve a prospect row and run build+email without blocking the HTTP request.
 * Returns immediately with clientId + poll URL.
 */
export async function enqueueProspectJob(pipeline, options = {}) {
  if (!pipeline?.processProspect) {
    return { ok: false, error: 'Prospect pipeline unavailable' };
  }

  const clientId = options.clientId || createProspectClientId();
  if (activeJobs.has(clientId)) {
    return { ok: false, error: 'Prospect job already running for this clientId', clientId };
  }

  const reserved = await pipeline.reserveProspectJob({
    ...options,
    clientId,
  });

  if (!reserved.ok) {
    return reserved;
  }

  activeJobs.add(clientId);

  setImmediate(() => {
    pipeline
      .processProspect({ ...options, clientId })
      .then(async (result) => {
        if (!result.success) {
          await pipeline.failProspectJob(clientId, result.error || 'Prospect pipeline failed');
        } else {
          logger.info('[PROSPECT-JOB] Completed', {
            clientId,
            emailSent: result.emailSent,
            previewUrl: result.previewUrl,
          });
        }
      })
      .catch(async (err) => {
        logger.error('[PROSPECT-JOB] Background failure', { clientId, error: err.message });
        await pipeline.failProspectJob(clientId, err.message);
      })
      .finally(() => {
        activeJobs.delete(clientId);
      });
  });

  return {
    ok: true,
    accepted: true,
    async: true,
    clientId,
    status: 'building',
    pollUrl: `/api/v1/sites/prospects/${clientId}/status`,
    message: 'Prospect build started — poll status until sent or failed',
  };
}

export async function getProspectJobStatus(pool, clientId) {
  if (!pool || !clientId) {
    return { ok: false, error: 'pool and clientId required' };
  }

  try {
    const result = await pool.query(
      `SELECT client_id, business_url, contact_email, contact_name, business_name,
              preview_url, email_sent, status, metadata, updated_at, created_at
         FROM prospect_sites
        WHERE client_id = $1
        LIMIT 1`,
      [clientId]
    );
    const row = result.rows[0];
    if (!row) {
      return { ok: false, error: 'Prospect job not found', clientId };
    }

    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const terminal = ['sent', 'built', 'qa_hold', 'failed', 'converted', 'lost', 'expired'].includes(
      String(row.status || '').toLowerCase()
    );

    return {
      ok: true,
      clientId: row.client_id,
      status: row.status,
      done: row.status !== 'building' && terminal,
      building: row.status === 'building',
      previewUrl: row.preview_url,
      emailSent: row.email_sent,
      businessName: row.business_name,
      contactEmail: row.contact_email,
      error: metadata.jobError || metadata.lastError || metadata.emailSendError || null,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  } catch (err) {
    return { ok: false, error: err.message, clientId };
  }
}

export function evaluateSiteBuilderEmailReadiness(env = process.env) {
  const provider = String(env.EMAIL_PROVIDER || 'postmark').toLowerCase();
  const emailFrom = String(env.EMAIL_FROM || '').trim();
  const blockers = [];
  const present = [];

  if (!emailFrom) {
    blockers.push({ name: 'EMAIL_FROM', purpose: 'Sender address for outreach' });
  } else {
    present.push('EMAIL_FROM');
  }

  if (provider === 'smtp') {
    present.push('EMAIL_PROVIDER');
    if (!String(env.SMTP_USER || '').trim()) {
      blockers.push({ name: 'SMTP_USER', purpose: 'SMTP login (e.g. lumea.lifeos@gmail.com)' });
    } else {
      present.push('SMTP_USER');
    }
    if (!String(env.SMTP_PASS || '').trim()) {
      blockers.push({ name: 'SMTP_PASS', purpose: 'SMTP app password' });
    } else {
      present.push('SMTP_PASS');
    }
  } else if (provider === 'postmark') {
    present.push('EMAIL_PROVIDER');
    if (!String(env.POSTMARK_SERVER_TOKEN || '').trim()) {
      blockers.push({ name: 'POSTMARK_SERVER_TOKEN', purpose: 'Postmark API token' });
    } else {
      present.push('POSTMARK_SERVER_TOKEN');
    }
  } else if (provider !== 'disabled') {
    blockers.push({ name: 'EMAIL_PROVIDER', purpose: 'Must be smtp or postmark' });
  }

  return {
    provider,
    ready: blockers.length === 0 && !!emailFrom,
    blockers,
    present,
    coldEmailSending: blockers.length === 0 && !!emailFrom,
  };
}

export default {
  createProspectClientId,
  enqueueProspectJob,
  getProspectJobStatus,
  evaluateSiteBuilderEmailReadiness,
  isProspectJobActive,
  getActiveProspectJobCount,
};
