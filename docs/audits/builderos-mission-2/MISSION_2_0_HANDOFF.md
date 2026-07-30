<!-- SYNOPSIS: BuilderOS Mission 2.0 canonical handoff artifact -->

# BuilderOS Mission 2.0 — Cross-Agent Handoff

**Mission:** Close the SMOS revenue/entitlement loop, harden runtime safety, and produce a durable handoff artifact so the next agent (Claude, Devin, or future) does not re-derive context from scratch.

**Base commit (origin/main at time of handoff):** `f7db5b53b5dfcd233a096287446d8a36e550c5ee`

**Last updated:** 2026-07-31

---

## Package Status

| Package | Status | Key Evidence |
|---|---|---|
| 2A — SMOS checkout + entitlement | **Shipped** | `POST /api/v1/marketing/pack/checkout` returns `cs_live_*` URL; `GET /api/v1/marketing/sessions/:id/export` enforces `marketing_pack_checkouts` entitlement; deprecated `/api/v1/socialmediaos/content-pack/checkout` returns `410`; SENTRY MarketingOS Layer A + B pass 0 findings. |
| 2B — Runtime safety | **In progress / partially shipped** | Security review wired into `commitOrMirrorFiles` (`routes/lifeos-council-builder-routes.js`); runtime-fingerprint endpoint (`GET /api/v1/lifeos/builder/runtime-fingerprint`) already live in founder runtime; per-scheduler audit doc pending. |
| 2C — Handoff artifact | **Shipped** | This file + `scripts/verify-mission-2-handoff.mjs` (run to confirm handoff matches current tip). |

## What was true at base commit

- `server-founder-runtime.js` is the only production lane on Railway (`services/runtime-modes.js` locks Railway to `founder_builder`).
- `startup/boot-domains.js` (and `server-full-runtime.js`) are unreachable in production unless `LIFEOS_ENABLE_FULL_RUNTIME=true` and `LIFEOS_ALLOW_FULL_RUNTIME_ON_RAILWAY=true` are both set.
- SMOS revenue path:
  1. Public page `/marketing` (served by `routes/marketing-session-ui-routes.js`, auto-registered in `config/auto-registered-product-modules.json`).
  2. Buy button calls `POST /api/v1/marketing/pack/checkout` with the most recent `marketing_sessions` row.
  3. `routes/smos-pack-checkout-routes.js` is mounted at `startup/register-founder-runtime-routes.js:158`.
  4. Service `services/smos-pack-checkout.js` creates the Stripe session, records the row in `marketing_pack_checkouts` (status `incomplete`), and returns the Stripe URL.
  5. On payment success Stripe redirects to `/marketing/session/:id/export?paid=1`.
  6. `routes/marketing-session-export-routes.js` calls `assertSessionPaid` from the shared helper; founder/admin bypass exists.
  7. Legacy `POST /api/v1/socialmediaos/content-pack/checkout` now returns `410 Gone` to prevent orphan `socialmediaos_content_packs`.

## Decisions made

1. **Email provider deferred.** Postmark account is canceled. `core/notification-service.js` supports `EMAIL_PROVIDER=resend|sendgrid|smtp|postmark|disabled`. No provider key is set in Railway, so purchase-confirmation email is intentionally out of scope for 2A. The revenue loop is shippable without email until a key is added.
2. **SO-003 Chair redesign not needed.** `services/chair-lumin-unified.js` already passes `grounded_direct_answer` to `translatePersonality`; `tests/chair-lumin-unified-so003.test.js` passes. Mission 2 should preserve and CI-gate this, not rebuild the Chair.
3. **Runtime-fingerprint already live.** `GET /api/v1/lifeos/builder/runtime-fingerprint` is mounted through `routes/lifeos-council-builder-routes.js` (`base` = `/api/v1/lifeos/builder`) in the founder runtime. No new route module is required.
4. **Security review is ROUTE, not BLOCK.** `reviewDiffForSecurity` is called fire-and-forget inside `commitOrMirrorFiles`; findings are logged and recorded in the model capability ledger, but commits are not refused. Blocking on an unproven model would itself be a governance risk.
5. **No blanket scheduler migration.** `startup/boot-domains.js` schedulers stay in the legacy full-runtime lane; founder runtime schedulers are classified individually (see `docs/products/builderos/SCHEDULER_AUDIT.md` when complete).

## Unresolved questions

1. **Live Stripe charge end-to-end.** A `cs_live_*` checkout URL is created, but a real customer payment has not been executed. The next revenue proof is one test/live card charge away.
2. **Email provider selection.** Resend is the cheapest supported path; a verified sending domain and `RESEND_API_KEY` (or `EMAIL_PROVIDER=smtp` + SMTP credentials) are still needed.
3. **Scheduler audit completion.** `docs/products/builderos/SCHEDULER_AUDIT.md` must list every scheduler in `server-founder-runtime.js` and `startup/boot-domains.js`, classify each, and document env gates.
4. **Multi-agent collaboration.** Only this handoff file exists; real-time model-to-model chat is deferred.

## Authority state

- **Canonical product registry:** `docs/products/PRODUCT_REGISTRY.json` (product homes); `docs/products/INDEX.md` points to it.
- **Canonical work queue:** `builderos-reboot/BP_PRIORITY.json`.
- **Hist-owned (do not treat as active queue):** `MISSION_QUEUE.json`, `MISSION_PACK_INDEX.json`.
- **Generated repo index:** `builderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json` (re-generated by `scripts/generate-file-synopsis-index.mjs`).
- These coexist; they are not competing authorities.

## How the next agent should continue

1. Run `bash scripts/verify-mission-2-handoff.mjs` (or `node scripts/verify-mission-2-handoff.mjs`) to confirm this handoff still matches `origin/main`.
2. If the hash mismatch warning appears, rebase/recheck `origin/main` before editing.
3. Complete `docs/products/builderos/SCHEDULER_AUDIT.md` (2B.1).
4. Add `RESEND_API_KEY` + `EMAIL_PROVIDER=resend` in Railway and run one real SMOS purchase to close 2A email proof.
5. Verify with:
   - `npm run builder:preflight`
   - `node --test tests/runtime-fingerprint-main-ancestor.test.js`
   - `node scripts/sentry-prealpha-gate.mjs marketingos`

## Verification commands

```bash
# Handoff integrity
node scripts/verify-mission-2-handoff.mjs

# Preflight (must exit 0)
npm run builder:preflight

# Runtime fingerprint tests
node --test tests/runtime-fingerprint-main-ancestor.test.js

# SMOS SENTRY
node scripts/sentry-prealpha-gate.mjs marketingos

# Live sanity (requires PUBLIC_BASE_URL set to live origin)
curl -s -H "x-command-key: $COMMAND_CENTER_KEY" "$PUBLIC_BASE_URL/api/v1/lifeos/builder/ready" | jq -r '.deploy_commit_sha'
```
