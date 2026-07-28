/**
 * SYNOPSIS: Deterministic Wix login + DNS upsert for WRM → Railway custom domains.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { createSession } from './browser-agent.js';

/** Server-module marker for execution-truth gate (Puppeteer evaluate bodies touch DOM). */
export function createWrmWixDnsCutover(deps = {}) {
  return {
    run: (opts = {}) => runWrmWixDnsCutover({ ...deps, ...opts }),
  };
}

export const WRM_DOMAIN = 'wellroundedmomma.com';

export const WRM_RAILWAY_DNS = {
  wwwCname: 'd7at9e8j.up.railway.app',
  apexCname: 'ydwz6n89.up.railway.app',
  wwwVerify: 'railway-verify=06ec307e85297110ef18e2186593552db6510c31b9d0ae2451ac2be49ece8c2c',
  apexVerify: 'railway-verify=bc0930c2f4c1eaf1202b32f8edbe26a06f5966755b013aa8021611a304dc149b',
};

function sleep(page, ms) {
  return page.waitForTimeout(ms);
}

async function clickByText(page, text, { timeout = 8000 } = {}) {
  const want = String(text || '').toLowerCase();
  const handle = await page.waitForFunction(
    (needle) => {
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]'));
      return nodes.find((n) => (n.innerText || n.value || '').toLowerCase().includes(needle)) || null;
    },
    { timeout },
    want,
  );
  const el = await handle.asElement();
  if (!el) throw new Error(`clickByText miss: ${text}`);
  await el.click();
}

async function fillFirst(page, selectors, value) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (!el) continue;
    await el.click({ clickCount: 3 }).catch(() => {});
    await el.type(value, { delay: 25 });
    return sel;
  }
  throw new Error(`fillFirst miss: ${selectors.join(',')}`);
}

async function pageSignals(page) {
  return page.evaluate(() => {
    const text = (document.body?.innerText || '').toLowerCase();
    // Wix always loads reCAPTCHA scripts on /signin — only treat as blocker when a
    // visible challenge is up (not mere iframe/script presence).
    const challengeIframes = Array.from(
      document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"]'),
    ).filter((f) => {
      const r = f.getBoundingClientRect();
      return r.width >= 100 && r.height >= 40 && getComputedStyle(f).visibility !== 'hidden';
    });
    const visibleChallengeText = /verify you are human|i'm not a robot|complete the security check|press and hold/.test(text);
    return {
      url: location.href,
      title: document.title,
      hasPassword: Boolean(document.querySelector('input[type="password"]')),
      hasEmail: Boolean(document.querySelector('input[type="email"], input[name="email"], input[autocomplete="username"]')),
      captcha: visibleChallengeText || challengeIframes.length > 0,
      mfa: /verification code|enter the code|two-factor|2-step|check your email for a code/.test(text)
        && !/log in|continue with email/.test(text),
      loggedInHint: /my sites|dashboard|domains|account settings|manage dns|dns records/.test(text)
        || /manage\.wix\.com|www\.wix\.com\/dashboard|www\.wix\.com\/account/.test(location.href),
    };
  });
}

/**
 * Email → Continue → Password → Log In.
 */
export async function loginToWix({ session, email, password, logger = console } = {}) {
  if (!session?.page) throw new Error('session.page required');
  if (!email || !password) throw new Error('email + password required');
  const page = session.page;

  await session.navigate('https://users.wix.com/signin');
  await sleep(page, 1500);

  let sig = await pageSignals(page);
  if (sig.captcha) return { ok: false, reason: 'captcha', needs_human: true, stage: 'pre_login', url: sig.url };
  if (sig.loggedInHint && !sig.hasEmail && !sig.hasPassword) {
    return { ok: true, already: true, url: sig.url };
  }

  try {
    await fillFirst(page, [
      'input[type="email"]',
      'input[name="email"]',
      'input[autocomplete="username"]',
      'input[data-hook="email-input"]',
      'input[placeholder*="Email" i]',
    ], email);
  } catch (err) {
    return { ok: false, reason: `email_field: ${err.message}`, needs_human: true, url: page.url() };
  }

  try {
    await clickByText(page, 'Continue with Email');
  } catch {
    try {
      await page.click('button[type="submit"]');
    } catch (err) {
      return { ok: false, reason: `continue_click: ${err.message}`, needs_human: true, url: page.url() };
    }
  }

  await sleep(page, 2000);
  sig = await pageSignals(page);
  if (sig.captcha) return { ok: false, reason: 'captcha', needs_human: true, stage: 'after_email', url: sig.url };
  if (sig.mfa) return { ok: false, reason: 'mfa', needs_human: true, stage: 'after_email', url: sig.url };

  try {
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await fillFirst(page, [
      'input[type="password"]',
      'input[name="password"]',
      'input[autocomplete="current-password"]',
    ], password);
  } catch (err) {
    return { ok: false, reason: `password_field: ${err.message}`, needs_human: true, url: page.url(), signals: sig };
  }

  try {
    await clickByText(page, 'Log In');
  } catch {
    try {
      await page.click('button[type="submit"]');
    } catch (err) {
      return { ok: false, reason: `login_click: ${err.message}`, needs_human: true, url: page.url() };
    }
  }

  await sleep(page, 3500);
  for (let i = 0; i < 12; i += 1) {
    sig = await pageSignals(page);
    if (sig.captcha) return { ok: false, reason: 'captcha', needs_human: true, stage: 'post_login', url: sig.url };
    if (sig.mfa) return { ok: false, reason: 'mfa', needs_human: true, stage: 'post_login', url: sig.url };
    if (sig.loggedInHint || (!sig.hasPassword && !/signin|login/i.test(sig.url))) {
      logger.info?.('[WRM-WIX] login ok', { url: sig.url });
      return { ok: true, url: sig.url };
    }
    await sleep(page, 1000);
  }

  return {
    ok: false,
    reason: 'login_not_confirmed',
    needs_human: true,
    url: page.url(),
    signals: await pageSignals(page),
  };
}

