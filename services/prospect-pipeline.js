/**
 * SYNOPSIS: Prospect Pipeline — Find a business → build their mock site → email it to them
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 * Prospect Pipeline — Find a business → build their mock site → email it to them
 *
 * Flow:
 *   Business URL/email → SiteBuilder builds mock site → Deploy preview →
 *   Send cold email: "We built a free upgrade of your website — here's the link" →
 *   Track in DB → Follow-up sequence
 *
 * Cold email strategy (research-confirmed best):
 *   - Subject: personalized with their business name
 *   - Body: 3-4 sentences max, leads with the value (preview link), no pitch
 *   - CTA: single link to their preview site
 *   - Follow-up: 3-email sequence over 7 days
 *
 * Revenue model:
 *   - One-time site build fee: $997-$1,997
 *   - Monthly maintenance/SEO/content: $297-$597/mo
 *   - POS referral commission: $50-$200 per signup
 *
 * Usage:
 *   import ProspectPipeline from './services/prospect-pipeline.js';
 *   const pipeline = new ProspectPipeline({ siteBuilder, pool, callCouncil, sendEmail });
 *   const result = await pipeline.processProspect({
 *     businessUrl: 'https://theirsite.com',
 *     contactEmail: 'owner@theirsite.com',
 *     contactName: 'Jane',
 *     businessName: 'Gentle Hands Midwifery',
 *   });
 */

import logger from './logger.js';
import { scoreProspectUrl } from './site-builder-opportunity-scorer.js';
import { createProspectClientId } from './site-builder-prospect-runner.js';
import { resolveDurablePublicBase } from './site-builder-public-base.js';

// Entry-product pricing (foot-in-door → care plan + add-ons)
import { SITE_BUILDER_PRICING, getBetaPublishOfferSummary, getBetaDealReasonWhy } from '../config/site-builder-pricing.js';

const PRICING = {
  publish: {
    name: 'Beta publish',
    price: SITE_BUILDER_PRICING.publish.display,
    description: SITE_BUILDER_PRICING.publish.description,
  },
  care: {
    name: 'Care plan',
    price: SITE_BUILDER_PRICING.carePlan.display,
    description: SITE_BUILDER_PRICING.carePlan.description,
  },
  pos: { name: 'POS referral', price: 'Commission', description: 'Jane / Mindbody / Square setup' },
};

function createNoopEmailAdapter() {
  return async (to, subject) => {
    logger.info('[PROSPECT] Email (no sender configured)', { to, subject });
    return { success: false, error: 'No email sender configured' };
  };
}

export default class ProspectPipeline {
  constructor({ siteBuilder, pool, callCouncil, sendEmail, baseUrl = '' } = {}) {
    this.siteBuilder = siteBuilder;
    this.pool = pool;
    this.callCouncil = callCouncil;
    this.sendEmail = sendEmail; // fn(to, subject, html) => Promise
    this.baseUrl = baseUrl;
  }

  generateClientId() {
    return createProspectClientId();
  }

  resolvePreviewUrl(clientId) {
    const base = resolveDurablePublicBase([this.baseUrl, process.env.SITE_BASE_URL]);
    return base ? `${base}/previews/${clientId}` : `/previews/${clientId}`;
  }

  async reserveProspectJob(options = {}) {
    const {
      businessUrl,
      contactEmail,
      contactName = '',
      businessName = '',
      clientId = this.generateClientId(),
      deferredBuild = false,
    } = options;

    if (!businessUrl) return { ok: false, error: 'businessUrl required' };

    const status = deferredBuild ? 'queued' : 'building';
    const previewUrl = deferredBuild ? this.resolvePreviewUrl(clientId) : null;

    if (!this.pool) {
      return {
        ok: true,
        clientId,
        status,
        previewUrl,
        reserved: false,
        warning: 'No database pool — job tracking in-memory only',
      };
    }

    try {
      await this.pool.query(
        `INSERT INTO prospect_sites
          (client_id, business_url, contact_email, contact_name, business_name, preview_url, email_sent, status, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8::jsonb, NOW(), NOW())`,
        [
          clientId,
          businessUrl,
          contactEmail || null,
          contactName || null,
          businessName || null,
          previewUrl,
          status,
          JSON.stringify({
            jobStartedAt: new Date().toISOString(),
            async: true,
            deferredBuild: deferredBuild === true,
            skipEmail: options.skipEmail === true,
            enrich: options.enrich,
            skipRepair: options.skipRepair === true,
            skipBlogs: options.skipBlogs === true,
            skipAi: options.skipAi === true,
            leanTemplate: options.leanTemplate === true,
            skipQualify: options.skipQualify === true,
            businessInfo: options.businessInfo || null,
            referrer: options.referrer || null,
            vertical: options.vertical || null,
          }),
        ]
      );
      return { ok: true, clientId, status, previewUrl, reserved: true };
    } catch (err) {
      logger.error('[PROSPECT] reserveProspectJob failed', { clientId, error: err.message });
      return { ok: false, error: err.message };
    }
  }

