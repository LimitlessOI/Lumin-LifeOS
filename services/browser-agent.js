/**
 * SYNOPSIS: browser-agent.js
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 *
 * browser-agent.js
 * Puppeteer-based headless browser for autonomous web interactions.
 * Used by signup-agent.js to fill forms, submit, and click verification links.
 *
 * Deps: puppeteer (already in package.json)
 * Railway: runs headless Chromium in the container
 */

import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || "/tmp/browser-agent-screenshots";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_NAV_TIMEOUT = 60_000;

try { fs.mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch (_) {}

// Container-safe base args. Deliberately EXCLUDES the process-model flags
// --single-process / --no-zygote / --renderer-process-limit=1: with Chrome's
// "new" headless mode inside a slim Debian container those cause an immediate
// crash ("Protocol error (Target.setDiscoverTargets): Target closed") before a
// page can ever open. Websocket transport (pipe:false) is also more reliable
// here than the fd pipe.
const BASE_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-extensions",
  "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,Translate,BackForwardCache,AcceptCHFrame,MediaRouter",
  "--disable-gpu",
  "--disable-renderer-backgrounding",
  "--disable-software-rasterizer",
  "--metrics-recording-only",
  "--mute-audio",
  "--no-first-run",
];

// Prefer an explicitly-set CHROME_BIN. Otherwise IGNORE the distro chromium
// wrapper (/usr/bin/chromium) even if PUPPETEER_EXECUTABLE_PATH points at it —
// its version mismatched puppeteer and crashed on launch. undefined lets
// puppeteer resolve its OWN matched bundled Chrome from PUPPETEER_CACHE_DIR.
function resolveExecutablePath() {
  const envPath = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH || "";
  return envPath && envPath !== "/usr/bin/chromium" ? envPath : undefined;
}

export function getChromiumLaunchOptions({ headless = true, pipe = false, extraArgs = [] } = {}) {
  const executablePath = resolveExecutablePath();
  return {
    headless: headless === true ? "new" : headless,
    executablePath,
    pipe,
    protocolTimeout: 120_000,
    args: [...BASE_ARGS, ...extraArgs],
  };
}

/**
 * Ground-truth which launch configuration actually boots Chrome in THIS
 * container. Tries a small matrix and, for each, opens a data: page to prove
 * the browser is usable (not just spawned). Returns an array of
 * { name, ok, version|error, ms } — one deploy tells us the working config
 * instead of guessing and redeploying repeatedly.
 */
export async function probeLaunchConfigs() {
  const executablePath = resolveExecutablePath();
  const configs = [
    { name: "new+ws", headless: "new", pipe: false, args: BASE_ARGS },
    { name: "new+pipe", headless: "new", pipe: true, args: BASE_ARGS },
    { name: "shell+ws", headless: "shell", pipe: false, args: BASE_ARGS },
    {
      name: "new+ws+single-process(control)",
      headless: "new",
      pipe: false,
      args: [...BASE_ARGS, "--no-zygote", "--single-process", "--renderer-process-limit=1"],
    },
  ];
  const results = [];
  for (const c of configs) {
    let browser = null;
    const started = Date.now();
    try {
      browser = await puppeteer.launch({
        executablePath,
        headless: c.headless,
        pipe: c.pipe,
        protocolTimeout: 60_000,
        args: c.args,
      });
      const page = await browser.newPage();
      await page.goto("data:text/html,<h1>ok</h1>", { waitUntil: "load", timeout: 15_000 });
      results.push({ name: c.name, ok: true, version: await browser.version(), ms: Date.now() - started });
    } catch (err) {
      results.push({ name: c.name, ok: false, error: String(err?.message || err).split("\n")[0], ms: Date.now() - started });
    } finally {
      try { await browser?.close(); } catch (_) {}
    }
  }
  return results;
}

/**
 * Create a browser session. Returns a context with helper methods.
 * Always call session.close() when done.
 */
