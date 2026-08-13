<!-- SYNOPSIS: Collectibles master blueprint — authoritative product specification -->

# Collectibles — Master Blueprint

| Field | Value |
|---|---|
| **Product id** | `collectibles` |
| **Status** | `BLUEPRINT_READY_FOR_CONSENSUS` |
| **Authored** | 2026-08-12 |
| **Authority** | This file + sibling contracts under `docs/products/collectibles/` |
| **Manufacturing** | Forbidden until consensus; then V1 mission only |

**Label legend:** `[FOUNDER]` founder-established intent · `[DERIVED]` resolved from constraints · `[HORIZON]` deferred · `[FOUNDER-RESERVED]` must not be decided by Builders

---

## 1. Executive product definition

Collectibles is a LimitlessOS product that converts photographs (and later scans) of real physical collectibles into a durable **CollectibleTwin**, presented in a brand-first, image-led **Vault**.

Competitors make users track collections. We make Twins that can be owned, enjoyed, discovered, quietly offered upon, exchanged under protection, connected to local partners/events, and eventually unlocked for play and asset services—without surrendering owner control.

**Primary user outcome (V1):** A new user photographs or imports a real collection and receives a beautiful, truthful, durable digital Vault whose corrections persist and whose physical objects remain traceable.

**Platform outcome (V10):** A new collectible category is added by a Category Capability Pack without altering ownership, transaction, trust, privacy, or partner semantics.

---

## 2. Founder intent and non-negotiables

### 2.1 Founder intent `[FOUNDER]`

1. The collection must feel like a collection, not a stock ticker or spreadsheet.
2. Actual user-item photographs are preferred as the hero representation when available.
3. Pricing shows range + confidence + freshness/provenance — never false precision.
4. Unknown printing/condition/value becomes **Needs Review**, not invented truth.
5. Corrections are first-class.
6. Quiet Mode is default — no engagement spam; offers are quiet liquidity, not SELL badges.
7. Users retain export, delete, privacy, and auto-list control.
8. One physical object → one Twin → many authorized capabilities.
9. Ownership ≠ possession ≠ custody ≠ location ≠ digital representation ≠ physical-copy evidence ≠ play entitlement ≠ IP permission.
10. Play entitlement must never imply IP permission.
11. Teloa does not hold customer funds; licensed payment/held-funds providers do. `[FOUNDER]` + `[DERIVED]` operationalization in EXTERNAL_ADAPTERS / LEGAL gates.
12. No automatic public listing without explicit permission.
13. Every version must be independently valuable; do not build later versions during V1 manufacturing.

### 2.2 Non-negotiable engineering laws `[DERIVED]`

- Modular monolith initially (Postgres + Express services modules).
- Provider-specific IDs never become canonical Twin ids.
- Every advanced capability has a deterministic fallback.
- Privacy: minimum necessary exposure; private reservation prices never leak.
- Capability-specific trust evidence; not one global star rating.
- Reality acceptance required before claiming a version “done” (Layer A + Layer B where UI ships).

---

## 3. Product powers

| Power | Meaning | First version with material surface |
|---|---|---|
| OWN | Register, correct, locate (privately), export, delete | V1 |
| ENJOY | Era Wall, Twin Dossier, image-led browse, memory | V1 |
| DISCOVER | Search own vault; later local inventory/events/wants | V1 own; V2 wants; V5 local |
| EXCHANGE | Liquidity preference → offers → protected trade | V1 prefs; V2 offers; V3 settle |
| TRUST | Provenance, corrections, capability trust scores | V1 foundation; V3+ operational |
| CONNECT | Household; partners; stores; events; reveals | V1 household; V5–V6 network |
| UNLOCK VALUE | Sell agent, raise $X, lending packages, play | V4–V9 gated |

---

## 4. Competitor / differentiation thesis `[FOUNDER]`

| Competitor pattern | Our answer |
|---|---|
| Spreadsheet / binder inventory | Image-led Vault + Twin Dossier |
| Price charts as home | Quiet value with uncertainty; emotional ownership first |
| Active listing required for liquidity | Invisible listing / standing demand finds you |
| Marketplace creates parallel SKUs | One Twin, authorized projections |
| Social feed engagement | Quiet Mode; CONNECT is people/places/expertise, not sludge |
| Digital play without ownership truth | Ownership-backed entitlement, IP-gated adapters |
| Platform holds funds / grades / lends | Adapter to licensed partners; Teloa orchestrates |

---

## 5. Canonical domain model

