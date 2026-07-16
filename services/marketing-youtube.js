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

function extractJsonArray(text) {
  let raw = String(text || '').trim();
  if (!raw) return null;
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  let slice = raw.slice(start, end + 1);
  const attempts = [
    slice,
    slice.replace(/,\s*([}\]])/g, '$1'),
    slice.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'),
    slice.replace(/,\s*([}\]])/g, '$1').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'),
  ];
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* try next */
    }
  }
  const objs = [];
  let depth = 0;
  let buf = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (inStr) {
      buf += ch;
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      buf += ch;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) buf = '{';
      else buf += ch;
      depth += 1;
      continue;
    }
    if (ch === '}') {
      buf += ch;
      depth -= 1;
      if (depth === 0 && buf) {
        try {
          const obj = JSON.parse(buf.replace(/,\s*}/g, '}'));
          if (obj && (obj.title || obj.seed_topic_id)) objs.push(obj);
        } catch {
          /* skip */
        }
        buf = '';
      }
      continue;
    }
    if (depth > 0) buf += ch;
  }
  return objs.length ? objs : null;
}

function thumbnailOverlayWords(titleOrHook, { maxWords = 5 } = {}) {
  const words = String(titleOrHook || '')
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !/^(the|a|an|to|for|of|in|on|and|or|vs|versus)$/i.test(w));
  if (!words.length) return 'MOVING HERE?';
  if (words.length <= maxWords) return words.join(' ').toUpperCase();
  return words.slice(0, maxWords).join(' ').toUpperCase();
}

function titleDedupeKey(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|to|for|of|in|on|and|or|vs|versus)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
}

function distinctTitleForDuplicate(idea, idx, count) {
  const seed = String(idea?.seed_topic_id || '').replace(/_/g, ' ').trim();
  const must = Array.isArray(idea?.must_say) && idea.must_say[0]
    ? String(idea.must_say[0]).replace(/[^\w\s]/g, ' ').trim().slice(0, 36)
    : '';
  const mode = String(idea?.film_mode || '').replace(/_/g, ' ').trim();
  const market = String(idea?.market || idea?.research_basis?.market || '').trim();
  const variants = [
    must,
    seed ? `${seed} — what locals skip` : '',
    market ? `${market}: costly first-week mistakes` : '',
    mode ? `${mode} cut: the line that earns the DM` : '',
    `Angle ${count}: ${String(idea?.competitor_gap || idea?.why || 'lead-intent take').slice(0, 42)}`,
  ].map((t) => String(t || '').replace(/\s+/g, ' ').trim()).filter((t) => t.length >= 12);
  return (variants[idx % variants.length] || `Talk card ${idx + 1}`).slice(0, 90);
}

function dedupeSuggestionTitles(ideas = []) {
  const seen = new Map();
  return (ideas || []).map((idea, idx) => {
    const base = String(idea?.title || idea?.text || `Idea ${idx + 1}`).trim() || `Idea ${idx + 1}`;
    const key = titleDedupeKey(base) || `idea-${idx}`;
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    if (count === 1) return { ...idea, title: base.replace(/\s*\([^)]*\)\s*$/, '').trim() || base };
    return {
      ...idea,
      title: distinctTitleForDuplicate({ ...idea, title: base }, idx, count),
    };
  });
}

function defaultClickPsychology(idea = {}) {
  if (idea?.click_psychology && String(idea.click_psychology).trim()) return idea.click_psychology;
  const title = String(idea.title || '').trim();
  const gap = String(idea.competitor_gap || '').trim();
  return [
    title ? `Curiosity gap: ${title.slice(0, 70)}` : 'Curiosity gap: specific outcome vs vague advice',
    gap ? `Shelf gap: ${gap.slice(0, 90)}` : 'Specificity beats generic competitor titles',
    'CTA is a conversation (DM/call), not a vanity view',
  ].join(' · ');
}

/** Click psychology layouts — overlay words always come from researched title (not truncated hook). */
function buildThumbnailPunch({ title, angle, idx = 0, market = '' }) {
  const titleWords = thumbnailOverlayWords(title, { maxWords: 5 });
  const parts = titleWords.split(/\s+/).filter(Boolean);
  const mid = Math.max(1, Math.ceil(parts.length / 2));
  const fromTitle = {
    line1: parts.slice(0, mid).join(' ') || 'WATCH THIS',
    line2: parts.slice(mid).join(' ') || '',
  };
  const layouts = ['face_right', 'face_left', 'banner_top', 'big_type', 'split_half'];
  const accents = ['#F59E0B', '#EF4444', '#14B8A6', '#3B82F6', '#E2E8F0'];
  return {
    ...fromTitle,
    overlayText: titleWords,
    layoutId: layouts[idx % layouts.length],
    accent: accents[idx % accents.length],
    angle: angle || '',
    market: market || '',
  };
}