/**
 * Prefer cookie-authenticated Wix Domain DNS API; fall back to manage UI scrape + PATCH via known REST.
 * Requires Wix-managed DNS (NS at wix.com) — true for wellroundedmomma.com today.
 */
export async function upsertWrmRailwayDnsViaSession({
  session,
  domain = WRM_DOMAIN,
  targets = WRM_RAILWAY_DNS,
  logger = console,
} = {}) {
  if (!session?.page) throw new Error('session.page required');
  const page = session.page;
  const steps = [];

  const accountUrls = [
    'https://manage.wix.com/account/domains',
    'https://www.wix.com/account/domains',
    `https://manage.wix.com/account/domains/${domain}/dns`,
  ];

  for (const url of accountUrls) {
    try {
      await session.navigate(url);
      await sleep(page, 2000);
      steps.push({ navigate: url, ok: true, final: page.url() });
      break;
    } catch (err) {
      steps.push({ navigate: url, ok: false, error: err.message });
    }
  }

  // Capture account id / auth headers from the logged-in manage app if present.
  const authProbe = await page.evaluate(async () => {
    const out = { cookies: document.cookie.slice(0, 200), fetches: [] };
    const tryUrls = [
      'https://manage.wix.com/_api/account-info',
      'https://www.wixapis.com/account-level/v1/accounts/my',
      'https://manage.wix.com/_serverless/domains-service/v1/domains',
    ];
    for (const u of tryUrls) {
      try {
        const res = await fetch(u, { credentials: 'include', headers: { Accept: 'application/json' } });
        const text = await res.text();
        out.fetches.push({
          url: u,
          status: res.status,
          bodyPreview: text.slice(0, 240),
        });
      } catch (err) {
        out.fetches.push({ url: u, error: String(err?.message || err) });
      }
    }
    return out;
  });
  steps.push({ authProbe: authProbe.fetches });

  // Try Domain DNS preview + update using session cookies against wixapis (may need API key — report honestly).
  const dnsApi = await page.evaluate(async (domainName, dns) => {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const previewUrl = `https://www.wixapis.com/domains/v1/dns-zones/${domainName}`;
    let preview = null;
    try {
      const res = await fetch(previewUrl, { method: 'GET', credentials: 'include', headers });
      preview = { status: res.status, body: (await res.text()).slice(0, 1500) };
    } catch (err) {
      preview = { error: String(err?.message || err) };
    }

    const additions = [
      { type: 'CNAME', hostName: `www.${domainName}`, values: [dns.wwwCname], ttl: 3600 },
      { type: 'CNAME', hostName: domainName, values: [dns.apexCname], ttl: 3600 },
      { type: 'TXT', hostName: `_railway-verify.www.${domainName}`, values: [dns.wwwVerify], ttl: 3600 },
      { type: 'TXT', hostName: `_railway-verify.${domainName}`, values: [dns.apexVerify], ttl: 3600 },
    ];

    let patch = null;
    try {
      const res = await fetch(previewUrl, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ additions, deletions: [] }),
      });
      patch = { status: res.status, body: (await res.text()).slice(0, 1500) };
    } catch (err) {
      patch = { error: String(err?.message || err) };
    }

    return { preview, patch, additions };
  }, domain, targets);
  steps.push({ dnsApi });

  const apiOk = Number(dnsApi?.patch?.status) >= 200 && Number(dnsApi?.patch?.status) < 300;

  // UI path: open DNS editor and report visible table text for human/agent follow-up if API blocked.
  let uiText = '';
  try {
    // Prefer clicking Manage DNS / DNS if visible
    const clicked = await page.evaluate((domainName) => {
      const want = ['manage dns', 'dns', 'advanced dns', domainName];
      const nodes = Array.from(document.querySelectorAll('a, button, [role="button"], [data-hook]'));
      for (const needle of want) {
        const hit = nodes.find((n) => (n.innerText || '').toLowerCase().includes(needle));
        if (hit) {
          hit.click();
          return (hit.innerText || '').slice(0, 80);
        }
      }
      return null;
    }, domain);
    if (clicked) {
      await sleep(page, 2500);
      steps.push({ uiClick: clicked, url: page.url() });
    }
    uiText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 4000));
  } catch (err) {
    steps.push({ uiError: err.message });
  }

  const hasWww = uiText.toLowerCase().includes(targets.wwwCname.toLowerCase());
  const hasApex = uiText.toLowerCase().includes(targets.apexCname.toLowerCase());
  const hasWwwTxt = uiText.includes('06ec307e85297110ef18e2186593552db6510c31b9d0ae2451ac2be49ece8c2c');
  const hasApexTxt = uiText.includes('bc0930c2f4c1eaf1202b32f8edbe26a06f5966755b013aa8021611a304dc149b');

  if (apiOk) {
    logger.info?.('[WRM-WIX] DNS API patch ok');
    return { ok: true, mode: 'wixapis_patch', steps, url: page.url() };
  }

  // Attempt structured UI upsert for common Wix DNS table “Add Record” flow.
  const uiUpsert = await tryUiDnsUpsert(page, domain, targets, logger).catch((err) => ({
    ok: false,
    error: err.message,
  }));
  steps.push({ uiUpsert });

  if (uiUpsert?.ok) {
    return { ok: true, mode: 'ui_upsert', steps, url: page.url() };
  }

  const screenshot = await session.screenshot('wrm-wix-dns').catch(() => null);

  return {
    ok: false,
    reason: 'dns_api_and_ui_incomplete',
    needs_human: true,
    mode: 'partial',
    visible: { hasWww, hasApex, hasWwwTxt, hasApexTxt },
    targets,
    steps,
    url: page.url(),
    screenshot,
    uiTextPreview: uiText.slice(0, 1200),
  };
}

