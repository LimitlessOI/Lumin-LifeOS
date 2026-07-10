/**
 * SYNOPSIS: Async Site Builder prospect jobs — accept fast, build+email in background.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import logger from './logger.js';

const activeJobs = new Set();
export const PROSPECT_STALE_MS = Number(process.env.SITE_BUILDER_PROSPECT_STALE_MS || 12 * 60 * 1000);

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
 * Mark orphaned `building` rows failed when the accepting instance died
 * (setImmediate fire-and-forget + Railway recycle) or the pipeline hung
 * without heartbeats past PROSPECT_STALE_MS.
 */
export async function failStaleProspectJobs(pool, { staleMs = PROSPECT_STALE_MS } = {}) {
  if (!pool) return { ok: false, error: 'pool required', failed: [] };
  const cutoff = new Date(Date.now() - Math.max(60_000, Number(staleMs) || PROSPECT_STALE_MS));
  try {
    const result = await pool.query(
      `UPDATE prospect_sites
          SET status = 'failed',
              metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
        WHERE status = 'building'
          AND updated_at < $1
        RETURNING client_id`,
      [
        cutoff.toISOString(),
        JSON.stringify({
          jobError: `stale_building_reclaimed — no heartbeat for >${Math.round(staleMs / 1000)}s (instance recycle or hung pipeline)`,
          jobFailedAt: new Date().toISOString(),
          staleReclaim: true,
        }),
      ]
    );
    return {
      ok: true,
      failed: (result.rows || []).map((r) => r.client_id),
      cutoff: cutoff.toISOString(),
    };
  } catch (err) {
    return { ok: false, error: err.message, failed: [] };
  }
}

/**
 * Reserve a prospect row and run build+email without blocking the HTTP request.
 * Returns immediately with clientId + poll URL.
 */
