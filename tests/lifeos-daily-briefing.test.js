/**
 * SYNOPSIS: js — tests/lifeos-daily-briefing.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDailyBriefingService } from '../services/lifeos-daily-briefing.js';

test('daily briefing reads MITs from daily_mits and counts non-done items', async () => {
  const calls = [];
  const pool = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes('FROM lifeos_calendar_events')) {
        return { rows: [{ title: 'Call', starts_at: '2026-06-27T17:00:00Z', ends_at: null, location: null }] };
      }
      if (sql.includes('FROM daily_mits')) {
        return {
          rows: [
            { title: 'One', status: 'pending', notes: null, position: 1 },
            { title: 'Two', status: 'done', notes: null, position: 2 },
            { title: 'Three', status: 'deferred', notes: null, position: 3 },
          ],
        };
      }
      if (sql.includes('FROM lifeos_habits')) {
        return { rows: [{ id: 1, name: 'Walk', recent_completions: 4 }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const svc = createDailyBriefingService(pool, null);
  const briefing = await svc.assembleBriefing('adam');

  assert.equal(briefing.calendarEvents.length, 1);
  assert.equal(briefing.mits.length, 3);
  assert.equal(briefing.habitStreaks.length, 1);
  assert.match(briefing.summary, /1 events, 2 pending MITs, 1 tracked habits/);
  assert.ok(calls.some((sql) => sql.includes('FROM daily_mits')));
  assert.ok(!calls.some((sql) => sql.includes('FROM lifeos_mits')));
});

test('daily briefing degrades to partial data when optional tables are missing', async () => {
  const pool = {
    async query(sql) {
      if (sql.includes('FROM lifeos_calendar_events')) {
        const err = new Error('relation "lifeos_calendar_events" does not exist');
        err.code = '42P01';
        throw err;
      }
      if (sql.includes('FROM daily_mits')) {
        return { rows: [{ title: 'One', status: 'pending', notes: null, position: 1 }] };
      }
      if (sql.includes('FROM lifeos_habits')) {
        const err = new Error('relation "lifeos_habits" does not exist');
        err.code = '42P01';
        throw err;
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const svc = createDailyBriefingService(pool, null);
  const briefing = await svc.assembleBriefing('adam');

  assert.deepEqual(briefing.calendarEvents, []);
  assert.equal(briefing.mits.length, 1);
  assert.deepEqual(briefing.habitStreaks, []);
  assert.match(briefing.summary, /0 events, 1 pending MITs, 0 tracked habits/);
});