async function tryUiDnsUpsert(page, domain, targets, logger) {
  // Best-effort: many Wix DNS UIs use "Add Record" + type select + host + value.
  const records = [
    { type: 'CNAME', host: 'www', value: targets.wwwCname },
    { type: 'CNAME', host: '@', value: targets.apexCname },
    { type: 'TXT', host: '_railway-verify.www', value: targets.wwwVerify },
    { type: 'TXT', host: '_railway-verify', value: targets.apexVerify },
  ];

  const results = [];
  for (const rec of records) {
    try {
      await clickByText(page, 'Add Record', { timeout: 4000 }).catch(() => clickByText(page, 'Add', { timeout: 2500 }));
      await sleep(page, 800);
      // Type selector often a dropdown — click type then option
      await page.evaluate((type) => {
        const opts = Array.from(document.querySelectorAll('option, [role="option"], li, button, div'));
        const hit = opts.find((n) => (n.innerText || '').trim().toUpperCase() === type);
        if (hit) hit.click();
      }, rec.type);
      await sleep(page, 400);
      const inputs = await page.$$('input:not([type="hidden"])');
      if (inputs[0]) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type(rec.host, { delay: 20 });
      }
      if (inputs[1]) {
        await inputs[1].click({ clickCount: 3 });
        await inputs[1].type(rec.value, { delay: 10 });
      }
      await clickByText(page, 'Save', { timeout: 4000 }).catch(() => clickByText(page, 'Add Record', { timeout: 2000 }));
      await sleep(page, 1200);
      results.push({ ...rec, ok: true });
    } catch (err) {
      results.push({ ...rec, ok: false, error: err.message });
      logger.warn?.('[WRM-WIX] ui record fail', { host: rec.host, error: err.message });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return { ok: okCount >= 2, results, okCount };
}

export async function runWrmWixDnsCutover({
  email = process.env.WRM_WIX_EMAIL || process.env.WIX_EMAIL,
  password = process.env.WRM_WIX_PASSWORD || process.env.WIX_PASSWORD,
  domain = process.env.WRM_DOMAIN || WRM_DOMAIN,
  logger = console,
} = {}) {
  const emailUsed = String(email || '').trim();
  const passwordUsed = String(password || '').trim();
  if (!emailUsed || !passwordUsed) {
    return {
      ok: false,
      reason: 'missing_env',
      error: 'WRM_WIX_EMAIL / WRM_WIX_PASSWORD not set',
    };
  }

  let session = null;
  try {
    session = await createSession({ logger });
    const login = await loginToWix({ session, email: emailUsed, password: passwordUsed, logger });
    if (!login.ok) {
      const shot = await session.screenshot('wrm-wix-login-fail').catch(() => null);
      return { ok: false, stage: 'login', ...login, screenshot: shot, email: emailUsed };
    }
    const dns = await upsertWrmRailwayDnsViaSession({
      session,
      domain,
      targets: WRM_RAILWAY_DNS,
      logger,
    });
    return {
      ok: Boolean(dns.ok),
      stage: dns.ok ? 'dns' : 'dns_blocked',
      email: emailUsed,
      domain,
      targets: WRM_RAILWAY_DNS,
      login,
      dns,
    };
  } catch (err) {
    return { ok: false, error: err.message, email: emailUsed, domain };
  } finally {
    if (session?.close) await session.close().catch(() => {});
  }
}

export default { runWrmWixDnsCutover, loginToWix, upsertWrmRailwayDnsViaSession, WRM_RAILWAY_DNS, WRM_DOMAIN };