  /**
   * Email first, build later — saves AI spend until the prospect clicks the preview link.
   */
  async sendDeferredInvite({
    clientId,
    contactEmail,
    contactName = '',
    businessName = '',
    businessUrl = '',
    previewUrl = null,
  } = {}) {
    if (!contactEmail) return { success: false, error: 'contactEmail required' };
    const url = previewUrl || this.resolvePreviewUrl(clientId);
    const name = contactName || 'there';
    const biz = businessName || 'your business';
    const emailContent = {
      subject: `${biz} — beta preview (tester rate)`,
      html: this.deferredInviteEmailHtml(name, biz, url, businessUrl),
    };

    let emailSent = false;
    let emailSendError = null;
    try {
      const delivery = await Promise.race([
        this.sendEmail(contactEmail, emailContent.subject, emailContent.html),
        new Promise((_, reject) => setTimeout(() => reject(new Error('sendEmail timed out after 25000ms')), 25_000)),
      ]);
      emailSent = delivery?.success !== false;
      if (!emailSent) emailSendError = delivery?.error || 'unknown';
    } catch (err) {
      emailSendError = err.message;
    }

    if (this.pool && clientId) {
      try {
        await this.pool.query(
          `UPDATE prospect_sites
              SET email_sent = $2,
                  status = CASE WHEN $2 THEN 'invited' ELSE status END,
                  metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
                  updated_at = NOW()
            WHERE client_id = $1`,
          [
            clientId,
            emailSent,
            JSON.stringify({
              deferredInviteAt: new Date().toISOString(),
              ...(emailSendError ? { emailSendError, emailSendAttemptAt: new Date().toISOString() } : {}),
            }),
          ]
        );
      } catch (err) {
        logger.warn('[PROSPECT] deferred invite status update failed', { clientId, error: err.message });
      }
    }

    return {
      success: emailSent,
      clientId,
      previewUrl: url,
      emailSent,
      emailSubject: emailContent.subject,
      error: emailSent ? null : emailSendError,
    };
  }

