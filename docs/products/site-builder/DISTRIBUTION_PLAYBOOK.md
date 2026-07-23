<!-- SYNOPSIS: Autonomous Site Builder distribution playbook (channels, caps, experience gates). -->

# Site Builder — Distribution Playbook

**Last Updated:** 2026-07-23

## Chair + founder standing order

Market without consulting Adam. Fix experience before send. Use system email / Twilio / Stripe already on Railway. No spam that burns the domain or Reddit.

## Hard gates before any outreach

1. Preview title is a real business name (not CDN/error poison).
2. Health score never fakes a grade on scan failure.
3. Demo is proof only — never checkout someone else's site as the buyer's product.
4. No SMS/voice outside **08:00–17:00 America/Los_Angeles**.
5. Cold email only when Postmark is approved **or** `RESEND_API_KEY` is set (HTTPS works on Railway).

## Channels (priority)

| Channel | Status | Cap |
|---|---|---|
| Twilio SMS + voice (preview link) | **Live** — queued flush | 8/day |
| Public inbound `/site-builder` | Live | unlimited (self-serve) |
| Cold email (Postmark) | **Blocked** — pending approval | 0 until unblocked |
| Reddit / communities | Inbound value only; promo megathreads only | 2 helpful replies/day |

## Reddit / community rules (TOS-safe)

- **r/smallbusiness**: questions only; promo only in weekly Promote megathread; no link-spam in normal threads.
- Prefer answering “my website is outdated / no leads” threads with: free preview offer + front door URL, no hard sell.
- Local: r/lasvegas, Nextdoor (human), FB local business groups — same value-first rule.
- Never automate mass Reddit posts; Bot Bouncer is active.

## Queue

- File: `data/site-builder-outreach-queue.json`
- Flush: `node scripts/site-builder-flush-outreach-queue.mjs` (defers outside business hours)
- Tip cron: Site Builder follow-up tick also attempts a flush during business hours.

## Comp / gift publish

- Env: `SITE_BUILDER_FREE_CODES` (e.g. `TALOA-FRIENDS`)
- Checkout: `?clientId=…&code=…`

## Unblock email (next system action)

1. Approve Postmark account / sender domain, **or**
2. Set `RESEND_API_KEY` + `EMAIL_PROVIDER=resend` (or leave Postmark and rely on pending→Resend fallback) via managed-env bulk.
3. Then email channel re-opens under the same experience gates.
