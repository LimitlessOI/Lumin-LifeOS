/**
 * SYNOPSIS: Presence Audit — scores a business AND its competitors across every channel (website, Google Business Profile, Instagram, Facebook, LinkedIn) and produces a head-to-head gap/opportunity comparison.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 *
 * Why this exists (Adam):
 *   "Score where the business is on all their pages, and do the same for their competitors.
 *    If they're all ahead, they should know it. If they're all behind, that's opportunity."
 *
 * Honesty note: social platforms often gate content behind login walls, so a channel we
 * cannot meaningfully fetch is reported as `analyzable:false` with a presence-based note
 * and a recommendation — we never fabricate a 1-10 we could not actually assess.
 *
 * Flow:
 *   compare({ businessInfo, competitorUrls })
 *     → auditEntity(client) + auditEntity(each competitor)
 *         → discoverProfiles(homepage) → per-channel scoreChannel()
 *     → synthesizeGap(...) → plain-English "you vs. them" per channel + biggest opportunity
 */

import logger from './logger.js';
import { DEFAULT_MODEL } from '../config/task-model-routing.js';
import CompetitorBenchmark from './competitor-benchmark.js';

const CHANNELS = ['website', 'google', 'instagram', 'facebook', 'linkedin'];
const LOGIN_WALL_MAX_BYTES = 2500; // below this a social page is almost certainly a login/JS shell

export default class PresenceAudit {
  constructor({ callCouncil } = {}) {
    this.callCouncil = callCouncil;
    this.scraper = new CompetitorBenchmark({ callCouncil });
  }