  deferredInviteEmailHtml(contactName, businessName, previewUrl, businessUrl = '') {
    const offer = getBetaPublishOfferSummary();
    const reasonWhy = getBetaDealReasonWhy();
    const months = SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2;
    const source = businessUrl
      ? `<p>We looked at <a href="${businessUrl}" style="color:#0F766E;">${businessUrl}</a> and started a free upgrade preview for <strong>${businessName || 'your business'}</strong>.</p>`
      : `<p>We started a free website upgrade preview for <strong>${businessName || 'your business'}</strong>.</p>`;
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.55;">
  <p>Hi ${contactName || 'there'},</p>
  ${source}
  <p>Click the link — the preview finishes for you in about a minute. Looking is free. No call. No card.</p>
  <p style="margin: 28px 0;">
    <a href="${previewUrl}" style="background: #0F766E; color: white; padding: 14px 26px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block; font-family: Arial, sans-serif;">
      Open my free beta preview
    </a>
  </p>
  <p><strong>Why the price is this low:</strong> ${reasonWhy}</p>
  <p>If you like what you see and want it live: <strong>${SITE_BUILDER_PRICING.publish.display}</strong> to publish, includes the first ${months} months of care, then ${SITE_BUILDER_PRICING.carePlan.display}. After beta, this rate goes away.</p>
  <p>Ignore it, use it, or tell us what’s off — all welcome. We need real feedback more than we need a hard close.</p>
  <p>Best,<br>The Lumin team</p>
  <hr style="margin-top: 36px; border: none; border-top: 1px solid #e5e5e5;">
  <p style="font-size: 12px; color: #777; font-family: Arial, sans-serif;">
    Beta-tester offer: ${offer}<br>
    <a href="${previewUrl}" style="color: #0F766E;">${previewUrl}</a>
  </p>
</body>
</html>`;
  }

  async failProspectJob(clientId, errorMessage) {
    if (!this.pool || !clientId) return;
    try {
      // Do not clobber a persisted preview with failed — email-stage errors keep status built.
      await this.pool.query(
        `UPDATE prospect_sites
            SET status = CASE
                  WHEN preview_url IS NOT NULL AND status IN ('built', 'sent', 'qa_hold') THEN status
                  ELSE 'failed'
                END,
                metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                updated_at = NOW()
          WHERE client_id = $1`,
        [
          clientId,
          JSON.stringify({
            jobError: String(errorMessage || 'unknown').slice(0, 500),
            jobFailedAt: new Date().toISOString(),
          }),
        ]
      );
    } catch (err) {
      logger.warn('[PROSPECT] failProspectJob update failed', { clientId, error: err.message });
    }
  }

  async touchProspectJob(clientId, stage = 'running') {
    if (!this.pool || !clientId) return;
    try {
      const claimExpires = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      await this.pool.query(
        `UPDATE prospect_sites
            SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                updated_at = NOW()
          WHERE client_id = $1 AND status IN ('building', 'queued', 'invited')`,
        [
          clientId,
          JSON.stringify({
            jobStage: String(stage || 'running').slice(0, 80),
            jobHeartbeatAt: new Date().toISOString(),
            jobClaimExpiresAt: claimExpires,
          }),
        ]
      );
    } catch (err) {
      logger.warn('[PROSPECT] touchProspectJob failed', { clientId, error: err.message });
    }
  }

  async markProspectBuilding(clientId, extraMeta = {}) {
    if (!this.pool || !clientId) return { ok: false };
    try {
      const result = await this.pool.query(
        `UPDATE prospect_sites
            SET status = 'building',
                metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                updated_at = NOW()
          WHERE client_id = $1
            AND status IN ('queued', 'invited', 'sent', 'failed', 'built', 'qa_hold')
            AND (metadata->>'previewHtml' IS NULL OR metadata->>'previewHtml' = '')
            AND COALESCE((metadata->>'repairRebuildAttempts')::int, 0) < 2
          RETURNING client_id, business_url, contact_email, contact_name, business_name, preview_url, metadata`,
        [
          clientId,
          JSON.stringify({
            deferredBuildStartedAt: new Date().toISOString(),
            jobStage: 'build_on_view',
            jobHeartbeatAt: new Date().toISOString(),
            ...extraMeta,
          }),
        ]
      );
      return { ok: (result.rows || []).length > 0, row: result.rows?.[0] || null };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Full prospect pipeline: build mock site + send outreach email.
   */
  async processProspect(options = {}) {
    const {
      businessUrl,
      contactEmail,
      contactName = '',
      businessName = '',
      skipEmail = false,
      referrer = null,
      vertical = null,
    } = options;

    if (!businessUrl) return { success: false, error: 'businessUrl required' };

    const clientIdEarly = options.clientId || null;
    logger.info('[PROSPECT] Processing prospect', { businessUrl, contactEmail, clientId: clientIdEarly });
    await this.touchProspectJob(clientIdEarly, 'score');

    // Step 0: Score their existing site — pain points personalize the outreach email,
    // AND gate whether we build at all. High opportunityScore = bad site = good prospect;
    // a site that already scores well can't support a compelling before/after story, so
    // we skip the expensive AI build entirely rather than spend generation cost on a
    // business we can't dramatically improve.
    let opportunityAnalysis = null;
    try {
      opportunityAnalysis = await Promise.race([
        scoreProspectUrl(businessUrl, { timeout: 6000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('scoreProspectUrl hard timeout')), 10_000)),
      ]);
      logger.info('[PROSPECT] Opportunity score', {
        businessUrl,
        score: opportunityAnalysis.opportunityScore,
        grade: opportunityAnalysis.grade,
        painPointCount: opportunityAnalysis.painPoints?.length,
      });
    } catch (err) {
      logger.warn('[PROSPECT] Opportunity score failed (non-fatal)', { error: err.message });
    }

    const MIN_OPPORTUNITY_SCORE = Number(process.env.SITE_BUILDER_MIN_OPPORTUNITY_SCORE || 40);
    if (!options.skipQualify && opportunityAnalysis && opportunityAnalysis.opportunityScore < MIN_OPPORTUNITY_SCORE) {
      logger.info('[PROSPECT] Skipping — existing site already too strong to build a compelling before/after', {
        businessUrl,
        opportunityScore: opportunityAnalysis.opportunityScore,
        grade: opportunityAnalysis.grade,
        minRequired: MIN_OPPORTUNITY_SCORE,
      });

      // Score any supplied competitors the same cheap way — a competitor with a
      // much worse site than this target is a better prospect for the same niche.
      let competitorOpportunities = [];
      const competitorUrls = Array.isArray(options.competitorUrls) ? options.competitorUrls : [];
      if (competitorUrls.length) {
        const scored = await Promise.all(
          competitorUrls.map(async (url) => {
            try {
              const analysis = await Promise.race([
                scoreProspectUrl(url, { timeout: 6000 }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('scoreProspectUrl hard timeout')), 10_000)),
              ]);
              return { url, opportunityScore: analysis.opportunityScore, grade: analysis.grade, painPoints: analysis.painPoints };
            } catch (err) {
              return { url, opportunityScore: null, grade: null, error: err.message };
            }
          }),
        );
        competitorOpportunities = scored
          .filter((c) => c.opportunityScore != null)
          .sort((a, b) => b.opportunityScore - a.opportunityScore);
      }

      return {
        success: false,
        skipped: true,
        error: 'existing site already strong enough',
        reason: 'existing_site_already_strong',
        opportunityScore: opportunityAnalysis.opportunityScore,
        grade: opportunityAnalysis.grade,
        minRequired: MIN_OPPORTUNITY_SCORE,
        competitorOpportunities,
        recommendation: competitorOpportunities.length && competitorOpportunities[0].opportunityScore >= MIN_OPPORTUNITY_SCORE
          ? `Pursue ${competitorOpportunities[0].url} instead — opportunity score ${competitorOpportunities[0].opportunityScore} vs. ${opportunityAnalysis.opportunityScore} for the original target.`
          : 'No qualifying competitor supplied — find contact info for a weaker competitor site, or move to the next prospect.',
      };
    }

    // If the caller gave a businessName but no structured businessInfo, use it
    // as the profile. This prevents parked/placeholder sites (e.g. HugeDomains)
    // from poisoning the generated site with the parking page's brand.
    if (!options.businessInfo && options.businessName) {
      options.businessInfo = {
        businessName: options.businessName,
        industry: options.vertical || 'wellness',
      };
    }

    await this.touchProspectJob(clientIdEarly, 'build');
    const heartbeat = setInterval(() => {
      this.touchProspectJob(clientIdEarly, 'build_heartbeat').catch(() => null);
    }, 20_000);
    let buildResult;
    try {
      // Build variants so the client can choose between multiple designs in the
      // preview switcher and editor. The switcher and all variant HTMLs are
      // durably stored in metadata (previewHtml + variantHtmls) for DB fallback.
      buildResult = await this.siteBuilder.buildVariants(businessUrl, {
        businessInfo: options.businessInfo || null,
        clientId: options.clientId || null,
        enrich: options.enrich,
        skipRepair: options.skipRepair,
        skipBlogs: options.skipBlogs,
        skipAi: options.skipAi,
        leanTemplate: options.leanTemplate,
        competitorUrls: options.competitorUrls || [],
        onProgress: (stage) => this.touchProspectJob(clientIdEarly, stage || 'build'),
      });
    } finally {
      clearInterval(heartbeat);
    }

    if (!buildResult.success) {
      return { success: false, error: `Site build failed: ${buildResult.error}` };
    }

    const previewUrl = buildResult.previewUrl;
    const name = contactName || buildResult.businessName || businessName || 'there';
    const biz = businessName || buildResult.businessName || 'your business';
    const qualityReport = buildResult.qualityReport || buildResult.metadata?.qualityReport || null;
    const scrapePoisoned = Boolean(
      buildResult.metadata?.businessInfo?.scrapePoisoned || qualityReport?.scrapePoisoned
    );
    const qaHold = scrapePoisoned || (qualityReport ? qualityReport.readyToSend === false : false);
    const clientId = options.clientId || buildResult.clientId;

    // Persist preview BEFORE email so SMTP hangs / resume cannot lose the build.
    await this.recordProspect({
      businessUrl,
      contactEmail,
      contactName: name,
      businessName: biz,
      clientId,
      previewUrl,
      emailSent: false,
      status: qaHold ? 'qa_hold' : 'built',
      metadata: {
        ...(buildResult.metadata || {}),
        qualityReport,
        buildCompletedAt: new Date().toISOString(),
        referrer: referrer || undefined,
        vertical: vertical || undefined,
        opportunityScore: opportunityAnalysis?.opportunityScore ?? null,
        opportunityGrade: opportunityAnalysis?.grade ?? null,
        referralCode: clientId,
        // Survive multi-instance / redeploy ephemeral disk wipe
        previewHtml: typeof buildResult.siteHtml === 'string'
          ? buildResult.siteHtml.slice(0, 400_000)
          : null,
      },
    });

    const emailHeartbeat = setInterval(() => {
      this.touchProspectJob(clientId, 'email_heartbeat').catch(() => null);
    }, 15_000);
    let emailSent = false;
    let emailSendError = null;
    let emailContent = { subject: '', html: '' };
    try {
      await this.touchProspectJob(clientId, 'email_copy');
      try {
        emailContent = await this.generateOutreachEmail({
          contactName: name,
          businessName: biz,
          previewUrl,
          industry: buildResult.metadata?.businessInfo?.industry,
          posPartnerName: buildResult.posPartner,
          painPoints: opportunityAnalysis?.painPoints?.slice(0, 3) || [],
        });
      } catch (err) {
        emailSendError = `email_copy_failed: ${err.message}`;
        emailContent = {
          subject: `${biz} — free website upgrade preview`,
          html: this.fallbackEmailHtml(name, biz, previewUrl, opportunityAnalysis?.painPoints?.slice(0, 3) || []),
        };
      }

      await this.touchProspectJob(clientId, skipEmail ? 'skip_email' : 'send_email');
      if (contactEmail && !skipEmail && !qaHold) {
        try {
          const delivery = await Promise.race([
            this.sendEmail(contactEmail, emailContent.subject, emailContent.html),
            new Promise((_, reject) => setTimeout(() => reject(new Error('sendEmail timed out after 25000ms')), 25_000)),
          ]);
          emailSent = delivery?.success !== false;
          if (emailSent) {
            logger.info('[PROSPECT] Outreach email sent', { contactEmail, previewUrl });
          } else {
            emailSendError = delivery?.error || emailSendError || 'unknown';
            logger.warn('[PROSPECT] Outreach email not sent', { contactEmail, previewUrl, error: emailSendError });
          }
        } catch (err) {
          emailSendError = err.message;
          logger.warn('[PROSPECT] Email send failed', { error: err.message });
        }
      }
    } finally {
      clearInterval(emailHeartbeat);
    }
    if (qaHold) {
      logger.warn('[PROSPECT] Prospect held by quality gate', {
        businessUrl,
        previewUrl,
        qualityScore: qualityReport?.score,
        scrapePoisoned,
        issues: qualityReport?.summaryIssues,
      });
    }

    await this.recordProspect({
      businessUrl,
      contactEmail,
      contactName: name,
      businessName: biz,
      clientId,
      previewUrl,
      emailSent,
      status: qaHold ? 'qa_hold' : (emailSent ? 'sent' : 'built'),
      metadata: {
        ...(buildResult.metadata || {}),
        qualityReport,
        referrer: referrer || undefined,
        vertical: vertical || undefined,
        opportunityScore: opportunityAnalysis?.opportunityScore ?? null,
        opportunityGrade: opportunityAnalysis?.grade ?? null,
        referralCode: clientId,
        // Keep durable preview HTML across the post-email write (was wiped by
        // metadata = EXCLUDED.metadata before merge fix).
        previewHtml: typeof buildResult.siteHtml === 'string'
          ? buildResult.siteHtml.slice(0, 400_000)
          : undefined,
        ...(emailSendError ? { emailSendError, emailSendAttemptAt: new Date().toISOString() } : {}),
      },
    });

    return {
      success: true,
      clientId,
      previewUrl,
      emailSent,
      qaHold,
      qualityReport,
      emailSubject: emailContent.subject,
      businessName: biz,
      posPartner: buildResult.posPartner,
      emailSendError,
    };
  }

  /**
   * Resend initial outreach email for an existing prospect (no rebuild).
   */
  async resendOutreachEmail(clientId, { contactEmail = null } = {}) {
    if (!this.pool || !this.sendEmail) return { success: false, error: 'pool and sendEmail are required' };

    let row;
    try {
      const result = await this.pool.query('SELECT * FROM prospect_sites WHERE client_id = $1', [clientId]);
      row = result.rows[0];
    } catch (err) {
      return { success: false, error: err.message };
    }

    if (!row) return { success: false, error: 'prospect not found' };
    const overrideEmail = String(contactEmail || '').trim();
    if (overrideEmail && overrideEmail !== row.contact_email) {
      try {
        await this.pool.query(
          `UPDATE prospect_sites SET contact_email = $2, updated_at = NOW() WHERE client_id = $1`,
          [clientId, overrideEmail]
        );
        row.contact_email = overrideEmail;
      } catch (err) {
        return { success: false, error: `contact email update failed: ${err.message}` };
      }
    }
    if (!row.contact_email) return { success: false, error: 'contact email missing' };
    if (!row.preview_url) return { success: false, error: 'preview not built yet' };
    if (String(row.status || '').toLowerCase() === 'qa_hold') {
      return { success: false, error: 'prospect is on qa_hold' };
    }

    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const emailContent = metadata.deferredBuild === true
      ? {
          subject: `${row.business_name || 'Your business'} — beta preview (tester rate)`,
          html: this.deferredInviteEmailHtml(
            row.contact_name,
            row.business_name,
            row.preview_url,
            row.business_url
          ),
        }
      : {
          subject: `${row.business_name || 'Your business'} — beta preview (tester rate)`,
          html: this.fallbackEmailHtml(row.contact_name, row.business_name, row.preview_url, []),
        };

    const delivery = await this.sendEmail(row.contact_email, emailContent.subject, emailContent.html);
    const emailSent = delivery?.success !== false;

    await this.recordProspect({
      businessUrl: row.business_url,
      contactEmail: row.contact_email,
      contactName: row.contact_name,
      businessName: row.business_name,
      clientId: row.client_id,
      previewUrl: row.preview_url,
      emailSent,
      status: emailSent ? 'sent' : row.status,
      metadata: {
        ...metadata,
        ...(emailSent
          ? { emailResentAt: new Date().toISOString() }
          : { emailSendError: delivery?.error || 'unknown', emailResendAttemptAt: new Date().toISOString() }),
      },
    });

    return {
      success: emailSent,
      clientId,
      emailSent,
      error: emailSent ? null : (delivery?.error || 'send failed'),
    };
  }

  /**
   * Generate personalized cold outreach email copy.
   * Keeps it short — 3-4 sentences, leads with the value.
   */
  async generateOutreachEmail({ contactName, businessName, previewUrl, industry, posPartnerName, painPoints = [] }) {
    if (this.callCouncil) {
      const painPointSection = painPoints.length
        ? `\n- SPECIFIC ISSUES WE FOUND on their current site (mention 1-2 naturally in the email body):\n${painPoints.map(p => `  • ${p}`).join('\n')}`
        : '';

      const painPointLead = painPoints[0]
        ? `Open with this specific, concrete observation about their current site (rephrase naturally, don't quote it): "${painPoints[0]}".`
        : `Open with a specific, plausible observation about what's dated or underperforming on a typical ${industry || 'medical/professional'} practice site (booking friction, no mobile optimization, thin SEO, unclear services) — infer, don't fabricate specifics you don't have.`;

      const prompt = `Write a cold outreach email using classic direct-response print sales craft (Claude Hopkins reason-why, Ogilvy clarity, risk reversal).

We are in BETA TESTING. That is the honest reason the price is unusually good — we need real feedback from real practices, so beta testers get ${SITE_BUILDER_PRICING.publish.display} to publish (includes first ${SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2} months of care), then ${SITE_BUILDER_PRICING.carePlan.display}. After beta, this rate goes away. Do NOT invent fake scarcity ("only 3 left today"). Do say it is a beta-tester rate in exchange for their honest reaction.

We built (or started) a FREE preview for this business — unsolicited. Looking is free. No call required.

CONTEXT:
- Their business: ${businessName}
- Industry: ${industry || 'medical/professional practice'} (credible, professional tone — not spa-breezy)
- Contact name: ${contactName}
- Preview URL: ${previewUrl}
- Included in the preview story: SEO-ready homepage, booking path, content support, design options${posPartnerName ? `, ${posPartnerName} ready` : ''}${painPointSection}

PRINT / DIRECT-RESPONSE RULES:
- 60–140 words. Short paragraphs. One idea per sentence.
- ${painPointLead}
- Lead with the free proof (the preview), not a pitch.
- Include a clear reason-why for the deal: beta testing → low price for feedback.
- Risk reversal: look free; publish only if they want it; ignore is fine.
- One CTA only: open the preview. Interest-based ("worth a look?"), never "book a call."
- Specific numbers beat adjectives. Name ${SITE_BUILDER_PRICING.publish.display} and ${SITE_BUILDER_PRICING.carePlan.display}.
- Tone: peer, warm, confident — a letter, not a brochure.
- NO: "I hope this finds you well", synergies, guaranteed #1, fake urgency, emoji spam.

EMAIL RULES:
- Subject: under 8 words, business name + curiosity or beta preview, no clickbait
- Body HTML with the real preview URL as a clickable link
- End with invitation for honest feedback (good or bad)

Return ONLY valid JSON:
{
  "subject": "email subject line",
  "body_text": "plain text version",
  "body_html": "HTML version with proper formatting"
}`;

      try {
        // groq_llama: fast JSON extraction — cold email body is ~300-500 tokens, well within groq's limit
        // useCache:false: outreach emails are customized to a specific business + preview URL.
        const response = await this.callCouncil('groq_llama', prompt, { maxOutputTokens: 900, taskType: 'extraction', useCache: false });
        const jsonMatch = response.match(/\{[\s\S]+\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            subject: parsed.subject,
            html: parsed.body_html || this.fallbackEmailHtml(contactName, businessName, previewUrl),
          };
        }
      } catch { /* fall through to template */ }
    }

    // Fallback template email
    return {
      subject: `${businessName} — free website upgrade preview`,
      html: this.fallbackEmailHtml(contactName, businessName, previewUrl, painPoints),
    };
  }

