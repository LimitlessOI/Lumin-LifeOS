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

function thumbnailSvgDataUri({ title, subtitle = 'SocialMediaOS', accent = '#7c3aed' }) {
  const safeTitle = String(title || 'Video idea').slice(0, 72)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeSub = String(subtitle).slice(0, 40)
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
  <text x="96" y="160" fill="#a78bfa" font-family="Arial, sans-serif" font-size="34" font-weight="700">${safeSub}</text>
  <text x="96" y="280" fill="#ffffff" font-family="Arial, sans-serif" font-size="64" font-weight="700">
    <tspan x="96" dy="0">${safeTitle.slice(0, 34)}</tspan>
    <tspan x="96" dy="78">${safeTitle.slice(34, 68)}</tspan>
  </text>
  <text x="96" y="620" fill="#c4b5fd" font-family="Arial, sans-serif" font-size="28">Click → Start making</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const FALLBACK_IDEAS = [
  {
    title: 'The follow-up most agents skip after closing',
    why: 'Retention + trust story; high comment potential for service businesses.',
    angle: 'story',
    hook: 'Closed is not the finish line.',
  },
  {
    title: 'Stop posting content that sounds like AI wrote it',
    why: 'Direct pain for founders who hate sounding fake on camera.',
    angle: 'teaching',
    hook: 'If it could be anyone’s post, it shouldn’t be yours.',
  },
  {
    title: 'One weekly video that fills your calendar',
    why: 'Simple operating system > random posting streaks.',
    angle: 'system',
    hook: 'One video. One offer. One clear next step.',
  },
  {
    title: 'What your analytics are actually telling you to film next',
    why: 'Uses channel truth when connected; otherwise founder defaults.',
    angle: 'analytics',
    hook: 'Your best next video is already hiding in the numbers.',
  },
  {
    title: 'The 15-second open that earns the next minute',
    why: 'Earned-attention framework — practical and rewatchable.',
    angle: 'script',
    hook: 'If second 15 fails, minute 2 never happens.',
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

  function buildSuggestionCards(ideas, { source, channelTitle }) {
    return ideas.map((idea, idx) => {
      const title = idea.title || idea.text;
      const startPath = `/marketing/session/new?seed_title=${encodeURIComponent(title)}&seed_angle=${encodeURIComponent(idea.angle || 'story')}`;
      return {
        id: `yt-idea-${idx + 1}`,
        rank: idx + 1,
        title,
        why: idea.why || idea.rationale || '',
        angle: idea.angle || 'story',
        hook: idea.hook || '',
        source,
        channelTitle: channelTitle || null,
        thumbnailUrl: thumbnailSvgDataUri({
          title,
          subtitle: channelTitle ? `${channelTitle} · researched` : 'Researched · ready to film',
        }),
        startUrl: startPath,
        studioUrl: `/creative/studio?title=${encodeURIComponent(title)}`,
      };
    });
  }

  async function getSuggestions(ownerId, { callCouncilMember } = {}) {
    const status = await getStatus(ownerId);
    let channelTitle = null;
    let recentTitles = [];
    let source = 'founder_defaults';

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
        const prompt = `You are a YouTube growth strategist for a founder-led channel.
Return ONLY a JSON array of exactly 5 objects with keys: title, why, angle, hook.
Channel: ${channelTitle || 'not connected yet'}
Recent titles: ${recentTitles.join(' | ') || 'none'}
Prefer specific, filmable ideas. No hashtags. English only.`;
        const raw = await callCouncilMember({
          role: 'gemini_flash',
          task: prompt,
          maxTokens: 900,
        });
        const text = typeof raw === 'string' ? raw : (raw?.text || raw?.content || '');
        const match = String(text).match(/\[[\s\S]*\]/);
        const parsed = match ? JSON.parse(match[0]) : null;
        if (Array.isArray(parsed) && parsed.length) {
          ideas = parsed.slice(0, 5).map((item, i) => ({
            title: item.title || item.text || FALLBACK_IDEAS[i].title,
            why: item.why || item.rationale || FALLBACK_IDEAS[i].why,
            angle: item.angle || FALLBACK_IDEAS[i].angle,
            hook: item.hook || FALLBACK_IDEAS[i].hook,
          }));
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
      suggestions: buildSuggestionCards(ideas, { source, channelTitle }),
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
