// SYNOPSIS: MarketingOS YouTube OAuth + channel analytics + video suggestion packs
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

const YOUTUBE_PROVIDER = 'youtube_channel';
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

function resolvePool(poolOrDeps) {
  if (poolOrDeps && typeof poolOrDeps.query === 'function') return poolOrDeps;
  if (poolOrDeps?.pool && typeof poolOrDeps.pool.query === 'function') return poolOrDeps.pool;
  return null;
}

function buildRedirectUri() {
  const base = process.env.PUBLIC_BASE_URL
    || process.env.RAILWAY_PUBLIC_DOMAIN
    || 'http://localhost:8080';
  return `${String(base).replace(/\/$/, '')}/api/v1/marketing/youtube/callback`;
}

function getOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: buildRedirectUri(),
  };
}

function createClient() {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

function parseTokens(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

function thumbnailSvgDataUri({ title, subtitle = 'SocialMediaOS', hook = '', accent = '#7c3aed' }) {
  const safeTitle = String(title || 'Video idea').slice(0, 72)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeSub = String(subtitle).slice(0, 40)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeHook = String(hook || '').slice(0, 90)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <rect x="48" y="48" width="1184" height="624" rx="28" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.18)"/>
  <text x="96" y="140" fill="#a78bfa" font-family="Arial, sans-serif" font-size="30" font-weight="700">${safeSub}</text>
  <text x="96" y="250" fill="#ffffff" font-family="Arial, sans-serif" font-size="58" font-weight="700">
    <tspan x="96" dy="0">${safeTitle.slice(0, 32)}</tspan>
    <tspan x="96" dy="70">${safeTitle.slice(32, 64)}</tspan>
  </text>
  <text x="96" y="480" fill="#fde68a" font-family="Arial, sans-serif" font-size="34">
    <tspan x="96" dy="0">${safeHook.slice(0, 48)}</tspan>
    <tspan x="96" dy="44">${safeHook.slice(48, 90)}</tspan>
  </text>
  <text x="96" y="620" fill="#c4b5fd" font-family="Arial, sans-serif" font-size="26">Talk card · hook · bullets · close</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function encodeSeedPack(pack) {
  return Buffer.from(JSON.stringify(pack), 'utf8').toString('base64url');
}

const DEFAULT_INTRO = 'Hey — I\'m Adam. I help people get clear results without the fluff.';
const DEFAULT_CLOSE = 'If this helped, tell me in the comments what you\'re stuck on next — I\'ll answer.';

function normalizeScriptLines(raw) {
  if (Array.isArray(raw)) {
    return raw.map((line) => String(line || '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  }
  return [];
}

function buildSampleScript(pack) {
  const existing = normalizeScriptLines(pack.sample_script);
  if (existing.length >= 4) return existing;
  const lines = [];
  if (pack.hook) lines.push(String(pack.hook).trim());
  if (pack.intro) lines.push(String(pack.intro).trim());
  for (const point of pack.talking_points || []) {
    const p = String(point || '').trim();
    if (!p) continue;
    lines.push(p);
    lines.push(`Here's the part most people skip: ${p.toLowerCase().replace(/\.$/, '')}.`);
  }
  for (const must of pack.must_say || []) {
    const m = String(must || '').trim();
    if (m && !lines.some((l) => l.toLowerCase().includes(m.toLowerCase().slice(0, 24)))) {
      lines.push(`Don't leave without this: ${m}`);
    }
  }
  if (pack.competitor_gap) {
    lines.push(`What the other channels won't say: ${String(pack.competitor_gap).trim()}`);
  }
  if (pack.close) lines.push(String(pack.close).trim());
  return lines.filter(Boolean);
}

function buildMustSay(pack) {
  const existing = Array.isArray(pack.must_say) ? pack.must_say.map((x) => String(x || '').trim()).filter(Boolean) : [];
  if (existing.length) return existing.slice(0, 5);
  const out = [];
  if (pack.competitor_gap) out.push(String(pack.competitor_gap).trim());
  for (const point of (pack.talking_points || []).slice(0, 2)) {
    if (point) out.push(String(point).trim());
  }
  return out.slice(0, 5);
}

const FALLBACK_IDEAS = [
  {
    title: 'The follow-up most agents skip after closing',
    why: 'Retention + trust story; high comment potential for service businesses.',
    angle: 'story',
    hook: 'Closed is not the finish line.',
    competitor_gap: 'Most agent channels stop at the closing day highlight reel.',
    competitors: ['Typical agent listing tours', 'Generic "just closed!" posts'],
    talking_points: [
      'What clients feel the week after closing that nobody prepares them for',
      'One concrete follow-up ritual you actually run',
      'The business result when you stay present after the deal',
    ],
    must_say: [
      'Name one post-closing fear clients actually text about',
      'Show your exact follow-up ritual (day/time/message)',
      'Say what competitors celebrate instead of serving after close',
    ],
    sample_script: [
      'Closed is not the finish line.',
      'Hey — I\'m Adam. I help people get clear results without the fluff.',
      'Most agents disappear the week after closing — and that\'s when clients feel the most alone.',
      'They\'re staring at a mortgage, a move, and a stack of "now what?" questions nobody answered.',
      'Here\'s the ritual I actually run: one check-in within 72 hours, one local intro in week one, one 30-day "any landmines?" call.',
      'Don\'t leave without this: name one post-closing fear clients actually text about.',
      'What the other channels won\'t say: closing day content is vanity — presence after close is the business.',
      'If this helped, tell me in the comments what you\'re stuck on next — I\'ll answer.',
    ],
    intro: DEFAULT_INTRO,
    close: DEFAULT_CLOSE,
  },
  {
    title: 'Stop posting content that sounds like AI wrote it',
    why: 'Direct pain for founders who hate sounding fake on camera.',
    angle: 'teaching',
    hook: 'If it could be anyone\'s post, it shouldn\'t be yours.',
    competitor_gap: 'Competing "content tips" channels sell templates; few show how to sound like yourself.',
    competitors: ['Generic AI content coaches', 'Template-first social gurus'],
    talking_points: [
      'The tell that a post was generated (no specific names, numbers, or scars)',
      'How you pull one real story from a real week',
      'The 3-beat structure: hook → lived detail → clear ask',
    ],
    must_say: [
      'Call out the "no names, no numbers, no scars" tell',
      'Give one real story from YOUR week, not a template',
      'End with a clear human ask, not "smash like"',
    ],
    sample_script: [
      'If it could be anyone\'s post, it shouldn\'t be yours.',
      'Hey — I\'m Adam. I help people get clear results without the fluff.',
      'You can smell AI content in three seconds: no names, no numbers, no scars.',
      'Here\'s how I pull a real story: I look at what actually happened this week — one client, one mess, one win.',
      'Then I run three beats: hook, lived detail, clear ask.',
      'Don\'t leave without this: one real story from YOUR week, not a template.',
      'What the other channels won\'t say: templates make you louder, not more you.',
      'If this helped, tell me in the comments what you\'re stuck on next — I\'ll answer.',
    ],
    intro: DEFAULT_INTRO,
    close: DEFAULT_CLOSE,
  },
  {
    title: 'One weekly video that fills your calendar',
    why: 'Simple operating system > random posting streaks.',
    angle: 'system',
    hook: 'One video. One offer. One clear next step.',
    competitor_gap: 'Growth channels push daily posting; yours can win on one intentional weekly film.',
    competitors: ['Daily-post hustle channels', 'Batch-content factories'],
    talking_points: [
      'Why daily posting burns founders out without filling the calendar',
      'The one weekly video format that maps to a booked conversation',
      'How you measure "did this video create a real next step?"',
    ],
    must_say: [
      'Daily posting is not the same as booked conversations',
      'Name the one weekly format that maps to a call',
      'Define the metric: real next step, not vanity views',
    ],
    sample_script: [
      'One video. One offer. One clear next step.',
      'Hey — I\'m Adam. I help people get clear results without the fluff.',
      'Daily posting burns founders out — and still leaves the calendar empty.',
      'I film one intentional weekly video aimed at one booked conversation.',
      'The measure is simple: did someone take a real next step?',
      'Don\'t leave without this: vanity views are not the win.',
      'What the other channels won\'t say: volume without a next step is expensive noise.',
      'If this helped, tell me in the comments what you\'re stuck on next — I\'ll answer.',
    ],
    intro: DEFAULT_INTRO,
    close: DEFAULT_CLOSE,
  },
  {
    title: 'What your analytics are actually telling you to film next',
    why: 'Uses channel truth when connected; otherwise founder defaults.',
    angle: 'analytics',
    hook: 'Your best next video is already hiding in the numbers.',
    competitor_gap: 'Most creators chase trends; few reverse-engineer their own retention graph.',
    competitors: ['Trend-chasing Shorts channels', 'Thumbnail-only growth advice'],
    talking_points: [
      'Which recent title retained people past 30 seconds',
      'What that audience was actually hungry for',
      'The next film that answers that hunger without copying a competitor',
    ],
    must_say: [
      'Point to one title that held past 30 seconds',
      'Name the hunger behind that retention',
      'Propose the next film from YOUR data, not a trend list',
    ],
    sample_script: [
      'Your best next video is already hiding in the numbers.',
      'Hey — I\'m Adam. I help people get clear results without the fluff.',
      'Forget the trend list for a second — look at what kept people past 30 seconds on YOUR channel.',
      'That retention spike is the hunger signal.',
      'The next film answers that hunger without copying a competitor.',
      'Don\'t leave without this: your data beats someone else\'s trend.',
      'What the other channels won\'t say: chasing trends skips the audience you already earned.',
      'If this helped, tell me in the comments what you\'re stuck on next — I\'ll answer.',
    ],
    intro: DEFAULT_INTRO,
    close: DEFAULT_CLOSE,
  },
  {
    title: 'The 15-second open that earns the next minute',
    why: 'Earned-attention framework — practical and rewatchable.',
    angle: 'script',
    hook: 'If second 15 fails, minute 2 never happens.',
    competitor_gap: 'Hook tips are everywhere; few give a reusable open + exit for YOUR voice.',
    competitors: ['Hook formula channels', 'Faceless AI narration pages'],
    talking_points: [
      'The open line that names the viewer\'s exact stuck point',
      'Proof you\'ve lived it (one specific beat)',
      'The promise of what they\'ll walk away with in this video',
    ],
    must_say: [
      'Name the viewer\'s exact stuck point in the open',
      'Prove you\'ve lived it with one specific beat',
      'Promise what they walk away with — then deliver the exit',
    ],
    sample_script: [
      'If second 15 fails, minute 2 never happens.',
      'Hey — I\'m Adam. I help people get clear results without the fluff.',
      'Open by naming the stuck point — not a vague "struggling with content."',
      'Then prove you\'ve lived it with one specific beat from your week.',
      'Promise what they\'ll walk away with before you teach anything.',
      'Don\'t leave without this: earned attention is a contract you keep.',
      'What the other channels won\'t say: a formula hook without your scar is still forgettable.',
      'If this helped, tell me in the comments what you\'re stuck on next — I\'ll answer.',
    ],
    intro: DEFAULT_INTRO,
    close: DEFAULT_CLOSE,
  },
];

export function createYouTubeService(poolOrDeps = {}) {
  const pool = resolvePool(poolOrDeps);
  const logger = poolOrDeps?.logger || console;

  async function getAuthUrl(ownerId = 'adam') {
    const { clientId } = getOAuthConfig();
    if (!clientId) {
      return {
        error: 'GOOGLE_CLIENT_ID is not set',
        blocker: 'GOOGLE_YOUTUBE_OAUTH_UNVERIFIED',
        next: 'Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET on Railway, then add redirect URI in Google Cloud Console.',
        redirectUri: buildRedirectUri(),
      };
    }
    if (!ownerId) return { error: 'owner_id is required' };

    const auth = createClient();
    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: YOUTUBE_SCOPES,
      state: String(ownerId),
    });
    return { authUrl, redirectUri: buildRedirectUri() };
  }

  async function handleCallback(code, ownerId = 'adam') {
    const { clientId } = getOAuthConfig();
    if (!clientId) return { error: 'GOOGLE_CLIENT_ID is not set' };
    if (!code) return { error: 'Missing authorization code' };
    if (!ownerId) return { error: 'Missing ownerId' };
    if (!pool) return { error: 'database_pool_unavailable' };

    const auth = createClient();
    const { tokens } = await auth.getToken(code);
    await pool.query(
      `INSERT INTO user_integrations (user_id, provider, tokens, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (user_id, provider)
       DO UPDATE SET tokens = $3::jsonb, updated_at = NOW()`,
      [ownerId, YOUTUBE_PROVIDER, JSON.stringify(tokens)],
    );
    return { connected: true, userId: ownerId };
  }

  async function getAuthedClient(ownerId) {
    const { clientId } = getOAuthConfig();
    if (!clientId) return { error: 'GOOGLE_CLIENT_ID is not set' };
    if (!ownerId) return { error: 'Missing ownerId' };
    if (!pool) return { error: 'database_pool_unavailable' };

    const { rows } = await pool.query(
      `SELECT tokens FROM user_integrations
       WHERE user_id = $1 AND provider = $2
       LIMIT 1`,
      [ownerId, YOUTUBE_PROVIDER],
    );
    if (!rows.length) return { error: 'YouTube is not connected' };

    const tokens = parseTokens(rows[0].tokens);
    if (!tokens) return { error: 'YouTube tokens missing' };

    const auth = createClient();
    auth.setCredentials(tokens);
    auth.on('tokens', async (newTokens) => {
      try {
        const merged = { ...tokens, ...newTokens };
        await pool.query(
          `UPDATE user_integrations
           SET tokens = $3::jsonb, updated_at = NOW()
           WHERE user_id = $1 AND provider = $2`,
          [ownerId, YOUTUBE_PROVIDER, JSON.stringify(merged)],
        );
      } catch (err) {
        logger?.warn?.({ err }, 'youtube token refresh persist failed');
      }
    });
    return { auth };
  }

  async function getStatus(ownerId) {
    if (!ownerId) return { connected: false, connectedSince: null, oauthConfigured: !!getOAuthConfig().clientId };
    if (!pool) return { connected: false, connectedSince: null, error: 'database_pool_unavailable', oauthConfigured: !!getOAuthConfig().clientId };

    const { rows } = await pool.query(
      `SELECT updated_at FROM user_integrations
       WHERE user_id = $1 AND provider = $2
       LIMIT 1`,
      [ownerId, YOUTUBE_PROVIDER],
    );
    const row = rows[0];
    return {
      connected: !!row,
      connectedSince: row ? row.updated_at : null,
      oauthConfigured: !!getOAuthConfig().clientId,
      redirectUri: buildRedirectUri(),
    };
  }

  async function getChannel(ownerId) {
    const client = await getAuthedClient(ownerId);
    if (client.error) return { ok: false, error: client.error };

    const yt = google.youtube({ version: 'v3', auth: client.auth });
    const channelRes = await yt.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true,
    });
    const channel = channelRes.data.items?.[0] || null;
    if (!channel) return { ok: false, error: 'no_youtube_channel' };

    let analytics = null;
    try {
      const analyticsApi = google.youtubeAnalytics({ version: 'v2', auth: client.auth });
      const end = new Date();
      const start = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
      const fmt = (d) => d.toISOString().slice(0, 10);
      const report = await analyticsApi.reports.query({
        ids: 'channel==MINE',
        startDate: fmt(start),
        endDate: fmt(end),
        metrics: 'views,estimatedMinutesWatched,subscribersGained,averageViewDuration',
        dimensions: 'day',
        sort: '-day',
        maxResults: 28,
      });
      analytics = {
        windowDays: 28,
        rows: report.data.rows || [],
        columnHeaders: report.data.columnHeaders || [],
      };
    } catch (err) {
      analytics = { error: err?.message || 'analytics_unavailable' };
    }

    return {
      ok: true,
      channel: {
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        customUrl: channel.snippet?.customUrl,
        thumbnails: channel.snippet?.thumbnails,
        stats: channel.statistics,
      },
      analytics,
    };
  }

  async function listRecentVideos(ownerId, maxResults = 10) {
    const client = await getAuthedClient(ownerId);
    if (client.error) return { ok: false, error: client.error, videos: [] };
    const yt = google.youtube({ version: 'v3', auth: client.auth });
    const channelRes = await yt.channels.list({ part: ['contentDetails'], mine: true });
    const uploads = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return { ok: true, videos: [] };
    const playlist = await yt.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: uploads,
      maxResults,
    });
    const videos = (playlist.data.items || []).map((item) => ({
      videoId: item.contentDetails?.videoId,
      title: item.snippet?.title,
      publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt,
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || null,
    }));
    return { ok: true, videos };
  }

  function buildSuggestionCards(ideas, { source, channelTitle, founderIntro }) {
    return ideas.map((idea, idx) => {
      const title = idea.title || idea.text;
      const hook = idea.hook || '';
      const intro = idea.intro || founderIntro || DEFAULT_INTRO;
      const close = idea.close || DEFAULT_CLOSE;
      const talking_points = Array.isArray(idea.talking_points) && idea.talking_points.length
        ? idea.talking_points.slice(0, 5)
        : (FALLBACK_IDEAS[idx % FALLBACK_IDEAS.length].talking_points || []);
      const competitors = Array.isArray(idea.competitors) ? idea.competitors.slice(0, 4) : [];
      const competitor_gap = idea.competitor_gap || idea.competitor_context?.gap || '';
      const draft = {
        title,
        why: idea.why || idea.rationale || '',
        angle: idea.angle || 'story',
        hook,
        intro,
        close,
        talking_points,
        competitors,
        competitor_gap,
        must_say: idea.must_say,
        sample_script: idea.sample_script,
      };
      const must_say = buildMustSay(draft);
      const sample_script = buildSampleScript({ ...draft, must_say });
      const pack = {
        ...draft,
        must_say,
        sample_script,
      };
      const seedPack = encodeSeedPack(pack);
      const startPath = `/marketing/session/new?seed_title=${encodeURIComponent(title)}&seed_angle=${encodeURIComponent(pack.angle)}&seed_pack=${encodeURIComponent(seedPack)}`;
      return {
        id: `yt-idea-${idx + 1}`,
        rank: idx + 1,
        ...pack,
        source,
        channelTitle: channelTitle || null,
        thumbnailUrl: thumbnailSvgDataUri({
          title,
          hook,
          subtitle: channelTitle ? `${channelTitle} · researched` : 'Researched · ready to film',
        }),
        startUrl: startPath,
        studioUrl: `/creative/studio?title=${encodeURIComponent(title)}`,
      };
    });
  }

  async function loadFounderIntro(ownerId) {
    if (!pool?.query) return DEFAULT_INTRO;
    try {
      const { rows } = await pool.query(
        `SELECT brand_voice_json FROM marketing_channel_profiles WHERE owner_id = $1 LIMIT 1`,
        [String(ownerId)]
      );
      const voice = rows[0]?.brand_voice_json;
      const parsed = typeof voice === 'string' ? JSON.parse(voice) : voice;
      return parsed?.founderIntro || parsed?.intro || DEFAULT_INTRO;
    } catch {
      return DEFAULT_INTRO;
    }
  }

  async function getSuggestions(ownerId, { callCouncilMember } = {}) {
    const status = await getStatus(ownerId);
    let channelTitle = null;
    let recentTitles = [];
    let source = 'founder_defaults';
    const founderIntro = await loadFounderIntro(ownerId);

    if (status.connected) {
      try {
        const channel = await getChannel(ownerId);
        if (channel.ok) {
          channelTitle = channel.channel?.title || null;
          source = 'youtube_analytics_plus_channel';
        }
        const recent = await listRecentVideos(ownerId, 8);
        recentTitles = (recent.videos || []).map((v) => v.title).filter(Boolean);
      } catch (err) {
        logger?.warn?.({ err }, 'youtube suggestions channel pull failed');
      }
    }

    let ideas = FALLBACK_IDEAS;
    if (typeof callCouncilMember === 'function') {
      try {
        const prompt = `You are a YouTube producer for a founder who hates AI-sounding scripts.
Return ONLY a JSON array of exactly 5 talk cards. Each object MUST have:
title, why, angle, hook, intro, talking_points (array of 3 short spoken bullets), close,
competitors (array of 2 competing channel types or example creators), competitor_gap (one sentence: what they miss that we cover),
must_say (array of 2–3 non-negotiable lines this video MUST land — especially competitor gaps and detail-heavy facts),
sample_script (array of 8–14 short teleprompter lines he can READ aloud; include numbers/details when the topic needs them — e.g. cost of living, fees, timelines. Spoken English, not essay paragraphs).

Rules:
- Sound human. No hashtags. No corporate fluff. Specific > generic.
- Hook = first line on camera (under 14 words).
- intro = how THIS founder opens ("Hey I'm…") — use this founder intro if present: ${JSON.stringify(founderIntro)}
- talking_points = what he talks through on camera (not essay paragraphs).
- sample_script = full readable teleprompter: hook → intro → detail beats → must_say → competitor gap → close.
- close = exit / CTA in his voice.
- Research competitors relative to channel: ${channelTitle || 'founder-led business channel'}
- Recent titles on this channel: ${recentTitles.join(' | ') || 'none yet'}
Prefer filmable ideas that beat competitors by lived specificity, not louder AI voice.`;
        const raw = await callCouncilMember('gemini_flash', prompt, { maxTokens: 3200 });
        const text = typeof raw === 'string' ? raw : (raw?.text || raw?.content || '');
        const match = String(text).match(/\[[\s\S]*\]/);
        const parsed = match ? JSON.parse(match[0]) : null;
        if (Array.isArray(parsed) && parsed.length) {
          ideas = parsed.slice(0, 5).map((item, i) => {
            const fb = FALLBACK_IDEAS[i % FALLBACK_IDEAS.length];
            return {
              title: item.title || item.text || fb.title,
              why: item.why || item.rationale || fb.why,
              angle: item.angle || fb.angle,
              hook: item.hook || fb.hook,
              intro: item.intro || founderIntro || fb.intro,
              close: item.close || fb.close,
              talking_points: Array.isArray(item.talking_points) && item.talking_points.length
                ? item.talking_points
                : fb.talking_points,
              competitors: Array.isArray(item.competitors) ? item.competitors : fb.competitors,
              competitor_gap: item.competitor_gap || item.competitor_context?.gap || fb.competitor_gap,
              must_say: Array.isArray(item.must_say) && item.must_say.length ? item.must_say : fb.must_say,
              sample_script: normalizeScriptLines(item.sample_script).length
                ? normalizeScriptLines(item.sample_script)
                : fb.sample_script,
            };
          });
          if (!status.connected) source = 'ai_research_defaults';
        }
      } catch (err) {
        logger?.warn?.({ err }, 'youtube suggestion AI fallback to defaults');
      }
    }

    return {
      ok: true,
      connected: !!status.connected,
      oauthConfigured: !!status.oauthConfigured,
      source,
      suggestions: buildSuggestionCards(ideas, { source, channelTitle, founderIntro }),
    };
  }

  return {
    getAuthUrl,
    handleCallback,
    getAuthedClient,
    getStatus,
    getChannel,
    listRecentVideos,
    getSuggestions,
  };
}

export default createYouTubeService;
