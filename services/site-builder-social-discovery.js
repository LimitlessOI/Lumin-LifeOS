/**
 * SYNOPSIS: Exports extractYouTubeChannelId — services/site-builder-social-discovery.js.
 */
const DEFAULT_TIMEOUT_MS = 3000;

const SOCIAL_PATTERNS = {
  youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'<>),]+/gi,
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[^\s"'<>),]+/gi,
  facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/[^\s"'<>),]+/gi,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/[^\s"'<>),]+/gi,
};

const URLISH_KEYS = new Set([
  "url",
  "website",
  "site",
  "homepage",
  "link",
  "href",
  "youtube",
  "youtubeUrl",
  "youtube_url",
  "instagram",
  "instagramUrl",
  "instagram_url",
  "facebook",
  "facebookUrl",
  "facebook_url",
  "tiktok",
  "tiktokUrl",
  "tiktok_url",
]);

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(value) {
  const text = asString(value);
  if (!text) return null;

  const cleaned = text.replace(/[)\].,;!?]+$/g, "");
  if (!cleaned) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isYouTubeUrl(url) {
  const host = hostnameOf(url);
  return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
}

function isInstagramUrl(url) {
  const host = hostnameOf(url);
  return host === "instagram.com" || host.endsWith(".instagram.com");
}

function isFacebookUrl(url) {
  const host = hostnameOf(url);
  return host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com";
}

function isTikTokUrl(url) {
  const host = hostnameOf(url);
  return host === "tiktok.com" || host.endsWith(".tiktok.com");
}

function classifyUrl(url) {
  if (isYouTubeUrl(url)) return "youtube";
  if (isInstagramUrl(url)) return "instagram";
  if (isFacebookUrl(url)) return "facebook";
  if (isTikTokUrl(url)) return "tiktok";
  return "others";
}

function collectStrings(value, out = [], depth = 0, keyHint = "") {
  if (depth > 6 || value == null) return out;

  if (typeof value === "string") {
    if (!keyHint || URLISH_KEYS.has(keyHint) || /https?:\/\/|www\.|youtube\.|youtu\.be|instagram\.|facebook\.|fb\.com|tiktok\./i.test(value)) {
      out.push(value);
    }
    return out;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out, depth + 1, keyHint);
    return out;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, out, depth + 1, key);
    }
  }

  return out;
}

function extractSocialUrlsFromText(text) {
  const urls = [];
  const source = asString(text);
  if (!source) return urls;

  for (const pattern of Object.values(SOCIAL_PATTERNS)) {
    const matches = source.match(pattern) || [];
    for (const match of matches) {
      const normalized = normalizeUrl(match);
      if (normalized) urls.push(normalized);
    }
  }

  const direct = normalizeUrl(source);
  if (direct && classifyUrl(direct) !== "others") urls.push(direct);

  return urls;
}

function collectKnownSocials(businessInfo) {
  const result = {
    youtube: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    others: [],
  };

  const strings = collectStrings(businessInfo);
  const urls = unique(strings.flatMap(extractSocialUrlsFromText));

  for (const url of urls) {
    const kind = classifyUrl(url);
    if (kind === "youtube" && !result.youtube) {
      result.youtube = { url, channelId: null };
    } else if (kind === "instagram" && !result.instagram) {
      result.instagram = url;
    } else if (kind === "facebook" && !result.facebook) {
      result.facebook = url;
    } else if (kind === "tiktok" && !result.tiktok) {
      result.tiktok = url;
    } else if (kind === "others") {
      result.others.push(url);
    }
  }

  result.others = unique(result.others);
  return result;
}

function getBusinessName(businessInfo) {
  if (!businessInfo || typeof businessInfo !== "object") return "";

  const candidates = [
    businessInfo.name,
    businessInfo.businessName,
    businessInfo.business_name,
    businessInfo.title,
    businessInfo.company,
    businessInfo.companyName,
    businessInfo.organization,
  ];

  return candidates.map(asString).find(Boolean) || "";
}

function slugToHandle(value) {
  return asString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .join("");
}

