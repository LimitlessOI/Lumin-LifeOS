// services/site-builder-opportunity-scorer.js
import { AbortController } from 'node:abort-controller';

const createOpportunityScorer = (options = {}) => {
  const timeout = options.timeout || 5000;
  return {
    async scoreUrl(url) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          headers: {
            'user-agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const responseTimeMs = response.headers.get('x-response-time-ms');
        const html = await response.text();
        const regex = /<meta name="viewport">/i;
        const hasMobileViewport = regex.test(html);
        const isHttps = url.startsWith('https:');
        const hasBookingWidget = [
          'calendly',
          'acuity',
          'jane',
          'mindbody',
          'square',
          'booksy',
          'schedulista',
        ].some((widget) => html.includes(widget));
        const hasTitleTag = html.includes('<title>');
        const hasMetaDescription = html.includes('<meta name="description">');
        const hasTestimonials = [
          'testimonial',
          'review',
          'rating',
          'star',
          'five',
          '5-star',
        ].some((testimonial) => html.includes(testimonial));
        const hasCTAKeywords = [
          'book',
          'schedule',
          'appointment',
          'call now',
          'get started',
          'contact us',
        ].some((keyword) => html.includes(keyword));
        const hasOldCopyrightYear = /\d{4}/.test(html);
        const hasSchemaMarkup = html.includes('application/ld+json');
        const hasOldHtmlPatterns = [
          'table',
          'font color',
          'bgcolor',
          'cellpadding',
          'cellspacing',
        ].some((pattern) => html.includes(pattern));
        const hasShortContent = html.length < 2000;
        const opportunityScore = [
          !hasMobileViewport ? 15 : 0,
          !isHttps ? 10 : 0,
          !hasBookingWidget ? 12 : 0,
          !hasTitleTag ? 8 : 0,
          !hasMetaDescription ? 8 : 0,
          !hasTestimonials ? 10 : 0,
          !hasCTAKeywords ? 10 : 0,
          hasOldCopyrightYear ? 6 : 0,
          !hasSchemaMarkup ? 4 : 0,
          hasOldHtmlPatterns ? 6 : 0,
          hasShortContent ? 6 : 0,
        ].reduce((acc, points) => acc + points, 0);
        const grade = Math.floor(opportunityScore / 20);
        const painPoints = [
          !hasMobileViewport,
          !isHttps,
          !hasBookingWidget,
          !hasTitleTag,
          !hasMetaDescription,
          !hasTestimonials,
          !hasCTAKeywords,
          hasOldCopyrightYear,
          !hasSchemaMarkup,
          hasOldHtmlPatterns,
          hasShortContent,
        ].filter((point) => point).map((point) => {
          switch (point) {
            case !hasMobileViewport:
              return 'Site not mobile-optimized — most clients search on phone';
            case !isHttps:
              return 'No SSL — browsers warn visitors site is not secure';
            case !hasBookingWidget:
              return 'No online booking — clients have to call instead of booking instantly';
            case !hasTitleTag:
              return 'No clear page title — search engines cannot rank this site';
            case !hasMetaDescription:
              return 'No meta description — site gets no click-through from search results';
            case !hasTestimonials:
              return 'No social proof — visitors cannot see why other clients chose them';
            case !hasCTAKeywords:
              return 'No clear call-to-action — visitors do not know what to do next';
            case hasOldCopyrightYear:
              return `Site has not been updated since ${hasOldCopyrightYear} — looks abandoned`;
            case !hasSchemaMarkup:
              return 'No structured data — Google cannot show rich results for this business';
            case hasOldHtmlPatterns:
              return 'Uses outdated web technology — site looks unprofessional on modern devices';
            case hasShortContent:
              return 'Very little content — search engines will not rank this site';
            default:
              return '';
          }
        });
        const strengths = [
          hasMobileViewport,
          isHttps,
          hasBookingWidget,
          hasTitleTag,
          hasMetaDescription,
          hasTestimonials,
          hasCTAKeywords,
          !hasOldCopyrightYear,
          hasSchemaMarkup,
          !hasOldHtmlPatterns,
          !hasShortContent,
        ].filter((strength) => strength).map((strength) => {
          switch (strength) {
            case hasMobileViewport:
              return 'Site is mobile-optimized';
            case isHttps:
              return 'Site uses SSL — browsers trust visitors';
            case hasBookingWidget:
              return 'Site has online booking — clients can book instantly';
            case hasTitleTag:
              return 'Site has clear page title — search engines can rank it';
            case hasMetaDescription:
              return 'Site has meta description — gets click-through from search results';
            case hasTestimonials:
              return 'Site has social proof — visitors can see why other clients chose it';
            case hasCTAKeywords:
              return 'Site has clear call-to-action — visitors know what to do next';
            case !hasOldCopyrightYear:
              return `Site has been updated since ${hasOldCopyrightYear} — looks modern`;
            case hasSchemaMarkup:
              return 'Site has structured data — Google shows rich results';
            case !hasOldHtmlPatterns:
              return 'Site uses modern web technology — looks professional on modern devices';
            case !hasShortContent:
              return 'Site has plenty of content — search engines can rank it';
            default:
              return '';
          }
        });
        const recommendation = [
          opportunityScore >= 80,
          opportunityScore >= 60,
          opportunityScore >= 40,
          opportunityScore >= 20,
        ].map((condition, index) => {
          if (condition) {
            switch (index) {
              case 0:
                return 'This business urgently needs a modern website — their current site is likely hurting their revenue.';
              case 1:
                return 'Strong opportunity — multiple critical gaps a modern site would solve immediately.';
              case 2:
                return 'Good opportunity — a conversion-focused site would noticeably improve their bookings.';
              case 3:
                return 'Moderate opportunity — some gaps to address but existing site has some strengths.';
              default:
                return '';
            }
          } else {
            return '';
          }
        }).join('\n');
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
      } catch (error) {
        return {
          url,
          opportunityScore: 0,
          grade: 'F',
          painPoints: [],
          strengths: [],
          recommendation: 'Error analyzing site: ' + error.message,
          responseTimeMs: null,
          analyzed: false,
          error: error.message,
        };
      }
    },
  };
};

export { createOpportunityScorer };

export async function scoreProspectUrl(url, options = {}) {
  const scorer = createOpportunityScorer(options);
  return scorer.scoreUrl(url);
}