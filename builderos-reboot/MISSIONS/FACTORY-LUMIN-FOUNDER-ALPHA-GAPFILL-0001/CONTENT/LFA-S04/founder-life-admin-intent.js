/**
 * SYNOPSIS: Founder personal-life asks — errands, coupons, appointments (not builder/code).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const PERSONAL_LIFE_MARKERS = [
  /\b(oil change|tire rotation|brake pad|alignment|car wash|smog check|vehicle service|auto repair)\b/i,
  /\b(coupon|promo code|discount|deal|on sale|cheaper|save \$\d)\b/i,
  /\b(on the way|on my way|way out|while I'?m out|running errands|errand)\b/i,
  /\b(appointment|dentist|doctor|haircut|vet|pick up|drop off|pharmacy|grocery)\b/i,
  /\b(jiffy lube|valvoline|midas|firestone|pep boys|dealership|mechanic)\b/i,
  /\b(find (?:me )?(?:a )?coupon|look for (?:a )?coupon|any coupons|best price)\b/i,
  /\b(should I (?:get|do|stop|go)|can you find (?:me )?(?:a )?(?:coupon|deal|place))\b/i,
];

const NON_PRODUCT_CHANGE = [
  /\boil change\b/i,
  /\bclimate change\b/i,
  /\bchange of (?:plans|address|heart)\b/i,
  /\bspare change\b/i,
  /\bpocket change\b/i,
  /\bcareer change\b/i,
  /\blife change\b/i,
];

export function isFounderIdentityIntent(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  return /\b(who am i|know me|about me|my priorities|my goals|what do you know about me|answer as my chair)\b/i.test(t);
}

export function isFounderPersonalLifeIntent(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/\b(target_file|\.html|\.js|lifere|blueprint|mission|ssot|amendment|deploy|railway|builder)\b/i.test(t)) {
    return false;
  }
  if (isFounderIdentityIntent(t)) return true;
  return PERSONAL_LIFE_MARKERS.some((re) => re.test(t));
}

export function isProductBuildChangeVerb(text = '') {
  const t = String(text || '');
  if (!/\bchange\b/i.test(t)) return false;
  if (NON_PRODUCT_CHANGE.some((re) => re.test(t))) return false;
  if (/\b(change|update|fix)\b.*\b(color|ui|css|html|page|route|api|bubble|nav|button|overlay)\b/i.test(t)) {
    return true;
  }
  if (/\b(change|update|fix|make)\b.*\b(code|file|service|route|deploy|build)\b/i.test(t)) {
    return true;
  }
  return false;
}

export function buildLifeAdminSearchQuery(text = '') {
  const t = String(text || '').trim();
  if (/\boil change\b/i.test(t) && /\bcoupon\b/i.test(t)) {
    return 'oil change coupon Jiffy Lube Valvoline Midas printable 2026';
  }
  if (/\boil change\b/i.test(t)) {
    return 'oil change near me coupon same day 2026';
  }
  if (/\bcoupon\b/i.test(t)) {
    return `${t.slice(0, 120)} coupon deal 2026`;
  }
  return t.slice(0, 160);
}

export function formatLifeAdminCounselPreamble(searchResult = null) {
  if (!searchResult?.results?.length) {
    return '';
  }
  const lines = ['', '── Coupon / local search (LifeOS) ──'];
  for (const r of searchResult.results.slice(0, 5)) {
    lines.push(`• ${r.title || 'Result'}${r.url ? `\n  ${r.url}` : ''}`);
    if (r.description) lines.push(`  ${String(r.description).slice(0, 280)}`);
  }
  if (searchResult.source) lines.push(`(source: ${searchResult.source})`);
  return lines.join('\n');
}

export function formatErrandCouponFallback(text = '') {
  const t = String(text || '');
  if (!/\b(oil change|coupon|jiffy|valvoline|midas|take 5)\b/i.test(t)) return '';
  return [
    '',
    '── Coupon starting points (open on your phone — no location assumed) ──',
    '• Jiffy Lube offers: https://www.jiffylube.com/offers',
    '• Valvoline promotions: https://www.valvoline.com/offers/',
    '• Take 5 coupons: https://www.take5.com/oil-change/coupons/',
    '• Midas local offers: https://www.midas.com/rebates-and-promotions',
    'Show the coupon before service starts; offers vary by location.',
  ].join('\n');
}
