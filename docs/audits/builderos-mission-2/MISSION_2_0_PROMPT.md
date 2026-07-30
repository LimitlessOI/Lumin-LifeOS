<!-- SYNOPSIS: BuilderOS Mission 2.0 implementation prompt — reconciled scope for Devin. -->

# BuilderOS Mission 2.0 — SMOS Revenue, Runtime Safety, Cross-Agent Handoff

## Section 1 — Reconciled Mission 2 Scope (for the founder)

This is the corrected, ready-to-send Devin prompt. It replaces the earlier draft and incorporates the live-repository findings from 2026-07-30.

**Baseline commit:** `2b96d2f42763dc831d7cf3ca3ac3e3ff9b6d8c0d` is current `origin/main` HEAD. Local and origin are in sync, but every Mission 2 work package must start with `git fetch origin` and verify the working tree is at or behind `origin/main` before editing.

**What changed from the draft prompt:**

- **SO-003 is already fixed.** `services/chair-lumin-unified.js` no longer short-circuits to a canned answer; it attaches `grounded_direct_answer` to system facts and always calls `translatePersonality`. `tests/chair-lumin-unified-so003.test.js` passes. Mission 2 must preserve and enforce this regression test, not redesign the Chair.
- **Email provider is out of scope for 2A.** Postmark is canceled. `core/notification-service.js` already supports `EMAIL_PROVIDER=resend` or `smtp`, and `services/env-registry-map.js` flags `RESEND_API_KEY` as `NEEDED`. Mission 2 will not migrate to or mandate any provider. The SMOS checkout/payment/download loop must work without email. The founder will pick and configure a provider separately.
- **SMOS checkout route IS mounted in production.** `routes/smos-pack-checkout-routes.js` is registered in `startup/register-founder-runtime-routes.js` (lines 158-159). The public UI routes (`/marketing`, `/marketing/signup`, `/marketing/session/new`) are auto-registered from `routes/marketing-session-ui-routes.js` and confirmed live. The real defect is not a missing mount: it is that the `/marketing` dashboard "Buy Content Pack" button calls `/api/v1/socialmediaos/content-pack/checkout` (the old marketplace route), while the correct revenue path is `/api/v1/marketing/pack/checkout` backed by `marketing_sessions` and `marketing_pack_checkouts`. There are two parallel checkout surfaces that must be reconciled.
- **Authority coexistence is not authority conflict.** `docs/products/PRODUCT_REGISTRY.json` is canonical. `docs/products/INDEX.md` points to it. `builderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json` is a generated file-search index with a different purpose. Mission 2 will not merge indexes merely because several exist; it will verify generation/ownership boundaries.
- **Multi-agent collaboration is deferred to a single handoff artifact.** No real-time chat room. Mission 2C defines a minimal structured handoff file that the next agent can read instead of asking the founder to copy context.

**Priority framework (unchanged):**

1. Immediate security, payment, entitlement, or destructive-production risk.
2. Shortest credible path to real revenue.
3. Work that unlocks or multiplies remaining Devin capacity.
4. Work that reduces founder relay and decision bottlenecks.
5. Mechanical governance or telemetry needed to keep autonomous implementation safe.
6. Broader architectural cleanup.
7. Documentation-only improvements.

---

## Section 2 — Ready-to-Send Devin Mission 2.0 Prompt

You are executing BuilderOS Mission 2.0. Do not start Mission 3. Do not build new product features. Converge the existing system toward a working, revenue-provable, self-improving machine.

### Hard rules

- Follow `CLAUDE.md` `SO-001`: you are the conductor. New `services/`, `routes/`, `middleware/`, or `factory-core/` modules must be built through the governed factory (`/factory/execute-step` `author_then_write`) unless the change is a documented GAP-FILL (infrastructure wiring, smallest repair to a file the builder just produced, SSOT/continuity update). Small endpoint/UX fixes to existing auto-registered modules count as GAP-FILL only if they are ≤20 lines and you update the owning `PRODUCT_HOME.md` in the same commit.
- Follow `SO-002`: no client-facing feature is "done" until SENTRY walks it. For 2A, run or create Layer A HTTP assertions and a Layer B browser walkthrough. A 200 response is not enough.
- Follow `SO-003`: never serve a canned/templated answer for load-bearing reasoning. Always route Chair/counsel through the real model.
- Use truth labels on every claim: `KNOW` (proven by evidence), `THINK` (inference), `BELIEVE` (opinion), `GUESS` (low confidence), `VERIFICATION BLOCKED` (tooling missing), `RECOMMENDATION`.
- Run `npm run builder:preflight` before and after every work package. If it fails, stop and fix the cause before claiming progress.
- Ship through the machine path: `npm run system:commit-files` or `POST /api/v1/lifeos/builder/execute-batch` → `npm run system:railway:redeploy`. Do not open human PRs and wait for approval.
- Every `.js` file touched must carry a valid `@ssot` JSDoc tag. Update the owning `PRODUCT_HOME.md` `## Change Receipts` table in the same commit.
- Record a handoff packet in `data/agent-handoff/` after each 2A/2B/2C sub-step, using the template in Section 2.4.

