/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Site Builder — Scrape existing site → AI-generates complete click-funnel website
 *
 * Pipeline:
 *   URL → scrape business info → AI builds full Tailwind HTML site → SEO schema →
 *   auto blog posts → YouTube RSS embed → deploy to /public/previews/{clientId}/
 *
 * Features:
 *   - Full click funnel (Hero → Problem → Services → Proof → CTA → FAQ → Blog → Videos)
 *   - Tailwind CSS via CDN (zero build step)
 *   - Schema.org LocalBusiness + Service markup
 *   - Auto-generated SEO blog posts (3x per build)
 *   - YouTube channel RSS embed (no API key needed)
 *   - Booking CTA (Cal.com or Calendly embed, or contact form)
 *   - POS/Payment integration via Stripe Payment Links or Square referral
 *   - sitemap.xml + robots.txt generated
 *
 * POS Commission Partners (wellness-focused):
 *   - Jane App: https://jane.app/affiliates — healthcare/wellness scheduling + POS
 *   - Mindbody: https://www.mindbodyonline.com/partner — fitness/wellness POS
 *   - Square: https://squareup.com/us/en/referral — general POS
 *   We earn referral commission when client signs up via our link.
 */

import { promises as fs } from 'fs';
import path from 'path';
import logger from './logger.js';
import { scoreGeneratedSite, scoreSummary } from './site-builder-quality-scorer.js';

const TAILWIND_CDN = 'https://cdn.tailwindcss.com';
const ALPINE_CDN = 'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js';
const DESIGN_INTEL_PATH = path.join(process.cwd(), 'docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md');
const MIN_SEND_SCORE = Number(process.env.SITE_BUILDER_MIN_SEND_SCORE || '72');
const TARGET_QUALITY_SCORE = Number(process.env.SITE_BUILDER_TARGET_SCORE || '88');
const MAX_REPAIR_PASSES = Math.max(0, Number(process.env.SITE_BUILDER_REPAIR_PASSES || '2'));
const GENERATION_MAX_TOKENS = Number(process.env.SITE_BUILDER_GEN_TOKENS || '14000');
const REPAIR_MAX_TOKENS = Number(process.env.SITE_BUILDER_REPAIR_TOKENS || '14000');

// POS partner referral links — set AFFILIATE_*_URL env vars in Railway to activate commission tracking
export const POS_PARTNERS = {
  jane_app: {
    name: 'Jane App',
    description: 'Best for healthcare & wellness scheduling + payments',
    url: process.env.AFFILIATE_JANE_APP_URL || 'https://jane.app',
    commission: '$50 per referral',
    bestFor: ['midwives', 'doulas', 'massage', 'naturopath', 'counselor', 'physio'],
  },
  mindbody: {
    name: 'Mindbody',
    description: 'Best for fitness, yoga, spa & wellness studios',
    url: process.env.AFFILIATE_MINDBODY_URL || 'https://www.mindbodyonline.com',
    commission: 'Up to $200 per referral',
    bestFor: ['yoga', 'spa', 'fitness', 'gym', 'pilates', 'meditation'],
  },
  square: {
    name: 'Square',
    description: 'Best general POS for any small business',
    url: process.env.AFFILIATE_SQUARE_URL || 'https://squareup.com/us/en/referral',
    commission: 'Up to $2,500 per referral (volume-based)',
    bestFor: ['retail', 'restaurant', 'general', 'any'],
  },
};

export default class SiteBuilder {
  constructor({ callCouncil, previewsDir = 'public/previews', baseUrl = '' } = {}) {
    this.callCouncil = callCouncil;
    this.previewsDir = previewsDir;
    this.baseUrl = baseUrl;
  }

