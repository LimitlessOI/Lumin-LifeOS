<!-- SYNOPSIS: Canonical product home — Collectibles (LimitlessOS) -->

# Collectibles Product Home

**Provisional product name:** Collectibles  
**Brand note:** Public-facing brand may later use Teloa Collectibles / Vault naming; domain id remains `collectibles`.

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `collectibles` |
| **Parent umbrella** | LimitlessOS (`docs/products/limitlessos/PRODUCT_HOME.md`) |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/collectibles/FILE_MANIFEST.json` |
| **Master blueprint** | `docs/products/collectibles/MASTER_BLUEPRINT.md` |
| **Blueprint status** | `BLUEPRINT_READY_FOR_CONSENSUS` |
| **Factory lane** | `factory-3` (`com.lumin.factory-3-lane`) |
| **Build queue** | One manufacturing queue: `docs/products/universal-overlay/BUILD_QUEUE.json` (Collectibles steps carry `product_id: collectibles`) |
| **Last Updated** | 2026-08-13 — Swapped `user_collectible_wants` to the physical table (view alone didn't satisfy the static grounding checker); `wants` is now the view. |

---

## Mission

Turn photos of real physical collectibles into trusted digital Twins that can be beautifully owned, understood, enjoyed, discovered, offered on without active listing, intelligently sold or traded, connected to local stores and events, and eventually used in supported play and financial services—without surrendering owner control.

The collection must emotionally remain a collection, not become a cold financial dashboard.

## Permanent product powers

1. OWN  
2. ENJOY  
3. DISCOVER  
4. EXCHANGE  
5. TRUST  
6. CONNECT  
7. UNLOCK VALUE  

## Core architectural law

**ONE PHYSICAL OBJECT → ONE COLLECTIBLE TWIN → MANY AUTHORIZED CAPABILITIES**

Marketplace, Arena, insurance, and partner custody consume authorized projections of the canonical `CollectibleTwin`. They do not create parallel card identities.

## Current state

| Layer | State |
|---|---|
| Master blueprint | Authored 2026-08-12 — ready for consensus |
| Runtime product code | V1 foundation shipped (adapter/twin/mtg/routes/acceptance); Vault schema+UI+V2–V10 sealed print continues |
| Bootstrap source | LifeOS MTG cataloger (adapter seed) |
| Manufacturing | factory-3 pulls Architect-sealed `docs/products/collectibles/PRINT_SEQUENCE.json` into the one queue through V10 unless `FACTORY_3_REASSIGNED=1` |
| Print custody | Architect: `npm run builderos:architect:seal-print -- --product collectibles --from-amended-blueprint`. Cursor must not edit print slices. |

### Bootstrap assets (LifeOS-owned until migration)

- `routes/mtg-cards-routes.js`
- `services/mtg-card-vision.js`
- `services/mtg-card-pricing.js`
- `services/mtg-card-photo-store.js`
- `public/mtg-cards-upload.html`
- LifeOS auth / multi-user path

V1 manufacturing must generalize MTG into a Category Adapter; core must not hard-code Magic semantics.

## Blueprint document set

| Doc | Purpose |
|---|---|
| [`MASTER_BLUEPRINT.md`](MASTER_BLUEPRINT.md) | Executive definition, V1–V10, architecture |
| [`SCHEMA_CONTRACTS.md`](SCHEMA_CONTRACTS.md) | Entities, fields, enums, indexes, retention |
| [`API_CONTRACTS.md`](API_CONTRACTS.md) | Domain contracts + adapter boundaries |
| [`STATE_MACHINES.md`](STATE_MACHINES.md) | Vault, offer, transaction, custody, content |
| [`TRUST_PRIVACY_MODEL.md`](TRUST_PRIVACY_MODEL.md) | Trust evidence + privacy law |
| [`PARTNER_MODEL.md`](PARTNER_MODEL.md) | Capability registry + economics |
| [`EXTERNAL_ADAPTERS.md`](EXTERNAL_ADAPTERS.md) | Payments, shipping, video, grading, lending |
| [`MONETIZATION.md`](MONETIZATION.md) | Revenue architecture by version |
| [`LEGAL_IP_REGULATORY_GATES.md`](LEGAL_IP_REGULATORY_GATES.md) | IP / custody / funds / prizes / lending gates |
| [`ADVERSARIAL_SIMULATIONS.md`](ADVERSARIAL_SIMULATIONS.md) | 30 attack scenarios |
| [`VERSION_ACCEPTANCE_GATES.md`](VERSION_ACCEPTANCE_GATES.md) | Reality proofs V1–V10 |
| [`NON_GOALS_AND_HORIZON.md`](NON_GOALS_AND_HORIZON.md) | Explicit non-goals + horizon |
| [`DEPENDENCY_GRAPH.md`](DEPENDENCY_GRAPH.md) | Version and service dependencies |
| [`FOUNDER_DECISIONS_REGISTER.md`](FOUNDER_DECISIONS_REGISTER.md) | Founder-reserved items only |
| [`AUDIT_RECEIPT.md`](AUDIT_RECEIPT.md) | Pre-authorization audits |

## Release sequence (law)

Every version must be independently valuable. Manufacture version N only after prior version’s sealed acceptance/Layer-B dep is DONE (encoded in `COLLECTIBLES_PRINT_SEQUENCE` depends_on). **factory-3 does not idle** while any sealed Collectibles slice remains through **V10**, unless the founder explicitly reassigns the lane (`FACTORY_3_REASSIGNED=1` or factory-3 `owns:[]`).

| Ver | Name |
|-----|------|
| V1 | Trusted Personal Vault |
| V2 | Latent Liquidity + Want Graph |
| V3 | Protected Exchange |
| V4 | Intelligent Commerce |
| V5 | Local Collector Commerce Network |
| V6 | Living Vault + Reveal Network |
| V7 | Universal Tabletop / Arena |
| V8 | Competition + Media Network |
| V9 | High-Value Asset Services |
| V10 | Universal Collectibles Operating Network |

## Agent handoff

**Next:** factory-3 ships sealed Collectibles print through V10 (`CAPTURE-API` → …). Never stop unless `FACTORY_3_REASSIGNED=1`. Do not mint `docs/products/collectibles/BUILD_QUEUE.json`.

**Do not:** Invent product architecture during manufacturing; invent MarketplaceCard / ArenaCard identities; treat play entitlement as IP permission; auto-list without permission; optimize Vault for engagement spam; declare Collectibles “done” at foundation acceptance; demote/skip Collectibles print slices while the lane is assigned.

## Change Receipts

| 2026-08-14 | **Collectibles was NOT reachable in production despite all 46 V1-V10 steps showing "done" — founder asked directly and was told it was finished; investigated with real evidence, found it wasn't.** `routes/collectibles-routes.js` (the entire Vault/twins/capture API surface) was only ever hand-wired into `startup/register-runtime-routes.js` (the "full runtime" lane) — never into `founder_builder`, the only lane Railway actually boots in production. Confirmed live: `GET /api/v1/collectibles` → `404 Cannot GET /api/v1/collectibles` before this fix. Separately, all 9 V2-V10 "acceptance" tests (`tests/collectibles-v{2..10}-acceptance.test.js`) import zero real application code — they mock the very modules they claim to test (one file's own comment: "we'll mock their existence... to ensure the test structure is sound") — so even a passing run would prove nothing; 9+ major V2-V10 services (want-graph, transaction-service, sell-agent, custody-workflow, tabletop-runtime, tournament-engine, provenance-graph, category-pack-registry, universal-desire-graph) have no caller anywhere in the codebase, not just unmounted. Fixed the concrete, verifiable part: (1) `routes/collectibles-routes.js` read `deps.requireAuth`, which the auto-register system never supplies (only `deps.requireKey`) — would have shipped every Vault/twin endpoint wide open the moment it was mounted; added a `requireKey` fallback, matching the pattern every other auto-registered route already uses. (2) Added the real auto-register entry (`config/auto-registered-product-modules.json`, 1-line surgical diff) so the route mounts on the actual lane Railway boots. Verified locally before shipping: called `registerCollectiblesRoutes` directly against a fake app/deps — 5 routes registered, each behind the auth middleware (not silently dropped). The 9 fake acceptance tests and the 9+ orphaned V2-V10 services are NOT fixed by this entry — they need real integration tests against actual services and real callers wiring them into the Vault UI/API, which is substantial follow-up work, not a same-session fix. | Founder, live session, verbatim: "I'm told it is [finished]" then, after the gap was shown: "fix the fixer first like what the fuck did it not pick up this problem and why did the system not fix it" | Live 404 confirmed before fix (real curl against production). Local `registerCollectiblesRoutes(fakeApp, {requireKey: fn})` call confirms 5 routes register with auth middleware attached, not dropped. `node --check` PASS. Live re-verify (real 200 on `/api/v1/collectibles`) pending next deploy. |
| 2026-08-14 | **Migration fix round 3 — real evidence, real fix.** Round 2 also deployed live but the migration STILL failed; instead of guessing a third time, shipped a diagnostic-only change first (`startup/database.js` → `server-founder-runtime.js` → `services/founder-runtime-boot-report.js`) to expose the actual Postgres error text at `/healthz` (previously console-only, unreachable outside a Railway shell). Once live, `/healthz.startup_report.migrations_failed_details` showed the real error for the first time: `cannot drop table wants because other objects depend on it`. Root cause found immediately: `20260813_collectibles_wants_v2.sql` made `user_collectible_wants` a VIEW defined as `SELECT * FROM wants` — a real dependent of the `wants` table. Round 2's guard block dropped `wants` (line 59, no CASCADE) BEFORE dropping the dependent view (line 66) — backwards order. Fixed by reordering: drop the dependent view first, then the table (also added defensive `CASCADE` to the table drop). Reproduced the exact failure scenario locally (built real pre-state: `wants`=table, `user_collectible_wants`=view depending on it via `pg_class.relkind` check) and confirmed the fixed file now converges correctly, `EXIT CODE 0`. | Founder's explicit 8-hour never-stop monitoring order — round 2 also silently failed live despite passing local tests twice; stopped guessing and fixed the actual diagnostic gap instead of trying a third blind fix. | Local repro: pre-state confirmed via `pg_class.relkind` (`wants`=r, `user_collectible_wants`=v) before migration, `wants`=v / `user_collectible_wants`=r after, exit 0. **Live-confirmed 2026-08-14:** deploy SHA `07fdb09b31` live via `builder/ready`, fresh boot `/healthz` shows `status:"healthy"`, `degraded:false`, `migrations_failed:[]` — closed. |
| 2026-08-14 | **Migration fix round 2 — round 1 deployed but the migration kept failing; found and fixed the real bug via actual local testing, not another guess.** Round 1 (`DROP VIEW IF EXISTS user_collectible_wants CASCADE`) deployed live but `/healthz` still showed the same migration failing after 19 minutes of uptime, confirmed by SHA ancestry that the fix was genuinely in the running code. Reproduced the failure locally against a real Postgres instance (confirmed via card-count cross-check that local DB is NOT production, so this was a syntax/logic test, not a data assumption): `IF wants_is_table AND (SELECT COUNT(*) FROM wants) = 0` throws `relation "wants" does not exist` when the table is genuinely absent, because Postgres does not short-circuit the COUNT(*) subquery inside that combined condition — this exact pattern was in the *original* migration from the start, likely the true root cause all along, predating round 1's view/table-swap fix entirely. Rewrote with nested `IF wants_is_table THEN IF (SELECT COUNT...` and made the `user_collectible_wants` and final `wants` view creation fully relation-kind-aware (checks `pg_views`/`pg_tables` explicitly instead of a blind `DROP VIEW IF EXISTS`, which itself would error against an actual table). Tested twice locally against real (non-prod) Postgres, both a from-scratch and a messy partial-state run, both `EXIT CODE 0` under `-v ON_ERROR_STOP=1`, both converging to the correct final state (`user_collectible_wants`=table, `wants`=view). | Founder's explicit 8-hour monitoring order caught round 1 not actually working rather than assuming it did — direct instruction not to just re-report the same finding. | `psql -v ON_ERROR_STOP=1 -f <migration>` twice, both exit 0, both correct final `relkind`. Live production re-verify still pending next deploy — local success is real evidence but not itself proof against production's actual (unknown, unintrospectable from this session) starting state. |
| 2026-08-14 | **Fixed a real, currently-live degraded-health bug found during overlay monitoring.** `/healthz` was reporting `status:"degraded"`, `migrations_failed:["20260813_collectibles_wants_v2_swap_physical.sql"]` on every single boot since 2026-08-13 — never marked done in `schema_migrations`, so it retried and failed fresh on every deploy. Root cause: `CREATE TABLE IF NOT EXISTS user_collectible_wants` only guards against another table of the same name; it errors when the name is occupied by a VIEW, which is exactly the state the migration's own header comment says the prior migration left it in. Made the migration idempotent against either starting relation kind (added `DROP VIEW IF EXISTS user_collectible_wants CASCADE` before the `CREATE TABLE`). Edited in place rather than a new migration file since it never successfully ran (nothing to preserve/double-apply). | Found live while investigating a 12-hour gap in autonomous commit activity per the founder's explicit 8-hour monitoring order; degraded health was a real, standing, currently-active symptom, not assumed. | Could not capture the exact live Postgres error text (only logged server-side, no exposed endpoint) — root cause is a well-grounded inference from the migration's own documented prior-state comments, not a guess from nothing. Live re-verify pending next deploy: `/healthz` should report `degraded:false` with 0 migrations_failed. |
| Date | What | Why | Evidence | Next |
|---|---|---|---|---|
| 2026-08-13 | **Point B — never stop.** Tip must not return success with shipped=0 while Collectibles print open; retry+heal in-tick; F3 always tip-ships while print open; sealed DOSSIER+LOCATION+HOUSEHOLD+GUEST+EXPORT+LAYER-B exacts ahead of thrash. | Founder: Point A not working → Point B never stops; do not sell partial. | sealed twins/steps + tip retry | Keep shipping through V10 |
| 2026-08-13 | **Never-stop hard gate.** Collectibles print cannot demote/skip/escalate-idle; tip heals + attaches convention sealed exact; CAPTURE-API + REVIEW-QUEUE sealed `write_file_exact` on real schema. | Founder: fix so it never stops again unless I say it to. | `tests/manufacturing-self-repair.test.js` never-stop | Tip F3 continues print |
| 2026-08-13 | **Architect print custody (honesty).** Cursor hand-sealing Collectibles print in config was SO-001 drift — made manufacturing Cursor-dependent. Closed: `AMENDED_BLUEPRINT.json` + Architect-sealed `PRINT_SEQUENCE.json`; config is loader only; `builderos:architect:seal-print`. | Founder: if sealed print is required, Architect was supposed to do it — not Cursor. | `tests/architect-print-seal.test.js` | Tip loads seal; F3 continues |
| 2026-08-13 | **Never-idle Collectibles print V1→V10.** Sealed print continues past foundation; prepare enrolls next slice; tip forbids factory-3 idle while print open unless `FACTORY_3_REASSIGNED=1`. | Founder: cannot idle if even one thing needed — through V10 if not reassigned. | `tests/collectibles-print-sequence.test.js` | Tip ship SCHEMA-TWINS |
| 2026-08-13 | **Twin sealed write_file_exact** (`COLLECTIBLES-V1-TWIN-SERVICE-001.exact`) with `identity_status` SENTRY needle. | author_then_write thrash + tip already_running; deterministic print. | twins/steps exact + queue seal | factory-3 tip-ship → MTG adapter |
| 2026-08-13 | **heal_unblocked on twin/mtg so one-queue unskips stick.** Tip mem was re-skipping Collectibles after GitHub reset. | Founder one-queue law. | Queue steps + merge fix | Factory-3 ships twin |
| 2026-08-13 | **Founder reaffirmed one-queue law; factory-3 re-pointed at the manufacturing queue.** No Collectibles BUILD_QUEUE. Stale lane process still asked for `collectibles` queue → missing. Reloaded; twin/mtg unblocked after self-referential STEP_STATUS_FORBIDDEN thrash. | Founder: we do not start a new queue; one queue manages multiple factories and more than one project; it pulls from the BPs. | factory-3 tick `product_id:universal-overlay` | Ship twin-service + mtg-adapter from the one queue |
| 2026-08-13 | **Founder correction: one queue, multi-factory, multi-project from BPs.** Mistaken Collectibles second queue archived. V1 foundation slices enrolled into `docs/products/universal-overlay/BUILD_QUEUE.json` with `product_id: collectibles` + `source` → MASTER_BLUEPRINT. factory-3 still owns Collectibles paths. | Founder: we do not start a new queue; one queue manages multiple factories and more than one project; it pulls from the BPs. | One queue + archived `docs/history/product-build-queues/collectibles/` | Factory-3 ship of `COLLECTIBLES-V1-ADAPTER-INTERFACE-001` |
| 2026-08-12 | **factory-3 = Collectibles manufacturing lane.** Owns `services/collectibles/`, mtg-card bootstrap, collectibles routes/public/docs. Overlay stays factory-1/2. | Founder: 3rd will not be for overlay but Collectibles; want it working. | `LANE_ASSIGNMENT.json` + LaunchAgent | Enroll work into the one queue (corrected 2026-08-13) |
| 2026-08-12 | **Monetization section resolved** after founder merge: constitutional fee-display law; V1 range vs V3+ expected net; no secret listing; hard non-monetization list; V2 Quiet Matching not locked as paid premium — basic matching must not be degraded for subscription pressure; recommendation-integrity rule. | Founder: ~90–95% consensus with Cursor draft; adopt sharper prohibitions; unlock V2 premium-matching assumption. | `MONETIZATION.md` + MASTER §13 + FD-R9/R10/FD-M2 | Consensus → V1 mission pack |
| 2026-08-12 | Master blueprint set authored under `docs/products/collectibles/`; status `BLUEPRINT_READY_FOR_CONSENSUS`. No product code. | Founder mandate: convert completed brainstorm into implementation-ready blueprint; two-builder behavioral equivalence. | Document tree + `AUDIT_RECEIPT.md` | Consensus → V1 mission pack |

## Conversations

| Topic | File |
|---|---|
| Collectibles north-star thesis + V1–V10 lock | [`conversations/2026-08-12-collectibles-master-blueprint.md`](conversations/2026-08-12-collectibles-master-blueprint.md) |
