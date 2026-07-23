/**
 * SYNOPSIS: Detect CDN/error/parked scrape poison and resolve safe business names.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

const POISON_BODY_MARKERS = /hugedomains|godaddy|is for sale|buy this domain|domain (name )?(is )?for sale|this domain (is|may be)|parked (free|domain)|just a moment|checking your browser|namecheap|sedo|cloudflare|attention required|ray id|enable javascript and cookies|the request could not be satisfied|403 error|502 bad gateway|503 service unavailable|504 gateway timeout|dns_probe_finished|err_name_not_resolved|site can't be reached|this site can't be reached|web server is down|error 1016|error 1020|access denied/i;

const POISON_TITLE_MARKERS = /could not be satisfied|403 forbidden|404 not found|502 bad gateway|503 service unavailable|504 gateway timeout|access denied|just a moment|checking your browser|attention required|error \d{3}|dns_probe|site can't be reached|this site can't be reached|web server is down|is for sale|buy this domain|hugedomains|parked domain|cloudflare/i;

export function hostnameBusinessName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    const base = host.split('.')[0] || host;
    return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return 'Your Business';
  }
}

export function detectPoisonScrape({ title = '', bodyText = '', h1 = '', metaDescription = '' } = {}) {
  const combined = [title, h1, metaDescription, bodyText].join('\n').slice(0, 12_000);
  const bodyHit = combined.match(POISON_BODY_MARKERS);
  if (bodyHit) {
    return { poisoned: true, marker: bodyHit[0], reason: 'error_or_placeholder_page' };
  }
  const titleHit = String(title || '').trim().match(POISON_TITLE_MARKERS);
  if (titleHit) {
    return { poisoned: true, marker: titleHit[0], reason: 'error_page_title' };
  }
  const text = String(bodyText || '').trim();
  if (text.length > 0 && text.length < 280 && POISON_BODY_MARKERS.test(text)) {
    return { poisoned: true, marker: 'thin_error_body', reason: 'thin_error_body' };
  }
  return { poisoned: false, marker: null, reason: null };
}

export function isPoisonBusinessName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return false;
  if (detectPoisonScrape({ title: trimmed }).poisoned) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return false;
}

export function resolveBusinessName({ scrapedName = '', submittedName = '', url = '', poisoned = false } = {}) {
  const submitted = String(submittedName || '').trim();
  const scraped = String(scrapedName || '').trim();
  const fallback = hostnameBusinessName(url);

  if (submitted && !isPoisonBusinessName(submitted)) {
    return { businessName: submitted, scrapePoisoned: Boolean(poisoned), nameSource: 'submitted' };
  }

  if (scraped && !isPoisonBusinessName(scraped) && !poisoned) {
    return { businessName: scraped, scrapePoisoned: false, nameSource: 'scraped' };
  }

  if (submitted && isPoisonBusinessName(submitted)) {
    return { businessName: fallback, scrapePoisoned: true, nameSource: 'hostname_fallback' };
  }

  return {
    businessName: fallback,
    scrapePoisoned: Boolean(poisoned || isPoisonBusinessName(scraped)),
    nameSource: 'hostname_fallback',
  };
}

export function applyScrapeGuard(profile, { submittedName = '', url = '', forcePoisoned = false } = {}) {
  const info = { ...(profile || {}) };
  const poison = forcePoisoned
    ? { poisoned: true, marker: 'fetch_failed', reason: 'fetch_failed' }
    : detectPoisonScrape({
        title: info.title,
        bodyText: info.bodyText,
        h1: info.h1,
        metaDescription: info.metaDescription,
      });

  const resolved = resolveBusinessName({
    scrapedName: info.businessName,
    submittedName,
    url: url || info.sourceUrl,
    poisoned: poison.poisoned,
  });

  info.businessName = resolved.businessName;
  info.scrapePoisoned = resolved.scrapePoisoned;
  info.scrapePoisonMarker = poison.poisoned ? poison.marker : null;
  info.scrapePoisonReason = poison.poisoned ? poison.reason : null;
  info.businessNameSource = resolved.nameSource;
  return info;
}

export function applyScrapePoisonQualityGate(qualityReport, businessInfo = {}) {
  if (!businessInfo?.scrapePoisoned) return qualityReport;
  const poisonIssue = 'Source URL returned an error or placeholder page — manual review required before outreach';
  const issues = [...new Set([...(qualityReport?.issues || []), poisonIssue])];
  const summaryIssues = [...new Set([...(qualityReport?.summaryIssues || qualityReport?.issues || []), poisonIssue])].slice(0, 6);
  return {
    ...qualityReport,
    readyToSend: false,
    recommendedAction: 'revise_before_send',
    scrapePoisoned: true,
    issues,
    summaryIssues,
  };
}

export function extractHtmlTitle(html) {
  const match = String(html || '').match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : '';
}

export function htmlBodySnippet(html, maxLen = 4000) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}