  /**
   * Full pipeline: URL → scraped info → new site → deploy → return preview URL
   */
  async buildFromUrl(targetUrl, options = {}) {
    const clientId = `prev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    logger.info('[SITE] Building site from URL', { clientId, targetUrl });

    try {
      // Step 1: Scrape business info
      const businessInfo = await this.scrapeBusinessInfo(targetUrl, options);

      // Step 2: Determine best POS partner for their industry
      const posPartner = this.selectPosPartner(businessInfo.industry || businessInfo.keywords || []);

      // Step 3: Generate main site HTML
      let siteHtml = await this.generateSiteHtml(businessInfo, { clientId, posPartner, ...options });
      let qualityReport = this.scoreSiteHtml(siteHtml, businessInfo);

      // Step 3b: Deterministic patch — inject schema, focus styles, sticky CTA regardless of AI output
      siteHtml = this.patchSiteHtml(siteHtml, businessInfo);
      qualityReport = this.scoreSiteHtml(siteHtml, businessInfo);

      // Step 3c: AI repair passes for remaining quality gaps
      if (this.callCouncil && qualityReport.scorePct < TARGET_QUALITY_SCORE && MAX_REPAIR_PASSES > 0) {
        for (let pass = 1; pass <= MAX_REPAIR_PASSES; pass++) {
          const repairedHtml = await this.improveSiteHtml(siteHtml, businessInfo, qualityReport, {
            clientId,
            posPartner,
            pass,
          });
          // Patch again after repair (AI may have dropped injected elements)
          const patchedRepair = this.patchSiteHtml(repairedHtml, businessInfo);
          const repairedScore = this.scoreSiteHtml(patchedRepair, businessInfo);
          if (repairedScore.scorePct <= qualityReport.scorePct) break;
          siteHtml = patchedRepair;
          qualityReport = repairedScore;
          if (qualityReport.scorePct >= TARGET_QUALITY_SCORE) break;
        }
      }

      // Step 4: Generate 3 SEO blog posts
      const blogPosts = await this.generateBlogPosts(businessInfo, 3);

      // Step 5: Fetch YouTube videos (RSS, no API key)
      const videos = businessInfo.youtubeChannelId
        ? await this.fetchYouTubeVideos(businessInfo.youtubeChannelId)
        : [];

      // Step 6: Build blog index page
      const blogHtml = this.generateBlogIndex(businessInfo, blogPosts);

      // Step 7: Generate SEO files
      const sitemap = this.generateSitemap(clientId, blogPosts);
      const robots = this.generateRobots();

      // Step 8: Deploy all files
      const deployDir = path.join(process.cwd(), this.previewsDir, clientId);
      await fs.mkdir(deployDir, { recursive: true });
      await fs.mkdir(path.join(deployDir, 'blog'), { recursive: true });

      // Inject view tracking pixel — when prospect opens preview we auto-mark them as 'viewed'
      if (this.baseUrl) {
        const pixel = `<img src="${this.baseUrl}/api/v1/sites/preview-view?id=${clientId}" style="position:absolute;opacity:0;pointer-events:none" width="1" height="1" alt="">`;
        siteHtml = siteHtml.includes('</body>') ? siteHtml.replace('</body>', `${pixel}\n</body>`) : siteHtml;
      }
      await fs.writeFile(path.join(deployDir, 'index.html'), siteHtml);
      await fs.writeFile(path.join(deployDir, 'blog', 'index.html'), blogHtml);
      await fs.writeFile(path.join(deployDir, 'sitemap.xml'), sitemap);
      await fs.writeFile(path.join(deployDir, 'robots.txt'), robots);

      for (const post of blogPosts) {
        const postDir = path.join(deployDir, 'blog', post.slug);
        await fs.mkdir(postDir, { recursive: true });
        await fs.writeFile(path.join(postDir, 'index.html'), post.html);
      }

      // Step 9: Save metadata
      const metadata = {
        clientId,
        targetUrl,
        businessInfo,
        posPartner,
        blogPosts: blogPosts.map(p => ({ slug: p.slug, title: p.title })),
        videos: videos.length,
        qualityReport,
        createdAt: new Date().toISOString(),
        previewUrl: `${this.baseUrl}/previews/${clientId}`,
      };
      await fs.writeFile(path.join(deployDir, 'meta.json'), JSON.stringify(metadata, null, 2));

      logger.info('[SITE] Site deployed', {
        clientId,
        previewUrl: metadata.previewUrl,
        quality: scoreSummary(qualityReport),
      });

      return {
        success: true,
        clientId,
        previewUrl: metadata.previewUrl,
        businessName: businessInfo.businessName,
        blogPosts: blogPosts.length,
        posPartner: posPartner.name,
        qualityReport,
        metadata,
      };
    } catch (err) {
      logger.error('[SITE] Build failed', { clientId, error: err.message });
      return { success: false, clientId, error: err.message };
    }
  }

  /**
   * Scrape business info from existing website using Puppeteer.
   * Extracts: name, tagline, services, contact, colors, testimonials, social links.
   */
  async scrapeBusinessInfo(url, options = {}) {
    // If manual info is provided (no scraping needed), use it directly
    if (options.businessInfo) return options.businessInfo;

    let puppeteer;
    let browser;
    try {
      puppeteer = await import('puppeteer');
      browser = await puppeteer.default.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; LuminBot/1.0; +https://lumin.ai)');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

      const scraped = await page.evaluate(() => {
        const getText = sel => document.querySelector(sel)?.innerText?.trim() || '';
        const getMeta = name =>
          document.querySelector(`meta[name="${name}"]`)?.content ||
          document.querySelector(`meta[property="og:${name}"]`)?.content || '';

        // Extract all visible text
        const bodyText = document.body?.innerText?.slice(0, 8000) || '';

        // Look for phone, email, address
        const phoneMatch = bodyText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
        const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);

        // Find social links
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
        const youtube = links.find(l => l.includes('youtube.com/channel') || l.includes('youtube.com/@'));
        const instagram = links.find(l => l.includes('instagram.com/'));
        const facebook = links.find(l => l.includes('facebook.com/'));

        // Try to get YouTube channel ID from URL
        let youtubeChannelId = null;
        if (youtube) {
          const chMatch = youtube.match(/channel\/(UC[\w-]+)/);
          const handleMatch = youtube.match(/@([\w-]+)/);
          youtubeChannelId = chMatch ? chMatch[1] : (handleMatch ? handleMatch[1] : null);
        }

        return {
          title: document.title || '',
          metaDescription: getMeta('description'),
          h1: getText('h1'),
          bodyText,
          phone: phoneMatch ? phoneMatch[0] : '',
          email: emailMatch ? emailMatch[0] : '',
          youtubeUrl: youtube || '',
          youtubeChannelId,
          instagramUrl: instagram || '',
          facebookUrl: facebook || '',
        };
      });

      await browser.close();

      // Use AI to extract structured business info from the raw scraped text
      const extracted = await this.extractBusinessInfoWithAI(scraped, url);
      return { ...scraped, ...extracted, sourceUrl: url };

    } catch (err) {
      if (browser) await browser.close().catch(() => {});
      logger.warn('[SITE] Scrape failed, using AI extraction only', { url, error: err.message });
      // Fallback: use AI to infer info from URL + domain name alone
      return this.extractBusinessInfoWithAI({ title: url, bodyText: '', sourceUrl: url }, url);
    }
  }

  /**
   * Use AI to structure scraped data into clean business profile.
   */
  async extractBusinessInfoWithAI(scraped, url) {
    if (!this.callCouncil) {
      return { businessName: new URL(url).hostname, services: [], keywords: [] };
    }

    const prompt = `Extract structured business information from this scraped website content.

URL: ${url}
Title: ${scraped.title || ''}
Meta description: ${scraped.metaDescription || ''}
H1: ${scraped.h1 || ''}
Body text (first 4000 chars):
${(scraped.bodyText || '').slice(0, 4000)}

Return ONLY valid JSON with this exact structure:
{
  "businessName": "exact business name",
  "tagline": "their main value proposition in 1 sentence",
  "industry": "e.g. midwifery, wellness, massage, yoga, doula, naturopath",
  "services": ["service 1", "service 2", "service 3"],
  "targetAudience": "who they serve",
  "location": "city, state if found",
  "priceRange": "e.g. $150-$300/session or unknown",
  "tone": "professional/warm/holistic/clinical/friendly",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "painPoints": ["pain point their clients have 1", "pain point 2", "pain point 3"],
  "testimonials": ["testimonial snippet 1 if found", "testimonial 2 if found"],
  "primaryColor": "#hex color if apparent from branding, else #7C3AED",
  "accentColor": "#hex color, else #EC4899",
  "bookingUrl": "their existing booking URL if found, else null",
  "uniqueValue": "what makes them different in 1-2 sentences"
}`;

    // groq_llama is fine for structured JSON extraction — fast and cheap
    const response = await this.callCouncil('groq_llama', prompt, { maxOutputTokens: 1000, taskType: 'extraction' });
    try {
      const jsonMatch = response.match(/\{[\s\S]+\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return {};
    }
  }

  /**
   * Select best POS partner based on business industry/keywords.
   */
  selectPosPartner(industryOrKeywords) {
    const text = Array.isArray(industryOrKeywords)
      ? industryOrKeywords.join(' ').toLowerCase()
      : String(industryOrKeywords).toLowerCase();

    if (/midwi|doula|naturo|counsel|physio|chiro|health|clinic|medical/.test(text)) {
      return POS_PARTNERS.jane_app;
    }
    if (/yoga|spa|fitnes|gym|pilates|meditation|wellness|massage|reiki/.test(text)) {
      return POS_PARTNERS.mindbody;
    }
    return POS_PARTNERS.square;
  }

  /**
   * Generate complete click-funnel website HTML using AI.
   * Full funnel: Hero → Problem → Services → Proof → Offer → FAQ → Blog → Videos → Footer
   */
  async generateSiteHtml(info, options = {}) {
    const { clientId, posPartner } = options;
    const primary = info.primaryColor || '#7C3AED';
    const accent = info.accentColor || '#EC4899';
    const designIntel = await this.loadDesignIntel();

    const prompt = `You are building a COMPLETE, PRODUCTION-READY website for a small wellness/health business.

BUSINESS PROFILE:
- Name: ${info.businessName || 'The Practice'}
- Industry: ${info.industry || 'wellness'}
- Tagline: ${info.tagline || 'Transforming lives through holistic care'}
- Services: ${(info.services || []).join(', ') || 'wellness services'}
- Target audience: ${info.targetAudience || 'local community'}
- Location: ${info.location || ''}
- Unique value: ${info.uniqueValue || 'expert, compassionate care'}
- Tone: ${info.tone || 'warm and professional'}
- Client pain points: ${(info.painPoints || []).join('; ')}
- SEO keywords: ${(info.keywords || []).join(', ')}
- Phone: ${info.phone || ''}
- Email: ${info.email || ''}
- Booking URL: ${info.bookingUrl || '#book'}
- Brand colors: Primary ${primary}, Accent ${accent}
- Testimonials: ${(info.testimonials || []).join(' | ')}

PAYMENT/BOOKING SYSTEM:
- We recommend ${posPartner.name} for scheduling + payments
- Referral link: ${posPartner.url}
- Include a "Book Now" CTA that links to booking system

HARD REQUIREMENTS:
1. Output ONE complete HTML file — nothing else, no explanation
2. Use Tailwind CSS via CDN: ${TAILWIND_CDN}
3. Use Alpine.js via CDN for interactivity: ${ALPINE_CDN} (defer)
4. Zero external dependencies beyond those CDNs
5. Mobile-first, fully responsive
6. After </html> write: BUILD_COMPLETE
7. Use semantic HTML, accessible buttons/links, and visible focus states
8. Use CSS custom properties inside ONE small <style> block for theme tokens and any shaped background effects
9. Do NOT use placeholder lorem ipsum, fake star ratings with no basis, or generic "AI agency" language
10. If real testimonials are missing, use a clearly labeled section like "What clients often appreciate" instead of fabricated quotes

CLICK FUNNEL STRUCTURE (in this exact order):
1. NAVIGATION: Logo + nav links + "Book Free Call" CTA button (sticky)
2. HERO: Bold headline about transformation/outcome (not features). Subheadline. Two CTAs: primary "Book Your Free Consultation" + secondary "See How It Works". Add a subtle background gradient using primary color.
3. SOCIAL PROOF BAR: 3 trust stats (e.g., "200+ families served", "5★ rated", "10 years experience") — infer from business info
4. PROBLEM SECTION: "Does this sound familiar?" — 3 pain points as cards with icons (use emoji)
5. SOLUTION SECTION: "Here's how we help" — 3-step process with numbered steps
6. SERVICES SECTION: Service cards with name, description, price range (if known), "Learn More" CTA
7. TESTIMONIALS: 3 testimonials or proof cards in a clean grid. Use real ones if provided. If none are provided, use trust-building proof cards or a "what clients value" section and label it clearly.
8. OFFER/PACKAGES: 2-3 clear pricing tiers with features list and "Get Started" CTA — make them buyable
9. ABOUT SECTION: Brief about the practitioner, warm and personal
10. FAQ SECTION: 5 Q&As using Alpine.js accordion (x-data, x-show, @click)
11. BLOG PREVIEW: "Latest from the Blog" — 3 blog post cards with title/excerpt placeholders (links to /blog/)
12. VIDEO SECTION: "Watch & Learn" — if videos are unavailable, show a useful educational content teaser instead of an empty embed grid
13. BOOKING CTA SECTION: Full-width colored section "Ready to start your journey?" with big CTA button
14. FOOTER: Logo, nav links, contact info, social links, copyright, concise trust note
15. MOBILE STICKY CTA BAR: a bottom booking bar visible on small screens only

SEO REQUIREMENTS:
- <title> tag: [Business Name] | [City] [Industry] | [Tagline]
- <meta name="description"> with natural keyword inclusion
- Schema.org LocalBusiness JSON-LD in <head>
- Open Graph tags (og:title, og:description, og:type=website)
- Include only truthful schema properties that are supported by the provided business data
- All H1/H2/H3 hierarchy correct (only ONE h1)
- Alt text on any images (use gradient placeholders, no external images)
- Internal links between sections

DESIGN INTELLIGENCE:
${designIntel}

DESIGN REQUIREMENTS:
- Use Tailwind utility classes for layout and components, plus one concise <style> block for theme tokens and a few intentional visual effects
- Primary color: ${primary} — use in CTAs, borders, highlights
- Accent color: ${accent} — use in gradients, hover states, and editorial moments
- Make the site feel custom to this business, not like a generic wellness template
- Avoid default purple-on-white unless the extracted brand colors actually call for it
- Use stronger hierarchy, editorial spacing, clear card groupings, and at least one visually distinctive section treatment
- Use subtle motion only where it improves clarity; avoid heavy animations and anything that hurts performance
- CTA buttons: large tap targets, high contrast, clear hover/focus states
- Section padding: py-16 md:py-24
- Keep the page fast and conversion-focused: concise copy, strong above-the-fold trust, repeated CTA placement, no dead sections

Output the ENTIRE HTML file from <!DOCTYPE html> to </html> then BUILD_COMPLETE.`;

    if (!this.callCouncil) throw new Error('callCouncil required for site generation');

    // gemini_flash: free, 8192+ output tokens — adequate for full 15-section HTML
    // maxOutputTokens (not maxTokens) is what council-service reads for the override
    const response = await this.callCouncil('gemini_flash', prompt, { maxOutputTokens: GENERATION_MAX_TOKENS });
    let clean = response.replace(/BUILD_COMPLETE[\s\S]*$/, '').trim();
    // Strip markdown fences AI models sometimes wrap HTML in (```html...``` or ```...```)
    clean = clean.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

    if (!clean.includes('<!DOCTYPE html') && !clean.includes('<html')) {
      throw new Error('AI did not return valid HTML');
    }
    return clean;
  }

  scoreSiteHtml(html, businessInfo = {}) {
    return scoreGeneratedSite(html, businessInfo, {
      minReadyScore: MIN_SEND_SCORE,
      minExcellentScore: TARGET_QUALITY_SCORE,
    });
  }

  /**
   * Deterministic post-processor: inject elements the quality scorer requires
   * that AI models sometimes omit. Safe to call multiple times (idempotent).
   */
  patchSiteHtml(html, info = {}) {
    let h = String(html || '');
    const primary = info.primaryColor || '#7C3AED';
    const accent = info.accentColor || '#EC4899';
    const phone = info.phone || '';
    const email = info.email || '';
    const bookingUrl = info.bookingUrl || '#book';
    const name = info.businessName || 'the practice';

    // 1. Schema.org JSON-LD — required for hasSchemaMarkup (8pts)
    if (!/application\/ld\+json/i.test(h)) {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: info.businessName || 'Local Business',
        description: info.tagline || info.metaDescription || '',
        url: info.sourceUrl || info.bookingUrl || '',
      };
      if (phone) schema.telephone = phone;
      if (email) schema.email = email;
      if (info.location) schema.address = { '@type': 'PostalAddress', addressLocality: info.location };
      const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
      h = h.includes('</head>')
        ? h.replace('</head>', `${scriptTag}\n</head>`)
        : scriptTag + h;
    }

    // 2. Focus-visible styles — required for hasFocusStyles (4pts)
    if (!/focus:|focus-visible:/i.test(h)) {
      const focusCss = `<style>
*:focus-visible{outline:2px solid ${primary};outline-offset:2px;border-radius:3px;}
button:focus-visible,a:focus-visible{outline:2px solid ${primary};outline-offset:2px;}
</style>`;
      h = h.includes('</head>')
        ? h.replace('</head>', `${focusCss}\n</head>`)
        : focusCss + h;
    }

    // 3. Mobile sticky CTA bar — required for hasStickyMobileCta (6pts)
    if (!/fixed bottom|sticky.*bottom|bottom booking|small screens only/i.test(h)) {
      const callLink = phone
        ? `<a href="tel:${phone.replace(/[^\d+]/g, '')}" class="flex-1 border border-white/30 rounded-full py-2.5 text-center text-sm font-semibold text-white">Call Us</a>`
        : '';
      const stickyBar = `
<!-- Mobile sticky CTA — small screens only -->
<div class="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-black/10 px-4 py-3 flex gap-3 shadow-xl" style="background:rgba(255,255,255,0.97);backdrop-filter:blur(8px)">
  <a href="${bookingUrl}" class="flex-1 rounded-full py-2.5 text-center text-sm font-bold text-white shadow-md" style="background:linear-gradient(135deg,${primary},${accent})">Book Now</a>${callLink}
</div>`;
      h = h.includes('</body>')
        ? h.replace('</body>', `${stickyBar}\n</body>`)
        : h + stickyBar;
    }

    // 4. Contact info — required for hasContactInfo (8pts)
    // Only inject if we have data AND the HTML has neither phone nor email patterns
    const hasContact = /\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]\d{4}|@[a-z0-9.-]+\.[a-z]{2,}/i.test(h);
    if (!hasContact && (phone || email)) {
      const contactLine = [
        phone ? `<a href="tel:${phone.replace(/[^\d+]/g, '')}" class="underline">${phone}</a>` : '',
        email ? `<a href="mailto:${email}" class="underline">${email}</a>` : '',
      ].filter(Boolean).join(' &nbsp;·&nbsp; ');
      // Prepend to </footer> if present, otherwise inject before </body>
      const contactSnippet = `<div class="text-center py-2 text-sm text-gray-500">${contactLine}</div>`;
      if (h.includes('<footer')) {
        h = h.replace('<footer', `${contactSnippet}<footer`);
      } else if (h.includes('</body>')) {
        h = h.replace('</body>', `${contactSnippet}\n</body>`);
      }
    }

    // 5. Offer/pricing clarity — inject minimal pricing note if completely absent (6pts)
    if (!/\$|pricing|package|membership|per month|\/mo\b|fee|investment/i.test(h)) {
      const pricingNote = `<p class="text-sm text-gray-500 text-center py-4">Flexible packages available — contact ${name} for current pricing and availability.</p>`;
      h = h.includes('</footer>')
        ? h.replace('</footer>', `${pricingNote}</footer>`)
        : h.includes('</body>')
        ? h.replace('</body>', `${pricingNote}\n</body>`)
        : h + pricingNote;
    }

    return h;
  }

  async improveSiteHtml(existingHtml, info, qualityReport, options = {}) {
    const { posPartner } = options;
    const designIntel = await this.loadDesignIntel();
    const prompt = `You are revising a generated local-business website that scored below target quality.

BUSINESS PROFILE:
- Name: ${info.businessName || 'The Practice'}
- Industry: ${info.industry || 'wellness'}
- Services: ${(info.services || []).join(', ') || 'wellness services'}
- Target audience: ${info.targetAudience || 'local community'}
- Location: ${info.location || ''}
- Tone: ${info.tone || 'warm and professional'}
- Booking URL: ${info.bookingUrl || '#book'}
- Recommended scheduling/payments partner: ${posPartner?.name || 'Square'}

CURRENT SCORE:
- Score: ${qualityReport.score}/${qualityReport.maxScore}
- Percent: ${qualityReport.scorePct}%
- Grade: ${qualityReport.grade}
- Recommended action: ${qualityReport.recommendedAction}
- Top issues: ${(qualityReport.summaryIssues || qualityReport.issues || []).join('; ') || 'none'}

DESIGN INTELLIGENCE:
${designIntel}

REVISION GOALS:
- Keep the site truthful, specific, and conversion-oriented.
- Fix the listed issues without bloating the page.
- Make the mobile CTA flow clearer.
- Strengthen trust and section hierarchy.
- Preserve semantic HTML, Tailwind, Alpine, schema markup, and fast-loading structure.
- If proof/testimonials are weak, replace fake-sounding claims with truthful proof framing.

HARD REQUIREMENTS:
1. Return ONE full HTML document only.
2. Keep Tailwind + Alpine CDNs.
3. Keep a single H1 and proper heading hierarchy.
4. Keep visible focus states and strong CTAs.
5. End with BUILD_COMPLETE after </html>.

CURRENT HTML:
${existingHtml}
`;

    const response = await this.callCouncil('gemini_flash', prompt, { maxOutputTokens: REPAIR_MAX_TOKENS });
    const clean = String(response || '').replace(/BUILD_COMPLETE[\s\S]*$/, '').trim();
    if (!clean.includes('<!DOCTYPE html') && !clean.includes('<html')) {
      throw new Error('AI did not return valid repaired HTML');
    }
    return clean;
  }

  /**
   * Generate 3 SEO blog posts for the business's industry.
   */
  async generateBlogPosts(info, count = 3) {
    if (!this.callCouncil) return [];

    const prompt = `Generate ${count} SEO-optimized blog post outlines for a ${info.industry || 'wellness'} business called "${info.businessName || 'the practice'}".

Target audience: ${info.targetAudience || 'local clients'}
Keywords to include: ${(info.keywords || []).join(', ')}
Location: ${info.location || 'local area'}

Return ONLY valid JSON array:
[
  {
    "title": "SEO-optimized blog title with keyword",
    "slug": "url-friendly-slug",
    "metaDescription": "150-160 char meta description with keyword",
    "excerpt": "2-3 sentence preview of the post",
    "content": "Full 600-800 word blog post in HTML (use <h2>, <h3>, <p>, <ul>, <li> tags). Include the business name naturally. End with a CTA to book a consultation."
  }
]`;

    // gemini_flash for blog content — 3 posts × 600-800 words each exceeds groq's 4096-token limit
    const response = await this.callCouncil('gemini_flash', prompt, { maxOutputTokens: 4000 });
    try {
      const jsonMatch = response.match(/\[[\s\S]+\]/);
      const posts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      return posts.map(post => ({
        ...post,
        html: this.wrapBlogPost(post, info),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Wrap blog post content in full HTML page.
   */
  wrapBlogPost(post, info) {
    const primary = info.primaryColor || '#7C3AED';
    const accent = info.accentColor || '#EC4899';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title} | ${info.businessName || 'Blog'}</title>
  <meta name="description" content="${post.metaDescription || post.excerpt}">
  <meta property="og:title" content="${post.title}">
  <meta property="og:type" content="article">
  <script src="${TAILWIND_CDN}"></script>
  <style>
    :root {
      --brand-primary: ${primary};
      --brand-accent: ${accent};
      --brand-paper: #fffdfa;
      --brand-ink: #171717;
    }
  </style>
</head>
<body class="bg-[var(--brand-paper)] text-[var(--brand-ink)]">
  <nav class="border-b border-black/5 bg-white/90 px-6 py-4 backdrop-blur">
    <a href="/" class="text-lg font-bold" style="color: var(--brand-primary)">${info.businessName || 'Home'}</a>
  </nav>
  <main class="max-w-3xl mx-auto px-6 py-12">
    <div class="mb-8 inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-black/55">Article</div>
    <h1 class="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">${post.title}</h1>
    <p class="mb-8 text-gray-500">Published by ${info.businessName || 'the team'}</p>
    <div class="prose prose-lg max-w-none">${post.content}</div>
    <div class="mt-12 rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
      <h3 class="mb-3 text-2xl font-bold" style="color: var(--brand-primary)">Ready to take the next step?</h3>
      <p class="text-gray-600 mb-6">Book a free consultation with ${info.businessName || 'us'} today.</p>
      <a href="${info.bookingUrl || '/#book'}" class="inline-block rounded-full px-8 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent))">Book Free Consultation</a>
    </div>
  </main>
  <footer class="border-t bg-white/80 px-6 py-8 text-center text-sm text-gray-500">
    <p>&copy; ${new Date().getFullYear()} ${info.businessName || ''}. Site powered by <a href="https://lumin.ai" style="color: var(--brand-primary)">Lumin AI</a>.</p>
  </footer>
</body>
</html>`;
  }

