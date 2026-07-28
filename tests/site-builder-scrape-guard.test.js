/**
 * SYNOPSIS: js — tests/site-builder-scrape-guard.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyScrapeGuard,
  applyScrapePoisonQualityGate,
  detectPoisonScrape,
  isPoisonBusinessName,
  resolveBusinessName,
} from '../services/site-builder-scrape-guard.js';

test('detectPoisonScrape flags CloudFront error titles', () => {
  const result = detectPoisonScrape({
    title: 'ERROR: The request could not be satisfied',
    bodyText: 'Request blocked.',
  });
  assert.equal(result.poisoned, true);
});

test('detectPoisonScrape flags parked domain pages', () => {
  const result = detectPoisonScrape({
    title: 'HugeDomains.com',
    bodyText: 'This domain is for sale.',
  });
  assert.equal(result.poisoned, true);
});

test('resolveBusinessName prefers submitted name over poison scrape', () => {
  const result = resolveBusinessName({
    scrapedName: 'ERROR: The request could not be satisfied',
    submittedName: 'Gentle Hands Midwifery',
    url: 'https://example.com',
    poisoned: true,
  });
  assert.equal(result.businessName, 'Gentle Hands Midwifery');
  assert.equal(result.scrapePoisoned, true);
});

test('applyScrapeGuard uses hostname when scrape is poison and no submitted name', () => {
  const info = applyScrapeGuard(
    {
      title: '403 Forbidden',
      businessName: '403 Forbidden',
      bodyText: 'Access denied',
    },
    { url: 'https://www.gentlehands.com' }
  );
  assert.equal(info.businessName, 'Gentlehands');
  assert.equal(info.scrapePoisoned, true);
});

test('applyScrapePoisonQualityGate blocks readyToSend', () => {
  const gated = applyScrapePoisonQualityGate(
    { scorePct: 88, readyToSend: true, issues: [], summaryIssues: [] },
    { scrapePoisoned: true }
  );
  assert.equal(gated.readyToSend, false);
  assert.match(gated.issues.join(' '), /error or placeholder page/i);
});

test('isPoisonBusinessName rejects error-page titles', () => {
  assert.equal(isPoisonBusinessName('Just a moment...'), true);
  assert.equal(isPoisonBusinessName('Bright Path Wellness'), false);
});