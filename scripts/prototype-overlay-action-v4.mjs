#!/usr/bin/env node
/**
 * SYNOPSIS: Prototype V4 — Verbal AI Director & Autonomous Overlay Action.
 * Parses a natural-language command into a deterministic, auditable plan, then
 * executes the plan in a browser via Puppeteer with required confirmation stops.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

let puppeteer;

export function parseCommand(command, context = {}) {
  const lower = String(command || '').toLowerCase();
  const steps = [];
  const clauses = String(command || '').split(/(?:\s+and\s+|\s*,\s+|\s+then\s+)/i);

  for (let clause of clauses) {
    clause = clause.trim().replace(/^(?:please|ok|okay|now)\s+/i, '');
    if (!clause) continue;

    let m = clause.match(/^(?:(?:fill|set|put)\s+(?:the\s+)?|the\s+)(?<field>[A-Za-z0-9 _.'"-]+?)\s+(?:with|to|as)\s+(?<value>.+)$/i);
    if (!m && /\b(?:type|enter)\b/i.test(clause)) {
      m = clause.match(/^(?:type|enter)\s*(?<value>[^,]+?)\s+(?:into|in)\s+(?:the\s+)?(?<field>[A-Za-z0-9 _.'"-]+?)$/i);
    }
    if (m) {
      const value = m.groups.value.replace(/\s+(?:stop|before|do\s+not|and\s+then|and\s+select|and\s+click|and\s+go|then\s+select|then\s+click).*/i, '').trim();
      steps.push({ action: 'fill', field: m.groups.field.trim(), value, reason: `parsed "${m.groups.field.trim()}" = "${value}"` });
      continue;
    }

    m = clause.match(/^(?:select|choose|pick)?\s*(?:the\s+)?(?<option>[^,]+?)\s+(?:from|in)\s+(?:the\s+)?(?<field>[A-Za-z0-9 _.'"-]+?)$/i);
    if (m) {
      steps.push({ action: 'select', field: m.groups.field.trim().replace(/\s+(?:drop\s*down|menu|list)$/i, ''), option: m.groups.option.trim(), reason: 'parsed select option' });
      continue;
    }

    m = clause.match(/^(?:click|press|tap)\s*(?:the\s+)?(?<target>.+?)(?:\s+button|\s+link|\s+tab)?$/i);
    if (m) {
      steps.push({ action: 'click', target: m.groups.target.trim(), reason: 'parsed click intent' });
      continue;
    }

    m = clause.match(/^(?:go|navigate)?\s+(?:to|over)\s+(?:the\s+)?(?<page>.+?)(?:\s+page|\s+tab|\s+screen)?$/i);
    if (m) {
      steps.push({ action: 'navigate', target: m.groups.page.trim(), reason: 'parsed navigation' });
      continue;
    }
  }

  if (/\bstop\b|\bdo\s+not\s+(?:submit|click)\b|\bbefore\s+(?:submitting|clicking)\b|wait\s+for\s+confirmation/i.test(lower)) {
    steps.push({ action: 'stop', reason: 'explicit stop / confirmation gate detected' });
  }

  return { intent: steps.length ? 'action_plan' : 'unknown', steps, command, context };
}

export function normalizeClickableText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function scoreClickableCandidate(candidate, target) {
  const wanted = normalizeClickableText(target);
  const fields = [candidate?.text, candidate?.ariaLabel, candidate?.title, candidate?.value, candidate?.name]
    .map(normalizeClickableText)
    .filter(Boolean);
  if (!wanted || !fields.length) return -1;
  if (fields.some((x) => x === wanted)) return 100;
  if (fields.some((x) => x.startsWith(wanted) || wanted.startsWith(x))) return 80;
  if (fields.some((x) => x.includes(wanted))) return 60;
  const words = wanted.split(' ').filter(Boolean);
  const bestOverlap = Math.max(0, ...fields.map((x) => words.filter((w) => x.includes(w)).length));
  return bestOverlap ? 20 + bestOverlap : -1;
}

export function resolveSelector(step, available = {}) {
  const synonyms = {
    fullname: 'input[name="fullName"],#fullName,input[name="name"]',
    name: 'input[name="fullName"],#fullName,input[name="name"]',
    email: 'input[name="email"],#email,input[type="email"]',
    phone: 'input[name="phone"],#phone',
    budget: 'input[name="budget"],#budget',
    plan: 'select[name="plan"],#plan',
    confirm: 'input[name="confirm"],#confirm',
    submit: '#submitBtn,[type="submit"]',
    reset: '#resetBtn',
    settings: 'a[href*="setting"],button,[role="button"]',
  };
  const key = (step.field || step.target || step.option || '').toLowerCase().replace(/\s+/g, '');
  if (synonyms[key]) return synonyms[key];
  return available[key] || `input[name="${key}"],#${key}`;
}

export function approvePlan(plan) {
  const risky = ['submit', 'delete', 'purchase', 'pay', 'confirm'];
  const hasRisk = plan.steps.some((s) => s.action === 'click' && risky.some((r) => (s.target || '').toLowerCase().includes(r)));
  const hasStop = plan.steps.some((s) => s.action === 'stop');
  return {
    approved: !hasRisk || hasStop,
    hasRisk,
    hasStop,
    requiresConfirmation: hasRisk,
  };
}

export async function clickVisibleTarget(page, target) {
  return page.evaluate((wanted) => {
    const normalize = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const score = (el) => {
      const fields = [
        el.innerText,
        el.textContent,
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.getAttribute('value'),
        el.getAttribute('name'),
      ].map(normalize).filter(Boolean);
      const targetText = normalize(wanted);
      if (fields.some((x) => x === targetText)) return 100;
      if (fields.some((x) => x.startsWith(targetText) || targetText.startsWith(x))) return 80;
      if (fields.some((x) => x.includes(targetText))) return 60;
      const words = targetText.split(' ').filter(Boolean);
      const overlap = Math.max(0, ...fields.map((x) => words.filter((word) => x.includes(word)).length));
      return overlap ? 20 + overlap : -1;
    };
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.pointerEvents !== 'none';
    };
    const selectors = [
      'button', 'a[href]', '[role="button"]', '[role="link"]', '[role="tab"]',
      'input[type="button"]', 'input[type="submit"]', 'input[type="checkbox"]', 'input[type="radio"]',
      'summary', 'label', '[tabindex]:not([tabindex="-1"])', '[onclick]', '[data-testid]'
    ].join(',');
    const candidates = [...document.querySelectorAll(selectors)]
      .filter(visible)
      .map((el, index) => ({ el, index, score: score(el), rect: el.getBoundingClientRect() }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score || b.rect.bottom - a.rect.bottom);
    const best = candidates[0];
    if (!best || best.score < 20) return { ok: false, reason: 'no_clickable_match', target: wanted };
    best.el.scrollIntoView({ block: 'center', inline: 'center' });
    best.el.click();
    return {
      ok: true,
      score: best.score,
      tag: best.el.tagName,
      text: normalize(best.el.innerText || best.el.textContent || best.el.getAttribute('aria-label') || best.el.getAttribute('title')).slice(0, 300),
    };
  }, target);
}

export async function executePlan(page, plan) {
  const receipt = { command: plan.command, startedAt: new Date().toISOString(), steps: [] };
  const approval = approvePlan(plan);
  if (!approval.approved) throw new Error(`Risky action requires explicit stop/confirmation: ${JSON.stringify(plan)}`);

  for (const step of plan.steps) {
    const entry = { ...step, timestamp: new Date().toISOString() };
    if (step.action === 'stop') {
      entry.result = 'stopped_before_risky_action';
      receipt.steps.push(entry);
      break;
    }

    if (step.action === 'fill') {
      const sel = resolveSelector(step);
      await page.locator(sel).fill(step.value);
      entry.result = 'filled';
      entry.selector = sel;
    } else if (step.action === 'select') {
      const sel = resolveSelector(step);
      await page.locator(sel).selectOption(step.option);
      entry.result = 'selected';
      entry.selector = sel;
    } else if (step.action === 'click') {
      const risky = ['submit', 'delete', 'purchase', 'pay', 'confirm'];
      if (risky.some((r) => (step.target || '').toLowerCase().includes(r))) {
        entry.result = 'blocked_pending_confirmation';
        receipt.steps.push(entry);
        break;
      }
      const result = await clickVisibleTarget(page, step.target);
      entry.result = result.ok ? 'clicked' : 'click_failed';
      entry.click = result;
      if (!result.ok) throw new Error(`Could not click visible target "${step.target}": ${result.reason}`);
    } else if (step.action === 'navigate') {
      const target = step.target.toLowerCase().replace(/\s/g, '-');
      await page.goto(`${page.url().split('/').slice(0, -1).join('/')}/${target}.html`);
      entry.result = 'navigated';
    } else {
      entry.result = 'skipped_unsupported';
    }
    receipt.steps.push(entry);
  }

  receipt.completedAt = new Date().toISOString();
  return receipt;
}

export async function runOverlayAction(command, urlOrFile, options = {}) {
  puppeteer ??= (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    const target = urlOrFile.startsWith('file://') ? urlOrFile : (fs.existsSync(urlOrFile) ? 'file://' + path.resolve(urlOrFile) : urlOrFile);
    await page.goto(target);
    const plan = parseCommand(command, options.context);
    const receipt = await executePlan(page, plan);
    return { plan, receipt, target };
  } finally {
    await browser.close();
  }
}

async function selfTest() {
  const plan = parseCommand('Fill the full name with Alice Smith and the email with alice@example.com and stop before submitting');
  assert.ok(plan.steps.some((s) => s.action === 'fill' && s.field === 'full name' && s.value === 'Alice Smith'), 'full name parsed');
  assert.ok(plan.steps.some((s) => s.action === 'fill' && s.field === 'email' && s.value === 'alice@example.com'), 'email parsed');
  assert.ok(plan.steps.some((s) => s.action === 'stop'), 'stop parsed');
  const risky = parseCommand('Click the submit button');
  const app = approvePlan(risky);
  assert.strictEqual(app.approved, false, 'submit requires confirmation');
  assert.ok(scoreClickableCandidate({ text: 'Allow once' }, 'Allow once') > scoreClickableCandidate({ text: 'Allow for this chat' }, 'Allow once'));
  assert.equal(parseCommand('Click Allow once').steps[0].target, 'Allow once');
  console.log('Overlay Action V4 self-tests passed.');
}

if (process.argv.includes('--test')) {
  await selfTest();
} else {
  await selfTest();
}

export { selfTest };