  /**
   * Fallback email template when AI is unavailable.
   */
  fallbackEmailHtml(contactName, businessName, previewUrl, painPoints = []) {
    const leadingPainPoint = painPoints[0]
      ? `I noticed ${painPoints[0].toLowerCase()} — so we built a cleaner version to show you, no ask attached.`
      : `We looked at ${businessName || 'your site'} and built an upgraded preview — showing beats explaining.`;
    const offer = getBetaPublishOfferSummary();
    const reasonWhy = getBetaDealReasonWhy();
    const months = SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2;
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.55;">
  <p>Hi ${contactName || 'there'},</p>
  <p>${leadingPainPoint}</p>
  <ul style="padding-left: 1.2rem;">
    <li>Free preview first — judge the work before anything is paid</li>
    <li>SEO-ready pages, booking path, and content support included</li>
    <li>Beta-tester publish: ${SITE_BUILDER_PRICING.publish.display} + ${months} months care, then ${SITE_BUILDER_PRICING.carePlan.display}</li>
  </ul>
  <p style="margin: 28px 0;">
    <a href="${previewUrl}" style="background: #0F766E; color: white; padding: 14px 26px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block; font-family: Arial, sans-serif;">
      Worth 60 seconds to look?
    </a>
  </p>
  <p><strong>Why such a good deal:</strong> ${reasonWhy}</p>
  <p>Ignore it, use it, or tell us it’s not for you — all fine. We need honest beta feedback more than a hard close.</p>
  <p>Best,<br>The Lumin team</p>
  <hr style="margin-top: 36px; border: none; border-top: 1px solid #e5e5e5;">
  <p style="font-size: 12px; color: #777; font-family: Arial, sans-serif;">
    Beta-tester offer: ${offer}<br>
    <a href="${previewUrl}" style="color: #0F766E;">${previewUrl}</a>
  </p>
</body>
</html>`;
  }

  /**
   * Nurture email template (1–4 step sequence). Category-agnostic.
   */
  nurtureEmailHtml(contactName, businessName, previewUrl, followUpNumber = 2, referralCode = null) {
    const name = contactName || 'there';
    const biz = businessName || 'your business';
    const offer = getBetaPublishOfferSummary();
    const months = SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2;
    const publicBase = resolveDurablePublicBase([this.baseUrl, process.env.SITE_BASE_URL]);
    const referralLink = referralCode && publicBase
      ? `${publicBase}/overlay/site-builder-landing.html?ref=${encodeURIComponent(referralCode)}`
      : null;
    const referralBlock = referralLink
      ? `<p>Know another business owner who could use this? Forward them your referral link: <a href="${referralLink}" style="color:#0F766E;">${referralLink}</a>. If they publish, you get one free month of care.</p>`
      : '';

    const steps = {
      1: {
        subject: `${biz} — your preview should be in your inbox`,
        body: `<p>Hi ${name},</p>
<p>Your free preview for ${biz} is built and ready. If you missed it, here is the link again.</p>
<p style="margin:28px 0;"><a href="${previewUrl}" style="background:#0F766E;color:white;padding:14px 26px;border-radius:4px;text-decoration:none;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Open my free preview</a></p>
<p>It is a beta-tester rate: ${SITE_BUILDER_PRICING.publish.display} to publish, includes ${months} months of care, then ${SITE_BUILDER_PRICING.carePlan.display}. No obligation.</p>
${referralBlock}`,
      },
      2: {
        subject: `Quick question about ${biz}`,
        body: `<p>Hi ${name},</p>
<p>Just checking in — did you get a chance to look at the preview for ${biz}? The feedback so far is that the site loads faster and makes the booking path clearer.</p>
<p style="margin:28px 0;"><a href="${previewUrl}" style="background:#0F766E;color:white;padding:14px 26px;border-radius:4px;text-decoration:none;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Review the preview</a></p>
<p>Happy to tweak anything before you publish. Reply with what you would change.</p>
${referralBlock}`,
      },
      3: {
        subject: `Last follow-up — ${biz}`,
        body: `<p>Hi ${name},</p>
<p>This is my last follow-up. I completely understand if the timing is not right. If you do want the preview to go live, the beta-tester rate (${SITE_BUILDER_PRICING.publish.display}) is still open for now.</p>
<p style="margin:28px 0;"><a href="${previewUrl}" style="background:#0F766E;color:white;padding:14px 26px;border-radius:4px;text-decoration:none;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Publish ${biz} for ${SITE_BUILDER_PRICING.publish.display}</a></p>
<p>Either way, no hard feelings. I will close the loop after this.</p>
${referralBlock}`,
      },
      4: {
        subject: `One month later — still want the ${biz} preview?`,
        body: `<p>Hi ${name},</p>
<p>Your preview for ${biz} has been live for a month. If you have questions or want to move forward, just reply. If not, I will leave you alone.</p>
<p style="margin:28px 0;"><a href="${previewUrl}" style="background:#0F766E;color:white;padding:14px 26px;border-radius:4px;text-decoration:none;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Open my preview</a></p>
<p>The beta-tester rate is still on the table.</p>
${referralBlock}`,
      },
    };

    const step = steps[followUpNumber] || steps[2];
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${step.subject}</title></head>
<body style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.55;">
  ${step.body}
  <p>Best,<br>The Lumin team</p>
  <hr style="margin-top:36px;border:none;border-top:1px solid #e5e5e5;">
  <p style="font-size:12px;color:#777;font-family:Arial,sans-serif;">
    Beta-tester offer: ${offer}<br>
    <a href="${previewUrl}" style="color:#0F766E;">${previewUrl}</a>
  </p>
</body>
</html>`;
  }

