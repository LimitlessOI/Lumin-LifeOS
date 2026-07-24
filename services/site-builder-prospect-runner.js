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
 * Email the preview link immediately; build only when they click (saves AI spend).
 * Defaults to lean template so first click is ~30–90s, not a 10-variant AI run.
 */
export async function enqueueDeferredProspectJob(pipeline, options = {}) {
  if (!pipeline?.reserveProspectJob || !pipeline?.sendDeferredInvite) {
    return { ok: false, error: 'Prospect pipeline unavailable for deferred mode' };
  }

  const clientId = options.clientId || createProspectClientId();
  const leanOptions = {
    ...options,
    clientId,
    deferredBuild: true,
    enrich: options.enrich === true ? true : false,
    skipRepair: options.skipRepair !== false,
    skipBlogs: options.skipBlogs !== false,
    skipAi: options.skipAi !== false,
    leanTemplate: options.leanTemplate !== false,
    skipEmail: true,
  };

  const reserved = await pipeline.reserveProspectJob(leanOptions);
  if (!reserved.ok) return reserved;

  const invite = await pipeline.sendDeferredInvite({
    clientId,
    contactEmail: options.contactEmail,
    contactName: options.contactName || '',
    businessName: options.businessName || '',
    businessUrl: options.businessUrl,
    previewUrl: reserved.previewUrl || pipeline.resolvePreviewUrl?.(clientId),
  });

  return {
    ok: true,
    accepted: true,
    async: true,
    deferred: true,
    clientId,
    status: invite.emailSent ? 'invited' : 'queued',
    previewUrl: invite.previewUrl || reserved.previewUrl,
    emailSent: invite.emailSent === true,
    emailError: invite.error || null,
    pollUrl: `/api/v1/sites/prospects/${clientId}/status`,
    message: 'Invite sent — preview builds on first link click (lean, ~30–90s)',
  };
}

/**
 * Start a deferred lean build when the prospect opens /previews/:id.
 * Idempotent across instances via DB claim.
 */
