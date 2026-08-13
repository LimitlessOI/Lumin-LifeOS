<!-- SYNOPSIS: Collectibles founder-reserved decisions only -->

# Collectibles — Founder Decisions Register

Only items that materially change mission, user rights, ownership, privacy policy, economics, company risk, or irreversible business commitment.

Ordinary architecture/schema/API/UX-state choices are **resolved in the blueprint** and must not be re-escalated.

## Open founder-reserved (non-blocking for V1 Vault manufacturing)

| ID | Question | Why founder-reserved | V1 impact |
|---|---|---|---|
| FD-01 | Final public brand name (Collectibles vs Teloa Vault vs other) | Brand/mission surface | None — product_id remains `collectibles` |
| FD-02 | V1 commercial packaging (free alpha vs paid digitization tiers) | Economics | Manufacturing can ship free; pricing UI optional behind flag |
| FD-M2 | Whether/when enhanced matching intelligence is paid (V2+) | Economics / network formation | V2 ships Quiet Matching as capability; basic matching must remain undegraded; do not assume Premium Quiet Matching |
| FD-03 | Which jurisdictions to enable prize tournaments first | Legal/company risk | V8 only |
| FD-04 | Whether any custody marketing claims (“insured,” “fiduciary”) are ever allowed under Teloa brand | Legal/risk | V6 marketing copy blocked until decided; engineering of custody workflow still YELLOW-gated |

## Resolved by founder intent (locked — not re-ask)

| ID | Decision | Source |
|---|---|---|
| FD-R1 | Teloa does **not** hold customer funds | Founder prompt + blueprint |
| FD-R2 | No automatic listing without permission | Founder |
| FD-R3 | Quiet Mode default; Vault is collection-first not ticker-first | Founder |
| FD-R4 | One Twin → many projections; no parallel MarketplaceCard identity | Founder |
| FD-R5 | Play entitlement ≠ IP permission | Founder |
| FD-R6 | No Teloa direct lending without separate regulated blueprint | Founder |
| FD-R7 | Every version independently valuable; do not build later versions during V1 | Founder |
| FD-R8 | Imported MTG Twins default liquidity `surprise_me`, Quiet Mode on, never auto-listed | Derived + locked in MASTER_BLUEPRINT §17 |
| FD-R9 | Fee-display law + recommendation-integrity monetization rules in MONETIZATION.md | Founder merge 2026-08-12 |
| FD-R10 | Basic Quiet Matching is a network primitive; must not be intentionally degraded for subscription pressure | Founder merge 2026-08-12 |

## Explicitly NOT founder decisions (Builders resolve from blueprint)

Schema column names, Postgres vs R2 media backend preference, Express route shapes under `/api/v1/collectibles`, Era Wall visual layout details within brand-first law, adapter confidence numeric thresholds (must be Reality-tuned but not founder tickets), notification digest cadence, offer rate-limit constants, risk_tier numeric cutovers.
