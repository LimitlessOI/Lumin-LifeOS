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

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function thumbnailOverlayWords(hook) {
  const words = String(hook || '')
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 3) return words.join(' ').toUpperCase() || 'WATCH THIS';
  return words.slice(0, 3).join(' ').toUpperCase();
}

function scoreCompetitiveThumbnail({ hook, hasFace, hasChannelBg, overlayText }) {
  let score = 38;
  const checks = [];
  if (hasFace) {
    score += 24;
    checks.push({ name: 'Founder face', pass: true, tip: 'Faces lift CTR ~20–40% in most niches.' });
  } else {
    checks.push({ name: 'Founder face', pass: false, tip: 'Connect YouTube or paste your channel URL so we use your face.' });
  }
  if (hasChannelBg) {
    score += 14;
    checks.push({ name: 'Real channel footage', pass: true, tip: 'Background pulled from your recent video — looks native in-feed.' });
  } else {
    checks.push({ name: 'Real channel footage', pass: false, tip: 'Enable YouTube Data API or add channel URL for real B-roll backgrounds.' });
  }
  const words = String(overlayText || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 4) {
    score += 16;
    checks.push({ name: 'Mobile-readable text', pass: true, tip: '3–4 bold words max — readable at phone size.' });
  } else {
    score += 6;
    checks.push({ name: 'Mobile-readable text', pass: false, tip: 'Trim overlay to 3 punchy words.' });
  }
  if (/(stop|secret|after|not|never|miss|alone|closed|data|trend)/i.test(hook || '')) {
    score += 8;
    checks.push({ name: 'Curiosity gap', pass: true, tip: 'Hook creates a reason to click without spoiling the video.' });
  } else {
    checks.push({ name: 'Curiosity gap', pass: false, tip: 'Add tension: what they miss, what happens after, what to stop.' });
  }
  score = Math.max(20, Math.min(96, score));
  const predictedCtrMin = Number((2.2 + score / 18).toFixed(1));
  const predictedCtrMax = Number((predictedCtrMin + 2.4 + (hasFace ? 1.2 : 0)).toFixed(1));
  const serpRank = score >= 82 ? 1 : score >= 70 ? 2 : score >= 55 ? 3 : 4;
  return {
    score,
    grade: score >= 85 ? 'A' : score >= 72 ? 'B+' : score >= 58 ? 'B' : 'C+',
    predictedCtr: `${predictedCtrMin}–${predictedCtrMax}%`,
    serpRank,
    serpLabel: serpRank === 1 ? 'Likely top of relevant shelf' : serpRank === 2 ? 'Competitive mid-shelf' : 'Needs a stronger open to beat niche thumbs',
    checks,
  };
}

async function fetchImageBuffer(url, timeoutMs = 8000) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 LifeOS-SocialMediaOS' },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800) return null;
    return buf;
  } catch {
    return null;
  }
}