function scoreCompetitiveThumbnail({
  title,
  overlayText,
  hasFace,
  researched,
  leadIntentScore = 0,
  competitorCount = 0,
  layoutDistinct = false,
}) {
  let score = 32;
  const checks = [];
  if (hasFace) {
    score += 26;
    checks.push({ name: 'Founder face readable', pass: true, tip: 'Large face + expression beats random B-roll in-feed.' });
  } else {
    checks.push({ name: 'Founder face readable', pass: false, tip: 'Connect YouTube or set founder photo so the face is the hero.' });
  }
  const words = String(overlayText || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 6) {
    score += 18;
    checks.push({ name: 'Click-trigger text', pass: true, tip: 'Punchy words that create curiosity/stakes in under 1 second.' });
  } else {
    score += 4;
    checks.push({ name: 'Click-trigger text', pass: false, tip: 'Overlay must create a reason to click — not a title dump.' });
  }
  if (researched) {
    score += 12;
    checks.push({ name: 'Researched angle', pass: true, tip: 'Title filled a gap or rides a velocity outlier from real YouTube results.' });
  } else {
    checks.push({ name: 'Researched angle', pass: false, tip: 'Connect YouTube Data API so we search competitors before writing.' });
  }
  if (layoutDistinct) {
    score += 8;
    checks.push({ name: 'Distinct layout', pass: true, tip: 'Each card uses a different composition so the shelf does not look templated.' });
  } else {
    checks.push({ name: 'Distinct layout', pass: false, tip: 'Vary face side, type size, and accent so thumbs do not clone each other.' });
  }
  if (competitorCount >= 2) {
    score += 8;
    checks.push({ name: 'Real competitor shelf', pass: true, tip: 'Shelf preview uses live competitor thumbnails, not placeholders.' });
  } else {
    checks.push({ name: 'Real competitor shelf', pass: false, tip: 'Need search results to show who you are beating.' });
  }
  if (leadIntentScore >= 60) {
    score += 8;
    checks.push({ name: 'Lead-intent topic', pass: true, tip: 'Optimized for reach-outs / booked conversations — not vanity views.' });
  } else {
    checks.push({ name: 'Lead-intent topic', pass: false, tip: 'Prefer relocation / buyer-consideration angles that make people message you.' });
  }
  if (/(relocat|moving|vs |versus|cost of living|neighborhood|school|compare)/i.test(title || '')) {
    score += 6;
  }
  score = Math.max(20, Math.min(96, score));
  const predictedCtrMin = Number((2.0 + score / 20).toFixed(1));
  const predictedCtrMax = Number((predictedCtrMin + 2.2 + (hasFace ? 1.0 : 0)).toFixed(1));
  const serpRank = score >= 80 ? 1 : score >= 68 ? 2 : score >= 52 ? 3 : 4;
  return {
    score,
    grade: score >= 84 ? 'A' : score >= 70 ? 'B+' : score >= 55 ? 'B' : 'C+',
    predictedCtr: `${predictedCtrMin}–${predictedCtrMax}%`,
    serpRank,
    serpLabel: serpRank === 1
      ? 'Designed to interrupt the shelf'
      : serpRank === 2
        ? 'Competitive mid-shelf — sharpen the click trigger'
        : 'Needs stronger curiosity + face contrast',
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

async function tryIdeogramThumbnail({ title, overlay, market = '', angle = '', cardIndex = 0 }) {
  try {
    const { default: runGraphicDesign, getReplicateApiToken } = await import('./creative-engine/modes/graphic-design.js');
    if (!getReplicateApiToken()) return null;

    const punch = String(overlay || title || '').trim().slice(0, 48);
    const prompt = [
      'YouTube thumbnail, 16:9, ultra high contrast, bold readable text only:',
      `"${punch}"`,
      market ? `Market: ${market}.` : '',
      angle ? `Angle: ${angle}.` : '',
      'Professional realtor/creator style, face-friendly negative space on one side,',
      'no watermark, no tiny text, no clutter, designed to beat the shelf.',
      `Variant ${Number(cardIndex) + 1}.`,
    ].filter(Boolean).join(' ');

    const out = await Promise.race([
      runGraphicDesign({
        job: {
          request_json: { prompt, assetType: 'thumbnail', aspectRatio: '16:9' },
          owner_id: 'marketing-youtube',
        },
      }),
      // Keep under Railway edge budget when 5 cards run in parallel.
      new Promise((resolve) => setTimeout(() => resolve({ ok: false, error: 'timeout' }), 8000)),
    ]);

    if (!out?.ok || !out.publicUrl) return null;
    return { thumbnailUrl: out.publicUrl, model: out.model || 'ideogram-ai/ideogram-v3-turbo' };
  } catch {
    return null;
  }
}

async function composeCompetitiveThumbnail({
  title,
  hook,
  channelTitle,
  faceUrl,
  accent,
  researched = false,
  leadIntentScore = 0,
  competitorCount = 0,
  cardIndex = 0,
  market = '',
  angle = '',
  fast = false,
}) {
  const punch = buildThumbnailPunch({ title, angle, idx: cardIndex, market });
  const useAccent = accent || punch.accent;
  // Plan: 3–5 word TITLE overlay from researched title — never truncated spoken hook.
  const overlayText = thumbnailOverlayWords(title || punch.overlayText || hook, { maxWords: 5 });
  const hasFace = !!faceUrl;
  const competition = scoreCompetitiveThumbnail({
    title,
    overlayText,
    hasFace,
    researched,
    leadIntentScore,
    competitorCount,
    layoutDistinct: true,
  });

  // Fast path: SVG only — avoids Sharp JPEG base64 payloads (~100KB+/card) that blow edge budgets.
  if (fast) {
    return {
      thumbnailUrl: thumbnailSvgDataUri({ title, hook: overlayText, subtitle: channelTitle || 'SocialMediaOS', accent: useAccent }),
      overlayText,
      layoutId: punch.layoutId,
      faceUrl: faceUrl || null,
      backgroundUrl: null,
      competition,
      composed: false,
      thumbnailSource: 'svg_fast',
    };
  }

  let sharpMod = null;
  try {
    sharpMod = (await import('sharp')).default;
  } catch {
    sharpMod = null;
  }

  if (!sharpMod) {
    return {
      thumbnailUrl: thumbnailSvgDataUri({ title, hook: overlayText, subtitle: channelTitle || 'SocialMediaOS', accent: useAccent }),
      overlayText,
      layoutId: punch.layoutId,
      faceUrl: faceUrl || null,
      backgroundUrl: null,
      competition,
      composed: false,
    };
  }

  try {
    const W = 1280;
    const H = 720;
    const layout = punch.layoutId;
    const faceBuf = faceUrl ? await fetchImageBuffer(faceUrl) : null;

    const bgColors = {
      face_right: ['#0a0a09', '#1c1917', useAccent],
      face_left: ['#111827', '#0f172a', useAccent],
      banner_top: ['#020617', '#0c0a09', useAccent],
      big_type: ['#000000', '#171717', useAccent],
      split_half: ['#0c0a09', '#1e1b16', useAccent],
    };
    const [c0, c1, c2] = bgColors[layout] || bgColors.face_right;

    let base;
    if (faceBuf && layout === 'split_half') {
      const left = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c0}"/><stop offset="100%" stop-color="${c1}"/>
        </linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>`);
      base = await sharpMod(Buffer.from(left)).jpeg().toBuffer();
      const rightFace = await sharpMod(faceBuf)
        .resize(Math.round(W * 0.52), H, { fit: 'cover', position: 'centre' })
        .modulate({ brightness: 0.92, saturation: 1.1 })
        .jpeg()
        .toBuffer();
      base = await sharpMod(base)
        .composite([{ input: rightFace, left: Math.round(W * 0.48), top: 0 }])
        .jpeg()
        .toBuffer();
    } else if (faceBuf && (layout === 'banner_top' || layout === 'big_type')) {
      base = await sharpMod(faceBuf)
        .resize(W, H, { fit: 'cover', position: 'centre' })
        .modulate({ brightness: layout === 'big_type' ? 0.38 : 0.5, saturation: 0.9 })
        .blur(layout === 'big_type' ? 2 : 18)
        .jpeg()
        .toBuffer();
    } else if (faceBuf) {
      base = await sharpMod(faceBuf)
        .resize(W, H, { fit: 'cover', position: 'centre' })
        .blur(32)
        .modulate({ brightness: 0.4, saturation: 0.8 })
        .jpeg()
        .toBuffer();
    } else {
      const svgBg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c0}"/><stop offset="55%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
        </linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>`;
      base = await sharpMod(Buffer.from(svgBg)).jpeg().toBuffer();
    }

    const layers = [];
    if (layout !== 'split_half') {
      const [x1, y1, x2, y2] = layout === 'face_left'
        ? [1, 0, 0, 0]
        : layout === 'banner_top'
          ? [0, 0, 0, 1]
          : [0, 0, 1, 0];
      const veil = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs><linearGradient id="v" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
          <stop offset="0%" stop-color="rgba(0,0,0,0.82)"/><stop offset="55%" stop-color="rgba(0,0,0,0.4)"/><stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
        </linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#v)"/>
      </svg>`);
      layers.push({ input: await sharpMod(veil).png().toBuffer() });
    } else {
      const veil = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <rect x="0" y="0" width="${Math.round(W * 0.52)}" height="${H}" fill="rgba(0,0,0,0.35)"/>
      </svg>`);
      layers.push({ input: await sharpMod(veil).png().toBuffer() });
    }

    if (faceBuf && layout !== 'split_half' && layout !== 'banner_top') {
      const faceSize = layout === 'big_type' ? 360 : layout === 'face_left' ? 500 : 520;
      const circleSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${faceSize}" height="${faceSize}">
        <circle cx="${faceSize / 2}" cy="${faceSize / 2}" r="${faceSize / 2}" fill="#fff"/>
      </svg>`);
      const rounded = await sharpMod(faceBuf)
        .resize(faceSize, faceSize, { fit: 'cover', position: 'centre' })
        .composite([{ input: await sharpMod(circleSvg).png().toBuffer(), blend: 'dest-in' }])
        .png()
        .toBuffer();
      const ring = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${faceSize + 22}" height="${faceSize + 22}">
        <circle cx="${(faceSize + 22) / 2}" cy="${(faceSize + 22) / 2}" r="${faceSize / 2 + 5}" fill="none" stroke="${useAccent}" stroke-width="14"/>
      </svg>`);
      const left = layout === 'face_left' ? 40 : W - faceSize - 40;
      const top = layout === 'big_type' ? H - faceSize - 40 : Math.round((H - faceSize) / 2) + 20;
      layers.push({ input: await sharpMod(ring).png().toBuffer(), left: left - 11, top: top - 11 });
      layers.push({ input: rounded, left, top });
    }

    const overlayParts = overlayText.split(/\s+/).filter(Boolean);
    const splitAt = Math.max(1, Math.ceil(overlayParts.length / 2));
    const line1 = escapeXml(overlayParts.slice(0, splitAt).join(' ') || punch.line1 || 'WATCH');
    const line2 = escapeXml(overlayParts.slice(splitAt).join(' ') || punch.line2 || '');
    const fontSize = layout === 'big_type' ? 118 : layout === 'banner_top' ? 100 : 88;
    const textX = layout === 'face_left' ? 560 : 56;
    const textY1 = layout === 'banner_top' ? 160 : layout === 'big_type' ? 220 : 280;
    const textY2 = textY1 + Math.round(fontSize * 1.15);
    const textW = layout === 'face_left' ? 660 : layout === 'split_half' ? 580 : 700;
    const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <style>
        .t { font-family: Arial Black, Helvetica, sans-serif; font-weight: 900; fill: #fff; stroke: #000; stroke-width: ${layout === 'big_type' ? 18 : 14}px; paint-order: stroke; font-size: ${fontSize}px; }
        .a { font-family: Arial Black, Helvetica, sans-serif; font-weight: 900; fill: ${useAccent}; stroke: #000; stroke-width: ${layout === 'big_type' ? 18 : 14}px; paint-order: stroke; font-size: ${fontSize}px; }
        .s { font-family: Arial, sans-serif; font-weight: 700; fill: ${useAccent}; font-size: 24px; letter-spacing: 2px; }
      </style>
      ${layout === 'banner_top' ? `<rect x="0" y="0" width="${W}" height="210" fill="rgba(0,0,0,0.72)"/>` : ''}
      <text x="${textX}" y="${layout === 'banner_top' ? 48 : 72}" class="s">${escapeXml((channelTitle || 'SOCIALMEDIAOS').toUpperCase().slice(0, 28))}</text>
      <text x="${textX}" y="${textY1}" class="t">${line1}</text>
      ${line2 ? `<text x="${textX}" y="${textY2}" class="a">${line2}</text>` : ''}
      <rect x="${textX}" y="${Math.min(H - 80, textY2 + 40)}" width="${Math.min(280, textW)}" height="14" fill="${useAccent}"/>
    </svg>`);
    layers.push({ input: await sharpMod(textSvg).png().toBuffer() });

    const out = await sharpMod(base)
      .composite(layers)
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    return {
      thumbnailUrl: `data:image/jpeg;base64,${out.toString('base64')}`,
      overlayText,
      layoutId: layout,
      faceUrl: faceUrl || null,
      backgroundUrl: null,
      competition,
      composed: true,
    };
  } catch (err) {
    return {
      thumbnailUrl: thumbnailSvgDataUri({ title, hook: overlayText, subtitle: channelTitle || 'SocialMediaOS', accent: useAccent }),
      overlayText,
      layoutId: punch.layoutId,
      faceUrl: faceUrl || null,
      backgroundUrl: null,
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

function normalizeBeatLines(lines) {
  if (Array.isArray(lines)) return lines.map((l) => String(l || '').trim()).filter(Boolean);
  if (typeof lines === 'string' && lines.trim()) {
    return lines.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  }
  return [];
}

function buildEarnedAttentionBeats(pack) {
  const hook = String(pack.hook || '').trim();
  const intro = String(pack.intro || DEFAULT_INTRO).trim();
  const points = (pack.talking_points || []).map((p) => String(p || '').trim()).filter(Boolean);
  const musts = (pack.must_say || []).map((m) => String(m || '').trim()).filter(Boolean);
  const gap = String(pack.competitor_gap || pack.competitor_fail || '').trim();
  const close = String(pack.close || DEFAULT_CLOSE).trim();
  const earn = (promise) => `Stay for this: ${promise}`;

  const beats = [
    {
      range: '0–10s',
      job: 'Interrupt + name the stuck person. Earn the next 10 seconds.',
      lines: [
        hook || 'If you are deciding whether to move — stop scrolling.',
        earn('I will tell you what the pretty videos skip.'),
      ],
    },
    {
      range: '10–20s',
      job: 'Prove you are talking to THEM. Earn the next 10 seconds.',
      lines: [
        intro,
        'This is for people seriously considering a move — not locals browsing listings for fun.',
        earn('The first tradeoff most people get wrong.'),
      ],
    },
    {
      range: '20–30s',
      job: 'Deliver first concrete value. Earn the next 30 seconds.',
      lines: [
        points[0] || 'Here is the first thing relocators overestimate.',
        earn('What that means for your timeline and money.'),
      ],
    },
    {
      range: '30–60s',
      job: 'Deepen with lived specificity. Earn the next 1–2 minutes.',
      lines: [
        points[1] || 'Week-one reality beats brochure reality.',
        points[2] || 'Here is how I help people decide without regret.',
        musts[0] ? `Must say: ${musts[0]}` : null,
        earn('The gap the other channels will not fill.'),
      ].filter(Boolean),
    },
    {
      range: '1–2min',
      job: 'Gap vs competition + trust. Earn the rest.',
      lines: [
        gap ? `What other videos skip: ${gap}` : 'Other videos dump stats. They rarely help you decide.',
        musts[1] ? `Must say: ${musts[1]}` : null,
        earn('A clear next step if you are serious.'),
      ].filter(Boolean),
    },
    {
      range: 'close',
      job: 'Payoff + lead CTA (reach-outs, not vanity).',
      lines: [
        musts[2] || musts[0] || 'If this matched your situation, do not leave with zero next step.',
        close,
      ],
    },
  ];
  return beats;
}

function normalizeRetentionBeats(beats, pack) {
  if (!Array.isArray(beats) || !beats.length) return buildEarnedAttentionBeats(pack);
  return beats.map((b) => ({
    range: String(b?.range || '').trim() || 'beat',
    job: String(b?.job || '').trim(),
    lines: normalizeBeatLines(b?.lines),
  })).filter((b) => b.lines.length);
}

function buildSampleScript(pack) {
  const beats = normalizeRetentionBeats(pack.retention_beats, pack);
  const fromBeats = beats.flatMap((b) => normalizeBeatLines(b.lines));
  if (fromBeats.length >= 6) return fromBeats;
  const existing = normalizeScriptLines(pack.sample_script);
  if (existing.length >= 8) return existing;
  return fromBeats.filter(Boolean);
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

function defaultMarketFromVoice(brandVoice, channelTitle) {
  const blob = `${brandVoice?.market || ''} ${brandVoice?.geo || ''} ${brandVoice?.city || ''} ${channelTitle || ''}`.toLowerCase();
  if (/vegas|henderson|summerlin/.test(blob)) return 'Las Vegas';
  if (/phoenix|scottsdale/.test(blob)) return 'Phoenix';
  if (/austin/.test(blob)) return 'Austin';
  if (/tampa|orlando|miami/.test(blob)) return 'Florida';
  return brandVoice?.market || 'Las Vegas';
}

function resolveNichePlaybook({ ownerId, channelTitle, brandVoice } = {}) {
  const blob = `${channelTitle || ''} ${brandVoice?.niche || ''} ${brandVoice?.industry || ''} ${brandVoice?.vertical || ''}`.toLowerCase();
  const market = defaultMarketFromVoice(brandVoice, channelTitle);
  const isInsurance = /insurance|agent.?of.?record|policy|medicare|life insurance/.test(blob);
  const isRealtor = /realtor|real.?estate|homes? for sale|listing|broker|homes/.test(blob)
    || String(ownerId || '').toLowerCase() === 'adam'
    || /adam hopkins/.test(blob);

  if (isInsurance && !isRealtor) {
    return {
      id: 'insurance_leads',
      label: 'Insurance · Trust + claim-moment leads',
      primary_outcome: 'leads',
      market,
      seed_topics: [
        { id: 'claim_moment', query: `${market} insurance claim what to do first`, angle: 'claim_first_48h', lead_weight: 95 },
        { id: 'rate_shock', query: `why ${market} insurance rates went up explained`, angle: 'rate_truth', lead_weight: 88 },
        { id: 'compare_cover', query: `${market} home insurance what is actually covered`, angle: 'coverage_gap', lead_weight: 84 },
        { id: 'life_stage', query: `first time homeowner insurance mistakes ${market}`, angle: 'life_stage', lead_weight: 78 },
      ],
      avoid_topics: ['day in the life insurance agent', 'motivational Monday'],
    };
  }

  if (isRealtor) {
    return {
      id: 'realtor_relocation',
      label: 'Realtor · Relocation first → buyer intel',
      primary_outcome: 'leads',
      market,
      seed_topics: [
        {
          id: 'relocate_here',
          query: `relocating to ${market} cost of living what to know`,
          angle: 'relocation',
          lead_weight: 98,
          title_template: `Moving to ${market}? What Locals Won't Tell You`,
        },
        {
          id: 'vs_california',
          query: `${market} vs California cost of living moving`,
          angle: 'origin_compare',
          lead_weight: 94,
          title_template: `${market} vs California: What You Actually Get`,
        },
        {
          id: 'metro_compare',
          query: `${market} vs Phoenix vs Las Vegas moving pros cons`,
          angle: 'metro_compare',
          lead_weight: 90,
          title_template: market === 'Las Vegas'
            ? 'Phoenix vs Las Vegas: Which Move Wins in 2026?'
            : `${market} vs Las Vegas vs Phoenix — Honest Pros & Cons`,
        },
        {
          id: 'neighborhoods',
          query: `best neighborhoods in ${market} for families relocating`,
          angle: 'neighborhoods',
          lead_weight: 86,
          title_template: `Best ${market} Neighborhoods If You're Relocating`,
        },
        {
          id: 'schools',
          query: `${market} best school districts for families moving`,
          angle: 'schools',
          lead_weight: 82,
          title_template: `${market} Schools: What Relocating Families Ask First`,
        },
      ],
      avoid_topics: [
        'day in the life of a realtor',
        'just closed another one',
        'grindset agent motivation',
        'best camera for listing videos',
      ],
    };
  }

  return {
    id: 'founder_leads',
    label: 'Founder · Offer-led authority',
    primary_outcome: 'leads',
    market,
    seed_topics: [
      { id: 'offer_clear', query: `${channelTitle || 'founder'} how I get clients without ads`, angle: 'offer', lead_weight: 88 },
      { id: 'objection', query: `${channelTitle || 'business'} biggest mistake before hiring`, angle: 'objection', lead_weight: 84 },
      { id: 'process', query: `${channelTitle || 'service'} what happens in the first 30 days`, angle: 'process', lead_weight: 80 },
      { id: 'proof', query: `${channelTitle || 'business'} client results case study`, angle: 'proof', lead_weight: 78 },
    ],
    avoid_topics: ['AI content tips', 'post every day hustle'],
  };
}