export async function triggerBuildOnView(pipeline, clientId) {
  if (!pipeline?.processProspect || !pipeline?.pool || !clientId) {
    return { ok: false, started: false, reason: 'missing_pipeline_or_id' };
  }
  if (activeJobs.has(String(clientId))) {
    return { ok: true, started: false, reason: 'already_active_here', building: true };
  }

  let row;
  try {
    const result = await pipeline.pool.query(
      `SELECT client_id, business_url, contact_email, contact_name, business_name,
              status, preview_url, metadata, updated_at
         FROM prospect_sites
        WHERE client_id = $1
        LIMIT 1`,
      [clientId]
    );
    row = result.rows[0];
  } catch (err) {
    return { ok: false, started: false, reason: err.message };
  }

  if (!row) return { ok: false, started: false, reason: 'not_found' };
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  if (typeof metadata.previewHtml === 'string' && metadata.previewHtml.length > 100) {
    return { ok: true, started: false, reason: 'already_built', ready: true };
  }
  if (row.status === 'building' && activeJobs.has(String(clientId))) {
    return { ok: true, started: false, reason: 'building', building: true };
  }
  // A 'building' row not in this* instance's in-memory activeJobs isn't necessarily
  // stalled — on Railway's multi-instance deploy, the job may simply be running on a
  // different instance than the one serving this request. Trust the DB's recency
  // (heartbeat) over local-only state: only treat it as stuck once it's actually stale
  // (matches the same PROSPECT_STALE_MS threshold failStaleProspectJobs uses elsewhere).
  // Getting this wrong in the other direction is what let a real in-progress cross-
  // instance repair get served the "couldn't finish" honest-failure page mid-build.
  const rowUpdatedAtMs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  if (row.status === 'building' && rowUpdatedAtMs > 0 && (Date.now() - rowUpdatedAtMs) < PROSPECT_STALE_MS) {
    return { ok: true, started: false, reason: 'building', building: true };
  }
  // A terminal row (sent/built/qa_hold) with no previewHtml is not "done", it's broken —
  // the pipeline reported success but the durable HTML write never landed (e.g. the
  // full multi-variant path returning a shape the persist step didn't handle the same
  // way the lean path does). Self-heal with one bounded retry instead of leaving the
  // visitor staring at a fake "still building" page forever.
  const repairAttempts = Number(metadata.repairRebuildAttempts) || 0;
  const isRepairableTerminal = ['sent', 'built', 'qa_hold', 'failed'].includes(String(row.status))
    && repairAttempts < 2;
  if (metadata.deferredBuild !== true && !['queued', 'invited'].includes(String(row.status)) && !isRepairableTerminal) {
    return { ok: true, started: false, reason: 'not_deferred' };
  }

  const claimed = await pipeline.markProspectBuilding(clientId, {
    jobClaimToken: `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    jobClaimExpiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
    // Clear the previous attempt's failure message — otherwise a fresh, successfully
    // in-progress build keeps reporting the prior attempt's stale error to callers
    // polling status mid-build (observed live: "stale_building_reclaimed…" persisted
    // through an entire successful repair run).
    jobError: null,
    ...(isRepairableTerminal ? { repairRebuildAttempts: repairAttempts + 1 } : {}),
  });
  if (!claimed.ok) {
    return { ok: true, started: false, reason: 'claimed_elsewhere_or_ready', building: row.status === 'building' };
  }

  const options = {
    clientId: row.client_id,
    businessUrl: row.business_url,
    contactEmail: row.contact_email,
    contactName: row.contact_name || '',
    businessName: row.business_name || '',
    skipEmail: true,
    deferredBuild: true,
    enrich: metadata.enrich === true,
    skipRepair: metadata.skipRepair !== false,
    skipBlogs: metadata.skipBlogs !== false,
    // Repair retries always use the lean single-template path — proven to persist
    // previewHtml reliably — rather than repeating whatever path may have produced
    // a result the persist step couldn't durably save the first time.
    skipAi: isRepairableTerminal ? true : (metadata.skipAi !== false),
    leanTemplate: isRepairableTerminal ? true : (metadata.leanTemplate !== false),
    businessInfo: metadata.businessInfo || null,
    skipQualify: metadata.skipQualify === true || isRepairableTerminal,
  };
  if (!options.businessUrl) {
    await pipeline.failProspectJob(clientId, 'build_on_view failed — missing businessUrl');
    return { ok: false, started: false, reason: 'missing_business_url' };
  }

  activeJobs.add(String(clientId));
  logger.info('[PROSPECT-JOB] Build-on-view started', { clientId });

  setImmediate(() => {
    pipeline
      .processProspect(options)
      .then(async (result) => {
        if (!result.success) {
          await pipeline.failProspectJob(clientId, result.error || 'Build-on-view failed');
        } else {
          logger.info('[PROSPECT-JOB] Build-on-view completed', {
            clientId,
            previewUrl: result.previewUrl,
          });
        }
      })
      .catch(async (err) => {
        logger.error('[PROSPECT-JOB] Build-on-view failure', { clientId, error: err.message });
        await pipeline.failProspectJob(clientId, err.message);
      })
      .finally(() => {
        activeJobs.delete(String(clientId));
      });
  });

  return { ok: true, started: true, building: true, clientId };
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
export async function resumeProspectJobIfOrphaned(pipeline, clientId, { minAgeMs = PROSPECT_STALE_MS } = {}) {
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

  const claimExpires = new Date(Date.now() + 3 * 60 * 1000).toISOString();
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
    enrich: metadata.enrich,
    skipRepair: metadata.skipRepair === true,
    skipBlogs: metadata.skipBlogs === true,
    skipAi: metadata.skipAi === true,
    leanTemplate: metadata.leanTemplate === true,
    deferredBuild: metadata.deferredBuild === true,
    skipQualify: metadata.skipQualify === true,
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

    const terminal = ['sent', 'built', 'qa_hold', 'failed', 'converted', 'lost', 'expired', 'viewed', 'invited'].includes(
      String(status || '').toLowerCase()
    );
    // Statuses implying a live, viewable preview page exists. If the job reached one of
    // these but metadata.previewHtml never actually landed, the preview link is broken —
    // "done" must not claim success on status alone (that's what let a broken build report
    // done:true to a real prospect while /previews/:id kept serving a fake "still building"
    // page forever). 'failed' has no preview to check by definition.
    const requiresPreview = ['sent', 'built', 'qa_hold', 'converted', 'viewed'].includes(
      String(status || '').toLowerCase()
    );

    const metadataReady = metadata && typeof metadata.previewHtml === 'string' && metadata.previewHtml.length > 100;
    const deferredPending = metadata.deferredBuild === true && !metadataReady
      && ['queued', 'invited', 'building'].includes(String(status || '').toLowerCase());
    const previewBroken = requiresPreview && !metadataReady && !deferredPending;

    return {
      ok: true,
      clientId: row.client_id,
      status,
      done: (status !== 'building' && status !== 'queued' && terminal && !deferredPending && !previewBroken) || metadataReady,
      building: status === 'building' || (deferredPending && status === 'building'),
      deferred: metadata.deferredBuild === true || undefined,
      waitingForClick: status === 'queued' || status === 'invited' || undefined,
      previewReady: metadataReady,
      previewBroken: previewBroken || undefined,
      previewUrl: row.preview_url,
      emailSent: row.email_sent,
      businessName: row.business_name,
      contactEmail: row.contact_email,
      error: previewBroken
        ? (metadata.jobError || metadata.lastError || metadata.emailSendError || 'preview_html_missing_despite_terminal_status')
        : (metadata.jobError || metadata.lastError || metadata.emailSendError || null),
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
  const notes = [];

  // Instantly is the cold-outreach lane (Postmark/Resend ban cold email).
  const instantlyKey = String(env.INSTANTLY_API_KEY || '').trim();
  const instantlyCampaign = String(env.INSTANTLY_CAMPAIGN_ID || '').trim();
  if (instantlyKey && instantlyCampaign) {
    present.push('INSTANTLY_API_KEY', 'INSTANTLY_CAMPAIGN_ID');
    if (emailFrom) present.push('EMAIL_FROM');
    return {
      provider: 'instantly',
      ready: true,
      blockers: [],
      present,
      notes: ['Cold outreach via Instantly campaign (not Postmark/Resend)'],
      keysPresent: true,
      coldEmailSending: true,
    };
  }
  if (instantlyKey || instantlyCampaign) {
    notes.push('Instantly partially configured — need both INSTANTLY_API_KEY and INSTANTLY_CAMPAIGN_ID');
  } else {
    notes.push('For cold outreach use Instantly (Postmark/Resend ban cold email). Set INSTANTLY_API_KEY + INSTANTLY_CAMPAIGN_ID.');
  }

  if (!emailFrom) {
    blockers.push({ name: 'EMAIL_FROM', purpose: 'Sender address for outreach' });
  } else {
    present.push('EMAIL_FROM');
  }

  let keysPresent = false;
  let coldEmailSending = false;

  if (provider === 'smtp') {
    present.push('EMAIL_PROVIDER');
    const userOk = !!String(env.SMTP_USER || '').trim();
    const passOk = !!String(env.SMTP_PASS || '').trim();
    if (!userOk) blockers.push({ name: 'SMTP_USER', purpose: 'SMTP login (e.g. lumea.lifeos@gmail.com)' });
    else present.push('SMTP_USER');
    if (!passOk) blockers.push({ name: 'SMTP_PASS', purpose: 'SMTP app password' });
    else present.push('SMTP_PASS');
    keysPresent = userOk && passOk && !!emailFrom;
    // Railway tip often cannot open SMTP ports — treat as sendable only when proved.
    coldEmailSending = keysPresent && String(env.SITE_BUILDER_EMAIL_PROVED || '').trim() === '1';
    if (keysPresent && !coldEmailSending) {
      notes.push('SMTP keys present but SITE_BUILDER_EMAIL_PROVED!=1 (Railway often blocks outbound SMTP)');
    }
  } else if (provider === 'resend') {
    present.push('EMAIL_PROVIDER');
    if (!String(env.RESEND_API_KEY || '').trim()) {
      blockers.push({ name: 'RESEND_API_KEY', purpose: 'Resend HTTPS API key (works on Railway)' });
    } else {
      present.push('RESEND_API_KEY');
      keysPresent = !!emailFrom;
      coldEmailSending = keysPresent;
    }
  } else if (provider === 'postmark') {
    present.push('EMAIL_PROVIDER');
    if (!String(env.POSTMARK_SERVER_TOKEN || '').trim()) {
      blockers.push({ name: 'POSTMARK_SERVER_TOKEN', purpose: 'Postmark API token' });
    } else {
      present.push('POSTMARK_SERVER_TOKEN');
      keysPresent = !!emailFrom;
      // Token alone is not enough — tip proves pending-approval + SMTP timeout.
      const approved = String(env.POSTMARK_APPROVED || env.SITE_BUILDER_EMAIL_PROVED || '').trim() === '1';
      const resendFallback = !!String(env.RESEND_API_KEY || '').trim();
      if (resendFallback) present.push('RESEND_API_KEY');
      coldEmailSending = keysPresent && (approved || resendFallback);
      if (keysPresent && !coldEmailSending) {
        notes.push('Postmark token present but not approved — set POSTMARK_APPROVED=1 after approval, or RESEND_API_KEY for HTTPS fallback');
      }
    }
  } else if (provider !== 'disabled') {
    blockers.push({ name: 'EMAIL_PROVIDER', purpose: 'Must be smtp, postmark, or resend' });
  }

  return {
    provider,
    ready: blockers.length === 0 && !!emailFrom,
    blockers,
    present,
    notes,
    keysPresent,
    coldEmailSending,
  };
}

export default {
  createProspectClientId,
  enqueueProspectJob,
  enqueueDeferredProspectJob,
  triggerBuildOnView,
  getProspectJobStatus,
  failStaleProspectJobs,
  resumeProspectJobIfOrphaned,
  evaluateSiteBuilderEmailReadiness,
  isProspectJobActive,
  getActiveProspectJobCount,
  PROSPECT_STALE_MS,
};