#!/usr/bin/env node
/**
 * One-shot: POST /api/v1/lifeos/chat/build/plan with a LifeOS P1 goal (council/AI; costs tokens).
 * Use after DB + keys are valid on the target base URL.
 *
 *   LUMIN_SMOKE_BASE_URL=... COMMAND_CENTER_KEY=... node scripts/lumin-invoke-plan.mjs
 *   LUMIN_PLAN_GOAL="Your goal..." node scripts/lumin-invoke-plan.mjs
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const base = (process.env.LUMIN_SMOKE_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';
const user = process.env.LUMIN_PLAN_USER || 'adam';
const defaultGoal =
  process.env.LUMIN_PLAN_GOAL ||
  'Priority LifeOS: specify the first vertical slice of the Commitment → execution desk (outbound follow-ups, review-before-send, cancel, MIT fallback). Name tables, routes, and verify commands. Label shipped vs stub.';

const headers = {
  'content-type': 'application/json',
  ...(key ? { 'x-command-key': key } : {}),
};

async function main() {
  if (!key) {
    console.error('Missing COMMAND_CENTER_KEY');
    process.exit(2);
  }
  const url = `${base}/api/v1/lifeos/chat/build/plan`;
  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user, goal: defaultGoal }),
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('Non-JSON', r.status, text.slice(0, 1200));
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
  if (r.status !== 200 || !json.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
