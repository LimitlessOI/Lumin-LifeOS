/**
 * SYNOPSIS: js — tests/site-builder-template-catalog-50.test.js.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SITE_BUILDER_TEMPLATE_CATALOG_50,
  LAYOUT_FAMILIES,
  catalogAsDesignSystems,
} from '../config/site-builder-template-catalog-50.js';
import { DESIGN_SYSTEMS, pickDesignSystems, FREE_DESIGN_SYSTEM_IDS } from '../config/design-studio.js';
import { normalizeLayoutContent, renderDesignSystemLayout } from '../config/design-studio-layouts.js';

describe('site-builder 50-template catalog', () => {
  it('has exactly 50 unique niche templates', () => {
    assert.equal(SITE_BUILDER_TEMPLATE_CATALOG_50.length, 50);
    const ids = SITE_BUILDER_TEMPLATE_CATALOG_50.map((t) => t.id);
    assert.equal(new Set(ids).size, 50);
  });

  it('covers many layout families (not one shell)', () => {
    const families = new Set(SITE_BUILDER_TEMPLATE_CATALOG_50.map((t) => t.layoutFamily));
    assert.ok(families.size >= 12, `expected ≥12 families, got ${families.size}`);
    for (const fam of families) {
      assert.ok(LAYOUT_FAMILIES.includes(fam), `unknown family ${fam}`);
    }
  });

  it('registers catalog into DESIGN_SYSTEMS', () => {
    const catalogIds = new Set(catalogAsDesignSystems().map((d) => d.id));
    for (const id of catalogIds) {
      assert.ok(DESIGN_SYSTEMS.some((d) => d.id === id), `missing ${id}`);
    }
  });

  it('pickDesignSystems diversifies layout families', () => {
    const picked = pickDesignSystems(16);
    const fams = new Set(picked.map((d) => d.layoutFamily || `legacy:${d.id}`));
    assert.ok(fams.size >= 8, `expected diversified families, got ${fams.size}: ${[...fams].join(',')}`);
  });

  it('pickDesignSystems excludes trade shells for midwifery', () => {
    const picked = pickDesignSystems(12, [], { industry: 'midwifery', bodyText: 'prenatal birth postpartum midwife' });
    const niches = picked.map((d) => d.niche);
    assert.ok(!niches.includes('hvac'), `HVAC leaked into midwife set: ${picked.map((d) => d.id).join(',')}`);
    assert.ok(!niches.includes('plumbing'), `plumber leaked into midwife set`);
    assert.ok(picked.some((d) => d.niche === 'midwifery' || /midwife|wellrounded|organic|editorial/i.test(d.id)),
      `expected birth/wellness-leaning templates, got ${picked.map((d) => d.id).join(',')}`);
  });

  it('normalizeLayoutContent never uses bare Jane affiliate as primary booking', () => {
    const c = normalizeLayoutContent({
      businessName: 'Sherry L Hopkins CPM',
      industry: 'midwifery',
      phone: '702-478-5080',
      h1: 'Certified Professional Midwife serving Las Vegas',
      uniqueValue: 'Compassionate home birth care for growing families',
      services: ['Prenatal Care', 'Birth Support', 'Postpartum Care'],
      serviceDetails: [
        { name: 'Prenatal Care', description: 'Ongoing prenatal visits and education.' },
      ],
    }, { name: 'Jane App', url: 'https://jane.app' });
    assert.ok(!/^https?:\/\/(www\.)?jane\.app\/?$/i.test(c.booking), `booking was affiliate: ${c.booking}`);
    assert.ok(c.booking.startsWith('tel:') || c.booking.includes('702'), `expected tel booking, got ${c.booking}`);
    assert.ok(!/clear outcomes/i.test(c.tagline), `generic tagline leaked: ${c.tagline}`);
    assert.ok(c.serviceDetails[0].description.includes('prenatal'), 'service description missing');
  });

  it('normalizeLayoutContent prefers AI service names over junk scrape labels', () => {
    const c = normalizeLayoutContent({
      businessName: 'Sherry L Hopkins CPM',
      industry: 'midwifery',
      phone: '702-478-5080',
      tagline: 'Transform from feeling shy or uncertain to truly shining in your life.',
      about: 'Certified Professional Midwife offering home birth and wellness.',
      services: ['Prenatal Care', 'Labor & Birth At Home', 'Postpartum & Newborn Care'],
      serviceDetails: [
        { name: 'Birth Story Videos', description: '' },
        { name: 'Services', description: '' },
      ],
    }, null);
    assert.deepEqual(c.services, ['Prenatal Care', 'Labor & Birth At Home', 'Postpartum & Newborn Care']);
    assert.ok(!c.services.includes('Services'));
    assert.ok(!c.services.includes('Birth Story Videos'));
  });

  it('FREE_DESIGN_SYSTEM_IDS are resolvable', () => {
    for (const id of FREE_DESIGN_SYSTEM_IDS) {
      assert.ok(DESIGN_SYSTEMS.some((d) => d.id === id), `free id missing: ${id}`);
    }
  });

  it('imageOffset rotates hero so variants do not share one photo', () => {
    const heroes = Array.from({ length: 8 }, (_, i) => `https://example.com/h${i}.jpg`);
    const a = normalizeLayoutContent({ businessName: 'Test', heroImages: heroes }, null, { imageOffset: 0 });
    const b = normalizeLayoutContent({ businessName: 'Test', heroImages: heroes }, null, { imageOffset: 3 });
    assert.equal(a.hero, 'https://example.com/h0.jpg');
    assert.equal(b.hero, 'https://example.com/h3.jpg');
    assert.notEqual(a.hero, b.hero);
  });

  it('layout families render distinct data-layout-family markers', () => {
    const info = {
      businessName: 'Acme HVAC',
      industry: 'hvac',
      phone: '555-0100',
      heroImages: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800'],
      services: ['AC repair', 'Install', 'Maintenance'],
    };
    const samples = [
      SITE_BUILDER_TEMPLATE_CATALOG_50.find((t) => t.layoutFamily === 'sticky-call'),
      SITE_BUILDER_TEMPLATE_CATALOG_50.find((t) => t.layoutFamily === 'before-after'),
      SITE_BUILDER_TEMPLATE_CATALOG_50.find((t) => t.layoutFamily === 'menu-board'),
      SITE_BUILDER_TEMPLATE_CATALOG_50.find((t) => t.layoutFamily === 'realtor-search'),
    ].filter(Boolean);
    const markers = samples.map((t) => {
      const sys = DESIGN_SYSTEMS.find((d) => d.id === t.id);
      const html = renderDesignSystemLayout(sys, info, null, { imageOffset: 0 });
      assert.ok(html && html.includes('data-layout-family'), `${t.id} missing family attr`);
      const m = html.match(/data-layout-family="([^"]+)"/);
      return m?.[1];
    });
    assert.equal(new Set(markers).size, markers.length, `families not distinct: ${markers.join(',')}`);
  });
});