### 2.0 — Start here: rebase and preflight

1. `git fetch origin` and `git rev-parse origin/main`.
2. If your working tree is not at `2b96d2f42763dc831d7cf3ca3ac3e3ff9b6d8c0d` or later, reset to `origin/main` (`git reset --hard origin/main`) after confirming no uncommitted work belongs to this mission.
3. Run `npm run builder:preflight`. It currently fails with 4 `PASS_WITHOUT_NAMED_VERIFIER` receipt violations (`BUILDEROS_AUTONOMY_CLOSURE_V1_ACCEPTANCE.json`, `BUILDEROS_BUILD_DEPLOY_TRUTH.json`, `BUILDEROS_FOUNDER_UI_PROOF.json`, `BUILDEROS_SAME_TIER_DETERMINISM.json`). These are pre-existing receipts dated after the `separation_collapsed` cutoff. For each, add `separation_collapsed: true` and a `separation_note` explaining that the acceptance was produced and verified by the same deterministic script run, or add a truthful `produced_by` and an independent `verified_by` if one exists. Do not fabricate a verifier. Re-run until `builder:preflight` exits 0 before any product change.

### 2A — SMOS revenue and entitlement loop (first)

**Purpose:** close the gap between "Stripe checkout URL is created" and "a real customer can pay, get their pack, and download it" without depending on email.

1. **Reconcile the two checkout surfaces.**
   - `routes/socialmediaos-routes.js` (mounted at `/api/v1/socialmediaos` in `startup/register-founder-runtime-routes.js` lines 161-164) exposes `POST /content-pack/checkout` (line 173) and `GET /content-pack/success` (line 192). It calls `services/socialmediaos-service.js` `createContentPackCheckout` (lines 263-344) and `verifyContentPackCheckout` (lines 346-391), which use `socialmediaos_sessions` and `socialmediaos_content_packs`.
   - `routes/smos-pack-checkout-routes.js` (mounted in `register-founder-runtime-routes.js` lines 158-159) exposes `POST /api/v1/marketing/pack/checkout`, `GET /api/v1/marketing/pack/verify`, and `POST /api/v1/marketing/pack/operator-mark-paid`. It uses `marketing_sessions` and `marketing_pack_checkouts` (`services/smos-pack-checkout.js` lines 9-136). The public UI `/marketing/session/:id/export` already calls this path correctly (`routes/marketing-session-ui-routes.js` lines 2219-2226).
   - **Fix:** The `/marketing` dashboard "Buy Content Pack" button currently calls `/api/v1/socialmediaos/content-pack/checkout` with an empty body (`routes/marketing-session-ui-routes.js` lines 1055-1065). Change it to call `/api/v1/marketing/pack/checkout` with the current `session_id` (create a session first if the user has none) and redirect to the returned `url`. If the user has no active session, the button should redirect to `/marketing/session/new` instead of silently creating an orphan checkout.
   - **Deprecate the old surface:** `POST /api/v1/socialmediaos/content-pack/checkout` should return `410 Gone` or `302` to `/api/v1/marketing/pack/checkout` after recording the path change, and `services/socialmediaos-service.js` `createContentPackCheckout`/`verifyContentPackCheckout` should be removed or clearly marked `HIST_OWNED` so no new code depends on them. If removal breaks a mounted route, update the route to delegate to `services/smos-pack-checkout.js`.

