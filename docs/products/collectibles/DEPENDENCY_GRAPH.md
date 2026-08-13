<!-- SYNOPSIS: Collectibles version and module dependency graph -->

# Collectibles — Dependency Graph

## 1. Version dependencies

```mermaid
flowchart LR
  V1[V1_Vault] --> V2[V2_LiquidityWant]
  V2 --> V3[V3_ProtectedExchange]
  V3 --> V4[V4_IntelligentCommerce]
  V1 --> V5[V5_LocalNetwork]
  V3 --> V5
  V5 --> V6[V6_LivingVaultReveal]
  V3 --> V6
  V1 --> V7[V7_Arena]
  V6 --> V7
  V5 --> V8[V8_CompetitionMedia]
  V6 --> V8
  V7 --> V8
  V3 --> V9[V9_AssetServices]
  V6 --> V9
  V2 --> V10[V10_UniversalNetwork]
  V5 --> V10
  V9 --> V10
```

**Rules:**
- Later versions may depend on earlier canonical entities.
- Earlier versions must not require later versions to provide value.
- No dependency cycles between versions.

## 2. Logical module dependencies (V1 core)

```mermaid
flowchart TB
  Auth[LifeOS_Auth] --> Twin[TwinService]
  Twin --> Adapter[CategoryAdapter]
  Twin --> Media[MediaEvidence]
  Adapter --> Price[PricingProvenance]
  Twin --> Own[OwnershipCustodyLocation]
  Twin --> Vault[VaultQuery]
  Twin --> Liq[LiquidityPreference]
  Twin --> Audit[AuditProvenance]
  Twin --> PlayStub[PlayEntitlementStub]
  Twin --> PartnerStub[PartnerStub]
```

## 3. Cycle detection result

| Check | Result |
|---|---|
| Version graph cycles | None |
| V1 module cycles | None (DAG) |
| Offer ↔ Twin | Offers depend on Twin; Twin does not depend on Offer runtime |
| PlayEntitlement ↔ IpPermission | Independent; Arena joins both at session time only |

## 4. External dependencies

| Dep | Blocking for |
|---|---|
| LifeOS auth | V1 |
| Postgres | V1 |
| Vision provider keys | V1 identify (fallback Needs Review if all down) |
| Scryfall (MTG) | MTG price quality; Vault still works with needs_review |
| Payment provider contract | V3 |
| IP grants | V7 protected adapters |
| Licensed lending partners | V9 lending routes |
