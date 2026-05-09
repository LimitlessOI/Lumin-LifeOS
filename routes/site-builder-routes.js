import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import SiteBuilder, { POS_PARTNERS } from '../services/site-builder.js';
import ProspectPipeline from '../services/prospect-pipeline.js';
import logger from '../services/logger.js';
import { getRegistryHealth } from '../services/env-registry-map.js'; // Added import for env-registry-map

let _siteBuilder = null;
let _prospectPipeline = null;

// --- Start of copied/adapted discovery logic from scripts/site-builder-prospect-discovery.mjs ---
const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'naturopath', 'physical-therapy', 'pilates', 'reiki', 'nutrition', 'counseling'];

async function searchGooglePlaces(city, type, apiKey, count) {
    const query = encodeURIComponent(`${type} business in ${city}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        const json = await res.json();
        if (json.status === 'REQUEST_DENIED') {
            logger.error('Google Places apiKey rejected:', json.error_message);
            return [];
        }
        if (!json.results?.length) {
            logger.warn(`No Google Places results found for "${type}" in "${city}".`);
            return [];
        }
        return json.results.slice(0, count).map(place => ({
            name: place.name,
            website: place.website || null,
            address: place.formatted_address || null,
            rating: place.rating || null,
            city,
            type,
            source: 'google_places',
        }));
    } catch (err) {
        clearTimeout(timer);
        logger.error('Google Places fetch error:', err.message);
        return [];
    }
}
// --- End of copied/adapted discovery logic ---

async function notifySlack(event, businessName, detail = '') {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) return;

    const emoji = event === 'replied' ? '💬' : '👀';
    const label = event === 'replied' ? 'REPLIED to cold email' : 'VIEWED preview';
    const text = `${emoji} Warm lead alert — ${label}\nBusiness: ${businessName}\n${detail}`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
    } catch {
        // Slack notify is best-effort
    }
}

function getSiteBuilder({ ccm, baseUrl }) {
    if (!_siteBuilder) {
        _siteBuilder = new SiteBuilder({
            callCouncil: ccm,
            previewsDir: 'public/previews',
            baseUrl,
        });
    }
    return _siteBuilder;
}

function getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl }) {
    if (!_prospectPipeline) {
        const builder = getSiteBuilder({ ccm, baseUrl });

        // Build sendEmail adapter — prefer NotificationService (Postmark + suppression),
        // fall back to outreachAutomation, then log-only.
        let sendEmail;
        if (notificationService) {
            sendEmail = async (to, subject, html) => {
                const result = await notificationService.sendEmail({ to, subject, html, text: '' });
                if (!result.success) logger.warn('[PROSPECT] Email not sent', { to, reason: result.error });
                return result;
            };
        } else if (outreachAutomation) {
            sendEmail = async (to, subject, html) => outreachAutomation.sendEmail(to, subject, html);
        } else {
            sendEmail = async (to, subject) => {
                logger.info('[PROSPECT] Email (no sender configured)', { to, subject });
            };
        }

        _prospectPipeline = new ProspectPipeline({
            siteBuilder: builder,
            pool,
            callCouncil: ccm,
            sendEmail,
            baseUrl,
        });
    }
    return _prospectPipeline;
}

/**
 * Register siteBld routes on the Express app. Also registers static file serving for /previews/.
 */
export function createSiteBuilderRoutes(app, { pool, rk, ccm, baseUrl, outreachAutomation, notificationService } = {}) {
    const router = Router();

    const buildLimiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 builds per hour per IP
        message: 'Too many build requests from this IP, please try again after an hour',
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

    // Serve static preview files
    app.use('/previews', Router().use(express.static('public/previews')));

    // Middleware to parse JSON bodies
    router.use(express.json());

    // Health check endpoint
    router.get('/health', async (req, res) => {
        const health = await getRegistryHealth();
        res.json({ ok: true, health });
    });

    // API endpoints
    router.post('/build', rk, buildLimiter, async (req, res) => {
        const { businessUrl, businessInfo } = req.body;
        if (!businessUrl) {
            return res.status(400).json({ ok: false, error: 'businessUrl is required' });
        }
        logger.info('[API] Build request', { businessUrl });
        const builder = getSiteBuilder({ ccm, baseUrl });
        const result = await builder.buildFromUrl(businessUrl, { businessInfo });
        if (result.success) {
            res.json({ ok: true, previewUrl: result.previewUrl, qualityReport: result.qualityReport });
        } else {
            res.status(500).json({ ok: false, error: result.error });
        }
    });

    router.post('/prospect', rk, buildLimiter, async (req, res) => {
        const { businessUrl, contactEmail, contactName, businessName, businessInfo, skipEmail } = req.body;
        if (!businessUrl || !contactEmail) {
            return res.status(400).json({ ok: false, error: 'businessUrl and contactEmail are required' });
        }
        logger.info('[API] Prospect request', { businessUrl, contactEmail });
        const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
        const result = await pipeline.processProspect({
            businessUrl,
            contactEmail,
            contactName,
            businessName,
            businessInfo,
            skipEmail,
        });
        if (result.success) {
            res.json({
                ok: true,
                clientId: result.clientId,
                previewUrl: result.previewUrl,
                emailSent: result.emailSent,
                qaHold: result.qaHold,
                qualityReport: result.qualityReport,
            });
        } else {
            res.status(500).json({ ok: false, error: result.error });
        }
    });

    router.post('/bulk-prospect', rk, async (req, res) => {
        const { prospects: prospectList } = req.body;
        if (!Array.isArray(prospectList) || prospectList.length === 0) {
            return res.status(400).json({ ok: false, error: 'prospects array is required' });
        }
        if (prospectList.length > 20) {
            return res.status(400).json({ ok: false, error: 'Maximum 20 prospects per batch' });
        }

        const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
        const results = [];
        for (const prospect of prospectList) {
            // Add a small delay to avoid hammering external APIs
            await new Promise(resolve => setTimeout(resolve, 500));
            const result = await pipeline.processProspect(prospect);
            results.push({
                businessUrl: prospect.businessUrl,
                contactEmail: prospect.contactEmail,
                success: result.success,
                clientId: result.clientId || null,
                previewUrl: result.previewUrl || null,
                error: result.error || null,
                qaHold: result.qaHold || false,
            });
        }
        return res.json({ ok: true, processed: results.length, results });
    });

    router.post('/discover', rk, async (req, res) => {
        const { city, niche, count } = req.body;

        if (!city) {
            return res.status(400).json({ ok: false, error: 'city is required' });
        }

        const type = niche || 'wellness';
        if (!SUPPORTED_TYPES.includes(type)) {
            return res.status(400).json({ ok: false, error: `Unsupported niche: "${type}". Supported: ${SUPPORTED_TYPES.join(', ')}` });
        }

        const discoveryCount = Math.min(20, Math.max(1, parseInt(count, 10) || 10));
        const apiKey = process.env.GOOGLE_PLACES_KEY;

        let prospects = [];
        let source = 'manual_guidance'; // Default if no API key

        if (apiKey) {
            source = 'google_places';
            logger.info('[DISCOVERY] Searching Google Places', { city, type, discoveryCount });
            prospects = await searchGooglePlaces(city, type, apiKey, discoveryCount);
            logger.info('[DISCOVERY] Found prospects', { count: prospects.length });
        } else {
            logger.warn('[DISCOVERY] GOOGLE_PLACES_KEY not set, returning empty results and manual guidance receipt.', { city, type });
            // The original script prints guidance to stderr, but for an API, we just return empty and note the source.
        }

        return res.json({
            ok: true,
            discovered: prospects.length,
            prospects: prospects,
            receipt: {
                source: source,
                city: city,
                niche: type,
            },
        });
    });

    router.post('/analyze', rk, async (req, res) => {
        const { businessUrl } = req.body;
        if (!businessUrl) {
            return res.status(400).json({ ok: false, error: 'businessUrl is required' });
        }
        logger.info('[API] Analyze request', { businessUrl });
        try {
            const { opportunityScore, grade, painPoints, strengths, isChain, isSpa } = await scoreProspectUrl(businessUrl);
            res.json({ ok: true, score: opportunityScore, grade, painPoints, strengths, isChain, isSpa });
        } catch (err) {
            logger.error('[API] Analyze failed', { businessUrl, error: err.message });
            res.status(500).json({ ok: false, error: `Analysis failed: ${err.message}` });
        }
    });

    router.get('/previews', rk, async (req, res) => {
        const builder = getSiteBuilder({ ccm, baseUrl });
        const previews = await builder.listPreviews();
        res.json({ ok: true, count: previews.length, previews });
    });

    router.get('/prospects', rk, async (req, res) => {
        const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
        const prospects = await pipeline.listProspects();
        res.json({ ok: true, count: prospects.length, prospects });
    });

    router.get('/dashboard', rk, async (req, res) => {
        const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
        const stats = await pipeline.getPipelineStats();
        res.json({ ok: true, pipeline: stats });
    });

    router.patch('/prospects/:clientId/status', rk, async (req, res) => {
        const { clientId } = req.params;
        const { status, dealValue } = req.body;
        if (!status) {
            return res.status(400).json({ ok: false, error: 'status is required' });
        }
        const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
        const result = await pipeline.updateProspectStatus(clientId, status, dealValue);
        if (result.success) {
            res.json({ ok: true, clientId, status: result.newStatus });
        } else {
            res.status(500).json({ ok: false, error: result.error });
        }
    });

    router.post('/prospects/:clientId/follow-up', rk, async (req, res) => {
        const { clientId } = req.params;
        const { followUpNumber } = req.body; // Optional, defaults to 2 (second follow-up)
        const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
        const result = await pipeline.sendFollowUp(clientId, followUpNumber);
        if (result.success) {
            res.json({ ok: true, clientId, followUpNumber: result.followUpNumber });
        } else {
            res.status(500).json({ ok: false, error: result.error });
        }
    });

    router.get('/pos-partners', rk, (req, res) => {
        res.json({ ok: true, partners: POS_PARTNERS });
    });

    // Tracking pixel endpoint
    router.get('/track-view', async (req, res) => {
        const { clientId } = req.query;
        if (!clientId) {
            return res.status(400).send('Client ID required');
        }
        const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
        const result = await pipeline.markProspectViewed(clientId);
        if (result.success && process.env.SLACK_WEBHOOK_URL) {
            // Fire Slack alert for warm lead
            notifySlack('viewed', result.businessName, `Preview URL: ${result.previewUrl}`);
        }
        // Return a 1x1 transparent GIF
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': '43',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    });

    // Postmark inbound webhook for replies
    router