/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Scores how bad a prospect's EXISTING website is so we know who to pitch first.
 * High opportunityScore (0-100) = bad site = high priority for cold outreach.
 */

export function createOpportunityScorer(options = {}) {
  const timeoutMs = options.timeout || 5000;

  return {
    async scoreUrl(url) {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let html = '';
      let responseTimeMs = null;
      let fetchError = null;

      try {
        const response = await fetch(url, {
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; SiteScorer/1.0)' },
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timer);
        responseTimeMs = Date.now() - startedAt;
        html = await response.text();
      } catch (err) {
        clearTimeout(timer);
        fetchError = err.name === 'AbortError' ? 'Fetch timed out' : err.message;
      }

      if (fetchError) {
        return {
          url,
          opportunityScore: 50,
          grade: 'C',
          painPoints: ['Could not load site to analyze — may be down or blocking crawlers'],
          strengths: [],
          recommendation: 'Unable to analyze site — try manually or skip.',
          responseTimeMs: null,
          analyzed: false,
          error: fetchError,
        };
      }

      const lowerHtml = html.toLowerCase();

      // Detect signals
      const slow = responseTimeMs > 3000;
      const noMobileViewport = !/<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
      const noSsl = !url.startsWith('https:');
      const noBooking = !['calendly', 'acuity', 'jane.app', 'mindbody', 'booksy', 'schedulista', 'vagaro', 'squareup.com/appointments', 'setmore'].some(w => lowerHtml.includes(w));
      const noTitle = !/<title[^>]*>[^<]{3,}<\/title>/i.test(html);
      const noMetaDesc = !/<meta[^>]+name=["']description["'][^>]*content=["'][^"']{10,}/i.test(html);
      const noSocialProof = !/(testimonial|review|rated|rating|stars|five.star|5.star)/i.test(lowerHtml);
      const noCTA = !/(book now|book a|schedule|appointment|call now|get started|contact us|free consult)/i.test(lowerHtml);
      const oldYear = (() => {
        const m = lowerHtml.match(/copyright[^\d]{0,10}(201[0-9]|2020|2021)/);
        return m ? m[1] : null;
      })();
      const noSchema = !lowerHtml.includes('application/ld+json');
      const oldHtml = /(font\s+color=|bgcolor=|cellpadding=|cellspacing=|<table\s+width=)/i.test(html);
      const thinContent = html.length < 2000;

      // Score: each check worth points when BAD (total possible ~100)
      const checks = [
        { active: slow,           points: 15, pain: `Site loads in ${responseTimeMs}ms — most visitors leave after 3s`, strength: null },
        { active: noMobileViewport, points: 15, pain: 'Not mobile-optimized — most clients search on their phone', strength: 'Mobile-optimized site' },
        { active: noSsl,          points: 10, pain: 'No SSL — browsers warn visitors the site is not secure', strength: 'Secure HTTPS site' },
        { active: noBooking,      points: 12, pain: 'No online booking — clients must call instead of booking instantly', strength: 'Has online booking' },
        { active: noTitle,        points: 8,  pain: 'Missing or empty page title — search engines cannot rank this site', strength: 'Clear page title' },
        { active: noMetaDesc,     points: 8,  pain: 'No meta description — site gets no click-through from search results', strength: 'Has meta description' },
        { active: noSocialProof,  points: 10, pain: 'No social proof — visitors cannot see why other clients chose them', strength: 'Shows testimonials or reviews' },
        { active: noCTA,          points: 10, pain: 'No clear call-to-action — visitors do not know what to do next', strength: 'Has clear call-to-action' },
        { active: Boolean(oldYear), points: 6, pain: `Copyright still shows ${oldYear} — site looks abandoned`, strength: null },
        { active: noSchema,       points: 4,  pain: 'No structured data — Google cannot show rich results for this business', strength: 'Schema markup present' },
        { active: oldHtml,        points: 6,  pain: 'Uses outdated HTML — site looks unprofessional on modern devices', strength: 'Uses modern web technology' },
        { active: thinContent,    points: 6,  pain: 'Very little content — search engines will not rank this site', strength: 'Rich content' },
      ];

      const rawScore = checks.reduce((sum, c) => sum + (c.active ? c.points : 0), 0);
      const maxScore = checks.reduce((sum, c) => sum + c.points, 0); // 110 currently
      const opportunityScore = Math.min(100, Math.round((rawScore / maxScore) * 100));

      const grade = opportunityScore >= 80 ? 'F'
        : opportunityScore >= 60 ? 'D'
        : opportunityScore >= 40 ? 'C'
        : opportunityScore >= 20 ? 'B'
        : 'A';

      const painPoints = checks.filter(c => c.active).map(c => c.pain);
      const strengths = checks.filter(c => !c.active && c.strength).map(c => c.strength);

      const recommendation = opportunityScore >= 80
        ? 'This business urgently needs a modern website — their current site is likely hurting their revenue.'
        : opportunityScore >= 60
        ? 'Strong opportunity — multiple critical gaps a modern site would solve immediately.'
        : opportunityScore >= 40
        ? 'Good opportunity — a conversion-focused site would noticeably improve their bookings.'
        : opportunityScore >= 20
        ? 'Moderate opportunity — some gaps to address but their existing site has some strengths.'
        : 'Lower priority — their site already covers the basics.';

      return {
        url,
        opportunityScore,
        grade,
        painPoints,
        strengths,
        recommendation,
        responseTimeMs,
        analyzed: true,
        error: null,
      };
    },
  };
}

export async function scoreProspectUrl(url, options = {}) {
  const scorer = createOpportunityScorer(options);
  return scorer.scoreUrl(url);
}