function leadIntentScoreForIdea(idea, playbook) {
  let score = Number(idea.lead_weight) || 40;
  const blob = `${idea.title || ''} ${idea.angle || ''} ${(idea.talking_points || []).join(' ')}`.toLowerCase();
  if (playbook?.id === 'realtor_relocation') {
    if (/relocat|moving to|moving from|vs california|vs phoenix|vs las vegas|cost of living/.test(blob)) score += 20;
    if (/neighborhood|school|commute|family/.test(blob)) score += 10;
    if (/day in the life|just closed|grind|motivation/.test(blob)) score -= 35;
  }
  if (playbook?.primary_outcome === 'leads' && /reach out|message me|book|call|dm|consult/.test(blob)) score += 8;
  return Math.max(0, Math.min(100, score));
}

function buildPlaybookFallbackIdeas(playbook, founderIntro = DEFAULT_INTRO) {
  const market = playbook.market || 'Las Vegas';
  const close = 'If you\'re seriously considering a move, comment MOVE or message me — I\'ll help you figure out the next honest step.';
  if (playbook.id === 'realtor_relocation') {
    return [
      {
        title: `Moving to ${market}? What Locals Won't Tell You`,
        why: 'Relocation seekers convert to conversations faster than vanity listing content.',
        angle: 'relocation',
        lead_weight: 98,
        seed_topic_id: 'relocate_here',
        hook: `If you're researching ${market} from out of state, watch this before you book a flight.`,
        hooks: [
          `If you're researching ${market} from out of state, watch this before you book a flight.`,
          `Relocating to ${market} in this market? Here's what the highlight reels skip.`,
          `Cost of living videos won't tell you how ${market} actually feels week one.`,
        ],
        competitor_strong: 'City overview and COL listicles get easy search traffic.',
        competitor_fail: 'They rarely give lived tradeoffs + a clear next step with a local who answers.',
        film_mode: 'teleprompter',
        competitor_gap: 'Most "moving to" videos dump stats; few name the surprises that make people message a realtor.',
        competitors: [],
        talking_points: [
          `What people moving to ${market} overestimate vs underestimate right now`,
          'The week-one surprises (housing, pace, heat/traffic, community) that change plans',
          'How to decide if a scouting trip is worth it — and what to do on day one',
        ],
        must_say: [
          'Say who this is for: people considering a move, not locals browsing listings',
          'Name one tradeoff tourists never hear',
          'Give a clear reach-out CTA (comment/message) — leads, not vanity views',
        ],
        sample_script: [
          `If you're researching ${market} from out of state, watch this before you book a flight.`,
          founderIntro,
          `Most "moving to ${market}" videos are a stats dump. Useful — incomplete.`,
          'Here\'s what locals won\'t put in a thumbnail: the tradeoffs that show up after week one.',
          'I\'ll cover cost reality, pace of life, and how to test-fit a neighborhood before you commit.',
          'Don\'t leave without this: who this video is for — relocators deciding, not locals scrolling.',
          'What the other channels won\'t say: pretty drone shots don\'t answer "should WE move."',
          close,
        ],
        intro: founderIntro,
        close,
      },
      {
        title: `${market} vs California: What You Actually Get`,
        why: 'Origin-market comparison captures high-intent relocators comparing lifestyle + money.',
        angle: 'origin_compare',
        lead_weight: 94,
        seed_topic_id: 'vs_california',
        hook: `California money does not buy the same life in ${market} — here's the honest math.`,
        hooks: [
          `California money does not buy the same life in ${market} — here's the honest math.`,
          `Thinking of leaving California for ${market}? Don't trust the vibes-only videos.`,
          `Same paycheck. Different life. ${market} vs California without the cheerleading.`,
        ],
        competitor_strong: 'COL calculators and "I left California" rant channels get clicks.',
        competitor_fail: 'They skip neighborhood-level reality and never invite a real consult.',
        film_mode: 'bookends',
        competitor_gap: 'Rant videos win emotion; few give a calm decision framework that leads to a conversation.',
        competitors: [],
        talking_points: [
          'Housing + tax + lifestyle tradeoffs that actually show up in the first year',
          `What feels similar to California in ${market} — and what is nothing alike`,
          'How to decide without romanticizing either place',
        ],
        must_say: [
          'Compare lived lifestyle, not just median home price',
          'Name one thing that is better AND one that is harder',
          'Invite relocators to reach out with their constraints (budget, schools, timeline)',
        ],
        sample_script: [
          `California money does not buy the same life in ${market} — here's the honest math.`,
          founderIntro,
          'I\'m not here to bash California or sell a fantasy.',
          `I\'ll map what transfers, what breaks, and how ${market} feels after the honeymoon.`,
          'Bring your real constraints: budget, schools, remote work, family.',
          'Don\'t leave without this: a decision framework, not a hype reel.',
          'What the other channels won\'t say: vibes without numbers create regret moves.',
          close,
        ],
        intro: founderIntro,
        close,
      },
      {
        title: market === 'Las Vegas'
          ? 'Phoenix vs Las Vegas: Which Move Wins in 2026?'
          : `${market} vs Phoenix vs Las Vegas — Honest Pros & Cons`,
        why: 'Metro comparison catches shoppers deciding between sunbelt markets — high lead intent.',
        angle: 'metro_compare',
        lead_weight: 90,
        seed_topic_id: 'metro_compare',
        hook: 'Phoenix or Las Vegas — the wrong YouTube take will cost you a year.',
        hooks: [
          'Phoenix or Las Vegas — the wrong YouTube take will cost you a year.',
          'If you\'re comparing sunbelt cities, stop watching cheerleaders from one side.',
          'Pros and cons that relocators actually feel — not chamber-of-commerce talking points.',
        ],
        competitor_strong: 'City rivalry thumbnails and "I moved and hated it" stories travel well.',
        competitor_fail: 'Partisan takes; no decision matrix tied to job, schools, and housing.',
        film_mode: 'teleprompter',
        competitor_gap: 'Few creators give a neutral matrix relocators can use with a local advisor.',
        competitors: [],
        talking_points: [
          'Jobs / remote work / industries that fit each market',
          'Housing inventory + commute + summer reality',
          'Which buyer profile fits which city (families, investors, lifestyle)',
        ],
        must_say: [
          'Refuse one-sided cheerleading',
          'Give a simple decision matrix (job, schools, budget, lifestyle)',
          'CTA: message with your constraints and I\'ll help you think it through',
        ],
        sample_script: [
          'Phoenix or Las Vegas — the wrong YouTube take will cost you a year.',
          founderIntro,
          'I\'m going to be unfair to neither city — and honest about both.',
          'We\'ll score jobs, housing, schools, and summer reality.',
          'Then I\'ll tell you which profile fits which move.',
          'Don\'t leave without this: your constraints decide the winner, not a thumbnail.',
          'What the other channels won\'t say: rivalry content is entertainment, not a relocation plan.',
          close,
        ],
        intro: founderIntro,
        close,
      },
      {
        title: `Best ${market} Neighborhoods If You're Relocating`,
        why: 'Neighborhood intel is the bridge from research to "message the local."',
        angle: 'neighborhoods',
        lead_weight: 86,
        seed_topic_id: 'neighborhoods',
        hook: `Don't pick a ${market} neighborhood from a drone video.`,
        hooks: [
          `Don't pick a ${market} neighborhood from a drone video.`,
          `Relocating to ${market}? These are the questions that actually sort neighborhoods.`,
          'Pretty streets are not the same as the right fit for your family.',
        ],
        competitor_strong: 'Top-10 neighborhood listicles and luxury tour channels rank well.',
        competitor_fail: 'Lists without fit criteria; no invitation to a real consult.',
        film_mode: 'bullets',
        competitor_gap: 'Lists dump names; few teach how to match neighborhood to lifestyle constraints.',
        competitors: [],
        talking_points: [
          'How to match neighborhood to commute, schools, and weekend lifestyle',
          `3–5 ${market} areas worth a scouting day for relocators right now`,
          'Red flags that look fine on Instagram',
        ],
        must_say: [
          'Frame for relocators deciding, not locals house-hopping',
          'Give fit criteria before naming areas',
          'Offer to help narrow based on their constraints',
        ],
        sample_script: [
          `Don't pick a ${market} neighborhood from a drone video.`,
          founderIntro,
          'First: fit criteria. Then names. Never the reverse.',
          'I\'ll walk 3–5 areas worth a scouting day for people moving in.',
          'And the red flags Instagram hides.',
          'Don\'t leave without this: your lifestyle constraints before any tour.',
          'What the other channels won\'t say: a pretty reel is not due diligence.',
          close,
        ],
        intro: founderIntro,
        close,
      },
      {
        title: `${market} Schools: What Relocating Families Ask First`,
        why: 'School questions are a top relocator blocker — answering them earns trust + leads.',
        angle: 'schools',
        lead_weight: 82,
        seed_topic_id: 'schools',
        hook: `Relocating with kids to ${market}? Start here before you fall in love with a house.`,
        hooks: [
          `Relocating with kids to ${market}? Start here before you fall in love with a house.`,
          'School ratings alone will mislead you — here\'s the relocator checklist.',
          'House first, schools second is how families get stuck.',
        ],
        competitor_strong: 'GreatSchools-style roundups and district map videos get search.',
        competitor_fail: 'Data without housing tradeoffs; no human next step.',
        film_mode: 'story',
        competitor_gap: 'Rankings without "how this changes which house you should even tour."',
        competitors: [],
        talking_points: [
          'What relocating parents ask first (and what they forget)',
          'How school choice should constrain the house search — not follow it',
          'How to validate a district on a short scouting trip',
        ],
        must_say: [
          'House after schools/fit — not before',
          'Admit what online ratings miss',
          'Invite families to share grade levels + budget for a tailored shortlist',
        ],
        sample_script: [
          `Relocating with kids to ${market}? Start here before you fall in love with a house.`,
          founderIntro,
          'Online ratings are a start — not a plan.',
          'I\'ll cover the questions families forget until they\'re under contract.',
          'Then how school fit should shape which doors you even knock on.',
          'Don\'t leave without this: schools constrain the search.',
          'What the other channels won\'t say: a beautiful house in the wrong zone is an expensive mistake.',
          close,
        ],
        intro: founderIntro,
        close,
      },
    ];
  }

  if (playbook.id === 'insurance_leads') {
    return playbook.seed_topics.slice(0, 5).map((t, i) => ({
      title: t.query.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 72),
      why: 'Insurance content that earns trust at claim/rate moments converts to consults.',
      angle: t.angle,
      lead_weight: t.lead_weight,
      seed_topic_id: t.id,
      hook: 'If you only watch insurance content when nothing is on fire, you\'re already behind.',
      hooks: [
        'If you only watch insurance content when nothing is on fire, you\'re already behind.',
        'Rates and claims — here\'s what people get wrong before they call.',
        'I\'m not selling fear. I\'m selling clarity before the expensive surprise.',
      ],
      competitor_strong: 'Fear-based claim horror stories get clicks.',
      competitor_fail: 'Rarely give calm next steps + a human to talk to.',
      film_mode: FILM_MODES[i % FILM_MODES.length].id,
      competitor_gap: 'Entertainment without a consult path.',
      competitors: [],
      talking_points: ['The moment this becomes urgent', 'What to check before you call anyone', 'How I help without the scare tactics'],
      must_say: ['No fear porn', 'Clear next step', 'Invite a conversation'],
      sample_script: [
        'If you only watch insurance content when nothing is on fire, you\'re already behind.',
        founderIntro,
        'Let\'s make this practical.',
        close.replace('move', 'coverage review'),
      ],
      intro: founderIntro,
      close: 'If you want a calm second set of eyes, message me — leads over views.',
    }));
  }

  return playbook.seed_topics.slice(0, 5).map((t, i) => ({
    title: t.query.slice(0, 72),
    why: 'Offer-led authority content that creates a next conversation.',
    angle: t.angle,
    lead_weight: t.lead_weight,
    seed_topic_id: t.id,
    hook: 'If this video doesn\'t create a next step, it was expensive noise.',
    hooks: [
      'If this video doesn\'t create a next step, it was expensive noise.',
      'Views are vanity. Conversations are the business.',
      'Here\'s the offer-clear version of this topic.',
    ],
    competitor_strong: 'Generic tips channels win on volume.',
    competitor_fail: 'No clear ask that creates a lead.',
    film_mode: FILM_MODES[i % FILM_MODES.length].id,
    competitor_gap: 'Tips without a path to work together.',
    competitors: [],
    talking_points: ['The stuck point', 'Lived proof', 'Clear next step'],
    must_say: ['Name the stuck point', 'Lived proof', 'Clear ask'],
    sample_script: [
      'If this video doesn\'t create a next step, it was expensive noise.',
      founderIntro,
      'Here\'s the stuck point.',
      'Here\'s what I\'ve lived.',
      'If that\'s you, reach out.',
    ],
    intro: founderIntro,
    close: 'If you want help with this, message me — I answer.',
  }));
}

