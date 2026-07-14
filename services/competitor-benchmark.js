/**
 * SYNOPSIS: Competitor Benchmark — scrapes competitor & best-in-industry sites, scores each 1-10 with strengths/weaknesses, synthesizes a design brief for Site Builder.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 *
 * Why this exists:
 *   A site scored 104/104 on structure can still look generic because nothing measured it
 *   against the real market. This service grounds every build in what the client's actual
 *   competitors — and the best sites in their industry — do well and do poorly. The scorecard
 *   is also a client-facing value-add: an honest 1-10 rating of each competitor with concrete
 *   strengths/weaknesses, then we position the client's new site to beat them where they're weak.
 *
 * Flow:
 *   benchmark({ businessInfo, competitorUrls })
 *     → scrapeLite(url) for each competitor (lightweight fetch, no headless browser)
 *     → scoreSite(...) → { score 1-10, doesWell[], doesPoorly[], summary }
 *     → synthesizeDesignBrief(...) → patterns to adopt + gaps to exploit (fed into generation)
 */

import logger from './logger.js';
import { DEFAULT_MODEL } from '../config/task-model-routing.js';

const FETCH_TIMEOUT_MS = Number(process.env.COMPETITOR_FETCH_TIMEOUT_MS || '12000');
const MAX_COMPETITORS = Number(process.env.COMPETITOR_BENCHMARK_MAX || '4');

export default class CompetitorBenchmark {
  constructor({ callCouncil } = {}) {
    this.callCouncil = callCouncil;
  }

  /**
   * Lightweight page fetch + HTML signal extraction. No headless browser —
   * we only need text/structure signals for the AI to reason about design quality.
   */
  async scrapeLite(url) {
    const raw = await this.fetchRaw(url);
    if (!raw.ok) return { url, ok: false, status: raw.status, error: raw.error };
    return { url, ok: true, status: raw.status, ...this.extractSignals(raw.html) };
  }