export async function enqueueProspectJob(pipeline, options = {}) {
  if (!pipeline?.processProspect) {
    return { ok: false, error: 'Prospect pipeline unavailable' };
  }

  if (pipeline.pool) {
    await failStaleProspectJobs(pipeline.pool).catch(() => null);
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

/**
 * If a building job is not running on this instance, resume it here.
 * Closes multi-instance orphan: accepting replica dies after 202, poller on
 * another replica can continue processProspect.
 */
export async function resumeProspectJobIfOrphaned(pipeline, clientId, { minAgeMs = 15_000 } = {}) {
  if (!pipeline?.processProspect || !pipeline?.pool || !clientId) {
    return { ok: false, resumed: false, reason: 'missing_pipeline_or_id' };
  }
  if (activeJobs.has(String(clientId))) {
    return { ok: true, resumed: false, reason: 'already_active_here' };
  }

  let row;
  try {
    const result = await pipeline.pool.query(
      `SELECT client_id, business_url, contact_email, contact_name, business_name,
              status, metadata, updated_at, created_at
         FROM prospect_sites
        WHERE client_id = $1
        LIMIT 1`,
      [clientId]
    );
    row = result.rows[0];
  } catch (err) {
    return { ok: false, resumed: false, reason: err.message };
  }

  if (!row || row.status !== 'building') {
    return { ok: true, resumed: false, reason: 'not_building' };
  }

  const updatedAtMs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  if (updatedAtMs && Date.now() - updatedAtMs < minAgeMs) {
    return { ok: true, resumed: false, reason: 'too_fresh' };
  }

  const claimExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const claimToken = `claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let claimed = false;
  try {
    const claim = await pipeline.pool.query(
      `UPDATE prospect_sites
          SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
        WHERE client_id = $1
          AND status = 'building'
          AND (
            metadata->>'jobClaimExpiresAt' IS NULL
            OR (metadata->>'jobClaimExpiresAt')::timestamptz < NOW()
          )
        RETURNING client_id`,
      [
        clientId,
        JSON.stringify({
          jobClaimToken: claimToken,
          jobClaimExpiresAt: claimExpires,
          jobStage: 'claimed_for_resume',
          jobHeartbeatAt: new Date().toISOString(),
        }),
      ]
    );
    claimed = (claim.rows || []).length > 0;
  } catch (err) {
    return { ok: false, resumed: false, reason: `claim_failed:${err.message}` };
  }
  if (!claimed) {
    return { ok: true, resumed: false, reason: 'claimed_elsewhere' };
  }

  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const options = {
    clientId: row.client_id,
    businessUrl: row.business_url,
    contactEmail: row.contact_email,
    contactName: row.contact_name || '',
    businessName: row.business_name || '',
    skipEmail: metadata.skipEmail === true,
    businessInfo: metadata.businessInfo || null,
  };
  if (!options.businessUrl) {
    await pipeline.failProspectJob(clientId, 'resume_failed — missing businessUrl on building row');
    return { ok: false, resumed: false, reason: 'missing_business_url' };
  }

  activeJobs.add(String(clientId));
  logger.info('[PROSPECT-JOB] Resuming orphaned building job on this instance', { clientId, claimToken });
  if (typeof pipeline.touchProspectJob === 'function') {
    await pipeline.touchProspectJob(clientId, 'resumed').catch(() => null);
  }

  setImmediate(() => {
    pipeline
      .processProspect(options)
      .then(async (result) => {
        if (!result.success) {
          await pipeline.failProspectJob(clientId, result.error || 'Prospect pipeline failed after resume');
        } else {
          logger.info('[PROSPECT-JOB] Resume completed', {
            clientId,
            emailSent: result.emailSent,
            previewUrl: result.previewUrl,
          });
        }
      })
      .catch(async (err) => {
        logger.error('[PROSPECT-JOB] Resume failure', { clientId, error: err.message });
        await pipeline.failProspectJob(clientId, err.message);
      })
      .finally(() => {
        activeJobs.delete(String(clientId));
      });
  });

  return { ok: true, resumed: true, clientId };
}

export async function getProspectJobStatus(pool, clientId, { pipeline = null } = {}) {
  if (!pool || !clientId) {
    return { ok: false, error: 'pool and clientId required' };
  }

  try {
    if (pipeline) {
      await resumeProspectJobIfOrphaned(pipeline, clientId).catch(() => null);
    }

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

    let status = row.status;
    let metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const updatedAtMs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const staleBuilding = status === 'building'
      && updatedAtMs > 0
      && (Date.now() - updatedAtMs) > PROSPECT_STALE_MS
      && !activeJobs.has(String(clientId));

    if (staleBuilding) {
      await failStaleProspectJobs(pool, { staleMs: PROSPECT_STALE_MS });
      const refreshed = await pool.query(
        `SELECT status, metadata, updated_at, preview_url, email_sent FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
        [clientId]
      );
      if (refreshed.rows[0]) {
        status = refreshed.rows[0].status;
        metadata = refreshed.rows[0].metadata && typeof refreshed.rows[0].metadata === 'object'
          ? refreshed.rows[0].metadata
          : metadata;
        row.updated_at = refreshed.rows[0].updated_at;
        row.preview_url = refreshed.rows[0].preview_url;
        row.email_sent = refreshed.rows[0].email_sent;
      }
    }

    const terminal = ['sent', 'built', 'qa_hold', 'failed', 'converted', 'lost', 'expired'].includes(
      String(status || '').toLowerCase()
    );

    return {
      ok: true,
      clientId: row.client_id,
      status,
      done: status !== 'building' && terminal,
      building: status === 'building',
      previewUrl: row.preview_url,
      emailSent: row.email_sent,
      businessName: row.business_name,
      contactEmail: row.contact_email,
      error: metadata.jobError || metadata.lastError || metadata.emailSendError || null,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      stale_reclaimed: staleBuilding || undefined,
      resumed_here: activeJobs.has(String(clientId)) || undefined,
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
  failStaleProspectJobs,
  resumeProspectJobIfOrphaned,
  evaluateSiteBuilderEmailReadiness,
  isProspectJobActive,
  getActiveProspectJobCount,
  PROSPECT_STALE_MS,
};
