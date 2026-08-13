<!-- SYNOPSIS: Collectibles external provider adapter strategy -->

# Collectibles — External Adapter Strategy

## 1. Policy `[FOUNDER]` / `[DERIVED]`

Prefer mature external infrastructure where ownership provides no strategic advantage.

**Teloa owns:** orchestration, trust graph, CollectibleTwin, UX, network intelligence, marketplace logic, learning loops.

**Do not rebuild** regulated commodity plumbing for ideological ownership.

## 2. Adapter areas

| Area | First version | Domain ownership | Notes |
|---|---|---|---|
| Payments / held-funds / marketplace settlement | V3 | Transaction state machine | Licensed provider holds funds; Teloa never claims custody of funds |
| Carrier labels / tracking | V3 | Shipment refs on transaction | |
| Shipping insurance | V3 | Risk router may require | |
| Identity verification (KYC) | V3/V9 | High-value thresholds | |
| Authentication / grading | V9 | Handoff packages | |
| Streaming / video | V6 | Reveal sessions | |
| Social publishing | V6/V8 | ContentRights gated | |
| Regulated lending / pawn | V9 | Referral/origination only | |
| Insurance | V9 | Data package + partner | |
| Market price sources | V1 | PriceEvidence sources[] | e.g. Scryfall for MTG — provider id in evidence, not Twin id |
| Object storage | V1 | MediaEvidence backend | R2/S3 when configured |

## 3. Adapter contract pattern

```
Domain request → Adapter.translate → Provider API
Provider webhook → Adapter.verify → Domain state transition (allowed only)
```

**Forbidden:** Domain Twin id = provider SKU.  
**Forbidden:** Settlement COMPLETED without adapter confirmation.  
**Required:** Simulator/fake adapter for Reality tests in non-prod.

## 4. Outage behavior

| Provider down | Domain behavior |
|---|---|
| Payments | No settlement; PROVIDER_OUTAGE_BLOCKED or hold prior state |
| Carrier | Manual tracking entry allowed; warn |
| Price source | Keep last PriceEvidence; mark freshness stale; Needs Review if never priced |
| Video | Reveal continues with local/manual capture path |
| Lending partner unavailable in jurisdiction | Hide that route; show alternatives or honest unavailable |

## 5. MTG bootstrap adapters

| Existing module | Adapter role |
|---|---|
| mtg-card-vision | CategoryAdapter.identify |
| mtg-card-pricing | CategoryAdapter.price (+ Scryfall source) |
| mtg-card-photo-store | MediaEvidence storage backend |

These remain LifeOS-owned until migration; Collectibles manufacturing wraps them behind CategoryAdapterInterface.