  /**
   * Raw HTML fetch with timeout. Returns { url, ok, status, html, error }.
   * Shared by scrapeLite and the presence auditor (which also needs raw links).
   */
  async fetchRaw(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LuminBot/1.0; +https://lumin.ai)' },
      });
      const html = await res.text();
      return { url, ok: res.ok, status: res.status, html };
    } catch (err) {
      logger.warn('[BENCHMARK] fetch failed', { url, error: err.message });
      return { url, ok: false, status: 0, html: '', error: err.message };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Extract design/structure signals from raw HTML (no DOM library needed).
   */
  extractSignals(html) {
    const h = String(html || '');
    const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const grab = re => (h.match(re) || []).map(m => strip(m)).filter(Boolean);

    const title = (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
    const metaDescription =
      h.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      h.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] || '';
    const h1s = grab(/<h1[^>]*>[\s\S]*?<\/h1>/gi);
    const h2s = grab(/<h2[^>]*>[\s\S]*?<\/h2>/gi).slice(0, 12);
    const bodyText = strip(h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')).slice(0, 3500);

    const imgCount = (h.match(/<img\b/gi) || []).length;
    const videoCount = (h.match(/<video\b|youtube\.com\/embed|player\.vimeo/gi) || []).length;
    const ctaHits = (h.match(/book now|get started|schedule|contact us|free (consult|quote|trial|call)|sign up/gi) || []).length;
    const hasSchema = /application\/ld\+json/i.test(h);
    const formCount = (h.match(/<form\b/gi) || []).length;
    const usesTailwind = /tailwind/i.test(h);

    return {
      title,
      metaDescription,
      h1: h1s[0] || '',
      h2s,
      bodyText,
      signals: { imgCount, videoCount, ctaHits, hasSchema, formCount, usesTailwind, htmlBytes: h.length },
    };
  }

  /**
   * AI-score one scraped competitor site 1-10 with concrete strengths/weaknesses.
   */
  async scoreSite({ scraped, industry }) {
    if (!this.callCouncil || !scraped || scraped.ok === false) {
      return {
        url: scraped?.url,
        reachable: false,
        score: null,
        doesWell: [],
        doesPoorly: [],
        summary: scraped?.error ? `Could not analyze (${scraped.error})` : 'Could not analyze this site.',
      };
    }

    const prompt = `You are a senior conversion-focused web designer auditing a competitor website in the "${industry || 'small business'}" industry. Judge it honestly like a demanding client would.

SITE URL: ${scraped.url}
TITLE: ${scraped.title}
META DESCRIPTION: ${scraped.metaDescription}
MAIN HEADLINE (H1): ${scraped.h1}
SECTION HEADINGS: ${(scraped.h2s || []).join(' | ')}
STRUCTURAL SIGNALS: images=${scraped.signals?.imgCount}, videos=${scraped.signals?.videoCount}, CTA phrases=${scraped.signals?.ctaHits}, forms=${scraped.signals?.formCount}, schema=${scraped.signals?.hasSchema}
VISIBLE TEXT (sample): ${(scraped.bodyText || '').slice(0, 2000)}

Rate this site from 1 to 10 (10 = best-in-class, converts exceptionally). Judge: clarity of value proposition, visual/design quality signals, trust & proof, call-to-action strength, and how well it would convert a visitor into a lead/customer.

Return ONLY valid JSON:
{
  "score": <integer 1-10>,
  "doesWell": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "doesPoorly": ["specific weakness 1", "specific weakness 2", "specific weakness 3"],
  "summary": "one honest sentence a business owner would understand"
}`;

    try {
      // useCache:false: competitor scorecards are per-URL; the semantic cache can
      // return a scorecard from a different competitor with a similar-looking prompt.
      const response = await this.callCouncil(DEFAULT_MODEL, prompt, { maxOutputTokens: 700, taskType: 'analysis', useCache: false, builderExecution: true });
      const jsonMatch = response.match(/\{[\s\S]+\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      const score = Math.max(1, Math.min(10, Math.round(Number(parsed.score) || 5)));
      return {
        url: scraped.url,
        reachable: true,
        score,
        doesWell: Array.isArray(parsed.doesWell) ? parsed.doesWell.slice(0, 5) : [],
        doesPoorly: Array.isArray(parsed.doesPoorly) ? parsed.doesPoorly.slice(0, 5) : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      };
    } catch (err) {
      logger.warn('[BENCHMARK] score failed', { url: scraped.url, error: err.message });
      return { url: scraped.url, reachable: true, score: null, doesWell: [], doesPoorly: [], summary: 'Analysis unavailable.' };
    }
  }

  /**
   * Synthesize a design brief from all scorecards: what patterns to adopt from the
   * winners, and which weaknesses to beat. This is fed into site generation.
   */
  async synthesizeDesignBrief({ businessInfo, scorecards }) {
    const analyzed = scorecards.filter(s => s.reachable && s.score != null);
    if (!this.callCouncil || analyzed.length === 0) {
      return {
        adopt: [],
        beat: [],
        text: 'No competitor sites could be analyzed; build to best-practice defaults for the industry.',
      };
    }

    const digest = analyzed
      .map(s => `- ${s.url} (scored ${s.score}/10): does well [${s.doesWell.join('; ')}]; weak on [${s.doesPoorly.join('; ')}]`)
      .join('\n');

    const prompt = `You are the lead designer for a NEW website in the "${businessInfo?.industry || 'small business'}" industry for "${businessInfo?.businessName || 'the client'}".

Here is an honest audit of competitor sites in this space:
${digest}

Synthesize a concrete design brief so the NEW site beats all of them. Return ONLY valid JSON:
{
  "adopt": ["proven pattern worth adopting 1", "pattern 2", "pattern 3"],
  "beat": ["common competitor weakness to visibly beat 1", "weakness 2", "weakness 3"],
  "positioning": "one sentence on how this new site should feel different/better"
}`;

    try {
      // useCache:false: design briefs are derived from a specific business + competitor set.
      const response = await this.callCouncil(DEFAULT_MODEL, prompt, { maxOutputTokens: 800, taskType: 'analysis', useCache: false, builderExecution: true });
      const jsonMatch = response.match(/\{[\s\S]+\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      const adopt = Array.isArray(parsed.adopt) ? parsed.adopt.slice(0, 6) : [];
      const beat = Array.isArray(parsed.beat) ? parsed.beat.slice(0, 6) : [];
      const positioning = typeof parsed.positioning === 'string' ? parsed.positioning : '';
      const text = [
        positioning ? `POSITIONING: ${positioning}` : '',
        adopt.length ? `ADOPT these proven patterns from top competitors:\n${adopt.map(a => `  • ${a}`).join('\n')}` : '',
        beat.length ? `BEAT these common competitor weaknesses:\n${beat.map(b => `  • ${b}`).join('\n')}` : '',
      ].filter(Boolean).join('\n');
      return { adopt, beat, positioning, text };
    } catch (err) {
      logger.warn('[BENCHMARK] design brief synthesis failed', { error: err.message });
      return { adopt: [], beat: [], text: 'Build to best-practice defaults for the industry.' };
    }
  }

  /**
   * Full benchmark pass. Returns a client-facing scorecard plus a design brief
   * that Site Builder feeds into generation.
   */
  async benchmark({ businessInfo = {}, competitorUrls = [] } = {}) {
    const urls = [...new Set((competitorUrls || []).map(u => String(u || '').trim()).filter(Boolean))]
      .filter(u => u !== businessInfo?.sourceUrl)
      .slice(0, MAX_COMPETITORS);

    if (urls.length === 0) {
      return {
        analyzedCount: 0,
        scorecards: [],
        designBrief: { adopt: [], beat: [], text: 'No competitors provided; building to industry best practices.' },
        generatedAt: new Date().toISOString(),
      };
    }

    logger.info('[BENCHMARK] analyzing competitors', { count: urls.length, industry: businessInfo?.industry });
    const scraped = await Promise.all(urls.map(u => this.scrapeLite(u)));
    const scorecards = await Promise.all(scraped.map(s => this.scoreSite({ scraped: s, industry: businessInfo?.industry })));
    scorecards.sort((a, b) => (b.score || 0) - (a.score || 0));

    const designBrief = await this.synthesizeDesignBrief({ businessInfo, scorecards });

    return {
      analyzedCount: scorecards.filter(s => s.reachable && s.score != null).length,
      scorecards,
      designBrief,
      generatedAt: new Date().toISOString(),
    };
  }
}
