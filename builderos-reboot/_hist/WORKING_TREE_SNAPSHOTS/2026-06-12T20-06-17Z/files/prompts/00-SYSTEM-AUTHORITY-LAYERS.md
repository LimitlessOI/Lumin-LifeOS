<!-- SYNOPSIS: System authority layers — read before choosing where to edit -->

# System authority layers — read before choosing where to edit

**Purpose:** One definition of repo truth layers so cold agents do not extend the wrong system.

**Read order:** **`prompts/00-HIST-LEGACY-BOUNDARY.md` first** (STOP — legacy vs active). Then this file → path `AGENTS.md` for the tree you are touching → domain prompt in `prompts/` if applicable.

**Legacy / Hist (2026-05-24):** All legacy repos, deploy surfaces, and experiment buckets are **Hist-owned**. The prompt above is mandatory; this registry is the full map. **Do not extend legacy** as the default path.

---

## Four layers (only one is “factory canonical”)

| Layer | Paths | Label | Role |
|-------|-------|-------|------|
| **Doctrine** | `docs/architecture/factory-v1-blueprint-pack/` | Doctrine only / not runtime authority | Law and phase spec. **Docs alone earn zero runtime maturity.** |
| **Machine** | `builderos-reboot/` | Machine layer / mission-pack authority | Sha256-pinned `BLUEPRINT.json`, acceptance, proofs. **Product work queue:** `BP_PRIORITY.json` only — not `MISSION_QUEUE.json`. |
| **Factory runtime** | `factory-staging/` | **Canonical factory runtime** | Governed execute-step hot path (BPB → Builder → SENTRY → TSOS → Historian). **Default target for new factory work.** |
| **Production spine** | `routes/`, `services/`, `startup/`, `server.js` | **Legacy production spine** | Live LifeOS on Railway today. Real, callable, often valuable — **not** factory authority. ADAPT via mission or documented GAP-FILL only. |

**Cutover bundle (future):** `lumin-factory/` — standalone export; not the main repo runtime.

---

## Default routing (when Adam did not name a path)

| Task | Go here |
|------|---------|
| New factory feature, gate, or execute-step behavior | `factory-staging/` + mission pack under `builderos-reboot/MISSIONS/` |
| Mission step, hash pin, acceptance test | `builderos-reboot/` |
| **What product BP to build next (rank order)** | **`builderos-reboot/BP_PRIORITY.json`** |
| Blueprint / phase law | `docs/architecture/factory-v1-blueprint-pack/` |
| LifeOS product on Railway (builder `/build`, deploy, env, CRM, etc.) | Production spine — **do not** silently port to `factory-staging/` |
| “Which system is correct?” | **Factory work** → `factory-staging/`. **Live product** → production spine until explicit cutover receipt. |

---

## Path-level prompts (always read the boundary you are in)

| Path | File |
|------|------|
| Machine layer | `builderos-reboot/AGENTS.md` |
| Factory runtime | `factory-staging/AGENTS.md` |
| Production routes | `routes/AGENTS.md` |
| Production services | `services/AGENTS.md` |
| Doctrine | `docs/architecture/factory-v1-blueprint-pack/AGENTS.md` |

Cursor glob rules under `.cursor/rules/` reinforce these boundaries when matching files are open.

---

## File tags (high-risk files only)

Some hot paths carry a one-line JSDoc tag:

```js
/** @authority Legacy production spine — see routes/AGENTS.md */
/** @authority Canonical factory runtime — see factory-staging/AGENTS.md */
```

Tags are reminders, not proof. Maturity still requires receipts and `npm run factory:ci` (factory) or runtime verifiers (production).

---

## What not to do

- Do not treat `docs/projects/AMENDMENT_*.md` as factory execute authority.
- Do not treat production `/api/v1/lifeos/builder/build` as the same system as `POST /factory/execute-step` without an explicit ADAPT/cutover mission.
- Do not delete legacy code to “clean up” — classify, quarantine, or ADAPT with receipts.
- Do not hand-author production spine changes as the default factory path (see `CLAUDE.md` §2.11 builder-first).

---

## Related docs

- `docs/architecture/HIST_LEGACY_SYSTEM_REGISTRY.md` — **Hist-owned legacy repos/trees + where to go instead**
- `docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md` — rebuild map
- `prompts/00-PROVIDER-STRATEGY-LOCK.md` — locked provider tiers (Decision A)
- `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md` — today's routing truth
- `builderos-reboot/HANDOFF.md` — operator one-liner + CI
- `docs/architecture/BUILDEROS_CLASSIFICATION_LOCK.md` — locked paths within production spine
- `prompts/00-LIFEOS-AGENT-CONTRACT.md` — epistemic contract (read first for all sessions)
