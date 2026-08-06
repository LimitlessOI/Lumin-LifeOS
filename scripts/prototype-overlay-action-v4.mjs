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
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

let puppeteer;

export function parseCommand(command, context = {}) {
  const lower = String(command || '').toLowerCase();
  const steps = [];

  // Split on clause separators, preserving values that do not contain conjunctions.
  const clauses = String(command || '').split(/(?:\s+and\s+|\s*,\s+|\s+then\s+)/i);

  for (let clause of clauses) {
    clause = clause.trim().replace(/^(?:please|ok|okay|now)\s+/i, '');
    if (!clause) continue;

    // Fill field with value: "fill the full name with Alice Smith" or "set email to bob@x.com"
    let m = clause.match(/^(?:(?:fill|set|put)\s+(?:the\s+)?|the\s+)(?<field>[A-Za-z0-9 ]+?)\s+(?:with|to|as)\s+(?<value>.+)$/i);
    // Type value into field: "type 5000 into the budget"
    if (!m && /\b(?:type|enter)\b/i.test(clause)) {
      m = clause.match(/^(?:type|enter)\s*(?<value>[^,]+?)\s+(?:into|in)\s+(?:the\s+)?(?<field>[A-Za-z0-9 ]+?)$/i);
    }
    if (m) {
      const value = m.groups.value.replace(/\s+(?:stop|before|do\s+not|and\s+then|and\s+select|and\s+click|and\s+go|then\s+select|then\s+click).*/i, '').trim();
      steps.push({ action: 'fill', field: m.groups.field.trim(), value, reason: `parsed "${m.groups.field.trim()}" = "${value}"` });
      continue;
    }

    // Select option from field.
    m = clause.match(/^(?:select|choose|pick)?\s*(?:the\s+)?(?<option>[^,]+?)\s+(?:from|in)\s+(?:the\s+)?(?<field>[A-Za-z0-9 ]+?)$/i);
    if (m) {
      steps.push({ action: 'select', field: m.groups.field.trim().replace(/\s+(?:drop\s*down|menu|list)$/i, ''), option: m.groups.option.trim(), reason: 'parsed select option' });
      continue;
    }

    // Click target.
    m = clause.match(/^(?:click|press|tap)\s*(?:the\s+)?(?<target>[A-Za-z0-9 ]+?)(?:\s+button|\s+link|\s+tab)?$/i);
    if (m) {
      steps.push({ action: 'click', target: m.groups.target.trim(), reason: 'parsed click intent' });
      continue;
    }

    // Navigate to page.
    m = clause.match(/^(?:go|navigate)?\s+(?:to|over)\s+(?:the\s+)?(?<page>[A-Za-z0-9 ]+?)(?:\s+page|\s+tab|\s+screen)?$/i);
    if (m) {
      steps.push({ action: 'navigate', target: m.groups.page.trim(), reason: 'parsed navigation' });
      continue;
    }
  }

  // Stop / confirm gates.
  if (/\bstop\b|\bdo\s+not\s+(?:submit|click)\b|\bbefore\s+(?:submitting|clicking)\b|wait\s+for\s+confirmation/i.test(lower)) {
    steps.push({ action: 'stop', reason: 'explicit stop / confirmation gate detected' });
  }

  return { intent: steps.length ? 'action_plan' : 'unknown', steps, command, context };
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
    settings: 'a[href*="setting"],button:has-text("settings")',
  };
  const key = (step.field || step.target || step.option || '').toLowerCase().replace(/\s+/g, '');
  if (synonyms[key]) return synonyms[key];
  return available[key] || `input[name="${key}"],#${key}`;
}

export function approvePlan(plan, policy = { requireConfirm: true }) {
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
      const sel = resolveSelector(step);
      await page.locator(sel).click();
      entry.result = 'clicked';
      entry.selector = sel;
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
  console.log('Overlay Action V4 self-tests passed.');
}

if (process.argv.includes('--test')) {
  await selfTest();
} else {
  await selfTest();
}

export { selfTest };
