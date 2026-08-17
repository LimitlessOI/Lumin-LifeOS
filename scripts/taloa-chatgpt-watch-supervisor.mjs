#!/usr/bin/env node
/**
 * SYNOPSIS: Taloa ChatGPT Watch Supervisor — supervised browser loop for BuilderOS Watch.
 * Connects to an existing Chromium session, recognizes bounded ChatGPT/GitHub approval states,
 * resumes a dedicated Watch thread with a mission-safe continuation prompt, and records receipts.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_CDP_URL = process.env.TALOA_WATCH_CDP_URL || 'http://127.0.0.1:9222';
const DEFAULT_THREAD_HINT = process.env.TALOA_WATCH_THREAD_HINT || 'BuilderOS Watch';
const DEFAULT_REPO = process.env.TALOA_WATCH_REPO || 'LimitlessOI/Lumin-LifeOS';
const DEFAULT_INTERVAL_MS = Number(process.env.TALOA_WATCH_INTERVAL_MS || 5000);
const DEFAULT_COOLDOWN_MS = Number(process.env.TALOA_WATCH_CONTINUE_COOLDOWN_MS || 30000);
const LOG_PATH = process.env.TALOA_WATCH_LOG || path.join(process.cwd(), 'data', 'taloa-chatgpt-watch-supervisor.jsonl');
const CAPSULE_PATH = path.join(process.cwd(), 'docs', 'CHATGPT_CONTEXT_CAPSULE.md');

export function buildContinuationPrompt() {
  return [
    'CONTINUE THE ACTIVE BUILDEROS WATCH MISSION.',
    'Read docs/CHATGPT_CONTEXT_CAPSULE.md before acting.',
    'Immediate priority: COSTELLO -> prove one lawful remote BP slice end-to-end -> reconcile and advance Taloa Overlay to a revenue-producing Point B.',
    'Do not add optional governance, naming, or protocol work unless it directly blocks Costello or Overlay.',
    'BP authors the whole decision tree. Factories only traverse it. Never invent the next slice.',
    'Every action this cycle must directly advance Costello, advance Overlay, verify required acceptance, or expose a concrete blocker to one of those.',
    'If material reality changed, update the context capsule and relevant project conversation/history before continuing.',
    'Stop only for POINT_B_REACHED, FOUNDER_DECISION_REQUIRED, or HARD_CAPABILITY_BLOCKER.'
  ].join(' ');
}

export function classifySnapshot(snapshot, options = {}) {
  const repo = String(options.repo || DEFAULT_REPO).toLowerCase();
  const text = String(snapshot?.bodyText || '').toLowerCase();
  const buttons = Array.isArray(snapshot?.buttons) ? snapshot.buttons.map((x) => String(x).trim()) : [];
  const lowerButtons = buttons.map((x) => x.toLowerCase());
  const hasAllowOnce = lowerButtons.includes('allow once');
  const hasRepoEvidence = text.includes(repo) || (text.includes('github') && text.includes(repo.split('/').at(-1).toLowerCase()));
  const hardBlocker = /(buy credits|usage limit|goal usage limit|verify your identity|sign in to continue|captcha|payment required)/i.test(snapshot?.bodyText || '');
  const working = Boolean(snapshot?.isGenerating) || lowerButtons.some((x) => /stop generating|stop response|stop$/.test(x));
  const canCompose = Boolean(snapshot?.composerPresent);

  if (hardBlocker) return { state: 'HARD_BLOCKER', reason: 'recognized account/usage/security blocker' };
  if (hasAllowOnce && hasRepoEvidence) return { state: 'APPROVAL_PENDING', reason: 'scoped GitHub approval prompt for target repository' };
  if (hasAllowOnce && !hasRepoEvidence) return { state: 'UNRECOGNIZED_APPROVAL', reason: 'approval prompt lacks target-repo evidence' };
  if (working) return { state: 'WORKING', reason: 'ChatGPT is generating or tool-running' };
  if (canCompose) return { state: 'TURN_COMPLETE', reason: 'composer available and no active generation detected' };
  return { state: 'UNKNOWN', reason: 'no recognized actionable state' };
}

export function shouldSendContinuation({ now, lastContinuationAt, cooldownMs = DEFAULT_COOLDOWN_MS }) {
  if (!lastContinuationAt) return true;
  return now - lastContinuationAt >= cooldownMs;
}

export function appendReceipt(receipt, logPath = LOG_PATH) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(receipt)}\n`);
}

export function assertCapsulePresent(capsulePath = CAPSULE_PATH) {
  if (!fs.existsSync(capsulePath)) throw new Error(`Missing context capsule: ${capsulePath}`);
  const text = fs.readFileSync(capsulePath, 'utf8');
  for (const required of ['COSTELLO', 'Taloa Overlay', 'BP authors the whole decision tree']) {
    if (!text.includes(required)) throw new Error(`Context capsule missing required invariant: ${required}`);
  }
  return true;
}

async function getSnapshot(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].map((el) => (el.innerText || el.textContent || '').trim()).filter(Boolean);
    const bodyText = document.body?.innerText || '';
    const composer = document.querySelector('textarea, [contenteditable="true"]');
    const stopLike = buttons.some((text) => /stop generating|stop response|^stop$/i.test(text));
    return {
      title: document.title,
      url: location.href,
      bodyText: bodyText.slice(-50000),
      buttons,
      composerPresent: Boolean(composer),
      isGenerating: stopLike,
    };
  });
}

async function clickScopedAllowOnce(page, repo = DEFAULT_REPO) {
  const clicked = await page.evaluate((targetRepo) => {
    const body = (document.body?.innerText || '').toLowerCase();
    const repoLower = targetRepo.toLowerCase();
    const repoName = repoLower.split('/').pop();
    if (!(body.includes(repoLower) || (body.includes('github') && body.includes(repoName)))) return false;
    const button = [...document.querySelectorAll('button')].find((el) => (el.innerText || el.textContent || '').trim().toLowerCase() === 'allow once');
    if (!button) return false;
    button.click();
    return true;
  }, repo);
  return clicked;
}

async function sendContinuation(page, prompt) {
  return page.evaluate((message) => {
    const composer = document.querySelector('textarea') || document.querySelector('[contenteditable="true"]');
    if (!composer) return { ok: false, reason: 'composer_not_found' };

    if (composer.tagName === 'TEXTAREA') {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) setter.call(composer, message);
      else composer.value = message;
      composer.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      composer.focus();
      composer.textContent = message;
      composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
    }

    const submit = [...document.querySelectorAll('button')].find((el) => {
      const label = `${el.getAttribute('aria-label') || ''} ${(el.innerText || el.textContent || '')}`.toLowerCase();
      return /send|submit/.test(label) && !el.disabled;
    });
    if (submit) {
      submit.click();
      return { ok: true, method: 'button' };
    }

    composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    composer.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    return { ok: true, method: 'enter' };
  }, prompt);
}

async function findWatchPage(browser, threadHint = DEFAULT_THREAD_HINT) {
  const pages = await browser.pages();
  const candidates = pages.filter((page) => /chatgpt\.com|chat\.openai\.com/i.test(page.url()));
  if (!candidates.length) return null;
  for (const page of candidates) {
    try {
      const title = await page.title();
      const body = await page.evaluate(() => document.body?.innerText?.slice(0, 12000) || '');
      if (`${title}\n${body}`.toLowerCase().includes(threadHint.toLowerCase())) return page;
    } catch {}
  }
  return candidates[0];
}

export async function runSupervisor(options = {}) {
  const execute = Boolean(options.execute);
  const once = Boolean(options.once);
  const cdpUrl = options.cdpUrl || DEFAULT_CDP_URL;
  const threadHint = options.threadHint || DEFAULT_THREAD_HINT;
  const repo = options.repo || DEFAULT_REPO;
  const intervalMs = options.intervalMs || DEFAULT_INTERVAL_MS;
  const cooldownMs = options.cooldownMs || DEFAULT_COOLDOWN_MS;

  assertCapsulePresent();
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.connect({ browserURL: cdpUrl, defaultViewport: null });
  let lastContinuationAt = 0;

  try {
    while (true) {
      const page = await findWatchPage(browser, threadHint);
      if (!page) {
        appendReceipt({ at: new Date().toISOString(), state: 'NO_WATCH_PAGE', cdpUrl, threadHint });
      } else {
        const snapshot = await getSnapshot(page);
        const classification = classifySnapshot(snapshot, { repo });
        const receipt = {
          at: new Date().toISOString(),
          page: { title: snapshot.title, url: snapshot.url },
          classification,
          execute,
          action: 'none',
        };

        if (classification.state === 'APPROVAL_PENDING') {
          receipt.action = execute ? 'approve_scoped_github' : 'would_approve_scoped_github';
          if (execute) receipt.actionResult = await clickScopedAllowOnce(page, repo);
        } else if (classification.state === 'TURN_COMPLETE') {
          const now = Date.now();
          if (shouldSendContinuation({ now, lastContinuationAt, cooldownMs })) {
            receipt.action = execute ? 'send_continuation' : 'would_send_continuation';
            if (execute) {
              receipt.actionResult = await sendContinuation(page, buildContinuationPrompt());
              if (receipt.actionResult?.ok) lastContinuationAt = now;
            }
          } else {
            receipt.action = 'cooldown';
          }
        }

        appendReceipt(receipt);
        if (classification.state === 'HARD_BLOCKER' || classification.state === 'UNRECOGNIZED_APPROVAL') {
          if (!once) await new Promise((resolve) => setTimeout(resolve, Math.max(intervalMs, 30000)));
        }
      }

      if (once) break;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  } finally {
    await browser.disconnect();
  }
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const valueAfter = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    execute: args.has('--execute'),
    once: args.has('--once'),
    cdpUrl: valueAfter('--cdp-url'),
    threadHint: valueAfter('--thread-hint'),
    repo: valueAfter('--repo'),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSupervisor(parseArgs(process.argv)).catch((error) => {
    appendReceipt({ at: new Date().toISOString(), state: 'SUPERVISOR_ERROR', error: error.message });
    console.error(error);
    process.exit(1);
  });
}
