#!/usr/bin/env node
/**
 * SYNOPSIS: Local smoke test for ambient moment detection (no DB/API).
 */
import { detectMomentSignals, createLuminAmbientMomentRouter } from '../services/lumin-ambient-moment-router.js';
import { createLuminAmbientCapture } from '../services/lumin-ambient-capture.js';

const CASES = [
  ['appointment tomorrow', true, false, false],
  ['Client Sarah birthday March 4 prefers email', false, true, false],
  ['That was textbook — look at the results', false, false, true],
  ['yeah ok', false, false, false],
];

let pass = 0;
for (const [text, appt, crm, coach] of CASES) {
  const s = detectMomentSignals(text);
  const ok = s.appointment === appt && s.crm === crm
    && (coach ? s.coachablePositive : !s.coachablePositive && !s.coachableImprove);
  if (ok) pass += 1;
  else console.error('FAIL', text, s);
}

const mockCalendar = {
  createEvent: async (_uid, p) => ({ id: 'evt-1', title: p.title, starts_at: p.starts_at }),
};
const router = createLuminAmbientMomentRouter({
  pool: { query: async () => ({ rows: [{ reg: null }] }) },
  calendar: mockCalendar,
  actionInbox: {
    captureItem: async () => ({ id: 'inbox-1' }),
  },
});
const moments = await router.applyMoments({
  userId: 1,
  text: 'I have a dentist appointment tomorrow at 3',
});
if (moments.some((m) => m.type === 'calendar_event')) pass += 1;
else console.error('FAIL calendar moment');

const cap = createLuminAmbientCapture({
  pool: { query: async () => ({ rows: [] }) },
  momentRouter: router,
});
const gate = cap.quickGate('appointment tomorrow at 3 with Frank');
if (!gate.skip && gate.signals.hasMoment) pass += 1;
else console.error('FAIL quickGate moment');

console.log(JSON.stringify({ ok: pass >= CASES.length + 2, pass, total: CASES.length + 2 }));
process.exit(pass >= CASES.length + 2 ? 0 : 1);
