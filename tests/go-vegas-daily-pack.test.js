/**
 * SYNOPSIS: js — tests/go-vegas-daily-pack.test.js.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildGoVegasDailyPack, formatDailyPackMarkdown } from '../services/go-vegas-daily-pack.js';

describe('go-vegas daily pack', () => {
  it('builds at least 31 owned posts with accounts and times', () => {
    const pack = buildGoVegasDailyPack({ date: new Date('2026-07-23T16:00:00Z') });
    assert.ok(pack.ok);
    assert.ok(pack.counts.total >= 31);
    assert.ok(pack.posts.every((p) => p.suggestedTimePT && p.account && p.body));
    assert.ok(pack.posts.some((p) => p.lane === 'contest'));
    assert.ok(pack.posts.some((p) => p.lane === 'recognition'));
    assert.ok(pack.posts.some((p) => p.account.includes('SiteBuilder')));
  });

  it('formats markdown for approve/paste', () => {
    const pack = buildGoVegasDailyPack({ date: new Date('2026-07-23T16:00:00Z') });
    const md = formatDailyPackMarkdown(pack);
    assert.match(md, /Go Vegas daily pack/);
    assert.match(md, /SiteBuilder/);
  });
});