  /**
   * Generate blog index page.
   */
  generateBlogIndex(info, posts) {
    const primary = info.primaryColor || '#7C3AED';
    const postCards = posts.map(p => `
      <a href="/blog/${p.slug || p.slug}/" class="block rounded-[24px] border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
        <h2 class="text-xl font-bold text-gray-900 mb-2">${p.title}</h2>
        <p class="text-gray-600 text-sm mb-4">${p.excerpt || ''}</p>
        <span class="text-sm font-medium" style="color: ${primary}">Read more →</span>
      </a>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog | ${info.businessName || ''}</title>
  <meta name="description" content="Wellness tips, advice, and insights from ${info.businessName || 'our team'}.">
  <script src="${TAILWIND_CDN}"></script>
</head>
<body class="bg-stone-50">
  <nav class="border-b bg-white px-6 py-4">
    <a href="/" class="text-lg font-bold" style="color: ${primary}">${info.businessName || 'Home'}</a>
  </nav>
  <main class="max-w-4xl mx-auto px-6 py-12">
    <h1 class="mb-2 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">Latest from the Blog</h1>
    <p class="text-gray-600 mb-10">Tips, guides, and insights for ${info.targetAudience || 'our community'}.</p>
    <div class="grid md:grid-cols-3 gap-6">${postCards}</div>
  </main>
</body>
</html>`;
  }

  async loadDesignIntel() {
    try {
      const raw = await fs.readFile(DESIGN_INTEL_PATH, 'utf8');
      return raw.slice(0, 5000);
    } catch {
      return [
        '- Prioritize mobile-first layouts, clear tap targets, and visible focus states.',
        '- Prefer fast-loading pages with concise sections, strong trust cues, and repeated CTAs.',
        '- Use truthful structured data, semantic headings, and a sitemap-friendly layout.',
        '- Avoid generic AI-looking purple templates; make the visual direction feel specific to the business.',
      ].join('\n');
    }
  }

  /**
   * Fetch latest YouTube videos via public RSS (no API key required).
   */
  async fetchYouTubeVideos(channelIdOrHandle) {
    try {
      const { default: https } = await import('https');
      // If it looks like a channel ID (starts with UC), use channel RSS
      // If it's a handle (@name), we'd need the channel ID — best effort
      const rssUrl = channelIdOrHandle.startsWith('UC')
        ? `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdOrHandle}`
        : `https://www.youtube.com/feeds/videos.xml?user=${channelIdOrHandle}`;

      const xml = await new Promise((resolve, reject) => {
        https.get(rssUrl, res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });

      // Extract video IDs and titles from RSS XML
      const videos = [];
      const entries = xml.match(/<entry>[\s\S]+?<\/entry>/g) || [];
      for (const entry of entries.slice(0, 6)) {
        const idMatch = entry.match(/yt:videoId>([\w-]+)</);
        const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
        if (idMatch) {
          videos.push({
            videoId: idMatch[1],
            title: titleMatch ? titleMatch[1] : 'Video',
            embedUrl: `https://www.youtube.com/embed/${idMatch[1]}`,
          });
        }
      }
      return videos;
    } catch {
      return [];
    }
  }

  /**
   * Generate sitemap.xml for the deployed site.
   */
  generateSitemap(clientId, blogPosts) {
    const baseUrl = `${this.baseUrl}/previews/${clientId}`;
    const blogUrls = blogPosts.map(p => `
  <url>
    <loc>${baseUrl}/blog/${p.slug}/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>${blogUrls}
</urlset>`;
  }

  generateRobots() {
    return `User-agent: *\nAllow: /\nSitemap: ${this.baseUrl}/sitemap.xml`;
  }

  /**
   * List all deployed preview sites.
   */
  async listPreviews() {
    const previews = [];
    try {
      const dir = path.join(process.cwd(), this.previewsDir);
      const entries = await fs.readdir(dir);
      for (const entry of entries) {
        const metaPath = path.join(dir, entry, 'meta.json');
        const meta = await fs.readFile(metaPath, 'utf-8').then(JSON.parse).catch(() => null);
        if (meta) previews.push(meta);
      }
    } catch { /* dir may not exist yet */ }
    return previews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}