Full fields: [`SCHEMA_CONTRACTS.md`](SCHEMA_CONTRACTS.md).

### 5.1 Core entities

| Entity | Role |
|---|---|
| `CollectibleTwin` | Canonical identity for one physical object instance |
| `CategoryAdapter` | Category-specific identity/condition/pricing hooks |
| `MediaEvidence` | Photos/scans with provenance |
| `PriceEvidence` | Range, confidence, freshness, sources |
| `OwnershipRecord` | Legal/economic owner |
| `PossessionRecord` | Who physically has it now |
| `CustodyRecord` | Contractual safeguarding responsibility |
| `LocationRecord` | Physical storage (strict privacy) |
| `LiquidityPreference` | Owner’s sell posture |
| `Offer` | Quiet economic proposal |
| `Want` | Standing desire graph node |
| `Transaction` | Protected exchange lifecycle |
| `TransactionPassport` | Evidence package for a deal |
| `TrustCapabilityScore` | Per-capability evidence trust |
| `Partner` / `PartnerCapability` | Declared partner services |
| `InventoryItem` | Partner/store inventory projection |
| `Event` | Local/network events |
| `ContentRights` | Media consent/revoke/takedown |
| `PlayEntitlement` | Eligibility for supported play (≠ IP) |
| `HouseholdMembership` | Shared ownership model |
| `AuditEvent` | Immutable provenance log |
| `IpPermissionGrant` | Platform legal right to reproduce protected material |

### 5.2 Twin representation levels `[FOUNDER]`

Upgrade preserves one Twin id.

| Level | Name | Ships |
|---|---|---|
| 1 | Canonical Twin — identity/printing/product reference; may use legally permitted canonical imagery; does not claim to be owner’s exact copy | V1 |
| 2 | Physical Scan Twin — actual front/back (or equivalent) photos of user’s copy | V1 |
| 3 | Condition Twin — standardized imaging, estimate, defects, confidence, provenance | V1 foundation; deepen V3/V6 |
| 4 | High-Value Evidence Twin — controlled capture, fingerprint, custody/provenance for tx/insurance/auth | V6/V9 |

### 5.3 Mandatory semantic separations `[FOUNDER]`

Builders must model these as distinct records/fields. Collapsing them is a blueprint violation.

1. Ownership  
2. Possession  
3. Custody  
4. Location  
5. Digital representation  
6. Physical-copy evidence  
7. Play entitlement  
8. IP permission  

**Hard rule:** A play entitlement must NEVER imply IP permission.

### 5.4 Projection law

```
CollectibleTwin
  ├── VaultProjection (owner UI)
  ├── OfferProjection (redacted for buyers)
  ├── TransactionProjection (parties + escrow adapter)
  ├── CustodyProjection (partner staff, need-to-know)
  ├── RevealHostProjection (strict privacy filter)
  ├── ArenaProjection (entitlement + neutral object state)
  └── AssetServiceProjection (insurer/lender packages)
```

No capability may mint a second canonical identity for the same physical object.

---

## 6. Privacy / security / trust (summary)

Full model: [`TRUST_PRIVACY_MODEL.md`](TRUST_PRIVACY_MODEL.md).

**Never expose by default:** home address, physical storage location, collection totals, reservation/private threshold prices, high-value ownership signals to hosts/ranking/public.

**Trust:** capability-specific evidence (seller condition accuracy, shipping reliability, dispute cause rates, self-disclosed defects favored over post-handoff discoveries, partner custody accuracy, etc.). Fraudulent trust manipulation modeled explicitly.

---

## 7. Technical architecture `[DERIVED]`

### 7.1 Deployment posture

- **Modular monolith** in the existing LifeOS/LimitlessOS Node/Express + Postgres stack.
- Domain modules under `services/collectibles/*` and `routes/collectibles/*` (names reserved for manufacturing; not created in this docs pass).
- Extract distributed services only when Reality shows isolation need (video encode, high-volume search, etc.).

### 7.2 Service boundaries (logical modules)

