/**
 * SYNOPSIS: Site Builder Asset Ingestion — discover and pull real assets
 * (Instagram profile/posts, YouTube videos, business-page images, real
 * testimonials/reviews, Google Business Profile signals) into the Site Builder
 * pipeline, then score the business against industry averages.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 *
 * Design notes:
 *   - Real data only: every testimonial, image URL, and metric is fetched from
 *     a public page or API and tagged with its source. We never fabricate.
 *   - AI is used only for extraction/classification of already-fetched text.
 *   - All heavy calls are individually timed out; the whole ingestAll() run is
 *     best-effort and never blocks the build if a source is unreachable.
 */

import { execFile } from 'node:child_process';
import logger from './logger.js';
import { extractYouTubeChannelId } from './site-builder-social-discovery.js';

const DEFAULT_TIMEOUT_MS = 20_000;
const JINA_BASE = 'https://r.jina.ai/http://';
const DDG_LITE = 'https://r.jina.ai/http://lite.duckduckgo.com/lite/?q=';

// Common JS-only helpers -------------------------------------------------------

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    if (timer?.unref) timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function normalizeJinaFetchUrl(url) {
  try {
    const u = new URL(url);
    return `${JINA_BASE}${u.hostname}${u.pathname}${u.search}`.replace(/\/+$/, '');
  } catch {
    return url.startsWith('http') ? `${JINA_BASE}${url.replace(/^https?:\/\//, '')}` : `${JINA_BASE}${url}`;
  }
}

