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
| **Build queue** | `docs/products/collectibles/BUILD_QUEUE.json` |
| **Last Updated** | 2026-08-12 — factory-3 assigned to Collectibles; V1 BUILD_QUEUE opened; manufacturing lane live. Prior: monetization resolved; master blueprint. |

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
| Runtime product code | Not started under `collectibles` ownership |
| Bootstrap source | LifeOS MTG cataloger (adapter seed) |
| Manufacturing | Blocked until consensus + V1 mission pack |

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

Every version must be independently valuable. Do not manufacture later versions while building V1.

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

**Next:** Consensus review → V1 mission pack (`PRODUCT-COLLECTIBLES-V1-VAULT-0001` or equivalent) → migrate/generalize MTG cataloger into CollectibleTwin + MTG adapter.

**Do not:** Invent product architecture during manufacturing; invent MarketplaceCard / ArenaCard identities; treat play entitlement as IP permission; auto-list without permission; optimize Vault for engagement spam.

## Change Receipts

| Date | What | Why | Evidence | Next |
|---|---|---|---|---|
| 2026-08-12 | **factory-3 = Collectibles manufacturing lane.** Owns `services/collectibles/`, mtg-card bootstrap, collectibles routes/public/docs. V1 BUILD_QUEUE opened (adapter → twin → mtg adapter → routes → acceptance). Overlay stays factory-1/2. Live-queue lock carved to allow overlay + collectibles only. | Founder: 3rd will not be for overlay but Collectibles; want it working. | `LANE_ASSIGNMENT.json` + `BUILD_QUEUE.json` + LaunchAgent | Factory-3 ship of `COLLECTIBLES-V1-ADAPTER-INTERFACE-001` |
| 2026-08-12 | **Monetization section resolved** after founder merge: constitutional fee-display law; V1 range vs V3+ expected net; no secret listing; hard non-monetization list; V2 Quiet Matching not locked as paid premium — basic matching must not be degraded for subscription pressure; recommendation-integrity rule. | Founder: ~90–95% consensus with Cursor draft; adopt sharper prohibitions; unlock V2 premium-matching assumption. | `MONETIZATION.md` + MASTER §13 + FD-R9/R10/FD-M2 | Consensus → V1 mission pack |
| 2026-08-12 | Master blueprint set authored under `docs/products/collectibles/`; status `BLUEPRINT_READY_FOR_CONSENSUS`. No product code. | Founder mandate: convert completed brainstorm into implementation-ready blueprint; two-builder behavioral equivalence. | Document tree + `AUDIT_RECEIPT.md` | Consensus → V1 mission pack |

## Conversations

| Topic | File |
|---|---|
| Collectibles north-star thesis + V1–V10 lock | [`conversations/2026-08-12-collectibles-master-blueprint.md`](conversations/2026-08-12-collectibles-master-blueprint.md) |
