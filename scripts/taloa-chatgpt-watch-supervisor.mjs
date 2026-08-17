#!/usr/bin/env node
/**
 * SYNOPSIS: Taloa ChatGPT Watch Supervisor — supervised browser loop for BuilderOS Watch.
 * Connects to an existing Chromium session, acts only on the current execution frontier,
 * resumes a dedicated Watch thread, alerts the founder by read-aloud when needed, and records receipts.
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
const DEFAULT_PLAYBACK_RATE = Number(process.env.TALOA_WATCH_PLAYBACK_RATE || 1.25);
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
    'If Adam is required, end the latest answer with the exact token FOUNDER_DECISION_REQUIRED and plainly state what you need from him.',
    'If a capability/permission blocks progress, end the latest answer with the exact token HARD_CAPABILITY_BLOCKER and plainly state the blocker.',
    'Stop only for POINT_B_REACHED, FOUNDER_DECISION_REQUIRED, or HARD_CAPABILITY_BLOCKER.'
  ].join(' ');
}

function repoEvidence(text, repo = DEFAULT_REPO) {
  const lower = String(text || '').toLowerCase();
  const repoLower = String(repo).toLowerCase();
  const repoName = repoLower.split('/').at(-1);
  return lower.includes(repoLower) || (lower.includes('github') && lower.includes(repoName));
}

export function selectExecutionFrontierApproval(approvals = [], repo = DEFAULT_REPO) {
  if (!Array.isArray(approvals) || approvals.length === 0) return null;
  const ordered = [...approvals].sort((a, b) => Number(a.bottom || 0) - Number(b.bottom || 0));
  const latest = ordered.at(-1);
  return {
    ...latest,
    scopedToRepo: repoEvidence(`${latest?.cardText || ''}\n${latest?.buttonText || ''}`, repo),
  };
}

export function classifySnapshot(snapshot, options = {}) {
  const repo = String(options.repo || DEFAULT_REPO);
  const bodyText = String(snapshot?.bodyText || '');
  const latestAssistantText = String(snapshot?.latestAssistantText || '');
  const buttons = Array.isArray(snapshot?.buttons) ? snapshot.buttons.map((x) => String(x).trim()) : [];
  const lowerButtons = buttons.map((x) => x.toLowerCase());
  const frontierApproval = selectExecutionFrontierApproval(snapshot?.approvals || [], repo);
  const fallbackAllowOnce = !snapshot?.approvals?.length && lowerButtons.includes('allow once');
  const fallbackRepoEvidence = repoEvidence(bodyText, repo);
  const hardBlocker = /(buy credits|usage limit|goal usage limit|verify your identity|sign in to continue|captcha|payment required)/i.test(bodyText);
  const founderAttention = /FOUNDER_DECISION_REQUIRED|HARD_CAPABILITY_BLOCKER/.test(latestAssistantText);
  const working = Boolean(snapshot?.isGenerating) || lowerButtons.some((x) => /stop generating|stop response|stop$/.test(x));
  const canCompose = Boolean(snapshot?.composerPresent);

  if (hardBlocker) return { state: 'HARD_BLOCKER', reason: 'recognized account/usage/security blocker' };
  if (founderAttention && !working) return { state: 'FOUNDER_ATTENTION', reason: 'latest assistant answer explicitly requires founder attention' };
  if (frontierApproval) {
    if (frontierApproval.scopedToRepo) {
      return { state: 'APPROVAL_PENDING', reason: 'current execution-frontier GitHub approval is scoped to target repository', frontierApproval };
    }
    return { state: 'UNRECOGNIZED_APPROVAL', reason: 'current execution-frontier approval is not scoped to target repository', frontierApproval };
  }
  if (fallbackAllowOnce && fallbackRepoEvidence) return { state: 'APPROVAL_PENDING', reason: 'legacy snapshot: scoped GitHub approval prompt for target repository' };
  if (fallbackAllowOnce && !fallbackRepoEvidence) return { state: 'UNRECOGNIZED_APPROVAL', reason: 'legacy snapshot: approval prompt lacks target-repo evidence' };
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
    const allButtons = [...document.querySelectorAll('button')];
    const buttons = allButtons.map((el) => (el.innerText || el.textContent || '').trim()).filter(Boolean);
    const bodyText = document.body?.innerText || '';
    const composer = document.querySelector('textarea, [contenteditable="true"]');
    const composerRect = composer?.getBoundingClientRect();
    const stopLike = buttons.some((text) => /stop generating|stop response|^stop$/i.test(text));
    const assistantMessages = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
    const latestAssistant = assistantMessages.at(-1);

    const approvals = allButtons
      .filter((el) => (el.innerText || el.textContent || '').trim().toLowerCase() === 'allow once')
      .map((button, index) => {
        const rect = button.getBoundingClientRect();
        let card = button.parentElement;
        let chosen = button.parentElement;
        for (let depth = 0; card && depth < 6; depth += 1, card = card.parentElement) {
          const text = (card.innerText || card.textContent || '').trim();
          if (text.length >= 20 && text.length <= 2500) chosen = card;
          if (/allow chatgpt to use github\?/i.test(text)) {
            chosen = card;
            break;
          }
        }
        const cardText = (chosen?.innerText || chosen?.textContent || '').trim();
        return {
          index,
          buttonText: (button.innerText || button.textContent || '').trim(),
          cardText: cardText.slice(0, 2500),
          top: rect.top,
          bottom: rect.bottom,
          distanceToComposer: composerRect ? Math.max(0, composerRect.top - rect.bottom) : null,
        };
      });

    return {
      title: document.title,
      url: location.href,
      bodyText: bodyText.slice(-50000),
      latestAssistantText: (latestAssistant?.innerText || latestAssistant?.textContent || '').slice(-12000),
      buttons,
      approvals,
      composerPresent: Boolean(composer),
      isGenerating: stopLike,
    };
  });
}

async function clickExecutionFrontierAllowOnce(page, repo = DEFAULT_REPO) {
  return page.evaluate((targetRepo) => {
    const repoLower = targetRepo.toLowerCase();
    const repoName = repoLower.split('/').pop();
    const composer = document.querySelector('textarea, [contenteditable="true"]');
    const composerRect = composer?.getBoundingClientRect();
    const candidates = [...document.querySelectorAll('button')]
      .filter((el) => (el.innerText || el.textContent || '').trim().toLowerCase() === 'allow once')
      .map((button) => {
        const rect = button.getBoundingClientRect();
        let card = button.parentElement;
        let chosen = button.parentElement;
        for (let depth = 0; card && depth < 6; depth += 1, card = card.parentElement) {
          const text = (card.innerText || card.textContent || '').trim();
          if (text.length >= 20 && text.length <= 2500) chosen = card;
          if (/allow chatgpt to use github\?/i.test(text)) {
            chosen = card;
            break;
          }
        }
        return {
          button,
          bottom: rect.bottom,
          distanceToComposer: composerRect ? Math.max(0, composerRect.top - rect.bottom) : null,
          cardText: (chosen?.innerText || chosen?.textContent || '').trim().toLowerCase(),
        };
      })
      .sort((a, b) => a.bottom - b.bottom);

    if (!candidates.length) return { ok: false, reason: 'no_allow_once' };
    const frontier = candidates.at(-1);
    const scoped = frontier.cardText.includes(repoLower) || (frontier.cardText.includes('github') && frontier.cardText.includes(repoName));
    if (!scoped) return { ok: false, reason: 'frontier_not_scoped_to_repo' };
    frontier.button.click();
    return { ok: true, reason: 'clicked_execution_frontier', distanceToComposer: frontier.distanceToComposer };
  }, repo);
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

async function notifyFounderByReadAloud(page, playbackRate = DEFAULT_PLAYBACK_RATE) {
  const result = await page.evaluate((rate) => {
    const assistantMessages = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
    const latest = assistantMessages.at(-1);
    if (!latest) return { ok: false, reason: 'latest_assistant_not_found' };

    const candidates = [...latest.querySelectorAll('button')];
    const readButton = candidates.find((el) => {
      const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${(el.innerText || el.textContent || '')}`.toLowerCase();
      return /read aloud|listen|speaker|play audio/.test(label);
    });
    if (!readButton) return { ok: false, reason: 'read_aloud_button_not_found' };

    const setRate = () => {
      for (const media of document.querySelectorAll('audio,video')) {
        try { media.playbackRate = rate; } catch {}
      }
    };
    if (!window.__taloaPlaybackRateObserver) {
      window.__taloaPlaybackRateObserver = new MutationObserver(setRate);
      window.__taloaPlaybackRateObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
    setRate();
    readButton.click();
    setTimeout(setRate, 250);
    setTimeout(setRate, 1000);
    return { ok: true, playbackRateRequested: rate };
  }, playbackRate);
  return result;
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
  const playbackRate = Number(options.playbackRate || DEFAULT_PLAYBACK_RATE);

  assertCapsulePresent();
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.connect({ browserURL: cdpUrl, defaultViewport: null });
  let lastContinuationAt = 0;
  let lastFounderAlertText = '';

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
          receipt.action = execute ? 'approve_execution_frontier_github' : 'would_approve_execution_frontier_github';
          if (execute) receipt.actionResult = await clickExecutionFrontierAllowOnce(page, repo);
        } else if (classification.state === 'FOUNDER_ATTENTION') {
          const alertText = snapshot.latestAssistantText || '';
          if (alertText && alertText !== lastFounderAlertText) {
            receipt.action = execute ? 'notify_founder_read_aloud' : 'would_notify_founder_read_aloud';
            if (execute) {
              receipt.actionResult = await notifyFounderByReadAloud(page, playbackRate);
              if (receipt.actionResult?.ok) lastFounderAlertText = alertText;
            }
          } else {
            receipt.action = 'founder_alert_already_sent';
          }
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
    playbackRate: valueAfter('--playback-rate'),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSupervisor(parseArgs(process.argv)).catch((error) => {
    appendReceipt({ at: new Date().toISOString(), state: 'SUPERVISOR_ERROR', error: error.message });
    console.error(error);
    process.exit(1);
  });
}