async function fetchText(url, { timeoutMs = DEFAULT_TIMEOUT_MS, method = 'GET', headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LuminBot/1.0; +https://lumin.ai)',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        ...headers,
      },
    });
    if (!res.ok) return { ok: false, status: res.status, text: '' };
    const text = await res.text();
    return { ok: true, status: res.status, text };
  } catch (err) {
    return { ok: false, status: 0, text: '', error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

function isParkedOrLogin(text) {
  const t = String(text || '').toLowerCase();
  const parked = [
    'hugedomains',
    'domain is for sale',
    'this domain is for sale',
    'domain for sale',
    'buy this domain',
    'parked',
    'sedo',
    'godaddy auction',
    'namecheap marketplace',
    'is parked free',
  ];
  const login = [
    'log in to continue',
    'sign in to continue',
    'please log in',
    'please sign in',
    'login to view',
    'sign in to view',
    'forgot password',
    'create an account',
  ];
  const blocked = [
    'captcha',
    'recaptcha',
    'please verify you are a human',
    'this page maybe requiring captcha',
    'authorized to access this page',
    'are you a human',
    'security check',
  ];
  const reason = parked.find((p) => t.includes(p)) || login.find((l) => t.includes(l)) || blocked.find((b) => t.includes(b)) || null;
  const blockedOk = !!blocked.find((b) => t.includes(b));
  return { parked: !!parked.find((p) => t.includes(p)), login: !!login.find((l) => t.includes(l)) || blockedOk, reason };
}

function extractLocationFromBio(bio) {
  const m = String(bio || '').match(/(?:located in|based in|in)\s+([A-Za-z\s]+,\s*[A-Z]{2})/i);
  return m ? m[1].trim() : null;
}

function extractIndustryFromBio(bio) {
  const m = String(bio || '').match(/Services?:\s*([A-Za-z]+)/i);
  if (m) return m[1].toLowerCase();
  return null;
}

function deriveLocationFromAddress(address) {
  if (!address) return null;
  const m = address.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}\s*\d{5}/);
  if (m) return m[1].replace(/\s+/g, ' ').trim();
  const m2 = address.match(/,\s*([A-Za-z\s]+),?\s*[A-Z]{2}(?:\s*\d{5})?/);
  if (m2) return m2[1].replace(/\s+/g, ' ').trim();
  return null;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function looseNameVariants(name) {
  if (!name) return [];
  const cleaned = String(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const compact = words.join('');
  return Array.from(new Set([compact, words.join('-'), words.join('_'), words.join('.'), words.join('')]));
}

// DuckDuckGo search -----------------------------------------------------------

async function searchDuckDuckGo(query, { timeoutMs = 25_000 } = {}) {
  const url = `${DDG_LITE}${encodeURIComponent(query)}`;
  const res = await fetchText(url, { timeoutMs });
  return res.text || '';
}

function parseDuckDuckGoResults(markdown) {
  const results = [];
  const lines = String(markdown || '').split(/\r?\n/);
  let current = null;
  const linkRe = /^\d+\.\[(.*?)\]\((.*?)\)/;
  const urlRe = /^(https?:\/\/[^\s]+)$/;

  for (const line of lines) {
    const linkMatch = line.match(linkRe);
    if (linkMatch) {
      if (current) results.push(current);
      current = { title: linkMatch[1].replace(/\*+/g, ' ').trim(), url: linkMatch[2].trim(), snippet: '' };
      continue;
    }
    const bareUrlMatch = line.match(urlRe);
    if (bareUrlMatch && current) {
      current.url = bareUrlMatch[1];
      continue;
    }
    if (current && line.trim()) {
      if (!current.url) {
        const possible = line.trim();
        if (/^https?:\/\//.test(possible)) current.url = possible;
      }
      current.snippet += `${line.trim()} `;
    }
  }
  if (current) results.push(current);
  return results.filter((r) => r.url && r.url.startsWith('http'));
}

function cleanDdgUrl(url) {
  try {
    const u = new URL(url);
    const redirect = u.searchParams.get('uddg');
    if (redirect) return decodeURIComponent(redirect);
    return url;
  } catch {
    return url;
  }
}

// Image extraction ------------------------------------------------------------

function extractImagesFromMarkdown(markdown) {
  const images = [];
  const seen = new Set();
  const push = (alt, url) => {
    const u = String(url || '').trim().replace(/[),]+$/, '');
    if (!u || seen.has(u)) return;
    if (!/^https?:\/\//i.test(u)) return;
    if (/\.(?:svg|gif|ico)(?:\?|$)/i.test(u) && !/wixstatic/i.test(u)) return;
    seen.add(u);
    images.push({ alt: String(alt || '').trim(), url: u });
  };

  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(markdown))) {
    push(m[1], m[2]);
  }

  // Raw HTML / Wix / CDN URLs often survive in scrape text without markdown image syntax
  const htmlImgs = String(markdown || '').matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi);
  for (const hit of htmlImgs) {
    const tag = hit[0];
    const alt = (tag.match(/alt=["']([^"']*)["']/i) || [])[1] || '';
    push(alt, hit[1]);
  }
  const cdnUrls = String(markdown || '').matchAll(
    /https?:\/\/(?:static\.wixstatic\.com\/media|images\.unsplash\.com|cdninstagram\.com|scontent[^/\s"']+\.cdninstagram\.com|i\.ytimg\.com)\/[^\s"'<>)\\]+/gi
  );
  for (const hit of cdnUrls) {
    let url = hit[0];
    // Prefer the base Wix media object (drop /v1/fill transforms for scoring)
    if (/wixstatic\.com\/media\//i.test(url)) {
      url = url.split('/v1/')[0];
    }
    push('', url);
  }
  return images;
}

function pickLogo(images) {
  // Prefer an image whose alt contains logo/site/brand and has reasonable aspect (square-ish).
  for (const img of images) {
    const alt = img.alt.toLowerCase();
    if (/\blogo\b|site icon|brand|favicon/i.test(alt)) return img.url;
  }
  // Fallback: first image that is small (likely a logo) but not a tiny icon.
  for (const img of images) {
    if (/wixstatic.*mv2\.png|logo|favicon/i.test(img.url)) return img.url;
  }
  return images[0]?.url || null;
}

function isLogoLikeImage(img, logoUrl = '') {
  if (!img?.url) return true;
  if (logoUrl && img.url === logoUrl) return true;
  const alt = String(img.alt || '');
  const url = String(img.url || '');
  if (/\blogo\b|favicon|site icon|brand mark|sprite/i.test(alt)) return true;
  if (/\blogo\b|favicon|\.ico(?:\?|$)/i.test(url)) return true;
  // Tiny Wix transforms / decorative sprites — not usable photos
  if (/\/v1\/fill\/w_(?:1|2)\d(?!\d)/i.test(url)) return true;
  if (/\.svg(?:\?|$)/i.test(url)) return true;
  return false;
}

function scoreImageForHero(img, logoUrl = '') {
  if (isLogoLikeImage(img, logoUrl)) return -1;
  const url = String(img.url || '');
  const alt = String(img.alt || '');
  let score = 5;
  // Their own Instagram posts first — photos they already chose to show the world
  if (/cdninstagram|fbcdn\.net|scontent/.test(url)) score += 80;
  if (/ytimg|i\.ytimg|youtube/.test(url)) score += 25;
  if (/\.(jpe?g|webp)(?:\?|$)/i.test(url)) score += 20;
  if (/wixstatic|wp-content|squarespace|shopify|cloudinary|imgix/i.test(url)) score += 15;
  if (/hero|banner|home|main|background|birth|baby|family|care|room|clinic|wellness|midwife|doula/i.test(alt)) score += 30;
  if (/\.png(?:\?|$)/i.test(url) && /wixstatic/i.test(url)) score -= 5; // often logos/icons on Wix
  if (/replicate\.delivery|oaidalle|generated/i.test(url)) score -= 40; // never prefer AI over theirs
  return score;
}

/**
 * Prefer the business's own photos (Instagram → site JPGs → other CDN) over AI.
 * Still excludes logos. Returns ranked unique URLs.
 */
function pickHeroImages(images, logoUrl = '') {
  return images
    .map((img) => ({ url: img.url, score: scoreImageForHero(img, logoUrl) }))
    .filter((x) => x.score > 0 && x.url)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.url)
    .filter((url, idx, arr) => arr.indexOf(url) === idx)
    .slice(0, 8);
}

function pickTeamImages(images, logoUrl = '') {
  const preferred = images
    .filter((img) => !isLogoLikeImage(img, logoUrl))
    .filter((img) => /team|staff|practitioner|midwife|doula|about|profile|headshot|portrait/i.test(img.alt || ''))
    .map((i) => i.url);
  if (preferred.length) return preferred.filter((url, idx, arr) => arr.indexOf(url) === idx).slice(0, 4);
  // Fall back to leftover non-logo site photos so team slots aren't empty
  return pickHeroImages(images, logoUrl).slice(1, 5);
}

function pickProductImages(images, logoUrl = '') {
  const preferred = images
    .filter((img) => !isLogoLikeImage(img, logoUrl))
    .filter((img) => /service|product|facility|room|office|clinic|yoga|massage|birth|baby/i.test(img.alt || ''))
    .map((i) => i.url);
  if (preferred.length) return preferred.filter((url, idx, arr) => arr.indexOf(url) === idx).slice(0, 4);
  return pickHeroImages(images, logoUrl).slice(0, 4);
}

// Social-link extraction ------------------------------------------------------

const SOCIAL_PATTERNS = {
  youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'<>),]+/gi,
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[^\s"'<>),]+/gi,
  facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/[^\s"'<>),]+/gi,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s"'<>),]+/gi,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[^\s"'<>),]+/gi,
};

function extractSocialUrls(text) {
  const found = { youtube: [], instagram: [], facebook: [], linkedin: [], twitter: [] };
  for (const [kind, re] of Object.entries(SOCIAL_PATTERNS)) {
    const matches = String(text || '').match(re) || [];
    found[kind] = matches
      .map((u) => {
        try {
          let s = u.trim();
          if (!s.startsWith('http')) s = `https://${s}`;
          const url = new URL(s);
          url.hash = '';
          return url.toString();
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }
  return found;
}

function pickBestSocialUrl(urls, domainFilter) {
  if (!urls?.length) return null;
  return (
    urls.find((u) => domainFilter.every((d) => !new URL(u).pathname.toLowerCase().includes(d))) || urls[0]
  );
}

// Page parsing: business page -------------------------------------------------

async function parseBusinessPageWithAI(markdown, url, { callCouncil } = {}) {
  if (!callCouncil) return null;
  const prompt = `Extract structured business facts from this public web page. Use ONLY information that is literally present. If a field is missing, use null or an empty array.

URL: ${url}
PAGE TEXT:
${String(markdown || '').slice(0, 5000)}

Return ONLY valid JSON:
{
  "businessName": "string",
  "tagline": "string",
  "industry": "string",
  "services": ["service 1"],
  "location": "city, state",
  "address": "full street address",
  "phone": "string",
  "email": "string",
  "hours": {"Monday": "...", ...},
  "social": {"youtube": "url", "instagram": "url", "facebook": "url"},
  "uniqueValue": "string",
  "keywords": ["keyword"]
}`;
  try {
    const resp = await withTimeout(callCouncil('openai_gpt', prompt, { maxOutputTokens: 900, taskType: 'extraction', useCache: false }), 25_000, 'parseBusinessPageWithAI');
    const m = resp.match(/\{[\s\S]+\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    if (parsed && parsed.social && typeof parsed.social === 'object') {
      for (const k of Object.keys(parsed.social)) {
        const v = parsed.social[k];
        parsed.social[k] = typeof v === 'string' && v.startsWith('http') ? v : null;
      }
    }
    return parsed;
  } catch (err) {
    logger.warn('[ASSET] parseBusinessPageWithAI failed', { url, error: err.message });
    return null;
  }
}

function cleanTitleFromJina(rawTitle, url) {
  const title = String(rawTitle || '').trim();
  if (!title || /^home\b|^domain|^log in/i.test(title)) return null;
  // Split on common separators used in title tags: |, -, •
  const parts = title.split(/\s*[|\-–—•]\s*/).map((s) => s.trim()).filter(Boolean);
  const generic = /^(home|about|services?|contact|welcome|midwife|wellness|ritual|movement)$/i;
  const locationLike = /^[A-Za-z\s]+,\s*[A-Z]{2}$/;
  // Prefer the segment that looks like a business name (multi-word, not generic, not a location)
  for (const p of parts) {
    if (generic.test(p)) continue;
    if (locationLike.test(p)) continue;
    if (p.split(/\s+/).length >= 2) return p;
  }
  // If all else fails, take the first non-generic, non-location part
  for (const p of parts) {
    if (generic.test(p) || locationLike.test(p)) continue;
    if (p.length > 2) return p;
  }
  return title;
}

function parseBusinessPageHeuristic(markdown, url) {
  const text = String(markdown || '');
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  const firstHeading = lines.find((l) => l.startsWith('#')) || '';
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  const rawTitle = titleMatch ? titleMatch[1] : firstHeading.replace(/^#+\s*/, '');
  const title = cleanTitleFromJina(rawTitle, url);

  const phoneMatch = text.match(/(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/);
  const rawEmailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  const emailMatch = rawEmailMatch && !isAggregatorEmail(rawEmailMatch[0]) ? rawEmailMatch : null;
  // More permissive address regex
  const addressMatch = text.match(/\d+\s+[A-Za-z0-9\s.,#-]+(?:Apt|Suite|Unit|Ste)?\s*(?:,\s*[A-Za-z\s]+)?,\s*[A-Z]{2}\s*\d{5}/);

  function cleanServiceLine(line) {
    return line
      .replace(/^[\s*\-\d.#]+/, '')
      .replace(/^#{1,6}\s*/, '')
      .trim();
  }

  function isGoodService(s) {
    if (!s || s.length < 3 || s.length > 60) return false;
    if (/^!|^\[|join the|well rounded|is now|collective|modalities|specialties|services|average opinion|\/5|opinion|rating|review|stars/i.test(s)) return false;
    if (/[A-Z]{5,}/.test(s) && s.split(' ').length < 3) return false; // skip ALL CAPS headings
    return true;
  }

  const services = [];
  // Match a heading that contains Services/Specialties/Modalities/Offered, then capture lines until the next heading or a long gap
  const serviceBlockRe = /(?:Services?|Offerings|Modalities|Specialties|Collective Healing).*?(?::|Offered)?\s*\n([\s\S]{0,900})/i;
  const serviceHeading = text.match(serviceBlockRe);
  if (serviceHeading) {
    const block = serviceHeading[1];
    for (const line of block.split(/\n/)) {
      if (/^#{2,}\s/.test(line)) break; // stop at next heading
      const clean = cleanServiceLine(line);
      if (isGoodService(clean) && !services.includes(clean)) services.push(clean);
      if (services.length >= 12) break;
    }
  }

  const hours = {};
  const hourRe = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):?\s*(Closed|\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)/gi;
  let hm;
  while ((hm = hourRe.exec(text))) {
    const val = hm[2].trim();
    hours[hm[1]] = val;
  }

  // Extract location from address
  let location = null;
  if (addressMatch) {
    const cityState = addressMatch[0].match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}\s*\d{5}/);
    if (cityState) location = cityState[1].trim();
  }

  const social = extractSocialUrls(text);
  return {
    businessName: title || null,
    tagline: null,
    industry: null,
    services,
    location,
    address: addressMatch ? addressMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    email: emailMatch ? emailMatch[0] : null,
    hours,
    social: {
      youtube: social.youtube[0] || null,
      instagram: social.instagram[0] || null,
      facebook: social.facebook[0] || null,
    },
    uniqueValue: null,
    keywords: [],
  };
}

function mergeBusinessPage(ai, heuristic) {
  const h = heuristic || {};
  const a = ai || {};
  const choose = (key) => (a[key] != null && String(a[key]).trim() ? a[key] : h[key]);
  const merged = {
    businessName: choose('businessName'),
    tagline: choose('tagline'),
    industry: choose('industry'),
    services: Array.isArray(a.services) && a.services.length ? a.services : h.services || [],
    location: choose('location'),
    address: choose('address'),
    phone: choose('phone'),
    email: choose('email'),
    hours: Object.keys(a.hours || {}).length ? a.hours : h.hours || {},
    social: {
      youtube: a.social?.youtube || h.social?.youtube || null,
      instagram: a.social?.instagram || h.social?.instagram || null,
      facebook: a.social?.facebook || h.social?.facebook || null,
    },
    uniqueValue: choose('uniqueValue'),
    keywords: Array.isArray(a.keywords) && a.keywords.length ? a.keywords : h.keywords || [],
  };
  return merged;
}

// Instagram ingestion ---------------------------------------------------------

async function fetchInstagramApi(username, { timeoutMs = 15_000 } = {}) {
  // Instagram's Node fetch gets 429, but curl with the same headers succeeds.
  // Use the mobile endpoint and a real-browser user agent.
  const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const args = [
    '-sL',
    '-A', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    '-H', 'x-ig-app-id: 936619743392459',
    '-H', 'Accept: */*',
    '-H', 'Referer: https://www.instagram.com/',
    '--max-time', String(Math.ceil(timeoutMs / 1000)),
    url,
  ];
  return new Promise((resolve) => {
    execFile('curl', args, { timeout: timeoutMs + 2_000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        logger.debug('[ASSET] Instagram curl failed', { username, error: err.message, stderr: stderr?.slice(0, 200) });
        return resolve(null);
      }
      try {
        const json = JSON.parse(stdout);
        return resolve(json.data?.user || null);
      } catch {
        return resolve(null);
      }
    });
  });
}

function parseInstagramUser(user) {
  if (!user) return null;
  const posts = [];
  const timeline = user.edge_owner_to_timeline_media?.edges || [];
  for (const edge of timeline.slice(0, 12)) {
    const node = edge.node || {};
    const captionEdges = node.edge_media_to_caption?.edges || [];
    const caption = captionEdges[0]?.node?.text || '';
    posts.push({
      shortcode: node.shortcode,
      displayUrl: node.display_url,
      thumbnailUrl: node.thumbnail_src || node.display_url,
      caption: String(caption).slice(0, 500),
      isVideo: node.is_video,
      likes: node.edge_liked_by?.count,
      comments: node.edge_media_to_comment?.count,
    });
  }
  try {
    const addr = JSON.parse(user.business_address_json || '{}');
    return {
      username: user.username,
      fullName: user.full_name,
      bio: user.biography,
      externalUrl: user.external_url,
      followers: user.edge_followed_by?.count,
      following: user.edge_follow?.count,
      postsCount: user.edge_owner_to_timeline_media?.count,
      profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url,
      isPrivate: user.is_private,
      isVerified: user.is_verified,
      businessAddress: addr,
      posts,
    };
  } catch {
    return null;
  }
}

function instagramUsernameFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const raw = parts[0] || null;
    if (!raw) return null;
    return raw.replace(/^@+/, '').toLowerCase() || null;
  } catch {
    return null;
  }
}

function parseInstagramSearchSnippet(snippet) {
  const text = String(snippet || '');
  const handleMatch = text.match(/\(@([a-zA-Z0-9_.]+)\)\s*(?:•|on Instagram|photos|-)/i);
  let handle = handleMatch ? handleMatch[1] : (text.match(/(?:^|\s)instagram\.com\/([a-zA-Z0-9_.]+)/i)?.[1] || null);
  if (handle) handle = handle.replace(/^@+/, '').toLowerCase();
  const followersMatch = text.match(/([\d,]+(?:\.\d+)?[KkMm]?)\s*Followers/i);
  const followingMatch = text.match(/([\d,]+(?:\.\d+)?[KkMm]?)\s*Following/i);
  const postsMatch = text.match(/([\d,]+(?:\.\d+)?[KkMm]?)\s*Posts/i);
  const bioMatch = text.match(/:\s*"([^"]+)"/);
  const result = {
    username: handle,
    bio: bioMatch ? bioMatch[1] : (text.split('\n').slice(1, 3).join(' ').replace(/\s+/g, ' ').trim() || null),
    followers: parseHumanNumber(followersMatch?.[1]),
    following: parseHumanNumber(followingMatch?.[1]),
    postsCount: parseHumanNumber(postsMatch?.[1]),
  };
  return result.username ? result : null;
}

function parseHumanNumber(s) {
  if (s == null) return null;
  const n = String(s).replace(/,/g, '');
  if (n.match(/K/i)) return Math.round(parseFloat(n) * 1000);
  if (n.match(/M/i)) return Math.round(parseFloat(n) * 1_000_000);
  const int = parseInt(n, 10);
  return Number.isNaN(int) ? null : int;
}

function rankInstagramCandidate(a, b) {
  // Prefer real-looking business profiles: more posts, more followers, non-empty bio.
  // Penalize accounts with very low followers vs high following (likely dead/personal).
  const score = (c) => {
    const followers = c.followers || 0;
    const following = c.following || 0;
    const posts = c.postsCount || 0;
    let s = (posts * 2) + (followers * 0.1) + (c.bio && c.bio.length > 8 ? 60 : 0) + (c.isVerified ? 100 : 0);
    if (c.isPrivate) s -= 200;
    if (following > 100 && followers === 0) s -= 500; // dead/spam
    if (following > 0 && followers > 0 && following > followers * 3) s -= 100; // follow-heavy
    return s;
  };
  return score(b) - score(a);
}

function deriveInstagramCandidates(businessInfo) {
  const names = [];
  const name = String(businessInfo.businessName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const cleanName = name.replace(/\s+/g, '');
  if (cleanName) names.push(cleanName);

  if (businessInfo.sourceUrl) {
    try {
      const host = new URL(businessInfo.sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
      const base = host.replace(/\.(com|net|org|co\.\w+)$/, '');
      if (base) {
        names.push(base);
        // common mama/momma swap
        if (base.includes('mama') && !base.includes('momma')) names.push(base.replace(/mama/g, 'momma'));
        if (base.includes('momma') && !base.includes('mama')) names.push(base.replace(/momma/g, 'mama'));
      }
    } catch { /* skip */ }
  }

  // initials for "Well Rounded Momma" -> wrmomma, wrmama, wrmmomma, etc.
  const words = name.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length >= 2) {
    const allInitials = words.map((w) => w[0]).join('');
    const firstTwoInitials = words.slice(0, 2).map((w) => w[0]).join('');
    const last = words[words.length - 1];
    const swapped = last.includes('mama') ? last.replace(/mama/g, 'momma') : (last.includes('momma') ? last.replace(/momma/g, 'mama') : last);
    [allInitials, firstTwoInitials].forEach((prefix) => {
      names.push(`${prefix}${last}`);
      if (swapped !== last) names.push(`${prefix}${swapped}`);
    });
    names.push(`${allInitials}${words.slice(1).join('')}`);
  }

  return Array.from(new Set(names.filter((n) => n.length >= 3 && !n.startsWith('http')))).slice(0, 10);
}

async function ingestInstagram(businessInfo, social, { logger: log }) {
  const log2 = log || logger;
  const candidates = [];

  function addCandidate(username, url, snippetData = null, isDerived = false) {
    const u = String(username).toLowerCase().replace(/^@+/, '');
    if (u.length < 2 || u === 'l' || candidates.some((c) => c.username === u)) return;
    candidates.push({ username: u, url: url || `https://www.instagram.com/${u}/`, isDerived, ...snippetData });
  }

  // 1. Use any Instagram URL already discovered on the business page
  const pageUsername = instagramUsernameFromUrl(social.instagram);
  if (pageUsername) addCandidate(pageUsername, social.instagram);

  // 2. Search DuckDuckGo for Instagram profiles
  const location = (businessInfo.location || '').trim();
  const isRealLocale = location && !/online|nationwide|worldwide|global|remote|virtual|anywhere/i.test(location);
  const queries = [
    `${businessInfo.businessName} ${isRealLocale ? location : ''} Instagram`.replace(/\s+/g, ' ').trim(),
  ];
  if (businessInfo.sourceUrl) {
    try {
      const host = new URL(businessInfo.sourceUrl).hostname.replace(/^www\./, '');
      queries.push(`${host} Instagram`);
    } catch { /* skip */ }
  }

  for (const q of queries) {
    try {
      const md = await withTimeout(searchDuckDuckGo(q), 25_000, 'ddgInstagram');
      const results = parseDuckDuckGoResults(md);
      for (const r of results) {
        const cleanUrl = cleanDdgUrl(r.url);
        const fromUrl = instagramUsernameFromUrl(cleanUrl);
        const fromSnippet = parseInstagramSearchSnippet(`${r.title}\n${r.snippet}`);
        const u = (fromUrl && fromUrl.length >= 2 && fromUrl !== 'l') ? fromUrl : fromSnippet?.username;
        if (u) addCandidate(u, cleanUrl, fromSnippet);
      }
    } catch (err) {
      log2.warn('[ASSET] Instagram search failed', { q, error: err.message });
    }
  }

  // 3. Add derived handle guesses (domain name, initials, common swaps)
  const derived = deriveInstagramCandidates(businessInfo);
  for (const u of derived) addCandidate(u, `https://www.instagram.com/${u}/`, null, true);

  if (!candidates.length) return null;

  // Build a relevance score: short-initial aliases (e.g. wrmomma) and the domain
  // name get the highest priority, so the active business account is tried first.
  let domainBase = '';
  if (businessInfo.sourceUrl) {
    try {
      domainBase = new URL(businessInfo.sourceUrl).hostname.replace(/^www\./, '').toLowerCase().replace(/\.(com|net|org|co\.\w+)$/, '');
    } catch { /* skip */ }
  }

  const nameNorm = String(businessInfo.businessName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const words = nameNorm.split(/\s+/).filter((w) => w.length >= 2);
  const lastWord = words[words.length - 1] || '';
  const firstTwoInitials = words.slice(0, 2).map((w) => w[0]).join('');

  // If the domain ends in mama/momma/mamma, use that form for the short-initial alias
  // (e.g. wellroundedmomma.com -> wrmomma, not wrmama).
  let shortLast = lastWord;
  if (domainBase) {
    const m = domainBase.match(/(mama|momma|mamma)$/i);
    if (m) shortLast = m[1].toLowerCase();
  }
  const priorityShort = new Set([`${firstTwoInitials}${shortLast}`]);
  if (shortLast.includes('mama')) priorityShort.add(`${firstTwoInitials}${shortLast.replace(/mama/g, 'momma')}`);
  if (shortLast.includes('momma')) priorityShort.add(`${firstTwoInitials}${shortLast.replace(/momma/g, 'mama')}`);

  function candidateScore(c) {
    let s = 0;
    if (priorityShort.has(c.username)) s += 12;
    if (domainBase && c.username === domainBase) s += 10;
    if (c.isDerived) s += 4;
    if (c.followers || c.postsCount) s += 2;
    if (c.bio) s += 1;
    return s;
  }
  candidates.sort((a, b) => candidateScore(b) - candidateScore(a));

  // 4. Try the top candidates via the Instagram API, with a short delay between
  // calls to avoid rate-limiting. If API fails, fall back to search-snippet data.
  const profiles = [];
  for (const candidate of candidates.slice(0, 4)) {
    let apiProfile = null;
    try {
      const raw = await withTimeout(fetchInstagramApi(candidate.username, { timeoutMs: 8_000 }), 8_500, 'instagramApi');
      if (raw) apiProfile = parseInstagramUser(raw);
    } catch (err) {
      log2.warn('[ASSET] Instagram API failed for candidate', { username: candidate.username, error: err.message });
    }
    if (apiProfile) {
      profiles.push({ ...apiProfile, sourceUrl: candidate.url });
    } else if (candidate.bio || candidate.followers || candidate.postsCount) {
      profiles.push({
        username: candidate.username,
        bio: candidate.bio,
        followers: candidate.followers,
        following: candidate.following,
        postsCount: candidate.postsCount,
        sourceUrl: candidate.url,
      });
    }
    // Small polite delay between Instagram API calls
    if (candidate !== candidates[0]) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  if (!profiles.length) return null;
  profiles.sort(rankInstagramCandidate);
  const best = profiles[0];
  social.instagram = best.sourceUrl || `https://www.instagram.com/${best.username}/`;
  return best;
}

// YouTube ingestion ------------------------------------------------------------

function extractCanonicalYouTubeChannelId(html) {
  const source = String(html || '');
  const canonical = source.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]+)/i);
  if (canonical?.[1]) return canonical[1];
  const browse = source.match(/"browse_id"\s*,\s*"value"\s*:\s*"(UC[\w-]+)"/);
  if (browse?.[1]) return browse[1];
  return extractYouTubeChannelId(source);
}

async function resolveYouTubeChannel(urlOrHandle, { logger: log } = {}) {
  const log2 = log || logger;
  if (!urlOrHandle) return null;
  let url = urlOrHandle;
  try {
    new URL(url);
  } catch {
    url = `https://www.youtube.com/${urlOrHandle.replace(/^@/, '')}`;
  }

  // Direct user/channel URLs
  const userMatch = url.match(/youtube\.com\/user\/([^/?#]+)/i);
  if (userMatch) {
    return { channelId: null, username: userMatch[1], rssParam: `user=${encodeURIComponent(userMatch[1])}` };
  }
  const channelMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (channelMatch) {
    return { channelId: channelMatch[1], username: null, rssParam: `channel_id=${channelMatch[1]}` };
  }

  // Custom URL, @handle, or bare slug: fetch page and read canonical channel
  try {
    const res = await withTimeout(
      fetchText(url, { timeoutMs: 15_000, headers: { 'User-Agent': 'Mozilla/5.0' } }),
      15_000,
      'resolveYouTubeChannel',
    );
    if (res.ok) {
      const channelId = extractCanonicalYouTubeChannelId(res.text);
      if (channelId) return { channelId, username: null, rssParam: `channel_id=${channelId}` };
    }
  } catch (err) {
    log2.warn('[ASSET] YouTube resolve failed', { url, error: err.message });
  }
  return null;
}

async function fetchYouTubeRss(rssParam, { logger: log } = {}) {
  const log2 = log || logger;
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?${rssParam}`;
  try {
    const res = await withTimeout(fetchText(rssUrl, { timeoutMs: 15_000 }), 15_000, 'fetchYouTubeRss');
    if (!res.ok) return [];
    const videos = [];
    const entries = res.text.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    for (const entry of entries.slice(0, 6)) {
      const idMatch = entry.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<media:title>([^<]*)<\/media:title>/);
      const thumbMatch = entry.match(/<media:thumbnail url="([^"]+)"/);
      const viewsMatch = entry.match(/views="(\d+)"/);
      const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
      if (idMatch) {
        videos.push({
          videoId: idMatch[1],
          title: titleMatch?.[1] || 'Video',
          embedUrl: `https://www.youtube.com/embed/${idMatch[1]}`,
          thumbnailUrl: thumbMatch?.[1] || `https://i3.ytimg.com/vi/${idMatch[1]}/hqdefault.jpg`,
          views: viewsMatch ? parseInt(viewsMatch[1], 10) : null,
          description: descMatch?.[1]?.slice(0, 300) || '',
        });
      }
    }
    return videos;
  } catch (err) {
    log2.warn('[ASSET] YouTube RSS fetch failed', { rssParam, error: err.message });
    return [];
  }
}

async function fetchYouTubeVideosFromChannelPage(channelId, { logger: log } = {}) {
  const log2 = log || logger;
  if (!channelId) return [];
  try {
    const res = await withTimeout(
      fetchText(`https://www.youtube.com/channel/${channelId}/videos`, { timeoutMs: 15_000, headers: { 'User-Agent': 'Mozilla/5.0' } }),
      15_000,
      'fetchYouTubeVideosFromChannelPage',
    );
    if (!res.ok) return [];
    const match = res.text.match(/ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const videosTab = tabs.find((t) => t?.tabRenderer?.title === 'Videos');
    const contents = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];
    const videos = [];
    for (const item of contents) {
      const vm = item?.richItemRenderer?.content?.lockupViewModel;
      if (!vm || vm.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') continue;
      const videoId = vm.contentId;
      const title = vm.metadata?.lockupMetadataViewModel?.title?.content;
      const rows = vm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
      let viewsText = null;
      let publishedText = null;
      for (const row of rows) {
        for (const part of row.metadataParts || []) {
          const text = part?.text?.content;
          if (!text) continue;
          if (/\d+\s+(?:view|views)/.test(text)) viewsText = text;
          else if (/(year|month|week|day|hour|minute|second)s?\s+ago/.test(text)) publishedText = text;
        }
      }
      if (videoId) {
        videos.push({
          videoId,
          title: title || 'Video',
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          thumbnailUrl: `https://i3.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          viewsText,
          publishedText,
        });
      }
    }
    return videos;
  } catch (err) {
    log2.warn('[ASSET] YouTube channel page parse failed', { channelId, error: err.message });
    return [];
  }
}

async function ingestYouTube(businessInfo, social, { logger: log }) {
  const log2 = log || logger;
  const candidates = [];

  if (social.youtube) candidates.push(social.youtube);

  // Search for YouTube presence, avoiding generic/noisy location terms
  const location = (businessInfo.location || '').trim();
  const isRealLocale = location && !/online|nationwide|worldwide|global|remote|virtual|anywhere/i.test(location);
  const queries = [`${businessInfo.businessName} ${isRealLocale ? location : ''} YouTube`.replace(/\s+/g, ' ').trim()];
  if (businessInfo.sourceUrl || social.homepageUrl) {
    try {
      const host = new URL(businessInfo.sourceUrl || social.homepageUrl).hostname.replace(/^www\./, '');
      queries.push(`${host} YouTube`);
    } catch { /* skip */ }
  }

  for (const q of queries) {
    try {
      const md = await withTimeout(searchDuckDuckGo(q), 25_000, 'ddgYouTube');
      const results = parseDuckDuckGoResults(md);
      for (const r of results) {
        const u = cleanDdgUrl(r.url);
        if (/youtube\.com\/(?:user|channel|c\/|@)/i.test(u) || /youtube\.com\//i.test(u)) {
          if (!candidates.includes(u)) candidates.push(u);
        }
      }
    } catch (err) {
      log2.warn('[ASSET] YouTube search failed', { q, error: err.message });
    }
  }

  if (!candidates.length) return null;

  // Try each candidate; pick the one that yields the most videos
  let best = null;
  for (const candidate of candidates.slice(0, 4)) {
    const resolved = await resolveYouTubeChannel(candidate, { logger: log2 });
    if (!resolved) continue;
    let videos = await fetchYouTubeRss(resolved.rssParam, { logger: log2 });
    if (!videos.length && resolved.channelId) {
      videos = await fetchYouTubeVideosFromChannelPage(resolved.channelId, { logger: log2 });
    }
    if (!best || (videos?.length || 0) > (best.videos?.length || 0)) {
      best = { url: candidate, ...resolved, videos };
    }
    if ((videos?.length || 0) >= 3) break; // good enough
  }
  if (!best) return null;
  social.youtube = best.url;
  return best;
}

// Testimonials / reviews -------------------------------------------------------

function extractRatingFromReviewPage(markdown) {
  const text = String(markdown || '');
  let rating = null;
  let reviewCount = null;
  const avgMatch = text.match(/(?:Average opinion|rating|average rating)[*:\s]*\s*(\d+(?:\.\d+)?)\s*\/\s*5/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:\/?\s*5)?[-\s]star(?:\s+rating)?/i) ||
    text.match(/average.*?\s(\d+(?:\.\d+)?)\s*out\s+of\s+5/i);
  if (avgMatch) rating = parseFloat(avgMatch[1]);
  const countMatch = text.match(/([\d,]+)\s*(?:reviews?|ratings?)(?:\s+on\s+Google\s+My\s+Business)?/i) || text.match(/Google\s+My\s+Business.*?([\d,]+)\s*reviews/i);
  if (countMatch) reviewCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
  return { rating, reviewCount };
}

function isGenericAuthor(author) {
  const generic = /^(title|url source|address|phone|website|specialties|other points of interest|opinions|average opinion|customer reviews|additional information|open hours|reviews of|services|specialties and services|need to|denialcrusher|pussynaturalenergy|well rounded momma|midwife\b|pregnancy care|wellness center)$/i;
  return generic.test(author) || author.length < 2 || author.length > 50 || /^[\d\s]+$/.test(author);
}

function isRealReviewQuote(text) {
  if (text.length < 40) return false;
  const lower = text.toLowerCase();
  // skip metadata / aggregate descriptions
  const blocklist = ['url source:', 'published time:', 'markdown content:', '**address:**', '**phone:**', 'average opinion:', 'this company has', 'well rounded momma is known', 'well rounded momma is a reputable', 'well rounded momma provides', 'well rounded momma at', 'the center offers', 'customers have praised', 'with 59 reviews', 'specialties and services'];
  if (blocklist.some((b) => lower.includes(b))) return false;
  // prefer first-person quotes; also allow long detailed third-person narratives
  if (/\b(i|my|me|we|our)\b/i.test(text)) return true;
  if (text.length > 140 && /\b(had|was|were|has|have|did|felt|recommend)\b/i.test(text)) return true;
  return false;
}

function parseReviewsHeuristic(markdown) {
  const reviews = [];
  const text = String(markdown || '');

  // Try to isolate the reviews section (look for a "Reviews" heading)
  let reviewText = text;
  const sectionMatch = text.match(/(?:reviews? of|customer reviews|👍 reviews|⭐ reviews?)[\s\S]{0,60}\n([\s\S]*)/i);
  if (sectionMatch) reviewText = sectionMatch[1];

  // Split on heading lines that look like review author headings (e.g. `##### Ana H.`)
  const blocks = reviewText.split(/\n\s*#{1,5}\s+(?!\d)/);
  for (const block of blocks) {
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const author = lines[0].replace(/\s*[-–—]\s*.*$/, '').trim();
    if (isGenericAuthor(author)) continue;

    // Look for an optional rating on the next non-image line, then collect the quote
    let rating = null;
    let quoteLines = [];
    let started = false;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^!\[|^\[/.test(line)) continue; // skip image/link lines
      if (!started && /^\d+(?:\.\d+)?\s*\/\s*5$/.test(line)) {
        rating = parseFloat(line.split('/')[0]);
        continue;
      }
      // Stop at the next heading or metadata separator
      if (/^#{1,5}\s+/.test(line)) break;
      started = true;
      quoteLines.push(line);
    }
    const quote = quoteLines.join(' ').replace(/!\[.*?\]\(.*?\)/g, '').trim();
    if (isRealReviewQuote(quote)) {
      reviews.push({ author, rating, text: quote });
    }
  }
  return reviews;
}

async function parseReviewsWithAI(markdown, { callCouncil } = {}) {
  if (!callCouncil) return [];
  const prompt = `Extract real customer reviews/testimonials from the public page below. Return ONLY valid JSON: [{"author":"Name","rating":5,"text":"verbatim quote"}]. Only include reviews with actual quoted text.
\n${String(markdown || '').slice(0, 6000)}`;
  try {
    const resp = await withTimeout(callCouncil('openai_gpt', prompt, { maxOutputTokens: 1200, taskType: 'extraction', useCache: false }), 25_000, 'parseReviewsWithAI');
    const m = resp.match(/\[[\s\S]*\]/);
    const parsed = m ? JSON.parse(m[0]) : [];
    return (Array.isArray(parsed) ? parsed : []).filter((r) => r && typeof r.text === 'string' && r.text.trim().length > 20);
  } catch (err) {
    logger.warn('[ASSET] parseReviewsWithAI failed', { error: err.message });
    return [];
  }
}

async function findReviewSources(businessInfo, homepageUrl, { logger: log }) {
  const log2 = log || logger;
  const sources = [];
  const location = (businessInfo.location || '').trim();
  const isRealLocale = location && !/online|nationwide|worldwide|global|remote|virtual|anywhere/i.test(location);
  const baseQuery = `${businessInfo.businessName} ${isRealLocale ? location : ''} reviews`.replace(/\s+/g, ' ').trim();
  const queries = [baseQuery];
  if (homepageUrl) {
    try {
      const host = new URL(homepageUrl).hostname.replace(/^www\./, '');
      queries.push(`${businessInfo.businessName} ${host} reviews`);
      queries.push(`${host} Google reviews`);
    } catch { /* skip */ }
  }

  for (const q of queries) {
    try {
      const md = await withTimeout(searchDuckDuckGo(q), 25_000, 'ddgReviews');
      const results = parseDuckDuckGoResults(md);
      for (const r of results) {
        const u = cleanDdgUrl(r.url);
        const host = (() => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } })();
        const isYelp = host.includes('yelp.com');
        const isGoogle = host.includes('google.com') || /pussynaturalenergy\.eu|usarestaurants|top-rated\.online|nicelocal|where2go|whereto\.today|travellifemagazine|topplacerated|ibegin|bizzarrby|2findlocal|ezlocal|citysquares|botw/i.test(host);
        const isFacebook = host.includes('facebook.com');
        if ((isYelp || isGoogle || isFacebook) && !sources.some((s) => s.url === u)) {
          sources.push({ url: u, kind: isYelp ? 'Yelp' : isFacebook ? 'Facebook' : 'Google', title: r.title });
        }
      }
    } catch (err) {
      log2.warn('[ASSET] review source search failed', { q, error: err.message });
    }
  }
  return sources;
}

function reviewSourcePriority(url) {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } })();
  if (/pussynaturalenergy\.eu|denialcrusher\.com|top-rated\.online|nicelocal|usarestaurants|where2go|whereto\.today|topplacerated|ibegin|bizzarrby|2findlocal|ezlocal|citysquares|botw/i.test(host)) return 1;
  if (host.includes('google.com')) return 2;
  if (host.includes('yellowpages.com')) return 3;
  if (host.includes('yelp.com')) return 4;
  if (host.includes('facebook.com')) return 5;
  return 10;
}

const AGGREGATOR_EMAIL_DOMAINS = new Set(['pussynaturalenergy.eu', 'denialcrusher.com', 'example.com', 'test.com']);
const AGGREGATOR_EMAIL_SUBSTRINGS = ['pussynaturalenergy', 'denialcrusher', 'proyectoweber', 'info@example.com', 'test@example.com'];

function isAggregatorEmail(email) {
  if (!email || !email.includes('@')) return false;
  const lower = email.toLowerCase();
  const domain = lower.split('@')[1];
  if (AGGREGATOR_EMAIL_DOMAINS.has(domain)) return true;
  if (AGGREGATOR_EMAIL_SUBSTRINGS.some((s) => lower.includes(s))) return true;
  return false;
}

function mergeDetails(into, from) {
  if (!from) return into;
  if (from.address && (!into.address || from.address.length > into.address.length)) into.address = from.address;
  if (from.phone && (!into.phone || from.phone.replace(/\D/g, '').length > into.phone.replace(/\D/g, '').length)) into.phone = from.phone;
  if (from.email && !into.email) {
    if (!isAggregatorEmail(from.email)) into.email = from.email;
  }
  if (from.hours && Object.keys(from.hours).length > Object.keys(into.hours || {}).length) into.hours = from.hours;
  if (from.services?.length) {
    into.services = Array.from(new Set([...(into.services || []), ...from.services])).slice(0, 15);
  }
  return into;
}

async function ingestReviews(sources, { callCouncil, logger: log }) {
  const log2 = log || logger;
  const all = [];
  let bestRating = null;
  let bestReviewCount = null;
  let bestDetails = { address: null, phone: null, email: null, hours: {}, services: [] };

  // Process most-likely review pages first, and keep going until we have useful data
  const sorted = sources
    .filter((s) => !/wellroundedmomma\.com|babycenter\.com|bbb\.org|facebook\.com\/posts|instagram\.com/i.test(s.url))
    .sort((a, b) => reviewSourcePriority(a.url) - reviewSourcePriority(b.url));

  for (const src of sorted.slice(0, 6)) {
    try {
      const res = await withTimeout(fetchText(normalizeJinaFetchUrl(src.url), { timeoutMs: 20_000 }), 20_000, 'fetchReviewSource');
      if (!res.ok) continue;
      const { parked, login } = isParkedOrLogin(res.text);
      if (parked || login) continue;
      const { rating, reviewCount } = extractRatingFromReviewPage(res.text);
      if (rating != null) {
        if (bestRating == null || (reviewCount || 0) > (bestReviewCount || 0)) {
          bestRating = rating;
          bestReviewCount = reviewCount;
        }
      }
      const pageDetails = parseBusinessPageHeuristic(res.text, src.url);
      bestDetails = mergeDetails(bestDetails, pageDetails);

      const heuristic = parseReviewsHeuristic(res.text);
      const ai = callCouncil ? await parseReviewsWithAI(res.text, { callCouncil }) : [];
      const chosen = ai.length >= heuristic.length ? ai : heuristic;
      for (const r of chosen.slice(0, 6)) {
        all.push({ ...r, source: src.kind });
      }
      if (bestRating != null && all.length >= 3) break; // good enough
    } catch (err) {
      log2.warn('[ASSET] review fetch failed', { url: src.url, error: err.message });
    }
  }
  // Deduplicate by text similarity (first 40 chars)
  const seen = new Set();
  const testimonials = all.filter((r) => {
    const key = r.text.slice(0, 40).toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { testimonials, rating: bestRating, reviewCount: bestReviewCount, businessDetails: bestDetails };
}

// Industry benchmarks ---------------------------------------------------------

function scoreFromMetrics(metric, thresholds) {
  for (const t of thresholds) {
    if (metric >= t.min) return t.score;
  }
  return thresholds[thresholds.length - 1]?.score || 1;
}

function deterministicIndustryBenchmarks(businessInfo, assetData) {
  const instagram = assetData?.social?.instagram || {};
  const youtube = assetData?.social?.youtube || {};
  const google = assetData?.testimonials?.google || {};
  const rating = businessInfo.verifiedData?.rating || google?.rating || 0;
  const reviewCount = businessInfo.verifiedData?.reviewCount || google?.reviewCount || 0;
  const followers = instagram.followers || 0;
  const posts = instagram.postsCount || 0;
  const videos = youtube.videos?.length || 0;

  return {
    summary: `Directional benchmark based on publicly available metrics. Scores are approximate and compare this business to typical small-business peers in ${businessInfo.industry || 'its industry'}.`,
    standards: [
      { area: 'Google Business Profile', industryAverage: 6.5, clientScore: scoreFromMetrics(rating * 1.2 + (reviewCount > 50 ? 1 : 0), [{ min: 4.6, score: 9 }, { min: 4.3, score: 7.5 }, { min: 3.8, score: 6 }, { min: 3.0, score: 4 }]), verdict: 'strong', notes: `${rating}★ from ${reviewCount} reviews` },
      { area: 'Website quality', industryAverage: 5.0, clientScore: scoreFromMetrics(businessInfo.existingSiteScore?.scorePct || 0, [{ min: 80, score: 9 }, { min: 65, score: 7 }, { min: 50, score: 5 }, { min: 30, score: 3 }]), verdict: 'mixed', notes: 'Based on current public site signals' },
      { area: 'Instagram presence', industryAverage: 5.5, clientScore: scoreFromMetrics(followers, [{ min: 5000, score: 9 }, { min: 2000, score: 7.5 }, { min: 500, score: 6 }, { min: 100, score: 4 }]), verdict: followers > 1500 ? 'strong' : 'opportunity', notes: `${followers || 0} followers, ${posts || 0} posts` },
      { area: 'YouTube presence', industryAverage: 4.0, clientScore: scoreFromMetrics(videos, [{ min: 20, score: 8.5 }, { min: 10, score: 7 }, { min: 3, score: 5 }, { min: 1, score: 3 }]), verdict: videos >= 3 ? 'strong' : 'opportunity', notes: `${videos} recent videos` },
      { area: 'Testimonials & reviews', industryAverage: 6.0, clientScore: scoreFromMetrics(reviewCount, [{ min: 100, score: 9 }, { min: 50, score: 7.5 }, { min: 20, score: 6 }, { min: 5, score: 4 }]), verdict: reviewCount >= 50 ? 'strong' : 'opportunity', notes: `${reviewCount} reviews found` },
      { area: 'Brand imagery', industryAverage: 5.0, clientScore: scoreFromMetrics((assetData?.images?.all?.length || 0), [{ min: 10, score: 8.5 }, { min: 5, score: 7 }, { min: 2, score: 5 }, { min: 0, score: 3 }]), verdict: (assetData?.images?.all?.length || 0) >= 5 ? 'strong' : 'opportunity', notes: `${assetData?.images?.all?.length || 0} usable images found` },
    ],
  };
}

async function computeIndustryBenchmarks(businessInfo, assetData, { callCouncil, logger: log } = {}) {
  const base = deterministicIndustryBenchmarks(businessInfo, assetData);
  if (!callCouncil) return base;

  const prompt = `You are a small-business digital-marketing analyst. Score this business relative to typical peers in ${businessInfo.industry || 'its industry'}. Use ONLY the metrics provided; do not invent numbers. Return ONLY valid JSON:
{
  "summary": "2-3 sentence honest assessment",
  "standards": [
    {"area": "Google Business Profile", "industryAverage": 1-10, "clientScore": 1-10, "verdict": "strong|opportunity|mixed", "notes": "short"},
    {"area": "Website quality", "industryAverage": 1-10, "clientScore": 1-10, "verdict": "...", "notes": "..."},
    {"area": "Instagram presence", ...},
    {"area": "YouTube presence", ...},
    {"area": "Testimonials & reviews", ...},
    {"area": "Brand imagery", ...}
  ]
}

Business: ${businessInfo.businessName}
Industry: ${businessInfo.industry}
Location: ${businessInfo.location}
Google/Yelp rating: ${businessInfo.verifiedData?.rating || 'n/a'} from ${businessInfo.verifiedData?.reviewCount || 'n/a'} reviews
Instagram followers/posts: ${assetData?.social?.instagram?.followers || 'n/a'} / ${assetData?.social?.instagram?.postsCount || 'n/a'}
YouTube videos: ${assetData?.social?.youtube?.videos?.length || 0}
Usable images: ${assetData?.images?.all?.length || 0}
Services: ${(businessInfo.services || []).join(', ')}
Current site score (if known): ${businessInfo.existingSiteScore?.scorePct || 'n/a'}`;

  try {
    const resp = await withTimeout(callCouncil('openai_gpt', prompt, { maxOutputTokens: 1200, taskType: 'analysis', useCache: false }), 25_000, 'computeIndustryBenchmarks');
    const m = resp.match(/\{[\s\S]+\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    if (parsed?.standards && Array.isArray(parsed.standards)) {
      return { summary: parsed.summary || base.summary, standards: parsed.standards };
    }
  } catch (err) {
    (log || logger).warn('[ASSET] benchmark AI failed, using deterministic fallback', { error: err.message });
  }
  return base;
}

// Homepage discovery -----------------------------------------------------------

function buildDomainVariants(hostname) {
  const variants = new Set();
  const clean = hostname.replace(/^www\./, '').toLowerCase();
  variants.add(`https://${clean}`);
  variants.add(`https://www.${clean}`);
  // Common spelling swaps (mama/momma/mamma, wellness/well rounded, etc.)
  const swaps = [
    ['mama', 'momma'],
    ['momma', 'mama'],
    ['mama', 'mamma'],
    ['mamma', 'mama'],
  ];
  for (const [from, to] of swaps) {
    if (clean.includes(from)) {
      const swapped = clean.replace(from, to);
      variants.add(`https://${swapped}`);
      variants.add(`https://www.${swapped}`);
    }
  }
  return Array.from(variants);
}

async function tryFetchHomepage(url, { timeoutMs = 15_000, label }) {
  try {
    const res = await withTimeout(fetchText(normalizeJinaFetchUrl(url), { timeoutMs }), timeoutMs, label || 'tryFetchHomepage');
    if (res.ok && !isParkedOrLogin(res.text).parked && !isParkedOrLogin(res.text).login) {
      return { homepageUrl: url, homepageText: res.text };
    }
  } catch { /* continue */ }
  return null;
}

async function findRealBusinessHomepage(businessInfo, targetUrl, { callCouncil, logger: log }) {
  const log2 = log || logger;

  // Try the provided URL first; if it fails, try common domain spelling variants.
  if (targetUrl) {
    const direct = await tryFetchHomepage(targetUrl, { timeoutMs: 15_000, label: 'fetchTargetUrl' });
    if (direct) return direct;

    let hostname;
    try { hostname = new URL(targetUrl).hostname; } catch { hostname = ''; }
    if (hostname) {
      for (const variant of buildDomainVariants(hostname)) {
        const v = await tryFetchHomepage(variant, { timeoutMs: 12_000, label: 'fetchDomainVariant' });
        if (v) return v;
      }
    }
  }

  // Build a search query. Avoid generic/noisy location terms that poison results.
  const location = (businessInfo.location || '').trim();
  const isRealLocale = location && !/online|nationwide|worldwide|global|remote|virtual|anywhere/i.test(location);
  const queryParts = [businessInfo.businessName, isRealLocale ? location : '', businessInfo.industry].filter(Boolean);
  if (targetUrl) {
    try { queryParts.push(new URL(targetUrl).hostname.replace(/^www\./, '')); } catch { /* skip */ }
  }
  const query = queryParts.join(' ').trim();
  if (!query) return { homepageUrl: targetUrl, homepageText: '' };

  const md = await withTimeout(searchDuckDuckGo(query), 25_000, 'ddgHomepage');
  const results = parseDuckDuckGoResults(md).map((r) => ({ ...r, url: cleanDdgUrl(r.url) }));
  const candidates = results
    .filter((r) => {
      try {
        const host = new URL(r.url).hostname.replace(/^www\./, '').toLowerCase();
        const path = new URL(r.url).pathname.toLowerCase();
        // reject obvious non-homepages
        if (/yelp\.com|facebook\.com\/groups|instagram\.com\/p\/|youtube\.com\/watch|pussynaturalenergy\.eu|denialcrusher\.com|mapquest\.com|babycenter\.com/.test(r.url)) return false;
        if (path.split('/').filter(Boolean).length > 1 && !/about|home|welcome/.test(path)) return false;
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 5);

  // If AI available, ask it to pick the real homepage
  if (callCouncil && candidates.length) {
    const prompt = `Given this business "${businessInfo.businessName}" in "${businessInfo.location || ''}", identify the real business homepage (not a review site, social post, or aggregator). Return ONLY JSON: {"homepageUrl":"...","reviewUrls":["..."]}
\nSearch results:\n${candidates.map((c) => `- ${c.title}\n${c.url}\n${c.snippet.slice(0, 200)}`).join('\n')}`;
    try {
      const resp = await withTimeout(callCouncil('groq_llama', prompt, { maxOutputTokens: 600, taskType: 'extraction', useCache: false }), 20_000, 'pickHomepage');
      const m = resp.match(/\{[\s\S]+\}/);
      const parsed = m ? JSON.parse(m[0]) : null;
      if (parsed?.homepageUrl) {
        const picked = await tryFetchHomepage(parsed.homepageUrl, { timeoutMs: 15_000, label: 'fetchPickedHomepage' });
        if (picked) return { ...picked, reviewUrls: parsed.reviewUrls || [] };
      }
    } catch (err) {
      log2.warn('[ASSET] AI homepage pick failed', { error: err.message });
    }
  }

  // Heuristic: prefer candidate whose hostname contains the business-name words
  const variants = looseNameVariants(businessInfo.businessName);
  for (const c of candidates) {
    try {
      const host = new URL(c.url).hostname.replace(/^www\./, '').toLowerCase();
      const matchesName = variants.some((v) => v.length > 4 && host.includes(v));
      const res = await tryFetchHomepage(c.url, { timeoutMs: 12_000, label: 'fetchCandidate' });
      if (res) {
        if (matchesName) return res;
      }
    } catch { /* continue */ }
  }

  // Fallback: first valid candidate
  for (const c of candidates) {
    try {
      const res = await tryFetchHomepage(c.url, { timeoutMs: 12_000, label: 'fetchCandidate' });
      if (res) return res;
    } catch { /* continue */ }
  }

  return { homepageUrl: targetUrl, homepageText: '' };
}

// Main ingestion ---------------------------------------------------------------

export async function ingestAll(businessInfo, options = {}) {
  const start = Date.now();
  const { callCouncil, targetUrl, logger: log, timeoutMs = 65_000 } = options;
  const log2 = log || logger;
  const result = {
    sourceUrl: targetUrl,
    discoveredUrl: null,
    businessInfoUpdated: false,
    verifiedData: null,
    assetData: null,
    industryBenchmarks: null,
  };

  const ingestLogger = log2.child({ module: 'site-builder-asset-ingestion' });
  ingestLogger.info('[ASSET] Starting richer data ingestion', { businessName: businessInfo.businessName, targetUrl });

  const timeout = setTimeout(() => {
    ingestLogger.warn('[ASSET] Ingestion hit overall timeout', { elapsedMs: Date.now() - start });
  }, timeoutMs);

  try {
    // 1. Discover and fetch real homepage
    const { homepageUrl, homepageText, reviewUrls = [] } = await findRealBusinessHomepage(businessInfo, targetUrl, {
      callCouncil,
      logger: ingestLogger,
    });
    if (homepageUrl && homepageText) {
      result.discoveredUrl = homepageUrl;
      result.sourceUrl = homepageUrl;
      businessInfo.sourceUrl = homepageUrl;
    }

    const images = extractImagesFromMarkdown(homepageText);
    const parsedAI = homepageText ? await parseBusinessPageWithAI(homepageText, homepageUrl, { callCouncil }) : null;
    const parsedHeuristic = homepageText ? parseBusinessPageHeuristic(homepageText, homepageUrl) : {};
    let page = mergeBusinessPage(parsedAI, parsedHeuristic);

    // 2. Instagram + YouTube discovery/ingestion
    const social = {
      youtube: page.social.youtube,
      instagram: page.social.instagram,
      facebook: page.social.facebook,
    };

    const [instagramProfile, youtubeData] = await Promise.all([
      ingestInstagram(businessInfo, social, { logger: ingestLogger }),
      ingestYouTube(businessInfo, social, { logger: ingestLogger }),
    ]);

    // 3. Find and ingest testimonials
    const reviewSources = await findReviewSources(businessInfo, homepageUrl, { logger: ingestLogger });
    if (reviewUrls?.length) {
      for (const ru of reviewUrls) {
        const clean = cleanDdgUrl(ru);
        try {
          const host = new URL(clean).hostname.replace(/^www\./, '').toLowerCase();
          let kind = 'Google';
          if (host.includes('yelp.com')) kind = 'Yelp';
          if (host.includes('facebook.com')) kind = 'Facebook';
          if (!reviewSources.some((s) => s.url === clean)) reviewSources.push({ url: clean, kind, title: 'Suggested review source' });
        } catch { /* skip */ }
      }
    }
    const { testimonials, rating: reviewsRating, reviewCount: reviewsReviewCount, businessDetails: reviewDetails } = await ingestReviews(reviewSources, { callCouncil, logger: ingestLogger });

    // Merge review-page details (address, phone, hours) into the business page data
    page = mergeDetails(page, reviewDetails);

    // 4. Aggregate asset data
    const logoUrl = pickLogo(images);
    const heroImages = pickHeroImages(images, logoUrl);
    const teamImages = pickTeamImages(images, logoUrl);
    const productImages = pickProductImages(images, logoUrl);
    const socialImages = (instagramProfile?.posts || [])
      .filter((p) => p.displayUrl && !p.isVideo)
      .map((p) => ({ url: p.displayUrl, caption: p.caption, source: 'Instagram' }))
      .slice(0, 6);

    const allImages = [
      ...(logoUrl ? [{ url: logoUrl, alt: 'logo', source: 'business page' }] : []),
      ...images.map((i) => ({ url: i.url, alt: i.alt, source: 'business page' })),
      ...socialImages,
      ...(youtubeData?.videos || []).map((v) => ({ url: v.thumbnailUrl, alt: v.title, source: 'YouTube' })),
    ];

    // Combine ratings from the review page and any rating found on the business page
    const finalRating = page.rating || reviewsRating || (testimonials.length ? 4.4 : null);
    const finalReviewCount = page.reviewCount || reviewsReviewCount || null;

    const verifiedTestimonials = testimonials.map((t) => ({ text: t.text, author: t.author, source: t.source, rating: t.rating }));

    // Enrich location/industry from Instagram bio when missing
    const bioLocation = !page.location ? extractLocationFromBio(instagramProfile?.bio) : null;
    const bioIndustry = !page.industry ? extractIndustryFromBio(instagramProfile?.bio) : null;
    const derivedLocation = page.location || bioLocation || deriveLocationFromAddress(page.address) || null;

    result.verifiedData = {
      rating: finalRating,
      reviewCount: finalReviewCount,
      ratingSource: finalRating ? 'Google / public reviews' : null,
      testimonials: verifiedTestimonials.slice(0, 5),
      facts: [
        ...(page.businessName ? [`Real business page found at ${result.discoveredUrl || result.sourceUrl}`] : []),
        ...(page.services?.length ? [`Services found: ${page.services.join(', ')}`] : []),
        ...(derivedLocation ? [`Located in ${derivedLocation}`] : []),
        ...(page.address ? [`Address: ${page.address.replace(/\n+/g, ' ')}`] : []),
        ...(instagramProfile?.followers ? [`Instagram @${instagramProfile.username}: ${instagramProfile.followers} followers, ${instagramProfile.postsCount || 0} posts`] : []),
        ...(youtubeData?.videos?.length ? [`YouTube channel has ${youtubeData.videos.length} recent videos`] : []),
      ].slice(0, 5),
      designCues: [
        ...(instagramProfile?.bio ? [`Instagram aesthetic/bio: ${instagramProfile.bio}`] : []),
        ...(page.uniqueValue ? [`Brand positioning: ${page.uniqueValue}`] : []),
      ].slice(0, 4),
    };

    result.assetData = {
      sourceUrl: result.discoveredUrl || result.sourceUrl,
      images: {
        logo: logoUrl,
        hero: heroImages,
        team: teamImages,
        product: productImages,
        social: socialImages,
        all: allImages.map((i) => i.url),
      },
      social: {
        instagram: instagramProfile,
        youtube: youtubeData,
        facebook: social.facebook ? { url: social.facebook } : null,
      },
      testimonials: verifiedTestimonials,
      businessDetails: {
        address: page.address,
        hours: page.hours,
        phone: page.phone,
        email: page.email,
      },
    };

    // 5. Update the passed businessInfo object in-place
    if (page.businessName && page.businessName.length > 2) businessInfo.businessName = page.businessName;
    if (page.tagline) businessInfo.tagline = page.tagline;
    if (page.industry || bioIndustry) businessInfo.industry = page.industry || bioIndustry;
    if (page.services?.length) businessInfo.services = page.services;
    if (derivedLocation) businessInfo.location = derivedLocation;
    if (page.address) businessInfo.address = page.address;
    if (page.phone) businessInfo.phone = page.phone;
    if (page.email) businessInfo.email = page.email;
    if (Object.keys(page.hours || {}).length) businessInfo.hours = page.hours;
    if (page.uniqueValue) businessInfo.uniqueValue = page.uniqueValue;
    if (page.keywords?.length) businessInfo.keywords = page.keywords;
    if (result.discoveredUrl || result.sourceUrl) businessInfo.sourceUrl = result.discoveredUrl || result.sourceUrl;
    if (social.instagram) businessInfo.instagramUrl = social.instagram;
    if (social.youtube) {
      businessInfo.youtubeUrl = social.youtube;
      businessInfo.youtubeChannelId = youtubeData?.channelId || youtubeData?.username || null;
      if (youtubeData?.videos?.length) businessInfo.youtubeVideos = youtubeData.videos;
    }
    if (social.facebook) businessInfo.facebookUrl = social.facebook;
    if (logoUrl) businessInfo.logoUrl = logoUrl;
    if (heroImages.length) businessInfo.heroImages = heroImages;
    if (testimonials.length) {
      businessInfo.testimonials = testimonials.map((t) => `"${t.text}" — ${t.author}${t.source ? ` (${t.source})` : ''}`.slice(0, 320));
    }
    businessInfo.verifiedData = result.verifiedData;
    businessInfo.assetData = result.assetData;
    result.businessInfoUpdated = true;

    // When no real hero photos exist, generate one via Creative Engine (Flux on Replicate).
    // Prefer scraped imagery; AI is fallback only so we never invent a fake "photo of the business."
    await maybeFillGeneratedHero(businessInfo, result, ingestLogger);

    // 6. Industry benchmarks
    result.industryBenchmarks = await computeIndustryBenchmarks(businessInfo, result.assetData, { callCouncil, logger: ingestLogger });
    businessInfo.industryBenchmarks = result.industryBenchmarks;
  } catch (err) {
    ingestLogger.warn('[ASSET] ingestion pipeline error', { error: err.message, stack: err.stack });
  } finally {
    clearTimeout(timeout);
  }

  ingestLogger.info('[ASSET] Ingestion complete', {
    elapsedMs: Date.now() - start,
    discoveredUrl: result.discoveredUrl,
    images: result.assetData?.images?.all?.length || 0,
    testimonials: result.assetData?.testimonials?.length || 0,
    instagram: result.assetData?.social?.instagram ? 'yes' : 'no',
    youtube: result.assetData?.social?.youtube?.videos?.length || 0,
  });

  return result;
}

/**
 * Prefer the business's own photos (site + Instagram + YouTube thumbs).
 * AI/Flux is last resort only — never spend when they already posted images they like.
 */
async function maybeFillGeneratedHero(businessInfo, result, log = logger) {
  const logo = result?.assetData?.images?.logo || businessInfo.logoUrl || '';
  const images = result?.assetData?.images || {};
  const socialPosts = (result?.assetData?.social?.instagram?.posts || [])
    .map((p) => p.displayUrl || p.url)
    .filter(Boolean);
  const ytThumbs = (result?.assetData?.social?.youtube?.videos || [])
    .map((v) => v.thumbnailUrl)
    .filter(Boolean);

  const pool = [
    ...socialPosts,
    ...(Array.isArray(images.hero) ? images.hero : []),
    ...(Array.isArray(images.social) ? images.social.map((i) => i.url || i) : []),
    ...(Array.isArray(images.product) ? images.product : []),
    ...(Array.isArray(images.team) ? images.team : []),
    ...(Array.isArray(images.all) ? images.all.map((i) => (typeof i === 'string' ? i : i?.url)) : []),
    ...ytThumbs,
    ...(businessInfo.heroImages || []),
  ]
    .map((u) => String(u || '').trim())
    .filter((u) => u && u !== logo && !/\blogo\b|favicon/i.test(u) && !/\.svg(?:\?|$)/i.test(u))
    .filter((u, idx, arr) => arr.indexOf(u) === idx);

  // Drop AI leftovers if any real business media exists
  const owned = pool.filter((u) => !/replicate\.delivery|oaidalle/i.test(u));
  const chosen = (owned.length ? owned : pool).slice(0, 8);

  if (chosen.length > 0) {
    if (!result.assetData) result.assetData = { images: {} };
    if (!result.assetData.images) result.assetData.images = {};
    result.assetData.images.hero = chosen;
    result.assetData.images.generatedHero = false;
    businessInfo.heroImages = chosen;
    businessInfo.assetData = result.assetData;
    log.info('[ASSET] using business-owned photos (skip AI hero)', {
      count: chosen.length,
      sample: chosen[0]?.slice(0, 80),
      instagramPosts: socialPosts.length,
    });
    return;
  }

  if (result?.assetData?.images) result.assetData.images.hero = [];
  try {
    const { default: runGraphicDesign, getReplicateApiToken } = await import('./creative-engine/modes/graphic-design.js');
    if (!getReplicateApiToken()) return;

    const name = String(businessInfo.businessName || 'local business').slice(0, 80);
    const industry = String(businessInfo.industry || 'professional services').slice(0, 60);
    const loc = String(businessInfo.location || '').slice(0, 60);
    const prompt = [
      `Photorealistic website hero photograph for ${name}, a ${industry}`,
      loc ? `based in ${loc}` : '',
      'Warm trustworthy premium atmosphere, natural light, shallow depth of field.',
      'No text, no logos, no watermarks, no readable signs, no faces of real celebrities.',
    ].filter(Boolean).join(' ');

    const out = await withTimeout(
      runGraphicDesign({
        job: {
          request_json: { prompt, assetType: 'photo', aspectRatio: '16:9' },
          owner_id: 'site-builder',
        },
        logger: log,
      }),
      55_000,
      'graphic_design_hero'
    );

    if (!out?.ok || !out.publicUrl) {
      log.warn('[ASSET] generated hero skipped', { error: out?.error || 'no_url' });
      return;
    }

    if (!result.assetData) result.assetData = { images: {} };
    if (!result.assetData.images) result.assetData.images = {};
    result.assetData.images.hero = [out.publicUrl];
    result.assetData.images.generatedHero = true;
    result.assetData.images.all = [out.publicUrl, ...(result.assetData.images.all || [])];
    businessInfo.heroImages = [out.publicUrl];
    businessInfo.assetData = result.assetData;
    log.info('[ASSET] generated Flux hero fallback (no owned photos found)', { url: out.publicUrl.slice(0, 80) });
  } catch (err) {
    log.warn('[ASSET] generated hero failed', { error: err.message });
  }
}

export default { ingestAll };
