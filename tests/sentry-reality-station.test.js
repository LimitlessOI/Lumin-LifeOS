/**
 * SYNOPSIS: SENTRY Reality Station unit tests.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runLayerA,
  runLayerB,
  runSentryRealityStation,
  assertSentryPassForStep,
} from '../services/sentry-reality-station.mjs';

function makeRunner(httpStatus) {
  return {
    http: async ({ path }) => ({ status: httpStatus || 200 }),
    readFile: async () => 'export function foo() {}',
    importModule: async () => ({ foo: () => 'ok' }),
  };
}

describe('sentry-reality-station', () => {
  it('runLayerA fails closed when no assertions are provided', async () => {
    const result = await runLayerA({ runner: makeRunner() });
    assert.equal(result.ok, false);
    assert.equal(result.findings[0], 'Layer A required but no assertions provided');
  });

  it('runLayerA passes when all assertions pass', async () => {
    const result = await runLayerA({
      assertions: [{ type: 'http_status', path: '/ready', expect_status: [200] }],
      runner: makeRunner(200),
    });
    assert.equal(result.ok, true);
    assert.equal(result.results.length, 1);
  });

  it('runLayerA fails when an assertion does not match', async () => {
    const result = await runLayerA({
      assertions: [{ type: 'http_status', path: '/ready', expect_status: [200] }],
      runner: makeRunner(500),
    });
    assert.equal(result.ok, false);
    assert.ok(result.findings[0].includes('http_status'));
  });

  it('runLayerB executes a real-browser scenario against a stubbed session', async () => {
    const log = [];
    const session = {
      navigate: (url) => { log.push({ type: 'navigate', url }); return Promise.resolve(); },
      click: (sel) => { log.push({ type: 'click', sel }); return Promise.resolve(); },
      fill: (sel, val) => { log.push({ type: 'fill', sel, val }); return Promise.resolve(); },
      waitFor: (sel) => { log.push({ type: 'waitFor', sel }); return Promise.resolve(); },
      pageText: () => Promise.resolve('Welcome to Lumin'),
      currentUrl: () => 'https://lumin-web-production-e3a9.up.railway.app/dashboard',
      screenshot: (label) => Promise.resolve(`/tmp/${label}.png`),
      close: () => Promise.resolve(),
    };
    const result = await runLayerB({
      baseUrl: 'https://lumin-web-production-e3a9.up.railway.app',
      session,
      scenario: [
        { type: 'navigate', url: '/' },
        { type: 'click', selectorOrText: 'button' },
        { type: 'fill', selector: 'input', value: 'test' },
        { type: 'waitFor', selector: 'h1' },
        { type: 'assertText', text: 'Welcome' },
        { type: 'assertUrl', contains: 'dashboard' },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(log.length, 4);
  });

  it('runLayerB captures a missing text assertion as a finding', async () => {
    const session = {
      navigate: () => Promise.resolve(),
      pageText: () => Promise.resolve('Goodbye'),
      currentUrl: () => 'https://example.com/',
      screenshot: () => Promise.resolve('/tmp/x.png'),
      close: () => Promise.resolve(),
    };
    const result = await runLayerB({
      baseUrl: 'https://example.com',
      session,
      scenario: [{ type: 'navigate', url: '/' }, { type: 'assertText', text: 'Welcome' }],
    });
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.includes('assertText missing')));
  });

  describe('runSentryRealityStation', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'sentry-')); });
    afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

    it('produces a PASS receipt and returns pass=true', async () => {
      const result = await runSentryRealityStation({
        step: { id: 'test-step' },
        baseUrl: 'https://example.com',
        layerA: { assertions: [{ type: 'http_status', path: '/', expect_status: [200] }], runner: makeRunner(200) },
        receiptDir: tmpDir,
        runId: 'run-1',
      });
      assert.equal(result.pass, true);
      assert.equal(result.receipt.passed, true);
      assert.equal(result.receipt.verified_by, 'sentry-reality-station');
      assert.equal(result.receipt.builder_actor, null);
      assert.equal(result.receipt.kind, 'sentry_reality_station_pass');
      assert.ok(existsSync(result.receiptPath));
      const saved = JSON.parse(readFileSync(result.receiptPath, 'utf8'));
      assert.equal(saved.passed, true);
    });

    it('produces a FAIL receipt when Layer A fails', async () => {
      const result = await runSentryRealityStation({
        step: { id: 'test-step' },
        baseUrl: 'https://example.com',
        layerA: { assertions: [{ type: 'http_status', path: '/', expect_status: [200] }], runner: makeRunner(500) },
        receiptDir: tmpDir,
        runId: 'run-2',
      });
      assert.equal(result.pass, false);
      assert.equal(result.receipt.kind, 'sentry_reality_station_fail');
    });

    it('produces a FAIL receipt when Layer B fails and requireLayerB is true', async () => {
      const session = {
        navigate: () => Promise.resolve(),
        pageText: () => Promise.resolve('Wrong'),
        screenshot: () => Promise.resolve('/tmp/x.png'),
        close: () => Promise.resolve(),
      };
      const result = await runSentryRealityStation({
        step: { id: 'test-step' },
        baseUrl: 'https://example.com',
        layerA: { assertions: [{ type: 'http_status', path: '/', expect_status: [200] }], runner: makeRunner(200) },
        layerB: { scenario: [{ type: 'navigate', url: '/' }, { type: 'assertText', text: 'Right' }], session },
        requireLayerB: true,
        receiptDir: tmpDir,
        runId: 'run-3',
      });
      assert.equal(result.pass, false);
      assert.ok(result.layerB.findings.length > 0);
    });
  });

  it('assertSentryPassForStep is fail-closed', () => {
    const step = { id: 's' };
    assert.throws(() => assertSentryPassForStep(step, undefined), /SENTRY_FAIL/);
    assert.throws(() => assertSentryPassForStep(step, { passed: false, kind: 'sentry_reality_station_fail' }), /SENTRY_FAIL/);
    assert.throws(() => assertSentryPassForStep(step, { passed: true, verified_by: 'builder' }), /SENTRY_FAIL/);
    assert.equal(assertSentryPassForStep(step, { passed: true, verified_by: 'sentry-reality-station' }), true);
  });
});