2. **Entitlement enforcement at the shared service boundary.**
   - `GET /api/v1/marketing/sessions/:id/export` in `routes/marketing-session-routes.js` (lines 897-958) already checks `sessionIsPaid` against `marketing_pack_checkouts` (lines 44-52). **Verify this is the only export/download path and that no other route can return approved content without that check.**
   - `GET /api/v1/socialmediaos/sessions/:sessionId/content-packs` and `GET /api/v1/socialmediaos/content-packs/:id` in `routes/socialmediaos-routes.js` (lines 117-145) return `socialmediaos_content_packs` rows. Confirm whether any public or UI path still uses them for paid content. If they are reachable, add an entitlement gate or redirect them to the `marketing_*` tables.
   - Add a single source-of-truth function `assertSessionPaid({ pool, sessionId, ownerId })` in `services/smos-pack-entitlement.js` (new file, GAP-FILL) and call it from every export/download/content-pack access path. If the function does not exist, the export must fail closed.

3. **Live production proof.**
   - With a command key, create a test `marketing_session` via `POST /api/v1/marketing/sessions` and then `POST /api/v1/marketing/pack/checkout`. Confirm the returned `url` is a live `cs_live_` Stripe session.
   - Call `GET /api/v1/marketing/pack/verify?checkout_session_id=<id>&marketing_session_id=<id>` before paying. Confirm `paid: false`, `status: "open"`, `payment_status: "unpaid"`.
   - Call `GET /api/v1/marketing/sessions/<id>/export` and confirm `402 payment_required` with a `checkout` hint.
   - Record the exact `curl` commands, responses, and the public URL path in the handoff packet. Do not use a real card without founder approval.

4. **SENTRY proof.**
   - If `npm run sentry:marketingos:layer-a` exists, run it. If not, extend `scripts/sentry-prealpha-gate.mjs` to support a `marketingos` target with these Layer A assertions (fail-closed):
     - `GET /marketing` returns 200 and contains `SocialMediaOS` and a start-session or buy CTA.
     - `GET /marketing/signup` returns 200 and contains a password field.
     - `POST /api/v1/marketing/public/signup` accepts `{email, password, handle, accepted_terms: true}` and returns an access token.
     - `POST /api/v1/marketing/sessions` with auth returns a session id.
     - `POST /api/v1/marketing/sessions/:id/coach` with auth returns a coach reply.
     - `POST /api/v1/marketing/pack/checkout` with auth returns a Stripe `cs_live_` URL.
     - `GET /api/v1/marketing/sessions/:id/export` before payment returns 402 with `payment_required`.
   - Layer B: use the SENTRY browser harness (or Puppeteer in `scripts/sentry-prealpha-gate.mjs`) to walk `/marketing` → click "Start a session" → complete consent → submit a coach message → reach `/marketing/session/:id/content` → click export → observe the 402/payment prompt. Screenshot each step. Report concrete UX friction and `proposed_solution` for every finding.

5. **Product-home update.** Update `docs/products/marketingos/socialmediaos/PRODUCT_HOME.md` and `docs/products/marketingos/PRODUCT_HOME.md` `## Change Receipts` with what changed, why, the commit SHA, and the SENTRY result. Mark `SMOS_REAL_CUSTOMER_READINESS.json` as progress toward first dollar, still blocked on a real card charge and an email provider.

### 2B — Runtime safety and observability (second)

**Purpose:** stop the system from silently drifting, running dead schedulers, or shipping without independent verification.

1. **Per-scheduler audit (no blanket moves).**
   - Inventory every scheduler start function in `startup/boot-domains.js` (`bootAllDomains`, lines 497-539) and `server-founder-runtime.js` (lines ~467-547).
   - For each scheduler, decide exactly one of:
     - `founder_runtime` — start it in `server-founder-runtime.js` because it is required for production `founder_builder` mode.
     - `full_runtime_only` — leave it in `bootAllDomains` and document that it requires `LIFEOS_RUNTIME_PROFILE=full` plus `LIFEOS_ENABLE_FULL_RUNTIME=true` and `LIFEOS_ALLOW_FULL_RUNTIME_ON_RAILWAY=true` (per `services/runtime-modes.js` lines 32-34 and 71-72).
     - `env_gated` — start conditionally based on a specific env var, and add a health endpoint that reports whether it is running.
   - Write the audit to `docs/products/project-governance/SCHEDULER_AUDIT.md` or `docs/products/builderos/SCHEDULER_AUDIT.md`, one row per scheduler, with the decision and the evidence (env gates, route dependencies, DB tables). Do not move a scheduler without the evidence.

