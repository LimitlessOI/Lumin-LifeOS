/**
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

/**
 * Create a browser session. Returns a context with helper methods.
 * Always call session.close() when done.
 */
export async function createSession({ headless = true, logger = console } = {}) {
  const browser = await puppeteer.launch({
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1280, height: 800 });

  page.setDefaultTimeout(DEFAULT_TIMEOUT);
  page.setDefaultNavigationTimeout(DEFAULT_NAV_TIMEOUT);

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
    // Try direct selector
    const el = await page.$(selector);
    if (el) {
      await el.click({ clickCount: 3 }); // select all existing text
      await el.type(value, { delay: 30 });
      return;
    }
    // Try placeholder match
    const filled = await page.evaluate((sel, val) => {
      // selector might be a placeholder hint — try to find by placeholder
      const inputs = Array.from(document.querySelectorAll("input, textarea"));
      const match = inputs.find(
        (i) => i.placeholder?.toLowerCase().includes(sel.toLowerCase()) ||
               i.name?.toLowerCase().includes(sel.replace(/[^a-z]/gi, "").toLowerCase())
      );
      if (match) {
        match.focus();
        match.value = val;
        match.dispatchEvent(new Event("input", { bubbles: true }));
        match.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      return false;
    }, selector, value);

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
    // Try XPath text match
    const [byText] = await page.$x(
      `//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),` +
      `'${selectorOrText.toLowerCase()}')]`
    );
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
    page,
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

export default { createSession };