const FALLBACK_IDEAS = buildPlaybookFallbackIdeas(
  resolveNichePlaybook({ ownerId: 'adam', channelTitle: 'Adam Hopkins - Realtor' }),
);

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

  async function loadBrandVoice(ownerId) {
    if (!pool?.query) return {};
    try {
      const { rows } = await pool.query(
        `SELECT brand_voice_json FROM marketing_channel_profiles WHERE owner_id = $1 LIMIT 1`,
        [String(ownerId)]
      );
      const voice = rows[0]?.brand_voice_json;
      return typeof voice === 'string' ? JSON.parse(voice || '{}') : (voice || {});
    } catch {
      return {};
    }
  }

  async function researchTopicShelf(yt, topicQuery, { maxResults = 5, order = 'relevance' } = {}) {
    if (!yt || !topicQuery) return { competitors: [], error: null };
    try {
      const search = await yt.search.list({
        part: ['snippet'],
        q: topicQuery,
        type: ['video'],
        maxResults,
        order,
        relevanceLanguage: 'en',
      });
      const items = search.data.items || [];
      const videoIds = items.map((it) => it.id?.videoId).filter(Boolean);
      if (!videoIds.length) return { competitors: [], error: null };

      const videosRes = await yt.videos.list({
        part: ['statistics', 'snippet'],
        id: videoIds,
      });
      const videoMap = new Map((videosRes.data.items || []).map((v) => [v.id, v]));
      const channelIds = [...new Set((videosRes.data.items || []).map((v) => v.snippet?.channelId).filter(Boolean))];
      let channelMap = new Map();
      if (channelIds.length) {
        const chRes = await yt.channels.list({
          part: ['statistics', 'snippet'],
          id: channelIds,
        });
        channelMap = new Map((chRes.data.items || []).map((c) => [c.id, c]));
      }

      const now = Date.now();
      const competitors = videoIds.map((id) => {
        const v = videoMap.get(id);
        if (!v) return null;
        const views = Number(v.statistics?.viewCount || 0);
        const ch = channelMap.get(v.snippet?.channelId);
        const subs = Number(ch?.statistics?.subscriberCount || 0);
        const publishedAt = v.snippet?.publishedAt || null;
        const ageDays = publishedAt ? Math.max(1, (now - new Date(publishedAt).getTime()) / 86400000) : 30;
        const viewsPerSub = views / Math.max(subs, 1);
        const viewsPerDay = views / ageDays;
        const velocityScore = Number((viewsPerSub * 40 + Math.min(viewsPerDay / 50, 40) + (viewsPerSub >= 1 ? 20 : 0)).toFixed(1));
        const outlier = viewsPerSub >= 1.25 || (subs > 0 && views > subs * 2);
        return {
          videoId: id,
          title: v.snippet?.title || 'Video',
          channelTitle: v.snippet?.channelTitle || ch?.snippet?.title || 'Channel',
          channelId: v.snippet?.channelId || null,
          thumbnailUrl: v.snippet?.thumbnails?.medium?.url
            || v.snippet?.thumbnails?.high?.url
            || `https://i3.ytimg.com/vi/${id}/hqdefault.jpg`,
          views,
          subscribers: subs,
          publishedAt,
          ageDays: Number(ageDays.toFixed(1)),
          viewsPerSub: Number(viewsPerSub.toFixed(3)),
          viewsPerDay: Number(viewsPerDay.toFixed(1)),
          velocityScore,
          outlier,
        };
      }).filter(Boolean);

      competitors.sort((a, b) => b.velocityScore - a.velocityScore);
      return { competitors, error: null };
    } catch (err) {
      return { competitors: [], error: err?.message || 'search_failed' };
    }
  }

  function enrichIdeaFromResearch(idea, shelf, playbook) {
    const comps = shelf?.competitors || [];
    const top = comps.slice(0, 3);
    const outliers = comps.filter((c) => c.outlier);
    const avgVelocity = comps.length
      ? comps.reduce((s, c) => s + c.velocityScore, 0) / comps.length
      : 0;
    const gapReason = outliers.length
      ? `Outliers exist (high views vs subs) — ride that hunger but fill what they skip: ${idea.competitor_fail || idea.competitor_gap || 'lived local truth + clear reach-out'}.`
      : comps.length
        ? `Shelf is mid/weak velocity — gap open for a clearer relocator decision video with a lead CTA.`
        : `No strong shelf yet — first-mover angle for this query.`;

    const research_basis = {
      query: shelf?.query || idea.research_query || '',
      gap_reason: gapReason,
      competitor_video_ids: top.map((c) => c.videoId),
      avg_velocity: Number(avgVelocity.toFixed(1)),
      outlier_count: outliers.length,
    };

    if (top.length) {
      idea.competitors = top.map((c) => ({
        name: c.channelTitle,
        title: c.title,
        videoId: c.videoId,
        thumbnailUrl: c.thumbnailUrl,
        views: c.views,
        subscribers: c.subscribers,
        viewsPerSub: c.viewsPerSub,
        velocityScore: c.velocityScore,
        outlier: c.outlier,
      }));
      idea.competitor_strong = idea.competitor_strong
        || `Top shelf: "${top[0].title.slice(0, 60)}" (${top[0].views.toLocaleString()} views · ${top[0].viewsPerSub}x views/sub).`;
      idea.competitor_fail = idea.competitor_fail
        || 'They win clicks; they rarely earn a relocator conversation with a clear local next step.';
      idea.competitor_gap = idea.competitor_gap || gapReason;
    }

    if (outliers[0] && idea.title && !/2026|2025/.test(idea.title)) {
      // keep playbook title — researched, not copied
    }

    idea.research_basis = research_basis;
    idea.researched = comps.length > 0;
    idea.lead_intent_score = leadIntentScoreForIdea(idea, playbook);
    return idea;
  }

  function buildChannelOps(videos, playbook) {
    const list = (videos || []).filter((v) => v?.title && v?.videoId);
    if (!list.length) return [];
    const market = playbook?.market || 'this market';
    const realtor = playbook?.id === 'realtor_relocation';
    const outcome = realtor ? 'inbound relocator reach-outs / leads' : 'leads / booked conversations';
    const ops = [];
    const oldest = list[list.length - 1];
    const mid = list[Math.min(2, list.length - 1)];
    const coreOldest = oldest.title.replace(/^(update|updated|relocating\?)\s*:?\s*/i, '').slice(0, 48);
    ops.push({
      type: 'refresh_metadata',
      videoId: oldest.videoId,
      currentTitle: oldest.title,
      proposedTitle: realtor
        ? `Moving to ${market}? ${coreOldest}`
        : `Updated: ${oldest.title.slice(0, 64)}`,
      why: `Refresh title + description + face/title thumb so this old upload earns ${outcome} — not vanity views.`,
      actions: [
        'Lead-intent title (relocation / buyer decision language)',
        'Description CTA: comment MOVE or message me',
        'New face + 3–5 word title thumbnail',
      ],
    });
    if (mid && mid.videoId !== oldest.videoId) {
      ops.push({
        type: 'ab_title',
        videoId: mid.videoId,
        currentTitle: mid.title,
        proposedTitle: realtor
          ? `Relocating to ${market}? Watch Before You Fly`
          : `A/B: ${mid.title.slice(0, 58)}`,
        why: `A/B a clearer lead-intent title on an existing upload to earn more ${outcome} without a reshoot.`,
        actions: ['Title variant A/B', 'Refresh face+title thumb if CTR soft', 'Pin comment with reach-out CTA'],
      });
    }
    if (list[0]) {
      ops.push({
        type: 'reuse_sequel',
        videoId: list[0].videoId,
        currentTitle: list[0].title,
        proposedTitle: realtor
          ? `${market} Relocation Update 2026 — What Changed`
          : `Sequel: ${list[0].title.slice(0, 55)}`,
        why: `Film a sequel/update that compounds SEO and invites new ${outcome} from people still deciding.`,
        actions: ['Sequel script from old angle', 'Link old ↔ new in descriptions', 'Ask past commenters what they still need'],
      });
    }
    return ops.slice(0, 3);
  }

  async function buildSuggestionCards(ideas, { source, channelTitle, founderIntro, assets, playbook, skipIdeogram = false }) {
    const faceUrl = assets?.faceUrl || null;
    const uniqueIdeas = dedupeSuggestionTitles(ideas).slice(0, 5);

    const built = await Promise.all(uniqueIdeas.map(async (idea, idx) => {
      const fb = (playbook ? buildPlaybookFallbackIdeas(playbook, founderIntro) : FALLBACK_IDEAS)[idx % 5]
        || FALLBACK_IDEAS[idx % FALLBACK_IDEAS.length];
      const title = idea.title || idea.text;
      const hook = idea.hook || '';
      const intro = idea.intro || founderIntro || DEFAULT_INTRO;
      const close = idea.close || DEFAULT_CLOSE;
      const talking_points = Array.isArray(idea.talking_points) && idea.talking_points.length
        ? idea.talking_points.slice(0, 5)
        : (fb.talking_points || []);
      const competitors = Array.isArray(idea.competitors) ? idea.competitors.slice(0, 4) : [];
      const competitor_gap = idea.competitor_gap || idea.competitor_context?.gap || '';
      const lead_intent_score = idea.lead_intent_score ?? leadIntentScoreForIdea(idea, playbook);
      const researched = !!idea.researched;
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
        research_basis: idea.research_basis || null,
        lead_intent_score,
        researched,
        primary_outcome: playbook?.primary_outcome || 'leads',
        click_psychology: defaultClickPsychology(idea),
        copy_model: idea.copy_model || null,
        retention_beats: idea.retention_beats || null,
      };
      const hooks = buildHooks(draft, fb);
      const must_say = buildMustSay(draft);
      const selectedHook = hooks[0] || hook;
      const retention_beats = normalizeRetentionBeats(idea.retention_beats, {
        ...draft,
        hook: selectedHook,
        must_say,
      });
      const sample_script = buildSampleScript({ ...draft, hook: selectedHook, must_say, retention_beats });

      const punch = buildThumbnailPunch({
        title,
        angle: draft.angle,
        idx,
        market: playbook?.market || '',
      });
      const [thumb, aiThumb] = await Promise.all([
        composeCompetitiveThumbnail({
          title,
          hook: selectedHook,
          channelTitle: channelTitle || assets?.channelTitle,
          faceUrl,
          researched,
          leadIntentScore: lead_intent_score,
          competitorCount: competitors.length,
          cardIndex: idx,
          market: playbook?.market || '',
          angle: draft.angle,
          fast: !!skipIdeogram,
        }),
        skipIdeogram
          ? Promise.resolve(null)
          : tryIdeogramThumbnail({
              title,
              overlay: punch.overlayText || selectedHook,
              market: playbook?.market || '',
              angle: draft.angle,
              cardIndex: idx,
            }),
      ]);
      // Plan: real-photo composite first; AI gen only if compose failed / SVG fallback.
      if (thumb.composed) {
        thumb.thumbnailSource = thumb.thumbnailSource || 'composed_face_title';
        if (aiThumb?.thumbnailUrl) thumb.aiThumbnailUrl = aiThumb.thumbnailUrl;
      } else if (aiThumb?.thumbnailUrl) {
        thumb.composedThumbnailUrl = thumb.thumbnailUrl;
        thumb.thumbnailUrl = aiThumb.thumbnailUrl;
        thumb.thumbnailSource = 'ideogram_replicate';
        thumb.model = aiThumb.model || null;
      } else {
        thumb.thumbnailSource = thumb.thumbnailSource || 'svg_fallback';
      }

      const pack = {
        ...draft,
        hook: selectedHook,
        hooks,
        must_say,
        retention_beats,
        sample_script,
        click_psychology: draft.click_psychology,
        thumbnail_layout: thumb.layoutId || null,
      };
      const seedPack = encodeSeedPack(pack);
      const startPath = `/marketing/session/new?seed_title=${encodeURIComponent(title)}&seed_angle=${encodeURIComponent(pack.angle)}&seed_pack=${encodeURIComponent(seedPack)}`;
      const serpCompetitors = competitors.slice(0, 3).map((c) => {
        if (typeof c === 'string') {
          return { name: c, title: c, score: 50, thumbnailUrl: null };
        }
        return {
          name: c.name || c.channelTitle || 'Competitor',
          title: c.title || c.name || 'Competitor video',
          score: Math.round(c.velocityScore || 50),
          thumbnailUrl: c.thumbnailUrl || null,
          views: c.views,
          subscribers: c.subscribers,
          viewsPerSub: c.viewsPerSub,
          outlier: !!c.outlier,
          videoId: c.videoId || null,
        };
      });
      return {
        id: `yt-idea-${idx + 1}`,
        rank: idx + 1,
        ...pack,
        source,
        channelTitle: channelTitle || assets?.channelTitle || null,
        playbook_id: playbook?.id || null,
        thumbnailUrl: thumb.thumbnailUrl,
        thumbnailOverlay: thumb.overlayText,
        thumbnailFaceUrl: thumb.faceUrl,
        thumbnailBgUrl: null,
        thumbnailComposed: !!thumb.composed,
        thumbnailSource: thumb.thumbnailSource || 'composed',
        competition: thumb.competition,
        serpPreview: {
          ourRank: thumb.competition?.serpRank || 3,
          label: thumb.competition?.serpLabel || '',
          competitors: serpCompetitors,
        },
        startUrl: startPath,
        studioUrl: `/creative/studio?title=${encodeURIComponent(title)}`,
      };
    }));

    built.sort((a, b) => (b.lead_intent_score || 0) - (a.lead_intent_score || 0));
    built.forEach((c, i) => { c.rank = i + 1; });
    return built;
  }

  async function loadFounderIntro(ownerId) {
    const voice = await loadBrandVoice(ownerId);
    return voice?.founderIntro || voice?.intro || DEFAULT_INTRO;
  }

  async function getSuggestions(ownerId, { callCouncilMember, fast = false } = {}) {
    const status = await getStatus(ownerId);
    let channelTitle = null;
    let recentTitles = [];
    let source = 'playbook_defaults';
    const founderIntro = await loadFounderIntro(ownerId);
    const brandVoice = await loadBrandVoice(ownerId);
    const assets = await loadChannelVisualAssets(ownerId);
    channelTitle = assets.channelTitle || null;
    recentTitles = (assets.videos || []).map((v) => v.title).filter(Boolean);
    if (assets.source && assets.source !== 'none') {
      source = assets.source === 'public_channel' ? 'public_channel_assets' : 'youtube_analytics_plus_channel';
    }

    const playbook = resolveNichePlaybook({
      ownerId,
      channelTitle,
      brandVoice: { ...brandVoice, niche: brandVoice.niche || channelTitle },
    });
    let ideas = buildPlaybookFallbackIdeas(playbook, founderIntro);
    let researchError = null;
    let researchedCount = 0;

    let yt = null;
    if (!fast) {
      try {
        const client = await getAuthedClient(ownerId);
        if (!client.error) {
          yt = google.youtube({ version: 'v3', auth: client.auth });
        }
      } catch (err) {
        researchError = err?.message || 'yt_client_failed';
      }
    }

    if (yt) {
      const enriched = [];
      for (const topic of playbook.seed_topics.slice(0, 5)) {
        const base = ideas.find((i) => i.seed_topic_id === topic.id) || ideas[enriched.length] || ideas[0];
        const idea = { ...base, research_query: topic.query, lead_weight: topic.lead_weight };
        if (topic.title_template) idea.title = topic.title_template;
        const shelf = await researchTopicShelf(yt, topic.query, { maxResults: 8 });
        shelf.query = topic.query;
        if (shelf.error && !researchError) researchError = shelf.error;
        // Second pass: viewCount order for velocity outliers
        const hot = await researchTopicShelf(yt, topic.query, { maxResults: 5, order: 'viewCount' });
        if (hot.competitors?.length) {
          const byId = new Map((shelf.competitors || []).map((c) => [c.videoId, c]));
          for (const c of hot.competitors) {
            if (!byId.has(c.videoId)) {
              shelf.competitors.push(c);
            }
          }
          shelf.competitors.sort((a, b) => b.velocityScore - a.velocityScore);
          shelf.competitors = shelf.competitors.slice(0, 6);
        }
        enrichIdeaFromResearch(idea, shelf, playbook);
        if (idea.researched) researchedCount += 1;
        enriched.push(idea);
      }
      if (enriched.length) {
        ideas = enriched;
        source = researchedCount ? 'youtube_research_playbook' : source;
      }

      // Optional scored title variants (never invent SERP) — pick higher lead-intent wording.
      if (researchedCount && typeof callCouncilMember === 'function') {
        try {
          const { generateTitleUniverse } = await import('./marketing-title-universe.js');
          for (let i = 0; i < ideas.length; i += 1) {
            const idea = ideas[i];
            const topic = `${idea.title || ''} | ${idea.research_query || ''} | gap: ${(idea.research_basis?.gap_reason || '').slice(0, 160)}`;
            const uni = await generateTitleUniverse({
              callCouncilMember,
              topic,
              transcript: `Playbook ${playbook.id}. Outcome=leads. Prefer relocation/buyer-decision language. Avoid vanity agent lifestyle.`,
              count: 12,
            });
            const winner = (uni?.top5 || []).find((t) => t?.text && t.score >= 70);
            if (winner?.text && winner.text.length >= 18 && winner.text.length <= 90) {
              idea.title_candidates = (uni.top5 || []).slice(0, 3);
              idea.title = winner.text;
              idea.lead_intent_score = leadIntentScoreForIdea(idea, playbook);
            }
          }
        } catch (err) {
          logger?.warn?.({ err }, 'title-universe scoring skipped');
        }
      }
    }

    let copyRewriteError = null;
    let copyModel = null;

    if (!fast && typeof callCouncilMember === 'function') {
      try {
        const modelOrder = ['claude_sonnet', 'openai_gpt', 'gemini_flash'];
        let modelUsed = null;
        const attemptErrors = [];
        // One-card rewrites: batch JSON from models routinely truncates/breaks.
        const perCard = [];
        for (const idea of ideas.slice(0, 5)) {
          const onePrompt = `You are an elite YouTube + direct-response producer. Outcome = LEADS not vanity views.
Rewrite ONE talk card. Return ONLY a JSON object (no markdown, no array).

SALES/CLICK: curiosity + stakes + specificity in <1s. Title implies cost of NOT watching.
EARNED ATTENTION: retention_beats must cover 0–10s, 10–20s, 20–30s, 30–60s, 1–2min, close.
Each beat except close must plant a reason to stay for the next block.

Playbook: ${playbook.id} · Market: ${playbook.market}
Intro to use: ${JSON.stringify(founderIntro)}
seed_topic_id: ${JSON.stringify(idea.seed_topic_id || '')}
Research: ${JSON.stringify({
            title: idea.title,
            query: idea.research_query || idea.research_basis?.query,
            gap: (idea.research_basis?.gap_reason || idea.competitor_gap || '').slice(0, 280),
            competitors: (idea.competitors || []).slice(0, 3).map((c) => typeof c === 'string' ? c : ({
              title: c.title, channel: c.name || c.channelTitle, viewsPerSub: c.viewsPerSub, outlier: c.outlier,
            })),
          })}

Required keys:
seed_topic_id, title, why, angle, click_psychology, hook, hooks (3 strings),
talking_points (3), close, competitor_strong, competitor_fail, competitor_gap,
must_say (2-3), film_mode, lead_weight (number),
retention_beats (6 objects with range, job, lines),
sample_script (10-14 short lines).`;

          let oneRaw = null;
          for (const model of modelOrder) {
            try {
              const res = await callCouncilMember(model, onePrompt, {
                maxTokens: 2800,
                founderComms: true,
                taskType: 'marketing_youtube_talk_pack',
              });
              const text = typeof res === 'string'
                ? res
                : (res?.text || res?.content || res?.message || (typeof res === 'object' ? JSON.stringify(res) : ''));
              if (res?.error || res?.ok === false) {
                attemptErrors.push(`${idea.seed_topic_id || 'card'}/${model}: ${res.error || 'ok_false'}`);
                continue;
              }
              if (!String(text || '').trim()) {
                attemptErrors.push(`${idea.seed_topic_id || 'card'}/${model}: empty`);
                continue;
              }
              oneRaw = text;
              modelUsed = model;
              break;
            } catch (err) {
              attemptErrors.push(`${idea.seed_topic_id || 'card'}/${model}: ${err?.message || err}`);
            }
          }
          if (!oneRaw) continue;
          let obj = null;
          const asArr = extractJsonArray(oneRaw);
          if (Array.isArray(asArr) && asArr[0]) obj = asArr[0];
          if (!obj) {
            const wrapped = extractJsonArray(`[${oneRaw}]`);
            if (Array.isArray(wrapped) && wrapped[0]) obj = wrapped[0];
          }
          if (!obj) {
            try {
              const s = String(oneRaw).replace(/^```(?:json)?/i, '').replace(/```$/i, '');
              const a = s.indexOf('{');
              const b = s.lastIndexOf('}');
              if (a >= 0 && b > a) {
                obj = JSON.parse(s.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1'));
              }
            } catch (err) {
              attemptErrors.push(`${idea.seed_topic_id || 'card'}: parse ${err?.message || err} :: ${String(oneRaw).slice(0, 120)}`);
            }
          }
          if (!obj) {
            attemptErrors.push(`${idea.seed_topic_id || 'card'}: no_object :: ${String(oneRaw).slice(0, 120)}`);
          } else {
            perCard.push({ ...obj, seed_topic_id: obj.seed_topic_id || idea.seed_topic_id });
          }
        }

        if (perCard.length) {
          copyModel = modelUsed;
          copyRewriteError = null;
          ideas = ideas.map((base, i) => {
            const item = perCard[i] || perCard.find((p) => p.seed_topic_id === base.seed_topic_id) || {};
            const hooks = buildHooks({ hook: item.hook || base.hook, hooks: item.hooks || base.hooks }, base);
            const retention_beats = normalizeRetentionBeats(item.retention_beats, {
              ...base,
              hook: hooks[0],
              must_say: item.must_say || base.must_say,
            });
            const merged = {
              ...base,
              title: item.title || base.title,
              why: item.why || base.why,
              angle: item.angle || base.angle,
              click_psychology: item.click_psychology || null,
              hook: hooks[0] || item.hook || base.hook,
              hooks,
              intro: item.intro || founderIntro || base.intro,
              close: item.close || base.close,
              talking_points: Array.isArray(item.talking_points) && item.talking_points.length
                ? item.talking_points
                : base.talking_points,
              competitor_gap: item.competitor_gap || base.competitor_gap,
              competitor_strong: item.competitor_strong || base.competitor_strong,
              competitor_fail: item.competitor_fail || base.competitor_fail,
              film_mode: item.film_mode || base.film_mode,
              must_say: Array.isArray(item.must_say) && item.must_say.length ? item.must_say : base.must_say,
              retention_beats,
              sample_script: normalizeScriptLines(item.sample_script).length
                ? normalizeScriptLines(item.sample_script)
                : buildSampleScript({ ...base, hook: hooks[0], retention_beats }),
              lead_weight: item.lead_weight || base.lead_weight,
              copy_model: modelUsed,
            };
            merged.lead_intent_score = leadIntentScoreForIdea(merged, playbook);
            return merged;
          });
          source = researchedCount
            ? `youtube_research_${modelUsed}`
            : `ai_strong_${modelUsed}`;
        } else {
          copyRewriteError = attemptErrors.slice(0, 8).join(' | ') || 'per_card_rewrite_failed';
        }
      } catch (err) {
        copyRewriteError = err?.message || 'rewrite_exception';
        logger?.warn?.({ err }, 'strong-model talk rewrite failed; keeping research/playbook packs');
      }
    } else if (fast) {
      copyRewriteError = 'fast_mode_skip_ai';
      source = source === 'playbook_defaults' ? 'playbook_fast' : `${source}_fast`;
    } else {
      copyRewriteError = 'callCouncilMember_unavailable';
    }

    ideas = ideas.map((idea) => {
      if (idea.lead_intent_score == null) idea.lead_intent_score = leadIntentScoreForIdea(idea, playbook);
      idea.retention_beats = normalizeRetentionBeats(idea.retention_beats, idea);
      return idea;
    });

    const suggestions = await buildSuggestionCards(ideas, {
      source,
      channelTitle,
      founderIntro,
      assets,
      playbook,
      skipIdeogram: !!fast,
    });

    const channel_ops = buildChannelOps(assets.videos, playbook);

    return {
      ok: true,
      connected: !!status.connected,
      oauthConfigured: !!status.oauthConfigured,
      source,
      playbook: {
        id: playbook.id,
        label: playbook.label,
        primary_outcome: playbook.primary_outcome,
        market: playbook.market,
        seed_topics: playbook.seed_topics.map((t) => ({ id: t.id, query: t.query, lead_weight: t.lead_weight })),
        avoid_topics: playbook.avoid_topics,
      },
      researchedCount,
      researchError,
      copyModel,
      copyRewriteError,
      youtubeApiError: assets.apiError || researchError || null,
      youtubeApiNext: assets.apiError && /youtube\.googleapis\.com|has not been used|disabled/i.test(String(assets.apiError))
        ? 'Enable YouTube Data API v3 on the Google Cloud project, then Refresh ideas. Or paste your public channel URL below to pull face assets without the API.'
        : null,
      channelVisuals: {
        faceUrl: assets.faceUrl || null,
        videoCount: (assets.videos || []).length,
        assetSource: assets.source,
        publicUrl: assets.publicUrl || null,
      },
      channel_ops,
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
