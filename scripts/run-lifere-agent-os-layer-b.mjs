#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE agent OS SENTRY Layer B — human-sim browser walkthrough of the teleprompter overlay.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const RECEIPT = path.join(ROOT, 'products/receipts/SENTRY_LIFERE_AGENT_OS_LAYER_B.json');

async function main() {
  const started = Date.now();
  const results = {};
  const findings = [];
  const { chromium } = await import('playwright');

  async function check(id, fn) {
    try {
      await fn();
      results[id] = { ok: true };
    } catch (e) {
      const detail = String(e?.message || e).slice(0, 400);
      results[id] = { ok: false, error: detail };
      findings.push({
        code: id,
        detail,
        solution: `Fix LifeRE overlay UX for ${id}: ${detail}`,
      });
    }
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const agentId = Date.now();

    await check('overlay_loads_and_displays_first_line', async () => {
      await page.goto(`${BASE}/overlay/lifere-teleprompter.html?agentId=${agentId}&scenario=buyer-consultation`);
      await page.waitForSelector('#currentLine', { timeout: 10000 });
      const current = await page.textContent('#currentLine');
      if (/Loading script|^-+$/.test(current)) throw new Error(`current line is placeholder: ${current}`);
    });

    await check('next_button_advances_script', async () => {
      const before = await page.textContent('#currentLine');
      await page.click('#nextBtn');
      await page.waitForTimeout(500);
      const after = await page.textContent('#currentLine');
      if (before === after) throw new Error('current line did not advance');
    });

    await check('interrupt_button_pauses_and_shows_reentry', async () => {
      page.on('dialog', async (dialog) => {
        await dialog.accept('Let me tell you a story about my kid.');
      });
      await page.click('#interruptBtn');
      await page.waitForSelector('#offTopicPanel.active', { timeout: 5000 });
      const reEntry = await page.textContent('#reEntryLine');
      if (!reEntry || /^-+$/.test(reEntry)) throw new Error('re-entry line missing');
    });

    await check('resume_button_returns_to_script', async () => {
      await page.click('#resumeBtn');
      await page.waitForFunction(() => !document.getElementById('offTopicPanel').classList.contains('active'));
    });

    await browser.close();
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    findings.push({ code: 'browser_setup', detail: String(err?.message || err), solution: 'Ensure Playwright chromium is installed and the server is running.' });
  }

  const ok = findings.length === 0;
  const report = {
    ok,
    layer: 'B',
    product: 'lifere-agent-os',
    implementation_status: ok ? 'PASS' : 'FAIL',
    at: new Date().toISOString(),
    duration_ms: Date.now() - started,
    base: BASE,
    results,
    findings,
  };

  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
}

main();