function buildCandidateHandles(businessInfo) {
  const name = getBusinessName(businessInfo);
  const compact = slugToHandle(name);
  if (!compact) return [];

  const lower = compact.toLowerCase();
  const words = asString(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];

  const candidates = [
    compact,
    lower,
    words.join(""),
    words.join("."),
    words.join("_"),
    words.join("-"),
  ];

  return unique(candidates).filter((handle) => handle.length >= 2 && handle.length <= 50);
}

function withTimeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (typeof AbortController === "undefined") {
    return { signal: undefined, cancel: () => {} };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const cancel = () => clearTimeout(timer);
  return { signal: controller.signal, cancel };
}

async function fetchReachable(fetchImpl, url, { wantText = false } = {}) {
  if (typeof fetchImpl !== "function") return { ok: false, text: "" };

  const methods = ["HEAD", "GET"];

  for (const method of methods) {
    const { signal, cancel } = withTimeoutSignal();

    try {
      const response = await fetchImpl(url, {
        method,
        redirect: "follow",
        signal,
        headers: {
          "user-agent": "LifeOS social discovery",
          accept: wantText || method === "GET" ? "text/html,application/xhtml+xml,*/*;q=0.8" : "*/*",
        },
      });

      cancel();

      if (!response || !response.ok) continue;

      if (wantText && method === "GET" && typeof response.text === "function") {
        try {
          return { ok: true, text: await response.text() };
        } catch {
          return { ok: true, text: "" };
        }
      }

      if (!wantText || method === "GET") return { ok: true, text: "" };
    } catch {
      cancel();
    }
  }

  return { ok: false, text: "" };
}

function youtubeCandidateUrls(handles) {
  return handles.map((handle) => `https://www.youtube.com/@${encodeURIComponent(handle)}`);
}

function instagramCandidateUrls(handles) {
  return handles.map((handle) => `https://www.instagram.com/${encodeURIComponent(handle)}/`);
}

function facebookCandidateUrls(handles) {
  return handles.flatMap((handle) => [
    `https://www.facebook.com/${encodeURIComponent(handle)}`,
    `https://www.facebook.com/${encodeURIComponent(handle)}/`,
  ]);
}

async function firstReachable(fetchImpl, urls, options = {}) {
  for (const url of unique(urls)) {
    const result = await fetchReachable(fetchImpl, url, options);
    if (result.ok) return { url, text: result.text || "" };
  }

  return null;
}

export function extractYouTubeChannelId(html) {
  const source = asString(html);
  if (!source) return null;

  const patterns = [
    /"channelId"\s*:\s*"([^"]+)"/,
    /"externalId"\s*:\s*"([^"]+)"/,
    /"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]{20,})"/,
    /<meta\s+itemprop=["']channelId["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+itemprop=["']channelId["']/i,
    /\/channel\/(UC[a-zA-Z0-9_-]{20,})/,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export async function discoverSocials(businessInfo = {}, { fetchImpl = globalThis.fetch } = {}) {
  const known = collectKnownSocials(businessInfo);
  const result = {
    youtube: known.youtube,
    instagram: known.instagram,
    facebook: known.facebook,
    tiktok: known.tiktok,
    others: known.others,
  };

  if (result.youtube?.url && !result.youtube.channelId && typeof fetchImpl === "function") {
    const fetched = await fetchReachable(fetchImpl, result.youtube.url, { wantText: true });
    if (fetched.ok) {
      result.youtube = {
        url: result.youtube.url,
        channelId: extractYouTubeChannelId(fetched.text),
      };
    }
  }

  if (typeof fetchImpl !== "function") return result;

  const handles = buildCandidateHandles(businessInfo);
  if (!handles.length) return result;

  if (!result.youtube) {
    const found = await firstReachable(fetchImpl, youtubeCandidateUrls(handles), { wantText: true });
    if (found) {
      result.youtube = {
        url: found.url,
        channelId: extractYouTubeChannelId(found.text),
      };
    }
  }

  if (!result.instagram) {
    const found = await firstReachable(fetchImpl, instagramCandidateUrls(handles));
    if (found) result.instagram = found.url;
  }

  if (!result.facebook) {
    const found = await firstReachable(fetchImpl, facebookCandidateUrls(handles));
    if (found) result.facebook = found.url;
  }

  return result;
}

// Existing services/site-builder-social-discovery.js already implements the requested discovery helper exports and behavior; no additive code is required.

export default discoverSocials;