| Module | Responsibility |
|---|---|
| Identity/Auth | Reuse LifeOS auth; household ACLs |
| TwinService | Create/update Twin; level upgrades |
| CategoryAdapterInterface | Identify, resolve printing/variant, category condition schema |
| MediaEvidenceService | Store photos/crops; retention |
| PricingProvenanceService | Ranges, confidence, freshness |
| OwnershipCustodyLocationService | Separated ledgers |
| VaultQueryService | Browse, search, Era Wall, Dossier |
| LiquidityOfferService | Preferences, offers (V2+) |
| WantGraphService | Wants/watch/love/need (V2+) |
| TransactionService | Protected exchange (V3+) |
| TrustService | Capability scores |
| PartnerCapabilityService | Registry + jurisdiction gates |
| InventoryService | Partner inventory sync (V5+) |
| EventService | Local events (V5+) |
| NotificationService | Quiet Mode policy |
| ContentRightsMediaService | Consent, clips, takedown (V6+) |
| PlayEntitlementService | Stub V1; active V7 |
| ArenaAdapterBoundary | Runtime + IP gate (V7) |
| ExternalProviderAdapters | Payments, carriers, grading, lending, video |
| AuditProvenanceService | Append-only audit |
| TelemetryRealityService | Outcome metrics, not vanity |

### 7.3 Bootstrap / migration from MTG cataloger

| Current | Becomes |
|---|---|
| `mtg_cards` rows | `CollectibleTwin` + `mtg` adapter payload |
| Vision identify | `CategoryAdapter.identify` |
| Scryfall pricing | `PricingProvenanceService` via MTG adapter |
| Photo BYTEA/R2 | `MediaEvidence` |
| Sell queue / liquidity | `LiquidityPreference` + later Offer |
| Upload UI | Vault capture surface (brand-first redesign in V1) |

Migration must preserve user corrections and photo evidence. Dual-read period allowed; dual-write avoided after cutover.

### 7.4 Failure philosophy

| Failure | Deterministic fallback |
|---|---|
| AI cannot identify | Needs Review queue |
| Weak price confidence | Wider range + manual review flag |
| Offer scoring down | Chronological inbox |
| External broker search fails | Internal results remain |
| Reveal AI context fails | Host continues opening manually |
| Arena rules assistant fails | Manual tabletop remains |
| Partner inventory sync fails | Stale-state warning, not fake stock |
| Payment provider fails | Transaction does not claim settlement |

---

## 8. V1–V10 version specification

### V1 — Trusted Personal Vault

**Independently valuable:** Yes — personal Vault works with zero marketplace.

**Required capabilities:**

| Capability | Behavior (exact) |
|---|---|
| CollectibleTwin | Create Twin from photo/import; stable UUID; category + adapter_ref |
| MTG adapter | Identify name/set/printing/foil/variant where supported; Needs Review otherwise |
| Auth multi-user | Each Twin owned by authenticated user/household |
| Photo/batch capture | Upload single + batch; persist actual photos |
| Identification | Adapter returns candidates + confidence; auto-accept only above threshold; else Needs Review |
| Printing/variant | Resolve when evidence supports; else Needs Review |
| Condition foundation | Optional estimate + confidence; never invent |
| Price range | min/max + confidence + source freshness; no false point |
| Needs Review workflow | Queue with reasons; user corrects; corrections persist |
| Corrections | First-class fields; audit trail |
| Browse/search | Image-led collection browse + text search |
| Era Wall | Beautiful home by era/generation buckets (MTG eras first) |
| Twin Dossier | Single-object detail: photos, identity, condition, price, location abstract, liquidity |
| Binder GPS / location | Private location abstraction (binder/box/shelf labels); never public |
| Household | Shared ownership memberships with roles |
| Guest scan → claim | Guest capture session → claim into authenticated Vault |
| Acquisition metadata | Source/purchase notes when supplied |
| Liquidity preference | `never_sell` \| `surprise_me` \| `open_to_offers` \| `private_threshold` \| `actively_selling` |
| Minimal Offer object | Data model only; no matching engine required in V1 |
| play_entitlement stub | Schema present; no Arena |
| Owner/possession/custody/location separation | Schema enforced even if UI mostly shows owner+location |
| Partner identity stub | Partner + capability tables stubbed |
| Export/delete/privacy | Full export; delete with audit; privacy prefs |
| Deterministic fallback UI | Needs Review + honest empty/error states |
| Audit/provenance | Identification, pricing, correction events |
| Telemetry | Digitization success, correction rate, unresolved rate — not engagement |

**Explicitly NOT V1:** Invisible matching, Want Graph UI, payments, shipping, Arena, Reveal, partner inventory, lending.

**Success proof:** See VERSION_ACCEPTANCE_GATES V1.

---

### V2 — Latent Liquidity + Want Graph