async function composeCompetitiveThumbnail({
  title,
  hook,
  channelTitle,
  faceUrl,
  backgroundUrl,
  accent = '#F59E0B',
}) {
  const overlayText = thumbnailOverlayWords(hook);
  const hasFace = !!faceUrl;
  const hasChannelBg = !!backgroundUrl;
  const competition = scoreCompetitiveThumbnail({ hook, hasFace, hasChannelBg, overlayText });

  let sharpMod = null;
  try {
    sharpMod = (await import('sharp')).default;
  } catch {
    sharpMod = null;
  }

  if (!sharpMod) {
    return {
      thumbnailUrl: thumbnailSvgDataUri({ title, hook, subtitle: channelTitle || 'SocialMediaOS', accent }),
      overlayText,
      faceUrl: faceUrl || null,
      backgroundUrl: backgroundUrl || null,
      competition,
      composed: false,
    };
  }

  try {
    const W = 1280;
    const H = 720;
    const bgBuf = backgroundUrl ? await fetchImageBuffer(backgroundUrl) : null;
    const faceBuf = faceUrl ? await fetchImageBuffer(faceUrl) : null;

    let base;
    if (bgBuf) {
      base = await sharpMod(bgBuf).resize(W, H, { fit: 'cover', position: 'centre' }).modulate({ brightness: 0.72, saturation: 1.15 }).jpeg().toBuffer();
    } else {
      const svgBg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0c0c0b"/><stop offset="55%" stop-color="#1c1917"/><stop offset="100%" stop-color="${accent}"/>
        </linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>`;
      base = await sharpMod(Buffer.from(svgBg)).jpeg().toBuffer();
    }

    const layers = [{ input: base }];
    const veil = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><linearGradient id="v" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(0,0,0,0.72)"/><stop offset="55%" stop-color="rgba(0,0,0,0.35)"/><stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#v)"/>
    </svg>`);
    layers.push({ input: await sharpMod(veil).png().toBuffer() });

    if (faceBuf) {
      const faceSize = 420;
      const circleSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${faceSize}" height="${faceSize}">
        <circle cx="${faceSize / 2}" cy="${faceSize / 2}" r="${faceSize / 2}" fill="#fff"/>
      </svg>`);
      const rounded = await sharpMod(faceBuf)
        .resize(faceSize, faceSize, { fit: 'cover' })
        .composite([{ input: await sharpMod(circleSvg).png().toBuffer(), blend: 'dest-in' }])
        .png()
        .toBuffer();
      const ring = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${faceSize + 16}" height="${faceSize + 16}">
        <circle cx="${(faceSize + 16) / 2}" cy="${(faceSize + 16) / 2}" r="${faceSize / 2 + 4}" fill="none" stroke="${accent}" stroke-width="10"/>
      </svg>`);
      layers.push({ input: await sharpMod(ring).png().toBuffer(), left: W - faceSize - 70 - 8, top: H - faceSize - 90 - 8 });
      layers.push({ input: rounded, left: W - faceSize - 70, top: H - faceSize - 90 });
    }

    const line1 = escapeXml(overlayText.slice(0, 18));
    const line2 = escapeXml(overlayText.length > 18 ? overlayText.slice(18, 36) : '');
    const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <style>
        .t { font-family: Arial Black, Helvetica, sans-serif; font-weight: 900; fill: #fff; stroke: #111; stroke-width: 14px; paint-order: stroke; font-size: 96px; }
        .s { font-family: Arial, sans-serif; font-weight: 700; fill: ${accent}; font-size: 28px; letter-spacing: 3px; }
      </style>
      <text x="72" y="110" class="s">${escapeXml((channelTitle || 'SOCIALMEDIAOS').toUpperCase().slice(0, 28))}</text>
      <text x="72" y="320" class="t">${line1}</text>
      ${line2 ? `<text x="72" y="430" class="t">${line2}</text>` : ''}
      <rect x="72" y="520" width="220" height="10" fill="${accent}"/>
    </svg>`);
    layers.push({ input: await sharpMod(textSvg).png().toBuffer() });

    const out = await sharpMod(base)
      .composite(layers.slice(1))
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    return {
      thumbnailUrl: `data:image/jpeg;base64,${out.toString('base64')}`,
      overlayText,
      faceUrl: faceUrl || null,
      backgroundUrl: backgroundUrl || null,
      competition,
      composed: true,
    };
  } catch (err) {
    return {
      thumbnailUrl: thumbnailSvgDataUri({ title, hook, subtitle: channelTitle || 'SocialMediaOS', accent }),
      overlayText,
      faceUrl: faceUrl || null,
      backgroundUrl: backgroundUrl || null,
      competition,
      composed: false,
      composeError: err?.message || 'compose_failed',
    };
  }
}

function thumbnailSvgDataUri({ title, subtitle = 'SocialMediaOS', hook = '', accent = '#F59E0B' }) {
  const safeTitle = escapeXml(String(title || 'Video idea').slice(0, 72));
  const safeSub = escapeXml(String(subtitle).slice(0, 40));
  const safeHook = escapeXml(String(hook || '').slice(0, 90));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c0c0b"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <rect x="48" y="48" width="1184" height="624" rx="28" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.18)"/>
  <text x="96" y="140" fill="${accent}" font-family="Arial, sans-serif" font-size="30" font-weight="700">${safeSub}</text>
  <text x="96" y="250" fill="#ffffff" font-family="Arial, sans-serif" font-size="58" font-weight="700">
    <tspan x="96" dy="0">${safeTitle.slice(0, 32)}</tspan>
    <tspan x="96" dy="70">${safeTitle.slice(32, 64)}</tspan>
  </text>
  <text x="96" y="480" fill="#fde68a" font-family="Arial, sans-serif" font-size="34">
    <tspan x="96" dy="0">${safeHook.slice(0, 48)}</tspan>
    <tspan x="96" dy="44">${safeHook.slice(48, 90)}</tspan>
  </text>
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

function buildHooks(pack, fb) {
  const fromIdea = Array.isArray(pack.hooks) ? pack.hooks.map((h) => String(h || '').trim()).filter(Boolean) : [];
  if (fromIdea.length >= 3) return fromIdea.slice(0, 3);
  const primary = pack.hook || fb?.hook || '';
  const extras = (fb?.hooks || []).filter(Boolean);
  const out = [primary, ...fromIdea, ...extras].map((h) => String(h || '').trim()).filter(Boolean);
  const uniq = [];
  for (const h of out) {
    if (!uniq.some((x) => x.toLowerCase() === h.toLowerCase())) uniq.push(h);
  }
  while (uniq.length < 3 && primary) {
    const variants = [
      primary,
      primary.replace(/\.$/, '') + ' — and most people miss it.',
      'Stop scrolling if ' + primary.charAt(0).toLowerCase() + primary.slice(1),
    ];
    for (const v of variants) {
      if (uniq.length >= 3) break;
      if (!uniq.some((x) => x.toLowerCase() === v.toLowerCase())) uniq.push(v);
    }
    break;
  }
  return uniq.slice(0, 3);
}

const FILM_MODES = [
  { id: 'teleprompter', label: 'Teleprompter', blurb: 'Full script · sticky line · hold when you digress' },
  { id: 'bullets', label: 'Bullet coach', blurb: 'Talk the bullets · producer pushes specificity' },
  { id: 'bookends', label: 'Scripted bookends', blurb: 'Lock hook + exit · freestyle the middle' },
  { id: 'read_riff', label: 'Read & riff', blurb: 'Glance the line · say it in your words' },
  { id: 'story', label: 'Story-first', blurb: 'One lived story · then teaching + must-say' },
  { id: 'interview', label: 'Hot-seat', blurb: 'Coach asks · you answer · extract hooks' },
  { id: 'analytics', label: 'Analytics reverse', blurb: 'Film what your retention already proved' },
  { id: 'shorts', label: 'Shorts-first', blurb: 'One hook · one punch · one CTA' },
];

const FALLBACK_IDEAS = [
  {
    title: 'The follow-up most agents skip after closing',
    why: 'Retention + trust story; high comment potential for service businesses.',
    angle: 'story',
    hook: 'Closed is not the finish line.',
    hooks: [
      'Closed is not the finish line.',
      'Your client feels most alone the week AFTER closing.',
      'Closing day content is vanity. Presence after close is the business.',
    ],
    competitor_strong: 'Listing tours and closing-day highlight reels get easy views.',
    competitor_fail: 'Almost nobody teaches the post-close ritual with real client fears named.',
    film_mode: 'story',
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
    hooks: [
      'If it could be anyone\'s post, it shouldn\'t be yours.',
      'You can smell AI content in three seconds.',
      'No names. No numbers. No scars. That\'s the tell.',
    ],
    competitor_strong: 'Template packs and "post every day" systems feel productive.',
    competitor_fail: 'They never force a lived story from THIS week — so everything still sounds fake.',
    film_mode: 'read_riff',
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
    hooks: [
      'One video. One offer. One clear next step.',
      'Daily posting is burning you out and still not booking calls.',
      'If the video doesn\'t create a next step, it\'s expensive noise.',
    ],
    competitor_strong: 'Hustle channels win on posting volume and Shorts cadence.',
    competitor_fail: 'They never define "filled calendar" as the metric — views substitute for revenue.',
    film_mode: 'bookends',
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
    hooks: [
      'Your best next video is already hiding in the numbers.',
      'Forget the trend list — what held people past 30 seconds on YOUR channel?',
      'Your data beats someone else\'s trend every time.',
    ],
    competitor_strong: 'Trend-chasing Shorts and thumbnail advice feel current.',
    competitor_fail: 'They skip reverse-engineering YOUR retention graph into the next film.',
    film_mode: 'analytics',
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
    hooks: [
      'If second 15 fails, minute 2 never happens.',
      'Name the stuck point in the first breath — or lose them.',
      'A formula hook without your scar is still forgettable.',
    ],
    competitor_strong: 'Hook-formula channels teach structures that get clicks.',
    competitor_fail: 'They rarely pair open + lived proof + exit in the founder\'s real voice.',
    film_mode: 'teleprompter',
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

  async function loadPublicChannelAssets(channelUrl) {
    const url = String(channelUrl || '').trim();
    if (!url) return { videos: [], faceUrl: null, channelTitle: null };
    try {
      const handle = url.match(/youtube\.com\/@([\w.-]+)/i)?.[1]
        || url.match(/youtube\.com\/(?:c|user)\/([\w.-]+)/i)?.[1];
      const channelId = url.match(/youtube\.com\/channel\/(UC[\w-]+)/i)?.[1];
      let rssParam = channelId ? `channel_id=${channelId}` : null;
      let faceUrl = null;
      let channelTitle = null;
      if (!rssParam && handle) {
        const page = await fetch(`https://www.youtube.com/@${handle}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 LifeOS-SocialMediaOS' },
        });
        const html = await page.text();
        const idMatch = html.match(/"channelId":"(UC[\w-]+)"/) || html.match(/\/channel\/(UC[\w-]+)/);
        if (idMatch) rssParam = `channel_id=${idMatch[1]}`;
        const avatar = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (avatar) faceUrl = avatar[1];
        const title = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (title) channelTitle = title[1].replace(/ - YouTube$/i, '').trim();
      }
      if (!rssParam) return { videos: [], faceUrl, channelTitle };
      const rss = await fetch(`https://www.youtube.com/feeds/videos.xml?${rssParam}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 LifeOS-SocialMediaOS' },
      });
      const xml = await rss.text();
      const videos = [];
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      for (const entry of entries.slice(0, 8)) {
        const idMatch = entry.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/);
        const titleMatch = entry.match(/<media:title>([^<]*)<\/media:title>/);
        const thumbMatch = entry.match(/<media:thumbnail url="([^"]+)"/);
        if (idMatch) {
          videos.push({
            videoId: idMatch[1],
            title: titleMatch?.[1] || 'Video',
            thumbnail: thumbMatch?.[1] || `https://i3.ytimg.com/vi/${idMatch[1]}/hqdefault.jpg`,
          });
        }
      }
      if (!channelTitle) {
        const feedTitle = xml.match(/<title>([^<]+)<\/title>/);
        if (feedTitle) channelTitle = feedTitle[1];
      }
      return { videos, faceUrl, channelTitle };
    } catch (err) {
      logger?.warn?.({ err }, 'public youtube channel asset pull failed');
      return { videos: [], faceUrl: null, channelTitle: null };
    }
  }

  async function loadChannelVisualAssets(ownerId) {
    let faceUrl = null;
    let channelTitle = null;
    let videos = [];
    let apiError = null;
    let source = 'none';

    try {
      const channel = await getChannel(ownerId);
      if (channel.ok) {
        channelTitle = channel.channel?.title || null;
        faceUrl = channel.channel?.thumbnails?.high?.url
          || channel.channel?.thumbnails?.medium?.url
          || channel.channel?.thumbnails?.default?.url
          || null;
        source = 'youtube_api';
        const recent = await listRecentVideos(ownerId, 8);
        videos = recent.videos || [];
      } else {
        apiError = channel.error || 'channel_failed';
      }
    } catch (err) {
      apiError = err?.message || 'channel_exception';
    }

    let publicUrl = null;
    try {
      if (pool?.query) {
        const { rows } = await pool.query(
          `SELECT brand_voice_json FROM marketing_channel_profiles WHERE owner_id = $1 LIMIT 1`,
          [String(ownerId)]
        );
        const voice = rows[0]?.brand_voice_json;
        const parsed = typeof voice === 'string' ? JSON.parse(voice) : voice;
        publicUrl = parsed?.youtubeChannelUrl || parsed?.youtube_url || null;
        if (!faceUrl) faceUrl = parsed?.founderPhotoUrl || parsed?.avatarUrl || null;
      }
    } catch {
      /* ignore */
    }
    publicUrl = publicUrl || process.env.FOUNDER_YOUTUBE_URL || null;

    if ((!videos.length || !faceUrl) && publicUrl) {
      const pub = await loadPublicChannelAssets(publicUrl);
      if (!videos.length) videos = pub.videos || [];
      if (!faceUrl) faceUrl = pub.faceUrl;
      if (!channelTitle) channelTitle = pub.channelTitle;
      if (pub.videos?.length) source = source === 'youtube_api' ? 'youtube_api_plus_public' : 'public_channel';
    }

    return { faceUrl, channelTitle, videos, apiError, source, publicUrl };
  }

  async function buildSuggestionCards(ideas, { source, channelTitle, founderIntro, assets }) {
    const faceUrl = assets?.faceUrl || null;
    const videos = assets?.videos || [];
    const cards = [];
    for (let idx = 0; idx < ideas.length; idx++) {
      const idea = ideas[idx];
      const fb = FALLBACK_IDEAS[idx % FALLBACK_IDEAS.length];
      const title = idea.title || idea.text;
      const hook = idea.hook || '';
      const intro = idea.intro || founderIntro || DEFAULT_INTRO;
      const close = idea.close || DEFAULT_CLOSE;
      const talking_points = Array.isArray(idea.talking_points) && idea.talking_points.length
        ? idea.talking_points.slice(0, 5)
        : (fb.talking_points || []);
      const competitors = Array.isArray(idea.competitors) ? idea.competitors.slice(0, 4) : [];
      const competitor_gap = idea.competitor_gap || idea.competitor_context?.gap || '';
      const draft = {
        title,
        why: idea.why || idea.rationale || '',
        angle: idea.angle || 'story',
        hook,
        hooks: idea.hooks,
        intro,
        close,
        talking_points,
        competitors,
        competitor_gap,
        must_say: idea.must_say,
        sample_script: idea.sample_script,
        competitor_strong: idea.competitor_strong || fb.competitor_strong || '',
        competitor_fail: idea.competitor_fail || fb.competitor_fail || '',
        film_mode: idea.film_mode || fb.film_mode || 'teleprompter',
      };
      const hooks = buildHooks(draft, fb);
      const must_say = buildMustSay(draft);
      const selectedHook = hooks[0] || hook;
      const sample_script = buildSampleScript({ ...draft, hook: selectedHook, must_say });
      const bg = videos[idx % Math.max(videos.length, 1)]?.thumbnail || videos[0]?.thumbnail || null;
      const thumb = await composeCompetitiveThumbnail({
        title,
        hook: selectedHook,
        channelTitle: channelTitle || assets?.channelTitle,
        faceUrl,
        backgroundUrl: bg,
        accent: idx % 2 === 0 ? '#F59E0B' : '#EF4444',
      });
      const pack = {
        ...draft,
        hook: selectedHook,
        hooks,
        must_say,
        sample_script,
      };
      const seedPack = encodeSeedPack(pack);
      const startPath = `/marketing/session/new?seed_title=${encodeURIComponent(title)}&seed_angle=${encodeURIComponent(pack.angle)}&seed_pack=${encodeURIComponent(seedPack)}`;
      const serpCompetitors = (competitors.length ? competitors : ['Niche creator A', 'Niche creator B', 'Niche creator C'])
        .slice(0, 3)
        .map((name, i) => ({
          name,
          title: `${String(name).slice(0, 28)} — generic take`,
          score: Math.max(40, (thumb.competition?.score || 60) - 8 - i * 7),
        }));
      cards.push({
        id: `yt-idea-${idx + 1}`,
        rank: idx + 1,
        ...pack,
        source,
        channelTitle: channelTitle || assets?.channelTitle || null,
        thumbnailUrl: thumb.thumbnailUrl,
        thumbnailOverlay: thumb.overlayText,
        thumbnailFaceUrl: thumb.faceUrl,
        thumbnailBgUrl: thumb.backgroundUrl,
        thumbnailComposed: !!thumb.composed,
        competition: thumb.competition,
        serpPreview: {
          ourRank: thumb.competition?.serpRank || 3,
          label: thumb.competition?.serpLabel || '',
          competitors: serpCompetitors,
        },
        startUrl: startPath,
        studioUrl: `/creative/studio?title=${encodeURIComponent(title)}`,
      });
    }
    return cards;
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
    const assets = await loadChannelVisualAssets(ownerId);
    channelTitle = assets.channelTitle || null;
    recentTitles = (assets.videos || []).map((v) => v.title).filter(Boolean);
    if (assets.source && assets.source !== 'none') {
      source = assets.source === 'public_channel' ? 'public_channel_assets' : 'youtube_analytics_plus_channel';
    }

    let ideas = FALLBACK_IDEAS;
    if (typeof callCouncilMember === 'function') {
      try {
        const prompt = `You are a YouTube producer for a founder who hates AI-sounding scripts.
Return ONLY a JSON array of exactly 5 talk cards. Each object MUST have:
title, why, angle, hook, hooks (array of EXACTLY 3 distinct spoken openers — best you can invent; hook = hooks[0]),
intro, talking_points (array of 3 short spoken bullets), close,
competitors (array of 2 competing channel types), competitor_gap,
competitor_strong (one sentence: what those competitors do well),
competitor_fail (one sentence: what they fail to give that we will),
must_say (array of 2–3 non-negotiable lines),
film_mode (one of: teleprompter, bullets, bookends, read_riff, story, interview, analytics, shorts),
sample_script (array of 8–14 short teleprompter lines; include numbers/details when needed).

Rules:
- Sound human. No hashtags. No corporate fluff. Specific > generic.
- hooks = three DIFFERENT first lines on camera (under 16 words each). Make them the best opens you can.
- intro = how THIS founder opens — use: ${JSON.stringify(founderIntro)}
- Research competitors relative to channel: ${channelTitle || 'founder-led business channel'}
- Recent titles: ${recentTitles.join(' | ') || 'none yet'}
Prefer filmable ideas that beat competitors by lived specificity.`;
        const raw = await callCouncilMember('gemini_flash', prompt, { maxTokens: 3600 });
        const text = typeof raw === 'string' ? raw : (raw?.text || raw?.content || '');
        const match = String(text).match(/\[[\s\S]*\]/);
        const parsed = match ? JSON.parse(match[0]) : null;
        if (Array.isArray(parsed) && parsed.length) {
          ideas = parsed.slice(0, 5).map((item, i) => {
            const fb = FALLBACK_IDEAS[i % FALLBACK_IDEAS.length];
            const hooks = buildHooks({ hook: item.hook || fb.hook, hooks: item.hooks }, fb);
            return {
              title: item.title || item.text || fb.title,
              why: item.why || item.rationale || fb.why,
              angle: item.angle || fb.angle,
              hook: hooks[0] || item.hook || fb.hook,
              hooks,
              intro: item.intro || founderIntro || fb.intro,
              close: item.close || fb.close,
              talking_points: Array.isArray(item.talking_points) && item.talking_points.length
                ? item.talking_points
                : fb.talking_points,
              competitors: Array.isArray(item.competitors) ? item.competitors : fb.competitors,
              competitor_gap: item.competitor_gap || item.competitor_context?.gap || fb.competitor_gap,
              competitor_strong: item.competitor_strong || fb.competitor_strong,
              competitor_fail: item.competitor_fail || fb.competitor_fail,
              film_mode: item.film_mode || fb.film_mode,
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

    const suggestions = await buildSuggestionCards(ideas, {
      source,
      channelTitle,
      founderIntro,
      assets,
    });

    return {
      ok: true,
      connected: !!status.connected,
      oauthConfigured: !!status.oauthConfigured,
      source,
      youtubeApiError: assets.apiError || null,
      youtubeApiNext: assets.apiError && /youtube\.googleapis\.com|has not been used|disabled/i.test(String(assets.apiError))
        ? 'Enable YouTube Data API v3 on the Google Cloud project, then Refresh ideas. Or paste your public channel URL below to pull thumbs without the API.'
        : null,
      channelVisuals: {
        faceUrl: assets.faceUrl || null,
        videoCount: (assets.videos || []).length,
        assetSource: assets.source,
        publicUrl: assets.publicUrl || null,
      },
      filmModes: FILM_MODES,
      suggestions,
    };
  }

  async function saveChannelUrl(ownerId, channelUrl) {
    if (!pool?.query) return { ok: false, error: 'pool_required' };
    const url = String(channelUrl || '').trim();
    if (!url) return { ok: false, error: 'channel_url_required' };
    const owner = String(ownerId || 'adam');
    try {
      const { rows } = await pool.query(
        `SELECT brand_voice_json FROM marketing_channel_profiles WHERE owner_id = $1 LIMIT 1`,
        [owner]
      );
      const prev = rows[0]?.brand_voice_json;
      const parsed = typeof prev === 'string' ? JSON.parse(prev || '{}') : (prev || {});
      const next = { ...parsed, youtubeChannelUrl: url };
      if (rows[0]) {
        await pool.query(
          `UPDATE marketing_channel_profiles SET brand_voice_json = $1, updated_at = NOW() WHERE owner_id = $2`,
          [JSON.stringify(next), owner]
        );
      } else {
        await pool.query(
          `INSERT INTO marketing_channel_profiles (owner_id, brand_voice_json) VALUES ($1, $2)`,
          [owner, JSON.stringify(next)]
        );
      }
      return { ok: true, youtubeChannelUrl: url };
    } catch (err) {
      return { ok: false, error: err?.message || 'save_failed' };
    }
  }

  return {
    getAuthUrl,
    handleCallback,
    getAuthedClient,
    getStatus,
    getChannel,
    listRecentVideos,
    getSuggestions,
    saveChannelUrl,
    filmModes: FILM_MODES,
  };
}

export default createYouTubeService;
