# Machine layer / mission-pack authority

You are in **`builderos-reboot/`** — governed mission packs and factory proofs.

---

## Two domains (do not confuse)

| Domain | What | Owner |
|--------|------|-------|
| **Active product work** | `BP_PRIORITY.json` → mission `BLUEPRINT.json` → acceptance | BPB / Machine (NOT Hist) |
| **History / legacy** | `MISSION_QUEUE.json`, overnight artifacts, autopilot scripts | **Hist (Historian)** |

**Adam locked:** Legacy files belong to **History**. **Historian domain owns them.** Read/salvage only — see `prompts/00-HIST-LEGACY-BOUNDARY.md`.

---

## CANONICAL — product work queue

**Blueprints in priority order ARE the queue.**

| Artifact | Role |
|----------|------|
| **`BP_PRIORITY.json`** | ONLY ordered list of product BPs to execute (rank 1 = active) |
| `MISSIONS/<id>/FOUNDER_PACKET.md` | WHAT + PASS bar |
| `MISSIONS/<id>/BLUEPRINT.json` | HOW |
| Named acceptance npm script | PROOF |

---

## HIST DOMAIN — Historian owns (not product orchestration)

Registry: **`HIST_DOMAIN_REGISTRY.json`**

| Artifact | Hist ID |
|----------|---------|
| `MISSION_QUEUE.json` | HIST-AUTO-001 |
| `MISSION_PACK_INDEX.json` | HIST-AUTO-002 |
| Overnight / slice / receipt JSON | HIST-AUTO-003 |
| Autopilot scripts | HIST-AUTO-004 |
| `factory-autopilot-scheduler.js` | HIST-AUTO-005 |
| Governed overnight runners + backlog state | HIST-AUTO-006 |

Every Hist-owned file has `_authority.domain: Hist`, `owner_department: Historian`, `status: HIST_OWNED`.

**To touch Hist artifacts:** Hist mandatory case (`HIST_LEGACY_SYSTEM_REGISTRY.md` §4) — default HALT.

---

## Verify (HARD)

```bash
npm run lifeos:bp-priority:verify
```

Enforced: pre-commit step 10 + `builder:preflight`. Checks Hist banners, BP_PRIORITY shape, MISSION_QUEUE ban in spine, **BP item ↔ receipt ↔ OBJECTIVE_VERDICT alignment** for TECHNICAL_PASS rows.

**Law:** Acceptance scripts **must** call `syncMissionFromTechnicalReceipt()` on technical PASS so `BP_PRIORITY.json`, mission `BLUEPRINT.json`, and `FOUNDER_PACKET.json` stay aligned with receipts.

See: `HIST_DOMAIN_REGISTRY.json`, `docs/architecture/HIST_LEGACY_SYSTEM_REGISTRY.md` §2E
