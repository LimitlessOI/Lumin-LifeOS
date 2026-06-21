<!-- SYNOPSIS: Factory Tools Completion — Mission 0030 slice -->

# Factory Tools Completion — Mission 0030 slice

**Canonical rebuild doc:** [FACTORY_REBUILD_MANIFEST_V1.md](../docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md)  
**Blueprint pack index:** [BLUEPRINT_PACK_INDEX_V1.md](../docs/architecture/factory-v1-blueprint-pack/BLUEPRINT_PACK_INDEX_V1.md)

**Status:** Live in `factory-staging/` — verified by `npm run factory:tools` and `npm run factory:ci` (15/15).

> **Maintenance rule:** Any new factory tool or route must update the manifest §4 runtime table **and** the relevant blueprint-pack audit addendum in the same session. This file is an operator summary; the manifest is the rebuild authority.

## What was added (audit gap closure)

### Upstream gates (Segments 0–3)
| Tool | Path |
|------|------|
| Product Development gate | `factory-core/product-development/validate-gate.js` |
| Founder Packet validator | `factory-core/founder-packet/validate-completeness.js` |
| Adam Filter | `factory-core/founder-intent/adam-filter.js` |
| BPB intake gate | `factory-core/bpb/intake-gate.js` |
| Runtime canon | `factory-core/canon/*.json` |

**Hot path:** `dispatchExecuteStep` runs BPB intake before builder (legacy mode for reboot missions; `strict_upstream_gates: true` for new missions).

### SENTRY depth (Segment 6)
| Tool | Behavior |
|------|----------|
| `anti-pattern-check.js` | Blocks forbidden patterns in written JS |
| `blueprint-freeze-check.js` | Validates blueprint step required fields |
| `future-lookback.js` | Structural horizon advisories |
| `unintended-consequence-check.js` | Sandbox / composition-root guards |
| `proof-freshness.js` | Receipt staleness (adapted from goldmine) |
| `verify-step-result.js` | Full stack + `SENTRY_REVIEW.json` shape |

### Historian (Segment 7)
| Tool | Path |
|------|------|
| Append-only ledger | `factory-core/historian/append-record.js` |
| Hot path record | After TSOS on successful step |

### TSOS (Segment 8)
| Tool | Path |
|------|------|
| Efficiency evaluator | `factory-core/tsos/evaluate-efficiency.js` |
| Proposals only | No silent optimization |

### C2 + readiness (Segments 9–10)
| Surface | Route |
|---------|-------|
| C2 status | `GET /factory/c2/status` |
| C2 brief | `GET /factory/c2/brief?mission_id=` |
| Intake gate probe | `GET /factory/gates/intake?mission_id=` |
| Historian summary | `GET /factory/historian/summary` |
| Remote truth | `GET /factory/truth/reconcile` |
| Canon status | `GET /factory/canon/status` |

## Verify

```bash
npm run factory:tools
npm run factory:ci
```

## Still not in this slice (honest)

- Production LifeOS builder merge (`routes/lifeos-council-builder-routes.js` remains separate) — two builders coexist; see `CURRENT_BP_GAPS_V1.md`
- Factory TSOS JSONL → `token_usage_log` bridge — **only needed when factory calls paid AI outside Railway**; production ledger + spend caps are the immediate control
- `lumin-factory/` GitHub cutover — optional org step
- Full product mission packs from salvage (46 candidates)
- Live council on SENTRY (structural checks only on hot path)
- `useful-work-guard` import into factory scheduled tasks

**Before expensive models:** set `MAX_DAILY_SPEND` / `COST_SHUTDOWN_THRESHOLD` on Railway; check `GET /api/v1/tokens/unified/today`.

## Strict mode for new missions

```json
POST /factory/execute-step
{
  "strict_upstream_gates": true,
  "mission_id": "NEW-MISSION-0001",
  ...
}
```

Requires full `PRODUCT_DEVELOPMENT_RESULT.json` + complete `FOUNDER_PACKET.json`.
