import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreGeneratedSite, scoreSummary } from '../services/site-builder-quality-scorer.js';

test('scoreGeneratedSite flags weak HTML as not ready to send', () => {
  const html = '<html><body><h1>Hello</h1></body></html>';
  const result = scoreGeneratedSite(html, {}, { minReadyScore: 72 });

  assert.equal(result.readyToSend, false);
  assert.equal(result.recommendedAction, 'revise_before_send');
  assert.ok(result.scorePct < 72);
  assert.ok(result.issues.length > 0);
});

test('scoreGeneratedSite passes a conversion-ready site', () => {
  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Bright Path Wellness"}</script>
    </head>
    <body>
      <nav><a href="#book">Book Free Consultation</a></nav>
      <main>
        <h1>Bright Path Wellness</h1>
        <h2>Does this sound familiar?</h2>
        <h2>Here's how we help</h2>
        <h2>Common questions</h2>
        <section>Book your free consultation today and schedule your first session.</section>
        <section>What clients value most about working with us.</section>
        <section>Packages start at $197 per month.</section>
        <section>Call us at (555) 555-1212 or email hello@example.com.</section>
        <div x-data="{open:false}">FAQ accordion</div>
        <a href="#book" class="focus-visible:outline">Get started</a>
        <a href="#book">Book now</a>
        <div class="fixed bottom-0 md:hidden">Mobile sticky CTA</div>
      </main>
      <footer>Footer content</footer>
    </body>
  </html>`;

  const result = scoreGeneratedSite(html.repeat(8), {}, { minReadyScore: 72 });

  assert.equal(result.readyToSend, true);
  assert.equal(result.recommendedAction === 'ship' || result.recommendedAction === 'review_then_send', true);
  assert.ok(result.scorePct >= 72);
  assert.ok(result.score >= 72);
  assert.match(scoreSummary(result), /Ready to send/i);
});
