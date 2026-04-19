#!/usr/bin/env node
/**
 * scripts/lifeos-smoke.mjs
 * Lightweight LifeOS surface verifier:
 * - checks shell-linked pages exist
 * - checks PAGE_META covers navigable pages
 * - checks feature guides exist for navigable pages
 * - serves public routes through a minimal Express app and verifies the URLs
 * - confirms in-page hover help wiring exists on the current high-use surfaces
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import fs from 'fs';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { registerPublicRoutes } from '../routes/public-routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const overlayDir = path.join(ROOT, 'public', 'overlay');

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

function ok(msg) { console.log(`${C.green}✓${C.reset} ${msg}`); }
function fail(msg) { console.error(`${C.red}✗${C.reset} ${msg}`); }

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function shellPages(shellHtml) {
  const pages = new Set();
  for (const m of shellHtml.matchAll(/data-page="(lifeos-[^"]+\.html)"/g)) pages.add(m[1]);
  for (const m of shellHtml.matchAll(/loadPage\('(lifeos-[^']+\.html)'/g)) pages.add(m[1]);
  pages.add('lifeos-app.html');
  return [...pages].sort();
}

function pageMetaPages(shellHtml) {
  const block = shellHtml.match(/const PAGE_META = \{([\s\S]*?)\n\};/);
  if (!block) return new Set();
  return new Set([...block[1].matchAll(/'(lifeos-[^']+\.html)'/g)].map((m) => m[1]));
}

function guidePages(dataJs) {
  return new Set([...dataJs.matchAll(/'(lifeos-[^']+\.html)': \{/g)].map((m) => m[1]));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkPublicRoutes(pages) {
  const app = express();
  registerPublicRoutes(app, {
    fs,
    path,
    __dirname: ROOT,
    COMMAND_CENTER_KEY: 'test-key',
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  try {
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    const urls = [
      '/lifeos',
      '/overlay/lifeos-app.html',
      '/overlay/lifeos-feature.html',
      '/overlay/lifeos-feature-data.js',
      '/overlay/lifeos-bootstrap.js',
      '/overlay/lifeos-control-help.js',
      '/overlay/lifeos-theme.js',
      '/overlay/lifeos-theme-overrides.css',
      '/overlay/lifeos-ds.css',
    ];

    for (const page of pages) {
      if (page !== 'lifeos-app.html') {
        urls.push(`/overlay/${page}`);
        urls.push(`/${page}`);
      }
    }

    for (const url of urls) {
      const res = await fetch(`${base}${url}`);
      assert(res.status === 200, `${url} returned ${res.status}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function checkControlHelpWiring() {
  const expectations = {
    'public/overlay/lifeos-today.html': [
      'data-help-key="checkin"',
      'data-help-key="focus-start"',
      'data-help-key="focus-stop"',
      'data-help-key="focus-nudge"',
      'data-help-key="privacy-1h"',
      'data-help-key="privacy-2h"',
      'data-help-key="privacy-off"',
      'data-help-key="commit-add"',
    ],
    'public/overlay/lifeos-quick-entry.html': [
      'data-help-key="type-commitment"',
      'data-help-key="type-joy"',
      'data-help-key="type-focus"',
      'data-help-key="type-privacy"',
      'data-help-key="type-command"',
      'data-help-key="type-braindump"',
      'data-help-key="capture-inbox"',
    ],
    'public/overlay/lifeos-notifications.html': [
      'data-help-key="ack-all"',
      'data-help-key="sms-delay"',
      'data-help-key="alarm-delay"',
      'data-help-key="call-delay"',
      'data-help-key="save-escalation"',
      'data-help-key="test-escalation"',
    ],
    'public/overlay/lifeos-engine.html': [
      'data-help-key="queue-task"',
      'data-help-key="save-event"',
      'data-help-key="add-rule"',
      'data-help-key="sync-google"',
      'data-help-key="connect-google"',
    ],
  };

  for (const [file, needles] of Object.entries(expectations)) {
    const text = read(file);
    for (const needle of needles) {
      assert(text.includes(needle), `${file} missing ${needle}`);
    }
    assert(text.includes('/overlay/lifeos-control-help.js'), `${file} missing shared control help script`);
  }
}

async function main() {
  console.log(`${C.bold}LifeOS Smoke${C.reset}`);
  const shellHtml = read('public/overlay/lifeos-app.html');
  const dataJs = read('public/overlay/lifeos-feature-data.js');

  const pages = shellPages(shellHtml);
  const meta = pageMetaPages(shellHtml);
  const guides = guidePages(dataJs);

  for (const page of pages) {
    assert(fs.existsSync(path.join(overlayDir, page)), `missing overlay file ${page}`);
    if (page !== 'lifeos-app.html' && page !== 'lifeos-feature.html') {
      assert(meta.has(page), `PAGE_META missing ${page}`);
      assert(guides.has(page), `feature guide metadata missing ${page}`);
    }
  }
  ok(`Shell references ${pages.length} LifeOS pages and all exist`);
  assert(shellHtml.includes('/overlay/lifeos-bootstrap.js'), 'LifeOS shell missing shared bootstrap script');

  checkControlHelpWiring();
  ok('Control-help wiring exists on Today, Quick Entry, Notifications, and Engine');

  await checkPublicRoutes(pages);
  ok('Public LifeOS routes and direct overlay pages return 200');

  console.log(`${C.green}${C.bold}PASS${C.reset}`);
}

main().catch((error) => {
  fail(error.message || String(error));
  process.exit(1);
});
