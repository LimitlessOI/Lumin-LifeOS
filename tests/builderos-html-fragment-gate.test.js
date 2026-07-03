/**
 * SYNOPSIS: Unit tests for the HTML fragment/partial truncation gate helpers in
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * routes/lifeos-council-builder-routes.js (validateHtmlFragmentComplete +
 * isHtmlFragmentTarget). A partial/component is legitimately small, so it is
 * gated by tag-structure completeness rather than the full-page length floor —
 * while a truncated fragment (unclosed tag/comment, ends mid-tag) is still
 * rejected. Non-fragment targets keep the strict full-page floor untouched.
 * No network / credentials required.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateHtmlFragmentComplete,
  isHtmlFragmentTarget,
} from '../routes/lifeos-council-builder-routes.js';

test('isHtmlFragmentTarget — recognizes partials/components/fragments dirs', () => {
  assert.equal(isHtmlFragmentTarget('public/overlay/partials/build-status-panel.html'), true);
  assert.equal(isHtmlFragmentTarget('public/components/card.html'), true);
  assert.equal(isHtmlFragmentTarget('ui/fragments/row.html'), true);
  assert.equal(isHtmlFragmentTarget('public/overlay/widget-partial.html'), true);
  assert.equal(isHtmlFragmentTarget('public/overlay/nav.component.html'), true);
});

test('isHtmlFragmentTarget — does NOT treat the live overlay as a fragment', () => {
  assert.equal(isHtmlFragmentTarget('public/overlay/lifeos-app.html'), false);
  assert.equal(isHtmlFragmentTarget('index.html'), false);
});

test('validateHtmlFragmentComplete — accepts a small complete fragment', () => {
  const frag = '<section id="x"><h2>Build Status</h2><p>placeholder</p></section>';
  assert.equal(validateHtmlFragmentComplete(frag), null);
});

test('validateHtmlFragmentComplete — accepts a small COMPLETE full document', () => {
  const doc = [
    '<!DOCTYPE html>', '<html lang="en">', '<head>',
    '<meta charset="utf-8">', '<title>Build Status</title>', '</head>',
    '<body>', '<section id="p"><h2>Build Status</h2><p>ok</p></section>',
    '</body>', '</html>',
  ].join('\n');
  assert.equal(validateHtmlFragmentComplete(doc), null);
});

test('validateHtmlFragmentComplete — accepts void elements without closing tags', () => {
  assert.equal(validateHtmlFragmentComplete('<div><img src="a.png"><br><span>hi</span></div>'), null);
});

test('validateHtmlFragmentComplete — accepts leading/inline comments', () => {
  assert.equal(validateHtmlFragmentComplete('<!-- note --><div>ok</div>'), null);
});

test('validateHtmlFragmentComplete — rejects truncation mid-text (no closing >)', () => {
  assert.match(
    String(validateHtmlFragmentComplete('<section><h2>Build Status</h2><p>place')),
    /truncated/i,
  );
});

test('validateHtmlFragmentComplete — rejects an unclosed outer element', () => {
  assert.match(
    String(validateHtmlFragmentComplete('<section><h2>Build</h2><p>ok</p>')),
    /unclosed <section>/i,
  );
});

test('validateHtmlFragmentComplete — rejects a truncated full document', () => {
  const trunc = '<!DOCTYPE html>\n<html>\n<head>\n<title>x</title>\n</head>\n<body>\n<section><h2>Build';
  assert.notEqual(validateHtmlFragmentComplete(trunc), null);
});

test('validateHtmlFragmentComplete — rejects an unterminated comment', () => {
  assert.match(
    String(validateHtmlFragmentComplete('<div><!-- unterminated <span>x</span></div>')),
    /unterminated comment/i,
  );
});

test('validateHtmlFragmentComplete — rejects a stray closing tag', () => {
  assert.match(
    String(validateHtmlFragmentComplete('</section>')),
    /unexpected closing/i,
  );
});
