/**
 * SYNOPSIS: Extract public contact emails from business websites for Go Vegas outreach.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */

const SKIP_LOCALS = new Set([
  'noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'postmaster',
  'wordpress', 'wixpress', 'sentry', 'example', 'email', 'yourname',
]);

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function normalizeUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function scoreEmail(email, businessName = '') {
  const lower = email.toLowerCase();
  const local = lower.split('@')[0];
  if (SKIP_LOCALS.has(local)) return -10;
  if (local.includes('noreply') || local.includes('no-reply')) return -10;
  if (lower.endsWith('.png') || lower.endsWith('.jpg')) return -10;
  let score = 0;
  if (/^(info|hello|contact|office|team|support|admin|sales)@/.test(lower)) score += 3;
  if (/^(owner|founder|ceo)@/.test(lower)) score += 2;
  const slug = String(businessName || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (slug && lower.includes(slug.slice(0, 8))) score += 2;
  return score;
}

export function extractEmailsFromHtml(html, businessName = '') {
  const found = new Set();
  const text = String(html || '');

  for (const match of text.matchAll(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)) {
    found.add(match[1].toLowerCase());
  }
  for (const match of text.matchAll(EMAIL_RE)) {
    found.add(match[0].toLowerCase());
  }

  return [...found]
    .map((email) => ({ email, score: scoreEmail(email, businessName) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.email);
}

export async function findEmailOnWebsite(websiteUrl, { businessName = '', timeoutMs = 8000 } = {}) {
  const url = normalizeUrl(websiteUrl);
  if (!url) return { ok: false, error: 'website required' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LuminLifeOS-GoVegasOutreach/1.0 (+business-network-invite)' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, url };
    }
    const html = await res.text();
    const emails = extractEmailsFromHtml(html, businessName);
    return {
      ok: emails.length > 0,
      url,
      email: emails[0] || null,
      candidates: emails.slice(0, 5),
    };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.message, url };
  }
}
