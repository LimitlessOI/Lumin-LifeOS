/**
 * SYNOPSIS: js — tests/site-builder-public-base.test.js.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isUnresolvedPublicBase,
  resolveDurablePublicBase,
  resolveRequestPublicBase,
  normalizePublicBase,
} from '../services/site-builder-public-base.js';

describe('site-builder-public-base', () => {
  it('flags branded host as unresolved by default', () => {
    assert.equal(isUnresolvedPublicBase('https://sitebuilder.taloaos.com'), true);
    assert.equal(isUnresolvedPublicBase('https://lumin-web-production-e3a9.up.railway.app'), false);
  });

  it('skips unresolved branded host in durable resolution', () => {
    const prev = {
      SITE_BASE_URL: process.env.SITE_BASE_URL,
      PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      SITE_BUILDER_FALLBACK_ORIGIN: process.env.SITE_BUILDER_FALLBACK_ORIGIN,
      SITE_BUILDER_BRANDED_HOST_LIVE: process.env.SITE_BUILDER_BRANDED_HOST_LIVE,
    };
    process.env.SITE_BASE_URL = 'https://sitebuilder.taloaos.com';
    process.env.PUBLIC_BASE_URL = '';
    process.env.RAILWAY_PUBLIC_DOMAIN = 'sitebuilder.taloaos.com';
    delete process.env.SITE_BUILDER_FALLBACK_ORIGIN;
    delete process.env.SITE_BUILDER_BRANDED_HOST_LIVE;

    try {
      const base = resolveDurablePublicBase(['https://sitebuilder.taloaos.com/']);
      assert.equal(base, 'https://lumin-web-production-e3a9.up.railway.app');
    } finally {
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });

  it('uses request forwarded host for checkout-style URLs', () => {
    const base = resolveRequestPublicBase(
      {
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'lumin-web-production-e3a9.up.railway.app',
        },
      },
      'https://sitebuilder.taloaos.com',
    );
    assert.equal(base, 'https://lumin-web-production-e3a9.up.railway.app');
  });

  it('normalizes trailing slashes', () => {
    assert.equal(normalizePublicBase('https://example.com/'), 'https://example.com');
  });
});