**Required:** Invisible Listing behavior; standing offers/buy intentions; Want/Watch/Love/Need-for-deck/Need-for-set; private reservation thresholds; offer inbox; offer quality score; buyer/seller trust foundation; spam controls; offer vs external net comparison; internal broker abstraction; persistent wants; Quiet Mode notifications; no auto-list without permission.

**Success proof:** Collector receives a legitimate economic offer for an owned object they never actively listed.

---

### V3 — Protected Exchange

**Required:** Buy/sell/trade; object+cash balancing; multi-object txs; third-party payment/held-funds abstraction; shipping/tracking; risk-based insurance requirements; transaction risk router; transaction passport; pre-shipment evidence; receipt/inspection window; disputes; returns; return-object consistency/fingerprint where supported; trust profiles; evidence-based dispute state; trust rewards for honest self-disclosure; external regulated providers behind adapters.

**Hard law:** Do not require Teloa to hold customer funds. Transaction state is separate from payment provider state.

**Success proof:** Two strangers complete a protected high-value sale/trade with explicit evidence and deterministic settlement/return states.

---

### V4 — Intelligent Commerce

**Required:** One-motion Sell Agent; net proceeds optimizer; venue comparison; smart lot composition; partial liquidation; “I need $X”; fast/balanced/max-net strategies; internal vs external venue recommendations; local-store/dealer bid abstraction; set/run completion intelligence; completion economics; opportunity engine; broker across approved sources; least-cost path to goal; multi-party trade solver where economics permit; regret/context warnings for sentimental/core/play-critical objects; emotional/utility value distinct from financial value.

**Success proof:** System turns part of a collection into requested cash or completes a defined acquisition goal while respecting constraints.

---

### V5 — Local Collector Commerce Network

**Required:** Partner-store accounts; Partner Capability Registry; inventory ingestion/sync; new/sealed + singles; store digital storefront; partner-origin attribution; revenue-share ledger; local-first venue economics; Home Store designation; city/local discovery; master local event calendar; tournaments/events by partners; release events; trade nights; store inventory-aware recommendations; Universal Cart / acquisition routing; sponsored placement clearly separated from best recommendation (“paid placement cannot masquerade as best answer”).

**Success proof:** Collector in one city discovers relevant local inventory, stores, events, and acquisition options; partners attribute real revenue to the network.

---

### V6 — Living Vault + Reveal Network

**Required:** Optional partner custody workflow; owner vs possessor vs custodian vs location ledger; check-in/out state machine; visit appointment; pickup; ship-to-owner; tournament checkout; return verification; Scan My Collection; paid physical scan upgrade tiers; Open & Scan; Buy → Ship / Vault / Open & Scan; Buy Now → owned-state; play-entitlement update independent of physical possession; Reveal Studio (live/recorded/dual-screen); host producer HUD with strict privacy filtering; content permissions; claim/revoke/takedown; anti-spoiler modes; reveal provenance; automated clip/highlight generation; partner/host revenue attribution; custody/accuracy reputation; jurisdiction/capability gating.

Custody/insurance marketing remains legal-gated until reviewed.

**Success proof:** Collector buys item; partner receives/opens/scans/stores; owner sees exact ownership/custody state; visits or retrieves; durable reveal/provenance experience.

---

### V7 — Universal Tabletop / Arena

**Behind formal IP/legal adapter gates.**

**Required core:** Publisher-independent Universal Tabletop Runtime; generic game primitives; rules adapter architecture; neutral object/state representation; physical-ownership-backed play entitlement; digital kitchen table; remote play; player-controlled state first; AI state assistance; rules-assistant where lawful; AI opponent; play against decks from owned inventory; deck suggestions/gap analysis; try/simulate only where legally permitted; Cards I Met; play history; nostalgia; protected physical object may remain stored while digital entitlement used.

**Hard law:** No third-party game adapter ships merely because user owns a physical card. Each adapter separately passes IP/licensing review. Success proof uses at least one fully lawful test/original game.

---

### V8 — Competition + Media Network

**Required:** Tournament engine; registrations; brackets/matchmaking; standings; deck validation where appropriate; optional Verified Physical Ownership format; prize framework behind contest/gaming legal gate; sponsored events; store-hosted tournaments; tournament checkout ↔ Living Vault; Home Store deck prep; city championships where desired; events-to-content pipeline; winning-deck/match recaps; local/partner/category/creator channels; Creative Engine multi-format output; explicit media consent/privacy.

**Success proof:** Partner store operates an event through the network connecting inventory, Vault assets, participants, results, and consented media.

---

### V9 — High-Value Asset Services

**Legal/partner gated.**