  /**
   * Save prospect record to database.
   */
  async recordProspect(data) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO prospect_sites
          (client_id, business_url, contact_email, contact_name, business_name, preview_url, email_sent, status, metadata, created_at, updated_at, last_contacted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW(), CASE WHEN $7 THEN NOW() ELSE NULL END)
         ON CONFLICT (client_id) DO UPDATE SET
           business_url = EXCLUDED.business_url,
           contact_email = COALESCE(EXCLUDED.contact_email, prospect_sites.contact_email),
           contact_name = COALESCE(EXCLUDED.contact_name, prospect_sites.contact_name),
           business_name = COALESCE(EXCLUDED.business_name, prospect_sites.business_name),
           preview_url = EXCLUDED.preview_url,
           email_sent = EXCLUDED.email_sent,
           status = EXCLUDED.status,
           metadata = COALESCE(prospect_sites.metadata, '{}'::jsonb) || EXCLUDED.metadata,
           updated_at = NOW(),
           last_contacted_at = CASE WHEN EXCLUDED.email_sent THEN NOW() ELSE prospect_sites.last_contacted_at END`,
        [
          data.clientId,
          data.businessUrl,
          data.contactEmail || null,
          data.contactName || null,
          data.businessName || null,
          data.previewUrl,
          data.emailSent || false,
          data.status || (data.emailSent ? 'sent' : 'built'),
          JSON.stringify({ ...(data.metadata || {}), jobCompletedAt: new Date().toISOString() }),
        ]
      );
    } catch (err) {
      // Table may not exist yet — log but don't crash
      logger.warn('[PROSPECT] DB record failed (table may not exist)', { error: err.message });
    }
  }

  /**
   * Get all prospects from DB.
   */
  async listProspects(limit = 50) {
    if (!this.pool) return [];
    try {
      const result = await this.pool.query(
        `SELECT * FROM prospect_sites ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows.map((row) => {
        const metadata = row.metadata && typeof row.metadata === 'object'
          ? { ...row.metadata }
          : row.metadata;
        if (metadata && typeof metadata.previewHtml === 'string') {
          metadata.hasPreviewHtml = true;
          metadata.previewHtmlBytes = metadata.previewHtml.length;
          delete metadata.previewHtml;
        }
        return { ...row, metadata };
      });
    } catch {
      return [];
    }
  }

  /**
   * Send follow-up sequence to a prospect (4 emails over 14 days).
   * followUpNumber: 1 (day 1), 2 (day 3), 3 (day 7), 4 (day 14)
   */
  async sendFollowUp(prospectId, followUpNumber = 2) {
    if (!this.pool || !this.sendEmail) return { success: false, error: 'pool and sendEmail are required' };

    let row;
    try {
      const result = await this.pool.query(
        'SELECT * FROM prospect_sites WHERE client_id = $1',
        [prospectId]
      );
      row = result.rows[0];
    } catch {
      return { success: false, error: 'prospect lookup failed' };
    }

    if (!row || !row.contact_email) return { success: false, error: 'prospect or contact email missing' };
    if (['converted', 'lost', 'expired'].includes(String(row.status || '').toLowerCase())) {
      return { success: false, error: `prospect status ${row.status} is not follow-up eligible` };
    }

    if (![1, 2, 3, 4].includes(Number(followUpNumber))) {
      return { success: false, error: `unsupported followUpNumber ${followUpNumber}` };
    }

    const html = this.nurtureEmailHtml(
      row.contact_name,
      row.business_name,
      row.preview_url,
      Number(followUpNumber),
      prospectId
    );
    const subjectMatch = html.match(/<title>([^<]*)<\/title>/);
    const subject = subjectMatch?.[1]?.trim()
      ? subjectMatch[1].trim()
      : `Quick question about ${row.business_name || 'your free preview'}`;

    const delivery = await this.sendEmail(row.contact_email, subject, html);
    if (delivery?.success === false) {
      logger.warn('[PROSPECT] Follow-up email not sent', {
        prospectId,
        followUpNumber,
        recipient: row.contact_email,
        error: delivery.error || 'unknown',
      });
      return { success: false, error: delivery.error || 'follow-up send failed' };
    }

    await this.pool.query(
      `UPDATE prospect_sites
          SET follow_up_count = COALESCE(follow_up_count, 0) + 1,
              last_follow_up_at = NOW(),
              last_contacted_at = NOW(),
              updated_at = NOW()
        WHERE client_id = $1`,
      [prospectId]
    ).catch(() => {});

    logger.info('[PROSPECT] Follow-up sent', { prospectId, followUpNumber, recipient: row.contact_email });
    return { success: true, prospectId, followUpNumber, recipient: row.contact_email };
  }
}

