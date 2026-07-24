<!-- SYNOPSIS: Autonomous Site Builder distribution playbook (channels, caps, experience gates). -->

# Site Builder — Distribution Playbook

**Last Updated:** 2026-07-24

## Chair + founder standing order

Market without consulting Adam. Fix experience before send. Use system email / Twilio / Stripe already on Railway. No spam that burns the domain or Reddit.

**Cash order (Chair judgment 2026-07-24):** Social Media OS self-serve first (`/marketing/for-you` → signup → $49), then Site Builder inbound + warm network, then TC enroll. BoldTrail stays key-gated.

## Hard gates before any outreach

1. Preview title is a real business name (not CDN/error poison).
2. Health score never fakes a grade on scan failure.
3. Demo is proof only — never checkout someone else's site as the buyer's product.
4. No SMS/voice outside **08:00–17:00 America/Los_Angeles**.
5. Cold email only when Postmark is approved **or** `RESEND_API_KEY` is set (HTTPS works on Railway).

## Cold email doctrine (hard)

**Do not use Postmark, Resend, SendGrid, or Amazon SES for Site Builder prospecting.** They are transactional providers and ban unsolicited/cold B2B email — Postmark already refused Adam’s account for that reason. Resend is the same category; it is **not** the unlock.

**Use Instantly** (or Smartlead) — growth/cold lane with Google Workspace / Microsoft inboxes, warmup, and rotation.

### Instantly setup (founder — ~20 min)

1. Create account at [instantly.ai](https://instantly.ai) — **Growth** plan or above (API V2).
2. Connect 1–2 Google Workspace mailboxes on a **sending subdomain** (e.g. `mail.yourdomain.com`), not the main brand inbox if possible.
3. Start warmup (or keep volume tiny: single digits/day week 1).
4. Create a campaign e.g. **“Site Builder Preview”** with body using Instantly variables:
   - `{{company_name}}`, `{{website}}`, `{{personalization}}`
   - Custom vars we send: `{{preview_url}}`, `{{business_name}}`, `{{subject_hint}}`, `{{client_id}}`
5. Copy **API key** (Settings → Integrations → API V2) + **campaign UUID**.
6. Set on Railway (or tell Cursor to set via managed-env):
   - `INSTANTLY_API_KEY`
   - `INSTANTLY_CAMPAIGN_ID`
7. Tip will enqueue leads on prospect/resend; Instantly sends the sequence. Then resend Handyman.

## Live blockers (tip-proved 2026-07-24)

| Blocker | Evidence | Unlock |
|---|---|---|
| Postmark refused cold | Account not approved for cold email | **Instantly** (wired) — not Resend |
| Twilio trial → unverified To | Handyman SMS 502 unverified number | Upgrade Twilio **or** verify each To |
| `GOOGLE_PLACES_KEY` missing | `/api/v1/go-vegas/discover` fails | Set Places key on Railway |
| Hot lead waiting | LV Handyman preview **viewed**, email not delivered | Instantly keys → `resend-outreach` |

Until Instantly keys land: market via warm network + inbound pages only.

## Channels (priority)

| Channel | Status | Cap |
|---|---|---|
| SMOS inbound `/marketing/for-you` | **Live** — primary cash door | unlimited |
| Site Builder inbound `/site-builder` | Live | unlimited (self-serve) |
| TC enroll `/overlay/tc-agent-enroll.html` | Live Stripe | unlimited |
| Cold email (**Instantly**) | **Code live — waiting on Adam keys** | campaign daily caps in Instantly |
| Twilio SMS + voice (preview link) | **Blocked for cold** — trial unverified To | 0 cold until upgrade |
| Cold email (Postmark/Resend) | **Do not use** — policy bans cold | — |
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

## Unblock cold email (next system action)

1. Adam completes Instantly setup above.
2. Set `INSTANTLY_API_KEY` + `INSTANTLY_CAMPAIGN_ID` on tip.
3. `POST /api/v1/sites/prospects/prev_1784791961326_i2dt/resend-outreach` with Handyman email.
4. Keep Postmark (if any) for transactional only — never prospecting.
