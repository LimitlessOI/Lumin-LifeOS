/**
 * SYNOPSIS: js — tests/founder-build-base-url.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

test('resolveFounderBuildBaseUrl prefers local loopback outside Railway even when PUBLIC_BASE_URL is set', async () => {
  const original = {
    FOUNDER_BUILD_BASE_URL: process.env.FOUNDER_BUILD_BASE_URL,
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
    RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
    RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
    RAILWAY_SERVICE_ID: process.env.RAILWAY_SERVICE_ID,
    PORT: process.env.PORT,
  };

  try {
    delete process.env.FOUNDER_BUILD_BASE_URL;
    process.env.PUBLIC_BASE_URL = 'https://robust-magic-production.up.railway.app';
    delete process.env.RAILWAY_PUBLIC_DOMAIN;
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.RAILWAY_ENVIRONMENT_NAME;
    delete process.env.RAILWAY_PROJECT_ID;
    delete process.env.RAILWAY_SERVICE_ID;
    process.env.PORT = '4313';

    const mod = await import(`../services/founder-build-success-gate.js?case=${Date.now()}`);
    assert.equal(mod.resolveFounderBuildBaseUrl(), 'http://127.0.0.1:4313');
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('resolveFounderBuildBaseUrl honors explicit override first', async () => {
  const original = {
    FOUNDER_BUILD_BASE_URL: process.env.FOUNDER_BUILD_BASE_URL,
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
    PORT: process.env.PORT,
  };

  try {
    process.env.FOUNDER_BUILD_BASE_URL = 'https://example.test';
    process.env.PUBLIC_BASE_URL = 'https://robust-magic-production.up.railway.app';
    process.env.PORT = '4313';

    const mod = await import(`../services/founder-build-success-gate.js?override=${Date.now()}`);
    assert.equal(mod.resolveFounderBuildBaseUrl(), 'https://example.test');
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
