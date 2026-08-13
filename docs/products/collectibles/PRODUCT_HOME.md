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
| **Last Updated** | 2026-08-13 — Collectibles never-stop: no demote/idle without FACTORY_3_REASSIGNED. |

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

| Date | What | Why | Evidence | Next |
|---|---|---|---|---|
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