2. **Wire security review into the commit path.**
   - `BUILD_QUEUE.json` item `bo-wire-security-review-into-commit-path` (lines 2565-2597) is `pending`. In `routes/lifeos-council-builder-routes.js`, inside `commitOrMirrorFiles()` after the `evaluateInvariants()` block and before `commitManyToGitHub`, call `reviewDiffForSecurity` from `scripts/ai-security-review.mjs` as a **fire-and-forget, non-blocking, non-throwing** call. Build the diff text from `fileEntries` (skip base64 entries). Use the same `callCouncilMember`/`callModel` and `pool` already in scope. Log findings but never block the commit. This matches the existing `BUILD_QUEUE.json` spec exactly.

3. **Runtime-fingerprint endpoint.**
   - `BUILD_QUEUE.json` item `bo-runtime-fingerprint` (lines 2599-2635) is `pending` and currently has a `last_error` from a false-done reaudit. Implement `GET /api/v1/lifeos/builder/runtime-fingerprint?paths=...` to return `sha256` of allowlisted repo files (`routes/`, `services/`, `middleware/`, `startup/`, `config/`, `scripts/lib/`) as they exist on the container disk. Reject paths outside the allowlist, `..`, and absolute paths. Wire it through the existing builder control route or as `routes/builderos-runtime-fingerprint-routes.js`. Add `tests/builderos-runtime-fingerprint.test.js` covering allowlist rejection and a fixture hash.

4. **Preflight truth repair (if still red).** If `npm run builder:preflight` still reports the 4 `PASS_WITHOUT_NAMED_VERIFIER` receipts after 2.0, fix them as described in 2.0. No product work ships while preflight is red.

### 2C — Minimal cross-agent handoff artifact (third)

**Purpose:** stop making the founder the only message bus between Devin sessions.

1. Create `docs/AGENT_HANDOFF.md` (or update it if it exists) with a template containing:
   - `origin_main_sha`: the `origin/main` commit hash at the start of the work.
   - `mission`: `Mission 2.0` and active sub-package (2A/2B/2C).
   - `findings`: a list of structured items, each with `claim`, `label` (KNOW/THINK/etc.), `evidence_file_or_url`, and `file_lines`.
   - `decisions`: founder decisions and AI decisions with `decision_id` and `rationale`.
   - `open_questions`: exactly what is blocking and what evidence would unblock it.
   - `next_actions`: concrete next steps with owning file/endpoint/test.
   - `verification_commands`: the exact commands to re-run to reproduce the current state.
2. After each sub-step, append a machine-readable packet to `data/agent-handoff/` as `<timestamp>_MISSION_2_<substep>.json` containing the same fields.
3. Add `scripts/verify-handoff.mjs` that reads the latest packet and exits 0 only if all required fields are present and non-empty. Wire it into `npm run builder:preflight` or as a standalone `npm run verify:handoff`.

### Section 3 — Excluded or Deferred Work

Do not do these in Mission 2 unless explicitly told:

- **Email provider migration.** Postmark is canceled. `RESEND_API_KEY`, `SMTP_*`, or another provider will be configured by the founder. Do not add new email-sending code; make checkout/download not depend on email.
- **Full TC field-ops runtime.** TC routes are now mounted under `founder_builder` from `register-founder-runtime-routes.js`. Real transaction processing is blocked on founder credentials (IMAP, SkySlope/eXp Okta, BoldTrail, GLVAR/MLS, Asana, Twilio, TC agent phone). Mission 2 only verifies the routes mount and return sensible errors when credentials are missing.
- **Multi-agent real-time chat room.** No WebSocket/API room. 2C is a single structured handoff file.
- **Large authority merges.** `PRODUCT_REGISTRY.json` is canonical; do not merge `REPO_FILE_SYNOPSIS_INDEX.json` or `docs/products/INDEX.md` into it. Verify boundaries, no consolidation theater.
- **New product features** beyond SMOS checkout correctness, the scheduler audit, security-review wiring, and runtime fingerprint.
- **Tonal/prosody pipeline.** It remains in the git stash (`7ae2cf882`) per founder instruction.
- **LifeRE founder usability walkthrough.** Mark `founder_usability_pass: false` and wait for the founder.

---

## Section 3 — Founder-Action List (things Devin cannot do)

- Choose and configure an email provider (`RESEND_API_KEY` + verified domain, or `SMTP_*` credentials, or another) and set `EMAIL_PROVIDER` in Railway. Devin can wire the code; Devin cannot create the account or verify the domain.
- Complete one real $49 SMOS charge with a real card so the system can prove money moves.
- Decide whether to keep Stripe in live mode or switch to test mode for controlled verification.
- Provide missing TC/MLS/voice credentials if TC field-ops should run.
- Review and approve the final Mission 2 handoff before Mission 3 begins.
