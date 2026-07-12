<!-- SYNOPSIS: Founder Never-Stop Report — 2026-07-11 -->

# Founder Never-Stop Report — 2026-07-12

**Standing order (Adam):** Never stop building unless out of credits. If blocked, skip to the next buildable thing / next project. Report why anything stopped and what Adam can fix.

---

## Verdict (KNOW)

Never-stop was enabled, but tip was **crash-looping every ~2 minutes** — so it looked idle (`total_runs: 0`) and kept restarting instead of shipping.

**Root cause:** deploy-proof always called Railway self-redeploy *before* checking whether tip already served the built SHA. That killed the web process mid-cycle, wiped in-memory state, and prevented queue-status commits. Pre-existing route artifacts short-circuited to that path → redeploy → die → reboot → repeat.

**Fix shipping now:** prove-first (skip redeploy when already live). Daily cap set to unlimited (`NEVER_STOP_DAILY_STEP_CAP=0`). Loop paused briefly only to stop the crash loop, then re-enabled after the fix deploy.

---

## Current machine state

| Check | Status |
|---|---|
| Tip SHA (at report) | `b5d8abdd…` then fix commit after push |
| Never-stop doctrine | ON after fix redeploy |
| Daily step cap | **Unlimited** (`cap=0`) |
| Token keys present | YES (4) — not a credit-presence halt |
| Skip-blocked → next product | Already in orchestrator (`founder_gated` skipped) |
| Money-first priority | site-builder → limitlessos → lifeos → marketingos |

---

## Why it “stopped” (honest)

1. **Crash loop (platform bug)** — not out of credits. Fixed by prove-before-redeploy.
2. Soft 60/day cap risk — cleared (`NEVER_STOP_DAILY_STEP_CAP=0`).
3. Feature paths blocked on **your secrets** still skip; system should build other queue work.

---

## Founder blockers — what YOU can fix

| Blocker | Why that path stalls | What you do |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | YouTube connect + channel analytics stay off | Paste OAuth Web client into Railway; redirect = `https://lumin-web-production-e3a9.up.railway.app/api/v1/marketing/youtube/callback` |
| `REPLICATE_API_TOKEN` | Generative video modes stay gated | Paste Replicate token (`r8_…`) into Railway |
| Google web login / 2FA | Agent cannot create OAuth client with App Passwords | One human Google Cloud login, or paste Client ID/Secret |
| External cold email (Postmark pending / SMTP) | Site Builder invite blast blocked | Approve Postmark **or** paste working `RESEND_API_KEY` / SMTP |
| Site Builder `founder_gated` UI steps (11) | Auto-loop skips those | Unlock specific steps if you want UI built without you |
| R2 `STORAGE_*` | SMOS audio upload path off | Add when you want audio sessions |
| Live $ balance | System only sees key *presence* | Check provider dashboards if spend stalls |

---

## What keeps building while those are blocked

1. **Site Builder** — non-gated queue / money path glue  
2. **Command Center / LifeOS / LimitlessOS** — open `BUILD_QUEUE` steps  
3. **MarketingOS** — Phase 5 publish verifier + ungated steps  
4. Plan/SENTRY repair lanes when no product step is actionable  

YouTube/Replicate secrets do **not** idle the whole factory.

---

## How to check anytime

```bash
curl -sS -H "x-command-key: $COMMAND_CENTER_KEY" \
  "$PUBLIC_BASE_URL/api/v1/lifeos/never-stop/status?events=25"
```

Kick:

```bash
curl -sS -X POST -H "x-command-key: $COMMAND_CENTER_KEY" \
  "$PUBLIC_BASE_URL/api/v1/lifeos/never-stop/run-once"
```

Healthy signal: `enabled:true`, `daily_budget.unlimited` or `cap:0`, `total_runs` climbing, tip `uptime` not resetting every ~2 min.

---

## Honesty labels

- **KNOW:** crash loop from unconditional deploy-proof redeploy; daily cap unlimited on tip after env load; Google/Replicate still absent; cold email still blocked for first-dollar outreach.
- **THINK:** after prove-first ships, never-stop completes cycles without suicide-redeploy when tip already contains the built SHA.
- **DON'T KNOW:** remaining provider dollar balances (keys present ≠ balance > 0).