export async function runFollowUpCron({ pool, sendEmail, baseUrl = '' } = {}) {
  if (!pool) {
    logger.warn('[PROSPECT] Follow-up cron disabled — no DB pool');
    return { success: false, error: 'pool required', processed: 0, sent: 0 };
  }

  const pipeline = new ProspectPipeline({
    pool,
    sendEmail: sendEmail || createNoopEmailAdapter(),
    baseUrl,
  });

  logger.info('[PROSPECT] Running follow-up cron');

  try {
    const result = await pool.query(`
      SELECT client_id,
             business_name,
             contact_email,
             created_at,
             follow_up_count,
             last_follow_up_at,
             status
        FROM prospect_sites
       WHERE email_sent = TRUE
         AND contact_email IS NOT NULL
         AND status NOT IN ('converted', 'lost', 'expired')
         AND COALESCE(follow_up_count, 0) < 4
         AND (
           (COALESCE(follow_up_count, 0) = 0 AND created_at <= NOW() - INTERVAL '1 day')
           OR
           (COALESCE(follow_up_count, 0) = 1 AND created_at <= NOW() - INTERVAL '3 days')
           OR
           (COALESCE(follow_up_count, 0) = 2 AND created_at <= NOW() - INTERVAL '7 days')
           OR
           (COALESCE(follow_up_count, 0) = 3 AND created_at <= NOW() - INTERVAL '14 days')
         )
       ORDER BY created_at ASC
    `);

    let sent = 0;
    const errors = [];

    for (const row of result.rows) {
      const followUpNumber = Number(row.follow_up_count || 0) + 1;
      const outcome = await pipeline.sendFollowUp(row.client_id, followUpNumber);
      if (outcome?.success) sent += 1;
      else if (outcome?.error) errors.push({ clientId: row.client_id, error: outcome.error });
    }

    logger.info('[PROSPECT] Follow-up cron complete', {
      eligible: result.rows.length,
      sent,
      failed: errors.length,
    });

    return {
      success: true,
      processed: result.rows.length,
      sent,
      failed: errors.length,
      errors,
    };
  } catch (err) {
    logger.error('[PROSPECT] Follow-up cron failed', { error: err.message });
    return { success: false, error: err.message, processed: 0, sent: 0 };
  }
}