**Required:** Advanced custody partners; insurance-data package; disaster/loss package; grading/authentication partner routing; high-value transfer/custody states; same-vault ownership transfer where legally supported; proof/provenance graph; financing partner registry; jurisdiction-aware lending/pawn routing; collateral information package; market vs liquidation value separation; standing demand evidence; licensed partner referral/origination economics.

**Hard law:** No Teloa direct lending unless separately authorized under an explicit regulated-business blueprint.

**Success proof:** Safe packaging of trusted evidence + liquidity info for external insurers/authenticators/lenders without pretending to hold licenses Teloa does not have.

---

### V10 — Universal Collectibles Operating Network

**Required:** Category packs beyond TCG (sports cards, comics, coins, memorabilia, LEGO/toys, other approved classes); category-specific schemas atop universal Twin; universal Want Graph; universal ownership/desire graph; global partner network; global event discovery; cross-category broker; generalized exchange optimization; universal collection intelligence; interoperability boundaries; category adapter certification; scalable privacy; large-network fraud detection; mature provenance/trust.

**Core invariant:** Identity → Ownership → Condition → Provenance → Value → Desire → Utility → Liquidity → Transaction

**Success proof:** New category via capability pack without altering canonical ownership/transaction/trust/privacy/partner semantics.

---

## 9. Acceptance gates

See [`VERSION_ACCEPTANCE_GATES.md`](VERSION_ACCEPTANCE_GATES.md). Manufacturing may not claim a version done without those Reality proofs.

---

## 10. State machines

See [`STATE_MACHINES.md`](STATE_MACHINES.md). Summary:

- Living Vault / object lifecycle states (ownership does not change when possession changes).
- Offer/liquidity states (private thresholds never leak).
- Transaction states separate from payment provider states.
- Content rights states with revoke/takedown.

---

## 11. External adapter strategy

See [`EXTERNAL_ADAPTERS.md`](EXTERNAL_ADAPTERS.md).

Prefer mature external infrastructure where ownership provides no strategic advantage. Teloa owns orchestration, trust graph, Twin, UX, network intelligence, marketplace logic, learning loops.

---

## 12. Partner model

See [`PARTNER_MODEL.md`](PARTNER_MODEL.md). Do not hard-code “card store.” Capabilities declared individually; jurisdiction-limited; revenue splits per service.

---

## 13. Monetization

See [`MONETIZATION.md`](MONETIZATION.md) (resolved founder merge 2026-08-12).

Constitutional locks (do not re-interpret):
- Revenue may participate in value creation but must never secretly redefine what is “best” for the user.
- Fee-display law: V3+ recommendations show expected user net; V1 shows market range only (no fake net).
- No secret listing revenue; basic Quiet Matching must not be degraded to manufacture subscription pressure.
- Hard non-monetization list in MONETIZATION §3 is binding.

---

## 14. Legal / IP / regulatory gates

See [`LEGAL_IP_REGULATORY_GATES.md`](LEGAL_IP_REGULATORY_GATES.md). GREEN / YELLOW / RED for Arena adapters, custody marketing, funds, prizes, lending.

---

## 15. Observability / Reality metrics

Optimize for outcomes and network health. Reject vanity metrics that conflict with user benefit.

**Candidate metrics (authoritative list):**

- scan identification accuracy  
- correction rate  
- unresolved (Needs Review) rate  
- offer quality / accepted-offer rate  
- successful protected transaction rate  
- condition-dispute rate  
- net proceeds improvement  
- time/effort saved  
- object location accuracy  
- partner custody accuracy  
- successful collection digitizations  
- buyer/seller trust calibration  
- store revenue attributable to Teloa  
- event participation (useful, not vanity)  
- content-to-product conversion as diagnostic only  

---

## 16. Adversarial simulations

All 30 scenarios: [`ADVERSARIAL_SIMULATIONS.md`](ADVERSARIAL_SIMULATIONS.md).

---

## 17. Migration / compatibility strategy

1. **V1 schema freezes** Twin id, ownership/possession/custody/location separation, media evidence, price evidence, liquidity preference, offer stub, play_entitlement stub, partner stub, audit.
2. **V10 retrofit simulation** (see AUDIT_RECEIPT): V1 columns must not force Twin identity rewrite for later categories/custody/arena.
3. **MTG → Collectibles:** One-time migration job; preserve photos, corrections, pricing evidence; map sell_status → liquidity preference defaults (`catalogued`/`ready_to_list` → `actively_selling` only if user opted; else `open_to_offers` or `surprise_me` per founder migration policy default: `surprise_me` for existing sell-queue ready items only if user had sell intent flagged; otherwise `never_sell` until preference set — **resolved default:** imported Twins default to `surprise_me` with Quiet Mode on, never auto-listed).
4. **API versioning:** Domain contracts versioned `collectibles.v1`; additive fields preferred; breaking changes require migration note in SCHEMA_CONTRACTS.
5. **Export:** Machine-readable export of Twins + media references + corrections for user sovereignty.

