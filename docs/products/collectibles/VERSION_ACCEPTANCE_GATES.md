<!-- SYNOPSIS: Collectibles Reality acceptance gates V1–V10 -->

# Collectibles — Version Acceptance Gates

**Law:** A version is not done until Reality proofs below pass. Endpoint 200 alone is insufficient. UI versions require SENTRY Layer A + Layer B with proposed_solution on every finding.

Reachability rule: new `services/collectibles/*` modules must have real callers in routes/UI (not exports-only).

---

## V1 — Trusted Personal Vault

**Success proof:** A new user can photograph/import a real collection and receive a beautiful, truthful, durable digital Vault whose corrections persist and whose physical objects remain traceable.

| Gate ID | Proof |
|---|---|
| V1-A1 | Authenticated user batch-uploads real photos → Twins created with persisted MediaEvidence (not discarded buffers) |
| V1-A2 | MTG adapter identifies or marks Needs Review; never invents printing/price point with false confidence |
| V1-A3 | PriceEvidence shows min/max + confidence + freshness/source |
| V1-A4 | Correction PATCH persists; reload shows correction; AuditEvent written |
| V1-A5 | Era Wall + Twin Dossier render image-led (hero prefers user photo when present) |
| V1-A6 | Location save works for owner; omitted from any non-owner projection test |
| V1-A7 | Liquidity preference set including private_threshold; threshold absent from non-owner API |
| V1-A8 | Household member roles enforced |
| V1-A9 | Guest scan → claim attaches Twins to authenticated user |
| V1-A10 | Export returns Twins+media refs; delete soft-deletes |
| V1-A11 | play_entitlement stub exists; no Arena surface |
| V1-A12 | Ownership/possession/custody/location tables distinct; check-in (if stubbed) does not change ownership |
| V1-A13 | Deterministic fallback UI for identify fail |
| V1-A14 | Telemetry emits digitization/correction metrics; no engagement-optimized spam |
| V1-B1 | Layer B: real browser walkthrough of upload → review → correct → dossier → era wall |
| V1-S | Adversarial sims 1,5,6,9,10,19,20,25,30 pass |

---

## V2 — Latent Liquidity + Want Graph

**Success proof:** Collector receives a legitimate economic offer for an owned object they never actively listed.

| Gate ID | Proof |
|---|---|
| V2-A1 | Twin with surprise_me/open_to_offers receives offer without actively_selling |
| V2-A0 | Basic Quiet Matching works without a paid “Premium Quiet Matching” gate; no artificial reach suppression for free users |
| V2-A2 | never_sell rejects offers |
| V2-A3 | private_threshold match without leaking value |
| V2-A4 | Want create/match; Quiet Mode digest |
| V2-A5 | Offer spam rate limit |
| V2-A6 | Quality score down → chronological inbox |
| V2-B1 | Layer B: offer inbox accept/decline |
| V2-S | Sims 8,9 |

---

## V3 — Protected Exchange

**Success proof:** Two strangers execute protected high-value sale/trade with explicit evidence and deterministic settlement/return states.

| Gate ID | Proof |
|---|---|
| V3-A1 | Payment adapter hold required before ship |
| V3-A0 | Sell/trade recommendations display expected user net including platform/venue/payment/shipping/insurance when material (fee-display law) |
| V3-A2 | Provider outage ≠ COMPLETED |
| V3-A3 | Passport + inspection window enforced by risk_tier |
| V3-A4 | Return substitution blocked when fingerprint enabled |
| V3-A5 | Dispute ambiguous evidence does not auto-resolve |
| V3-A6 | Delete blocked during active tx |
| V3-B1 | Layer B: full sale happy path + one dispute path |
| V3-S | Sims 2–4,7,15–18 |

---

## V4 — Intelligent Commerce

**Success proof:** System turns part of collection into requested cash amount or completes acquisition goal under constraints.

| Gate ID | Proof |
|---|---|
| V4-A1 | “I need $X” plan returns lots with expected net and constraints honored |
| V4-A2 | Sentimental/play-critical warnings fire; emotional ≠ monetary |
| V4-A3 | Dead external venue does not empty all options |
| V4-B1 | Layer B: one-motion sell agent dry-run |

---

## V5 — Local Collector Commerce Network

**Success proof:** City collector discovers local inventory/stores/events; partner attributes revenue.

| Gate ID | Proof |
|---|---|
| V5-A1 | Partner capability registry gates features |
| V5-A2 | Inventory sync stale warning |
| V5-A3 | Sponsored ≠ best in API+UI |
| V5-A4 | Revenue ledger event on attributed sale |
| V5-A5 | Partner left hides inventory |
| V5-B1 | Layer B: local discover + event |
| V5-S | Sims 11,12,28 |

---

## V6 — Living Vault + Reveal Network

**Success proof:** Buy → partner open/scan/store → ownership/custody visible → visit/retrieve → reveal/provenance.

| Gate ID | Proof |
|---|---|
| V6-A1 | Custody transitions without ownership change |
| V6-A2 | Host HUD redaction test |
| V6-A3 | ContentRights revoke → takedown queue |
| V6-A4 | Lost/damaged paths |
| V6-B1 | Layer B: check-in + host HUD privacy |
| V6-S | Sims 13,14,29 |

---

## V7 — Universal Tabletop / Arena

**Success proof:** Generic runtime supports at least one fully lawful test/original game; remote ownership-backed play without third-party copyrighted assets.

| Gate ID | Proof |
|---|---|
| V7-A1 | Lawful test game session completes remotely |
| V7-A2 | Protected adapter denied without IpPermissionGrant |
| V7-A3 | Entitlement without IP ≠ session |
| V7-A4 | Grant withdrawal disables adapter |
| V7-S | Sims 21,22 |

---

## V8 — Competition + Media Network

**Success proof:** Partner store operates event connecting inventory, Vault, participants, results, consented media.

| Gate ID | Proof |
|---|---|
| V8-A1 | Tournament lifecycle + standings |
| V8-A2 | Prize disabled in restricted jurisdiction |
| V8-A3 | Media consent enforced |
| V8-B1 | Layer B: register → result → consented recap |
| V8-S | Sim 23 |

---

## V9 — High-Value Asset Services

**Success proof:** Evidence/liquidity packages for insurers/authenticators/lenders without Teloa holding licenses it lacks.

| Gate ID | Proof |
|---|---|
| V9-A1 | Insurance package export shape |
| V9-A2 | Lending routes jurisdiction-filtered; unavailable honest |
| V9-A3 | No direct lend execution path in codebase |
| V9-S | Sim 24 |

---

## V10 — Universal Collectibles Operating Network

**Success proof:** New category via capability pack without altering ownership/transaction/trust/privacy/partner semantics.

| Gate ID | Proof |
|---|---|
| V10-A1 | Second category pack certified; Twin semantics unchanged |
| V10-A2 | Cross-category want/broker smoke |
| V10-A3 | Scale harness 100k objects/owner budgets |
| V10-S | Sims 26,27 + adapter certification checklist |