export async function createSession({ headless = true, logger = console } = {}) {
  const browser = await puppeteer.launch(getChromiumLaunchOptions({ headless }));

  let page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1280, height: 800 });

  function wirePageDefaults(p) {
    if (typeof p.waitForTimeout !== "function") {
      p.waitForTimeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    }
    p.setDefaultTimeout(DEFAULT_TIMEOUT);
    p.setDefaultNavigationTimeout(DEFAULT_NAV_TIMEOUT);
  }
  wirePageDefaults(page);

  async function setPage(nextPage) {
    if (!nextPage) throw new Error('setPage requires a page');
    page = nextPage;
    wirePageDefaults(page);
    return page;
  }

  async function screenshot(label = "screenshot") {
    const filename = `${Date.now()}-${label.replace(/[^a-z0-9-]/gi, "_")}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  async function detectCaptcha() {
    return page.evaluate(() => {
      const html = document.body.innerHTML.toLowerCase();
      return (
        html.includes("g-recaptcha") ||
        html.includes("h-captcha") ||
        html.includes("cf-turnstile") ||
        html.includes("data-sitekey") ||
        Boolean(document.querySelector(
          ".g-recaptcha, .h-captcha, iframe[src*='recaptcha'], iframe[src*='hcaptcha']"
        ))
      );
    });
  }

  async function navigate(url) {
    logger.log?.(`[BROWSER] Navigating to ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: DEFAULT_NAV_TIMEOUT });
  }

  /**
   * Fill a form field. Tries CSS selector, then placeholder attr matching via evaluate.
   */
  async function fill(selector, value) {
    const candidates = String(selector || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sel of candidates.length ? candidates : [selector]) {
      try {
        await page.waitForSelector(sel, { timeout: 2500 });
      } catch {
        /* try next */
      }
      const el = await page.$(sel);
      if (el) {
        await el.click({ clickCount: 3 });
        await el.type(value, { delay: 30 });
        return;
      }
    }
    // Try placeholder / name match across main document + same-origin iframes
    const filled = await page.evaluate((sels, val) => {
      const tryDoc = (doc) => {
        for (const sel of sels) {
          const direct = doc.querySelector(sel);
          if (direct) {
            direct.focus();
            direct.value = val;
            direct.dispatchEvent(new Event('input', { bubbles: true }));
            direct.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        const inputs = Array.from(doc.querySelectorAll('input, textarea'));
        const match = inputs.find(
          (i) =>
            i.placeholder?.toLowerCase().includes(String(sels[0] || '').toLowerCase()) ||
            sels.some((sel) => i.name && sel.toLowerCase().includes(String(i.name).toLowerCase()))
        );
        if (match) {
          match.focus();
          match.value = val;
          match.dispatchEvent(new Event('input', { bubbles: true }));
          match.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      };
      if (tryDoc(document)) return true;
      for (const frame of Array.from(document.querySelectorAll('iframe'))) {
        try {
          const doc = frame.contentDocument;
          if (doc && tryDoc(doc)) return true;
        } catch {
          /* cross-origin */
        }
      }
      return false;
    }, candidates, value);

    if (!filled) {
      throw new Error(`Could not find field: ${selector}`);
    }
  }

  /**
   * Click an element by CSS selector or visible text.
   */
  async function click(selectorOrText) {
    // Try direct CSS selector
    const el = await page.$(selectorOrText);
    if (el) {
      await el.click();
      return;
    }
    // Try XPath text match (Puppeteer 22+ uses page.$$('xpath/...') instead of page.$x)
    const xpathExpr = `//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),` +
      `'${selectorOrText.toLowerCase()}')]`;
    const [byText] = await page.$$(`xpath/${xpathExpr}`);
    if (byText) {
      await byText.click();
      return;
    }
    throw new Error(`Could not find element to click: ${selectorOrText}`);
  }

  async function waitFor(selector, timeoutMs = DEFAULT_TIMEOUT) {
    await page.waitForSelector(selector, { timeout: timeoutMs });
  }

  function currentUrl() {
    return page.url();
  }

  async function pageText() {
    return page.evaluate(() => document.body.innerText);
  }

  async function pageIndicatesSuccess(keywords = ["success", "thank you", "welcome", "verified", "confirmed"]) {
    const text = (await pageText()).toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  }

  async function close() {
    await browser.close();
  }

  return {
    browser,
    get page() {
      return page;
    },
    setPage,
    navigate,
    fill,
    click,
    waitFor,
    currentUrl,
    pageText,
    pageIndicatesSuccess,
    detectCaptcha,
    screenshot,
    close,
  };
}

/**
 * Deterministic Cloudflare dashboard login + DNS upsert via dash /api/v4 (cookie session).
 * Prefer this over the AI browser loop for Railway custom-domain records.
 */
export async function applyCloudflareDnsViaDashSession({
  session,
  email,
  password,
  records = [],
  zoneName = "taloaos.com",
  logger = console,
} = {}) {
  if (!session?.page) throw new Error("session.page required");
  if (!email || !password) throw new Error("email + password required");
  if (!records.length) throw new Error("records required");

  const page = session.page;
  const sleep = (ms) => page.waitForTimeout(ms);

  async function dashFetch(apiPath, { method = "GET", body } = {}) {
    return page.evaluate(async (apiPath, method, body) => {
      const res = await fetch(`https://dash.cloudflare.com/api/v4${apiPath}`, {
        method,
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-cross-site-security": "dash",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      let json = null;
      try { json = await res.json(); } catch { json = null; }
      return { status: res.status, ok: res.ok, json };
    }, apiPath, method, body || null);
  }

  await session.navigate("https://dash.cloudflare.com/login");
  await sleep(1200);
  if (await session.detectCaptcha()) {
    return { ok: false, reason: "captcha", needs_human: true, stage: "pre_login" };
  }

  // Cloudflare login is often email → continue → password
  try {
    await session.fill(
      'input[name="email"], input#email, input[type="email"], input[autocomplete="username"]',
      email,
    );
  } catch (err) {
    return { ok: false, reason: `email_field: ${err.message}`, needs_human: true };
  }

  try {
    await session.click('button[type="submit"], button[data-testid="login-submit"]');
  } catch {
    /* password may already be on same page */
  }
  await sleep(1500);

  try {
    await session.fill(
      'input[name="password"], input#password, input[type="password"], input[autocomplete="current-password"]',
      password,
    );
  } catch (err) {
    return { ok: false, reason: `password_field: ${err.message}`, needs_human: true, url: session.currentUrl() };
  }

  try {
    await session.click('button[type="submit"], button[data-testid="login-submit"]');
  } catch (err) {
    return { ok: false, reason: `submit: ${err.message}`, needs_human: true };
  }

  await sleep(4500);
  if (await session.detectCaptcha()) {
    return { ok: false, reason: "captcha", needs_human: true, stage: "post_login", url: session.currentUrl() };
  }

  const afterLoginUrl = session.currentUrl();
  if (/\/login|challenge|turnstile/i.test(afterLoginUrl)) {
    return {
      ok: false,
      reason: "login_not_completed",
      needs_human: true,
      url: afterLoginUrl,
    };
  }

  await session.navigate("https://dash.cloudflare.com/");
  await sleep(2000);

  const zones = await dashFetch(`/zones?name=${encodeURIComponent(zoneName)}&status=active`);
  const zoneId = zones?.json?.result?.[0]?.id || null;
  if (!zoneId) {
    return {
      ok: false,
      reason: "zone_not_found_or_unauthorized",
      needs_human: true,
      zone_http: zones?.status,
      zone_errors: zones?.json?.errors || null,
      url: session.currentUrl(),
      note: "Vault account may not own taloaos.com — need token from the owning Cloudflare account",
    };
  }

  const results = [];
  for (const rec of records) {
    const type = String(rec.type || "").toUpperCase();
    const name = String(rec.name || "").toLowerCase();
    const content = String(rec.content || "");
    const list = await dashFetch(
      `/zones/${zoneId}/dns_records?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`,
    );
    const existing = list?.json?.result?.[0];
    const payload = {
      type,
      name,
      content,
      proxied: type === "CNAME" ? Boolean(rec.proxied) : false,
      ttl: rec.ttl || 1,
    };
    let written;
    if (existing?.id) {
      written = await dashFetch(`/zones/${zoneId}/dns_records/${existing.id}`, {
        method: "PUT",
        body: payload,
      });
      results.push({
        action: "updated",
        ok: Boolean(written?.json?.success),
        status: written?.status,
        record: payload,
        errors: written?.json?.errors || null,
      });
    } else {
      written = await dashFetch(`/zones/${zoneId}/dns_records`, {
        method: "POST",
        body: payload,
      });
      results.push({
        action: "created",
        ok: Boolean(written?.json?.success),
        status: written?.status,
        record: payload,
        errors: written?.json?.errors || null,
      });
    }
  }

  const ok = results.length > 0 && results.every((r) => r.ok);
  logger.log?.(`[BROWSER] Cloudflare DNS via dash: ok=${ok} zone=${zoneId} n=${results.length}`);
  return { ok, path: "dash_session_api", zoneId, zoneName, results };
}

export default { createSession, applyCloudflareDnsViaDashSession };