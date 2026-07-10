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

// Entry-product pricing (foot-in-door → care plan + add-ons)
import { SITE_BUILDER_PRICING, getBetaPublishOfferSummary } from '../config/site-builder-pricing.js';

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

  async reserveProspectJob(options = {}) {
    const {
      businessUrl,
      contactEmail,
      contactName = '',
      businessName = '',
      clientId = this.generateClientId(),
    } = options;

    if (!businessUrl) return { ok: false, error: 'businessUrl required' };

    if (!this.pool) {
      return {
        ok: true,
        clientId,
        status: 'building',
        reserved: false,
        warning: 'No database pool — job tracking in-memory only',
      };
    }

    try {
      await this.pool.query(
        `INSERT INTO prospect_sites
          (client_id, business_url, contact_email, contact_name, business_name, preview_url, email_sent, status, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NULL, false, 'building', $6::jsonb, NOW(), NOW())`,
        [
          clientId,
          businessUrl,
          contactEmail || null,
          contactName || null,
          businessName || null,
          JSON.stringify({
            jobStartedAt: new Date().toISOString(),
            async: true,
            skipEmail: options.skipEmail === true,
            enrich: options.enrich,
            skipRepair: options.skipRepair === true,
            skipBlogs: options.skipBlogs === true,
            skipAi: options.skipAi === true,
            leanTemplate: options.leanTemplate === true,
            businessInfo: options.businessInfo || null,
          }),
        ]
      );
      return { ok: true, clientId, status: 'building', reserved: true };
    } catch (err) {
      logger.error('[PROSPECT] reserveProspectJob failed', { clientId, error: err.message });
      return { ok: false, error: err.message };
    }
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
          WHERE client_id = $1 AND status = 'building'`,
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
      opportunityAnalysis = await scoreProspectUrl(businessUrl, { timeout: 6000 });
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
              const analysis = await scoreProspectUrl(url, { timeout: 6000 });
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

    await this.touchProspectJob(clientIdEarly, 'build');
    const heartbeat = setInterval(() => {
      this.touchProspectJob(clientIdEarly, 'build_heartbeat').catch(() => null);
    }, 20_000);
    let buildResult;
    try {
      // Step 1: Build their site. Lean/no-AI fast paths (emergency reliability
      // modes built for Railway's edge timeout) still use the single-site
      // buildFromUrl; a normal build now generates the free template gallery
      // (buildVariants) so the editor has real choices to toggle between,
      // not just one design (founder direction 2026-07-10).
      const useLeanSinglePath = options.leanTemplate || options.skipAi;
      buildResult = useLeanSinglePath
        ? await this.siteBuilder.buildFromUrl(businessUrl, {
            businessInfo: options.businessInfo || null,
            clientId: options.clientId || null,
            enrich: options.enrich,
            skipRepair: options.skipRepair,
            skipBlogs: options.skipBlogs,
            skipAi: options.skipAi,
            leanTemplate: options.leanTemplate,
            onProgress: (stage) => this.touchProspectJob(clientIdEarly, stage || 'build'),
          })
        : await this.siteBuilder.buildVariants(businessUrl, {
            businessInfo: options.businessInfo || null,
            clientId: options.clientId || null,
            enrich: options.enrich,
            skipRepair: options.skipRepair,
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
    const biz = buildResult.businessName || businessName || 'your business';
    const qualityReport = buildResult.qualityReport || buildResult.metadata?.qualityReport || null;
    const qaHold = qualityReport ? qualityReport.readyToSend === false : false;
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
        // Survive multi-instance / redeploy ephemeral disk wipe
        previewHtml: typeof buildResult.siteHtml === 'string'
          ? buildResult.siteHtml.slice(0, 400_000)
          : null,
        previewMeta: buildResult.metadata || null,
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
    const emailContent = {
      subject: `${row.business_name || 'Your business'} — free website upgrade preview`,
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

      const prompt = `Write a cold outreach email. We are in BETA. We built a FREE, already-finished website upgrade for this specific business — unsolicited, no call booked, nothing purchased — and we want their honest reaction, not a hard sale.

CONTEXT:
- Their business: ${businessName}
- Industry: ${industry || 'medical/professional practice'} (psychiatry, therapy, medical, or dental — keep tone credible and professional, not "spa/wellness" breezy)
- Contact name: ${contactName}
- Preview URL: ${previewUrl}
- What's already built and waiting for them to see: SEO-optimized click-funnel site, automated blog content, booking flow, ${posPartnerName ? posPartnerName + ' integration, ' : ''}10 design variations they can toggle between${painPointSection}

DIRECT-RESPONSE PRINCIPLES (apply, don't state):
- 50-125 words total body. Every sentence earns its place — cut anything generic.
- ${painPointLead}
- Frame as "we already did the work, here's the result" (dream outcome + zero effort + zero time delay on their end) — NOT "we'd like to help you." The finished preview IS the proof; don't sell what the email can just show.
- Beta/feedback framing in Adam's own words: we're in beta, this is a look at what our system can build, we'd genuinely value their reaction — lowers pressure, invites a reply instead of a decision.
- CTA is interest-based and reversible, never a scheduling ask: "worth 60 seconds to look?" / "curious what you think" — NOT "book a call" or "let's chat Tuesday."
- No pressure close: they can ignore it, use it, or tell us it's not for them — all fine.

EMAIL RULES:
- Subject: under 7 words, curiosity + their business name, no clickbait, no emoji
- Body: 3 short paragraphs max — (1) the specific observation + we already built the fix, (2) 2-3 bullet highlights of what's included, (3) interest-based CTA + no-pressure close in one line
- Tone: direct, warm, confident, professional — a peer sharing something useful, not a vendor pitching
- NO: "I hope this email finds you well", "synergies", "reach out", "circle back", generic corporate filler
- Include the actual preview URL as a clickable link

Return ONLY valid JSON:
{
  "subject": "email subject line",
  "body_text": "plain text version",
  "body_html": "HTML version with proper formatting"
}`;

      try {
        // groq_llama: fast JSON extraction — cold email body is ~300-500 tokens, well within groq's limit
        const response = await this.callCouncil('groq_llama', prompt, { maxOutputTokens: 900, taskType: 'extraction' });
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
      ? `I noticed ${painPoints[0].toLowerCase()} — so we already built a fixed version to show you, no ask attached.`
      : `We took a look at ${businessName || 'your site'} and already built an upgraded version — figured showing beats explaining.`;
    const offer = getBetaPublishOfferSummary();
    const months = SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2;
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <p>Hi ${contactName || 'there'},</p>
  <p>${leadingPainPoint}</p>
  <ul>
    <li>10 design directions to flip through, not just one</li>
    <li>SEO-ready pages, booking flow, and blog content already in place</li>
    <li>Yours to look at, edit, or ignore — nothing's been charged</li>
  </ul>
  <p style="margin: 24px 0;">
    <a href="${previewUrl}" style="background: #0F766E; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
      Worth 60 seconds to look?
    </a>
  </p>
  <p>We're in beta and genuinely want your honest reaction — good or bad. If you'd rather it go live, beta pricing is ${SITE_BUILDER_PRICING.publish.display} (includes the first ${months} months of upkeep), but there's zero obligation either way.</p>
  <p>Best,<br>The Lumin team</p>
  <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 11px; color: #999;">
    Beta offer: ${offer}<br>
    <a href="${previewUrl}" style="color: #0F766E;">${previewUrl}</a>
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
           metadata = EXCLUDED.metadata,
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
   * Send follow-up sequence to a prospect (3 emails over 7 days).
   * Call this on day 3 and day 7 after initial outreach.
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

    const subjects = {
      2: `Quick question about ${row.business_name || 'your site preview'}`,
      3: `Last follow-up — ${row.business_name || 'your free preview'}`,
    };

    const bodies = {
      2: this.fallbackEmailHtml(row.contact_name, row.business_name, row.preview_url)
        .replace('I just wanted to show you', 'Just following up — did you get a chance to see the preview?'),
      3: this.fallbackEmailHtml(row.contact_name, row.business_name, row.preview_url)
        .replace('No obligation at all', 'This is my last follow-up — completely understand if the timing isn\'t right'),
    };

    if (subjects[followUpNumber]) {
      const delivery = await this.sendEmail(row.contact_email, subjects[followUpNumber], bodies[followUpNumber]);
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

    return { success: false, error: `unsupported followUpNumber ${followUpNumber}` };
  }
}

export async function runFollowUpCron({ pool, sendEmail } = {}) {
  if (!pool) {
    logger.warn('[PROSPECT] Follow-up cron disabled — no DB pool');
    return { success: false, error: 'pool required', processed: 0, sent: 0 };
  }

  const pipeline = new ProspectPipeline({
    pool,
    sendEmail: sendEmail || createNoopEmailAdapter(),
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
         AND (
           (COALESCE(follow_up_count, 0) = 0 AND created_at <= NOW() - INTERVAL '3 days')
           OR
           (COALESCE(follow_up_count, 0) = 1 AND created_at <= NOW() - INTERVAL '7 days')
         )
       ORDER BY created_at ASC
    `);

    let sent = 0;
    const errors = [];

    for (const row of result.rows) {
      const followUpNumber = Number(row.follow_up_count || 0) === 0 ? 2 : 3;
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
