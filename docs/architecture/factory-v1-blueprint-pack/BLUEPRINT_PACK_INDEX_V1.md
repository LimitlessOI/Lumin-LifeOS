<!-- SYNOPSIS: Blueprint Pack Index v1 -->

# Blueprint Pack Index v1

**Purpose:** Single table of contents for rebuilding the factory system from scratch. Read this first, then follow links in order.

**Last updated:** 2026-05-24 (missions through FACTORY-REBOOT-0030)

---

## If you lost everything — start here

1. **`prompts/00-SYSTEM-AUTHORITY-LAYERS.md`** — which layer is canonical (factory vs legacy spine)
2. **[FACTORY_REBUILD_MANIFEST_V1.md](./FACTORY_REBUILD_MANIFEST_V1.md)** — master map: doctrine → mission packs → runtime → verify → cutover
3. Run on a clean clone: `npm run factory:ci` (expect **16/16 PASS**)

---

## Document roles (doctrine layer)

| Document | Role | Rebuild? |
|----------|------|----------|
| [AGENTS.md](./AGENTS.md) | **Doctrine only** — agent boundary prompt for this pack | Read when editing pack |
| [COUNCIL_ROUTING_AUDIT_V1.md](../COUNCIL_ROUTING_AUDIT_V1.md) | **Today's routing truth** (production spine) | Read before provider keys |
| [CANONICAL_FACTORY_FOUNDATION_V1.md](./CANONICAL_FACTORY_FOUNDATION_V1.md) | Constitutional vocabulary | Read first |
| [DEPARTMENT_CHARTERS_V1.md](./DEPARTMENT_CHARTERS_V1.md) | Actor boundaries | Read |
| [FULL_FOUNDER_PACKET_V1.md](./FULL_FOUNDER_PACKET_V1.md) | Founder packet doctrine | Read |
| [CODER_ZERO_DECISION_BUILD_SPEC_V1.md](./CODER_ZERO_DECISION_BUILD_SPEC_V1.md) | A-to-Z build spec (BPB source) | BPB converts to missions |
| [FACTORY_A_TO_Z_BUILD_BLUEPRINT_V1.md](./FACTORY_A_TO_Z_BUILD_BLUEPRINT_V1.md) | Phase outputs + acceptance | Cross-check manifest |
| [SYSTEM_TOOL_INVENTORY_AUDIT_V1.md](./SYSTEM_TOOL_INVENTORY_AUDIT_V1.md) | Tool gap map | See addendum for current status |
| [FULL_FOUNDER_PACKET_AUDIT_V1.md](./FULL_FOUNDER_PACKET_AUDIT_V1.md) | Doctrine vs runtime gaps | See addendum |
| [OLD_STACK_BUILDER_STRUCTURE_AUDIT_V1.md](./OLD_STACK_BUILDER_STRUCTURE_AUDIT_V1.md) | What to mine from main repo | Adapt list |
| [GOLDMINE_PASS_V2.md](./GOLDMINE_PASS_V2.md) | KEEP / ADAPT / REJECT per file | See addendum |
| [BLUEPRINT_MACHINE_READINESS_AUDIT_V1.md](./BLUEPRINT_MACHINE_READINESS_AUDIT_V1.md) | Spec vs machine-ready verdict | See addendum |
| [SALVAGE_CANDIDATES.json](./SALVAGE_CANDIDATES.json) | Parts-car inventory | Product missions |
| [FACTORY-0001-v1/](./FACTORY-0001-v1/) | Proof-slice mission template | Copy shape |

---

## Machine layer (step-atomic packets)

| Path | Role |
|------|------|
| `builderos-reboot/MISSIONS/FACTORY-REBOOT-0001` … `0030` | Sha256-pinned blueprints + acceptance |
| `builderos-reboot/MISSIONS/FACTORY-GREENFIELD-0001` | Greenfield proof |
| `builderos-reboot/MISSIONS/FACTORY-PROOF-LOOP-0001` | Full loop proof |
| `builderos-reboot/MISSION_QUEUE.json` | Mission order |
| `builderos-reboot/MISSION_SHARED_FILE_OWNERSHIP.md` | Shared file canonical steps |
| `builderos-reboot/HANDOFF.md` | Operator one-liner |

---

## Runtime layer (what missions materialize)

| Path | Role |
|------|------|
| `factory-staging/` | Governed factory runtime (execute-step hot path) |
| `lumin-factory/` | Standalone cutover bundle (git-ready, push separately) |

---

## Production layer (main LifeOS repo — not replaced by factory-staging)

| Path | Role |
|------|------|
| `routes/lifeos-council-builder-routes.js` | Production `/build` (ADAPT target) |
| `services/deployment-service.js` | GitHub commit + Railway deploy |
| `routes/railway-managed-env-routes.js` | Env vault + sync |
| `scripts/council-builder-preflight.mjs` | Builder reachability |

See [FACTORY_REBUILD_MANIFEST_V1.md](./FACTORY_REBUILD_MANIFEST_V1.md) § Production spine.

---

## Verification commands

```bash
npm run factory:ci          # 15 checks umbrella
npm run factory:tools       # gates + SENTRY + Historian
npm run factory:tsos        # TSOS guardrails
npm run factory:sentry      # mechanical SENTRY
npm run factory:readiness   # readiness report
npm run builder:preflight   # production builder (Railway)
```

---

## Maintenance rule

When **any** factory runtime file or mission pack changes:

1. Update **[FACTORY_REBUILD_MANIFEST_V1.md](./FACTORY_REBUILD_MANIFEST_V1.md)** runtime table + mission row
2. Append row to affected audit doc **Addendum** (do not erase history)
3. Refresh hash pins: `node builderos-reboot/scripts/refresh-blueprint-hashes.mjs <MISSION>`
4. Run `npm run factory:ci` before claiming green