  /**
   * Find social/GBP profile links on a homepage.
   */
  extractSocialLinks(html) {
    const h = String(html || '');
    const hrefs = (h.match(/href=["']([^"']+)["']/gi) || []).map(m => m.replace(/^href=["']|["']$/gi, ''));
    const find = re => hrefs.find(u => re.test(u)) || null;
    return {
      instagram: find(/instagram\.com\/[A-Za-z0-9_.]+/i),
      facebook: find(/facebook\.com\/[A-Za-z0-9_.\-]+/i),
      linkedin: find(/linkedin\.com\/(company|in)\/[A-Za-z0-9_.\-]+/i),
      google: find(/(g\.page|google\.[a-z.]+\/maps|business\.google\.com|goo\.gl\/maps)/i),
    };
  }

  /**
   * Score a single channel 1-10. Website & readable pages get an AI design/conversion
   * score; login-walled socials are reported honestly as present-but-unanalyzable.
   */
  async scoreChannel({ channel, url, businessName, industry }) {
    if (!url) {
      return {
        channel,
        present: false,
        analyzable: false,
        score: null,
        doesWell: [],
        doesPoorly: [],
        recommendation: `No ${channel} presence found — an open opportunity to claim and grow this channel.`,
      };
    }

    const raw = await this.scraper.fetchRaw(url);
    const signals = raw.ok ? this.scraper.extractSignals(raw.html) : null;
    const analyzable = raw.ok && (channel === 'website' || (raw.html || '').length > LOGIN_WALL_MAX_BYTES);

    if (!analyzable || !this.callCouncil) {
      return {
        channel,
        present: true,
        analyzable: false,
        score: null,
        url,
        doesWell: [],
        doesPoorly: [],
        recommendation: raw.ok
          ? `Profile exists but is not publicly analyzable; we'd optimize bio, pinned content, posting cadence, and calls-to-action.`
          : `Profile linked but unreachable for analysis; we'd verify and optimize it.`,
      };
    }

    const prompt = `You are auditing the "${channel}" presence for a "${industry || 'small business'}" called "${businessName || 'the business'}". Judge it honestly.

URL: ${url}
TITLE: ${signals.title}
HEADLINE: ${signals.h1}
SECTIONS: ${(signals.h2s || []).join(' | ')}
SIGNALS: images=${signals.signals?.imgCount}, CTA phrases=${signals.signals?.ctaHits}, forms=${signals.signals?.formCount}
VISIBLE TEXT: ${(signals.bodyText || '').slice(0, 1500)}

Rate this ${channel} presence 1-10 (10 = best-in-class). Return ONLY JSON:
{"score": <1-10>, "doesWell": ["s1","s2"], "doesPoorly": ["w1","w2"], "recommendation": "what we'd do to improve it"}`;

    try {
      // useCache:false: presence scores are per-URL; the semantic cache can return
      // another channel's score for a similar-looking audit prompt.
      const response = await this.callCouncil(DEFAULT_MODEL, prompt, { maxOutputTokens: 600, taskType: 'analysis', useCache: false, builderExecution: true });
      const parsed = JSON.parse((response.match(/\{[\s\S]+\}/) || ['{}'])[0]);
      return {
        channel,
        present: true,
        analyzable: true,
        url,
        score: Math.max(1, Math.min(10, Math.round(Number(parsed.score) || 5))),
        doesWell: Array.isArray(parsed.doesWell) ? parsed.doesWell.slice(0, 4) : [],
        doesPoorly: Array.isArray(parsed.doesPoorly) ? parsed.doesPoorly.slice(0, 4) : [],
        recommendation: typeof parsed.recommendation === 'string' ? parsed.recommendation : '',
      };
    } catch (err) {
      logger.warn('[PRESENCE] channel score failed', { channel, url, error: err.message });
      return { channel, present: true, analyzable: false, url, score: null, doesWell: [], doesPoorly: [], recommendation: '' };
    }
  }

  /**
   * Audit one entity (the client or a competitor) across all channels.
   */
  async auditEntity({ label, homepageUrl, industry, profiles = {} }) {
    const discovered = {};
    if (homepageUrl) {
      const raw = await this.scraper.fetchRaw(homepageUrl);
      if (raw.ok) Object.assign(discovered, this.extractSocialLinks(raw.html));
    }
    const urls = {
      website: homepageUrl || null,
      google: profiles.google || discovered.google || null,
      instagram: profiles.instagram || discovered.instagram || null,
      facebook: profiles.facebook || discovered.facebook || null,
      linkedin: profiles.linkedin || discovered.linkedin || null,
    };

    const channels = {};
    await Promise.all(
      CHANNELS.map(async ch => {
        channels[ch] = await this.scoreChannel({ channel: ch, url: urls[ch], businessName: label, industry });
      }),
    );

    const scored = Object.values(channels).filter(c => c.score != null);
    const overallScore = scored.length ? Math.round((scored.reduce((s, c) => s + c.score, 0) / scored.length) * 10) / 10 : null;
    const channelsPresent = Object.values(channels).filter(c => c.present).length;

    return { label, homepageUrl, channels, overallScore, channelsPresent };
  }

  /**
   * Full head-to-head: audit the client and each competitor, then synthesize a
   * plain-English gap/opportunity readout per channel.
   */
  async compare({ businessInfo = {}, competitorUrls = [] } = {}) {
    const industry = businessInfo.industry;
    const clientUrl = businessInfo.sourceUrl || businessInfo.website || null;

    const client = await this.auditEntity({
      label: businessInfo.businessName || 'Your business',
      homepageUrl: clientUrl,
      industry,
      profiles: {
        instagram: businessInfo.instagramUrl,
        facebook: businessInfo.facebookUrl,
      },
    });

    const competitorList = [...new Set((competitorUrls || []).map(u => String(u || '').trim()).filter(Boolean))]
      .filter(u => u !== clientUrl)
      .slice(0, 4);
    const competitors = await Promise.all(
      competitorList.map(u => this.auditEntity({ label: u, homepageUrl: u, industry })),
    );

    const perChannel = this.buildChannelComparison(client, competitors);
    const gap = await this.synthesizeGap({ businessInfo, client, competitors, perChannel });

    return { client, competitors, perChannel, gap, generatedAt: new Date().toISOString() };
  }

  /**
   * Per-channel: client score vs competitor average, and who leads.
   */
  buildChannelComparison(client, competitors) {
    return CHANNELS.map(ch => {
      const clientScore = client.channels[ch]?.score ?? null;
      const compScores = competitors.map(c => c.channels[ch]?.score).filter(s => s != null);
      const compAvg = compScores.length ? Math.round((compScores.reduce((a, b) => a + b, 0) / compScores.length) * 10) / 10 : null;
      const compPresent = competitors.filter(c => c.channels[ch]?.present).length;
      let verdict = 'unknown';
      if (clientScore != null && compAvg != null) verdict = clientScore > compAvg ? 'ahead' : clientScore < compAvg ? 'behind' : 'even';
      else if (clientScore == null && compPresent === 0) verdict = 'open_lane';
      else if (clientScore == null && compPresent > 0) verdict = 'behind';
      return { channel: ch, clientScore, competitorAvg: compAvg, competitorsPresent: compPresent, totalCompetitors: competitors.length, verdict };
    });
  }

  async synthesizeGap({ businessInfo, perChannel }) {
    if (!this.callCouncil) return { summary: '', biggestOpportunity: '', text: '' };
    const digest = perChannel
      .map(c => `${c.channel}: you=${c.clientScore ?? 'none'}, competitors avg=${c.competitorAvg ?? 'n/a'} (${c.competitorsPresent}/${c.totalCompetitors} present) → ${c.verdict}`)
      .join('\n');
    const prompt = `You are advising "${businessInfo.businessName || 'a business'}" (${businessInfo.industry || 'small business'}) on their online presence vs competitors.

Channel-by-channel comparison:
${digest}

Give an honest, motivating read. Return ONLY JSON:
{"summary":"2-3 sentence overview of where they stand vs competitors","biggestOpportunity":"the single highest-leverage channel to win and why","quickWins":["win 1","win 2","win 3"]}`;
    try {
      // useCache:false: gap synthesis is per-business; the cache can reuse a different
      // business's comparison if the prompt is template-heavy.
      const response = await this.callCouncil(DEFAULT_MODEL, prompt, { maxOutputTokens: 700, taskType: 'analysis', useCache: false, builderExecution: true });
      const parsed = JSON.parse((response.match(/\{[\s\S]+\}/) || ['{}'])[0]);
      const quickWins = Array.isArray(parsed.quickWins) ? parsed.quickWins.slice(0, 5) : [];
      return {
        summary: parsed.summary || '',
        biggestOpportunity: parsed.biggestOpportunity || '',
        quickWins,
        text: [parsed.summary, parsed.biggestOpportunity ? `Biggest opportunity: ${parsed.biggestOpportunity}` : ''].filter(Boolean).join(' '),
      };
    } catch (err) {
      logger.warn('[PRESENCE] gap synthesis failed', { error: err.message });
      return { summary: '', biggestOpportunity: '', quickWins: [], text: '' };
    }
  }
}
