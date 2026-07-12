<!-- SYNOPSIS: Founder Never-Stop Report — 2026-07-11 -->

# Founder Never-Stop Report — 2026-07-11

**Standing order (Adam):** Never stop building unless out of credits. If blocked, skip to the next buildable thing / next project. Report why anything stopped and what Adam can fix.

---

## Current machine state (KNOW)

| Check | Status |
|---|---|
| Tip deploy | `622467639d…` ready |
| Never-stop enabled | **YES** (`BUILDEROS_NEVER_STOP=1`) |
| Cycle when checked | **running** (receipt phase `started`) |
| Token capacity | OK (4 model keys present) |
| Daily step cap | 60/day (remaining 60) — raising to unlimited next deploy |
| Governed fence | OFF (ungoverned never-stop allowed) |
| Autopilot flag | Set to `1` via managed-env |

Priority order (money first): **site-builder → limitlessos → lifeos → marketingos → …**

---

## Why it looked “stopped” earlier

1. Never-stop was **enabled** but **had never completed a cycle** on tip (`total_runs: 0`, `last_run_at: null`) until kicked.
2. Scheduler ticks every ~5 minutes after boot; no live “I’m building X” surface was checked.
3. Several money/video features are **blocked on founder secrets**, so the loop must **skip those steps** and build other queue work.

**Action taken:** kicked `POST /api/v1/lifeos/never-stop/run-once` (accepted; was already running). Set faster interval (`120000` ms) + `BUILDEROS_AUTOPILOT=1`. Adding `NEVER_STOP_DAILY_STEP_CAP=0` (unlimited) to managed allowlist so a 60/day soft stop cannot idle the factory while credits remain.

---

## Founder blockers — what YOU can fix

| Blocker | Why it stops that path | What you do |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` missing | YouTube connect + channel analytics stay off | Paste OAuth Web client into Railway; redirect = `https://lumin-web-production-e3a9.up.railway.app/api/v1/marketing/youtube/callback` |
| `REPLICATE_API_TOKEN` missing | AI video / generative modes stay gated | Paste Replicate token (`r8_…`) into Railway |
| Google web login / 2FA | Agent cannot create OAuth client with App Passwords alone | One human Google Cloud login, or paste Client ID/Secret |
| External cold email (Postmark pending / SMTP timeout) | Site Builder invite blast to prospects blocked | Approve Postmark **or** paste working `RESEND_API_KEY` / SMTP |
| Site Builder `founder_gated` steps (11) | Queue won't auto-build those until unlocked | Decide which gated steps to open, or leave them human-only |
| R2 storage (`STORAGE_*`) | SMOS audio upload path stays off | Add R2 bucket vars when you want audio sessions |
| Daily step cap = 60 | Soft halt after 60 builder attempts/day even with credits | Will set `NEVER_STOP_DAILY_STEP_CAP=0` after allowlist ship |

---

## What the system SHOULD keep building while blocked

(Skip gated items; do not idle.)

1. **Site Builder** — remaining auto-buildable queue steps (not founder_gated)
2. **MarketingOS Phase 5** — social publish pipeline (3 pending: publisher → route → sentry)
3. **LifeOS / LimitlessOS / other products** in `PRODUCT_BUILD_PRIORITY.json` with open `BUILD_QUEUE` steps
4. Plan/SENTRY repair lanes when no product step is actionable

---

## How to check anytime

```bash
curl -sS -H "x-command-key: $COMMAND_CENTER_KEY" \
  "$PUBLIC_BASE_URL/api/v1/lifeos/never-stop/status?events=25"
```

Kick a cycle:

```bash
curl -sS -X POST -H "x-command-key: $COMMAND_CENTER_KEY" \
  "$PUBLIC_BASE_URL/api/v1/lifeos/never-stop/run-once"
```

---

## Honesty labels

- **KNOW:** never-stop enabled; cycle was running after kick; Google/Replicate tokens still absent on tip; Site Builder money path still email-blocked for cold outreach.
- **THINK:** with unlimited daily cap + skip logic, tip should keep picking Site Builder / MarketingOS publish / other queues without waiting on YouTube keys.
- **DON'T KNOW:** live model billing balance (system only checks key *presence*, not remaining $).
