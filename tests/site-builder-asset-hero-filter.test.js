/**
 * SYNOPSIS: js — tests/site-builder-asset-hero-filter.test.js.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isVideoThumbnailUrl } from '../services/site-builder-asset-ingestion.js';
import { normalizeLayoutContent } from '../config/design-studio-layouts.js';

describe('site-builder hero photo filter', () => {
  it('flags YouTube clickbait thumbnails', () => {
    assert.equal(isVideoThumbnailUrl('https://i3.ytimg.com/vi/zDClwn_C4nQ/hqdefault.jpg'), true);
    assert.equal(isVideoThumbnailUrl('https://i.ytimg.com/vi/abc/maxresdefault.jpg'), true);
    assert.equal(isVideoThumbnailUrl('https://static.wixstatic.com/media/fb1e61_abc~mv2.jpg'), false);
  });

  it('normalizeLayoutContent never picks YouTube thumbs as hero', () => {
    const c = normalizeLayoutContent({
      businessName: 'Sherry L Hopkins CPM',
      industry: 'midwifery',
      heroImages: [
        'https://i3.ytimg.com/vi/zDClwn_C4nQ/hqdefault.jpg',
        'https://static.wixstatic.com/media/fb1e61_798ae6e3db394fabbe89a4ea28d6e207~mv2.jpg',
        'https://i2.ytimg.com/vi/5kWI9i9c9eA/hqdefault.jpg',
      ],
    }, null);
    assert.ok(!/ytimg/i.test(c.hero), `hero was youtube thumb: ${c.hero}`);
    assert.ok(/wixstatic.*\.jpg/i.test(c.hero), `expected Wix jpg hero, got ${c.hero}`);
    assert.ok(c.gallery.every((u) => !/ytimg/i.test(u)), 'gallery still has youtube thumbs');
  });
});