---

## 18. Explicit non-goals

See [`NON_GOALS_AND_HORIZON.md`](NON_GOALS_AND_HORIZON.md).

Highlights: no crypto provenance theater; no engagement feed; no Teloa-held funds; no Arena shipping third-party IP without grant; no global star rating as primary trust; no spreadsheet-first Vault.

---

## 19. Deferred / Horizon register

See [`NON_GOALS_AND_HORIZON.md`](NON_GOALS_AND_HORIZON.md) § Horizon.

---

## 20. Dependency graph

See [`DEPENDENCY_GRAPH.md`](DEPENDENCY_GRAPH.md).

---

## 21. Implementation-ready schema contracts

See [`SCHEMA_CONTRACTS.md`](SCHEMA_CONTRACTS.md) + [`API_CONTRACTS.md`](API_CONTRACTS.md).

---

## 22. Builder handoff requirements

Before manufacturing V1, Builders must:

1. Read PRODUCT_HOME + MASTER_BLUEPRINT + SCHEMA + API + STATE_MACHINES + TRUST_PRIVACY + VERSION_ACCEPTANCE V1 + ADVERSARIAL (relevant sims) + FOUNDER_DECISIONS_REGISTER.
2. Create governed mission pack with assertion_spec covering V1 Reality gates.
3. Reuse LifeOS auth; do not invent parallel auth.
4. Implement CategoryAdapter interface first; port MTG cataloger behind it.
5. Ship Vault UI brand-first / image-led (not admin dashboard).
6. Pass SENTRY Layer A + Layer B before founder-facing “done.”
7. Not invent MarketplaceCard / ArenaCard / InsuranceCard identities.
8. Not escalate ordinary schema/API choices to Founder if constrained by this blueprint.
9. Halt only on FOUNDER-RESERVED items in FOUNDER_DECISIONS_REGISTER.

---

## UX product design law (cross-cutting) `[FOUNDER]`

- Vault is brand-first and image-led.
- One intent → one clear motion.
- Quiet Mode default.
- Offers are quiet liquidity, not SELL badges.
- Pricing uncertainty honest.
- Needs Review over invented truth.
- Actual user photos preferred as hero when present.

---

## Pricing architecture (cross-cutting) `[FOUNDER]` / `[DERIVED]`

Represent: market value range, confidence, freshness, source/provenance, liquidity value, quick-sale value, transaction-specific expected net (V3+), set/completeness effect (V4+), optional utility metadata, personal/sentimental significance **separately**.

Never allow emotional value to masquerade as monetary valuation. Never optimize default Vault around speculative price movement.

---

## Content architecture (V6+) `[FOUNDER]`

One source recording may create: full private recording, highlights, vertical clips, object moments, store/local/category recaps. Publishing requires ContentRights. Rights not implied by purchase, custody, or transaction participation alone.

---

## V10-against-V1 retrofit simulation (summary)

| Later need | V1 decision that protects it |
|---|---|
| Multi-category | `category_id` + adapter payload JSON; Twin id universal |
| Custody | Separate Possession/Custody/Location tables from day 1 |
| Offers | LiquidityPreference + Offer stub tables in V1 |
| Arena | PlayEntitlement stub; IpPermissionGrant separate |
| Partners | Partner + PartnerCapability stubs |
| High-value evidence | Twin `representation_level` enum 1–4 |
| Privacy | Location + threshold fields sensitivity-classified; projection APIs |
| Scale | Twin UUID PK; indexes for owner_id + category + needs_review; media externalizable |

**Conclusion:** V1 schema as specified does not force prohibitively expensive rewrites for V2–V10 if Builders obey separation laws.

---

## Two-builder equivalence rule

If two competent Builders could interpret a material behavior differently, the ambiguity is a defect in this blueprint. Resolved ambiguities are recorded in AUDIT_RECEIPT. Remaining FOUNDER-RESERVED items are listed in FOUNDER_DECISIONS_REGISTER and do not block V1 manufacturing of non-gated surfaces.
