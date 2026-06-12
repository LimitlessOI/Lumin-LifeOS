# Hist — Legacy System & Repo Registry

**Status:** `ACTIVE` — operator-locked 2026-05-24 (Adam)  
**Owner department:** **Hist** (Historian) — ledger + mandatory case for all legacy material  
**Mandatory prompt (read before edits):** **`prompts/00-HIST-LEGACY-BOUNDARY.md`** — first-class law, not a README  
**Authority:** Supplements `prompts/00-SYSTEM-AUTHORITY-LAYERS.md`; does not replace North Star  
**Amendment:** `docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md` (Hist dept definition)

---

## Synopsis (read this first)

1. **One GitHub monorepo today:** `Lumin-LifeOS` (see `GITHUB_REPO` on Railway). It contains **both** the old live stack **and** the new factory — they are **not** the same system.
2. **Legacy = production spine + pre-factory experiments.** From **2026-05-24 forward**, legacy repos/trees are **Hist-owned**: read, salvage, cite — **do not extend** without ADAPT mission or documented GAP-FILL.
3. **Where to build now:** `factory-staging/` (runtime) + `builderos-reboot/MISSIONS/` (machine). Live Railway product still runs the **production spine** until cutover receipts.
4. **Deploy host** `robust-magic-production.up.railway.app` = legacy production spine image — not factory authority.
5. **Cutover bundle** `lumin-factory/` = future standalone export — Hist until explicit cutover mission promotes it.

---

## Forward rule (Hist ownership)

| Rule | Meaning |
|------|---------|
| **Hist owns legacy** | All systems in §2 below are historical record. Changes require Hist case text + salvage/ADAPT mission — not casual edits. |
| **No silent extension** | Do not add features, routes, or SSOT law to legacy paths “because it’s faster.” |
| **Salvage path** | Good ideas → `docs/architecture/BUILDEROS_SALVAGE_REGISTRY.md` or mission `SALVAGE_MAP.json` → rebuild in `factory-staging/`. |
| **Mandatory case** | Any agent touching legacy must state: *what legacy artifact, why read, what replaces it, receipt*. |
| **Delete ≠ default** | Quarantine and classify first (`docs/REPO_TRIAGE_NOTES.md`). Hist preserves provenance. |

---

## 1. Active systems (NOT Hist — use these)

| System | Path / host | Role | When to use |
|--------|-------------|------|-------------|
| **Factory runtime (canonical)** | `factory-staging/` | BPB → Builder → SENTRY → TSOS → Hist record on hot path | All **new factory/platform** work |
| **Machine layer** | `builderos-reboot/` | Missions, BLUEPRINT pins, queue, proofs | Mission steps, acceptance, CI |
| **Doctrine** | `docs/architecture/factory-v1-blueprint-pack/` | Phase law, rebuild manifest | Spec / law only — not runtime |
| **Production spine (live)** | `server.js`, `startup/`, `routes/`, `services/`, `public/overlay/` | LifeOS on Railway **today** | Live product, env, deploy, deliberation on spine until cutover |
| **Deliberation (spine parity)** | `routes/deliberation-governance-routes.js`, `services/deliberation-governance-service.js` | v2.7 on legacy deploy | Live ops + SNT verify — factory mirror in `factory-staging/factory-core/deliberation/` |
| **Builder (production)** | `routes/lifeos-council-builder-routes.js` | `POST /api/v1/lifeos/builder/build` on Railway | Operator builds until factory cutover |
| **Provider stack (2026-05-24)** | Groq, Gemini, DeepSeek, Anthropic direct | No OpenRouter, no Together | See `prompts/00-PROVIDER-STRATEGY-LOCK.md` |

**Verify factory:** `npm run factory:ci`  
**Verify production spine:** `npm run tsos:doctor`, `npm run builder:preflight`

---

## 2. Legacy registry (Hist-owned)

### 2A — Git remotes & deploy surfaces

| Hist ID | Name | Era | Was | Use instead now | Hist instructions |
|---------|------|-----|-----|-----------------|-------------------|
| **HIST-REPO-001** | **`Lumin-LifeOS`** (monorepo root) | 2024–present | Everything in one tree | **Factory work** → `factory-staging/` + missions. **Live product** → production spine only. | Monorepo is not “all legacy” — read layer table in `00-SYSTEM-AUTHORITY-LAYERS.md`. |
| **HIST-REPO-002** | **`lumin-factory/`** | 2026 export | Standalone cutover candidate | Promote only via cutover mission; until then treat as **snapshot** | Do not treat as live Railway. `npm run factory:init` regenerates from bundle. |
| **HIST-REPO-003** | **`lumin-factory-bundle/`** | 2026 export | Build artifact for HIST-REPO-002 | Same as cutover bundle | Generated; do not hand-edit. |
| **HIST-DEPLOY-001** | **`robust-magic-production`** (Railway) | 2024–present | Legacy production spine host | Same URLs until cutover; factory staging is **not** this deploy by default | `PUBLIC_BASE_URL` probes this image. Deploy SHA ≠ factory maturity. |

### 2B — Production spine (legacy authority, still live)

| Hist ID | Path pattern | Era | Was | Use instead now | Hist instructions |
|---------|--------------|-----|-----|-----------------|-------------------|
| **HIST-SPINE-001** | `routes/command-center-routes.js`, `public/overlay/command-center.*` | Pre–Command Center V2 | Old admin cockpit | `routes/lifeos-command-center-routes.js`, `public/overlay/lifeos-command-center.html` | **LOCKED legacy** — `BUILDEROS_CLASSIFICATION_LOCK.md` |
| **HIST-SPINE-002** | `routes/lifeos-council-builder-routes.js` (whole file) | 2025–2026 | Primary builder before factory execute-step | **New factory behavior** → `factory-staging/factory-core/builder/` | Still **callable** on Railway — ADAPT, don’t duplicate authority |
| **HIST-SPINE-003** | `routes/memory-routes.js`, `core/memory-system.js` | Pre–2026-05 | Flat file memory | `/api/v1/memory/capsules/*`, `/api/v1/memory/evidence/*` | Legacy alias mount `/api/v1/memory/legacy/*` |
| **HIST-SPINE-004** | `builder-overnight-*` naming, compat JSONL | 2025–2026 | Overnight-only builder branding | `lifeos:builder:queue`, continuous daemon | Names are **Hist compat** — not product identity |
| **HIST-SPINE-005** | `council/enhanced-consensus.js` (consensus v1) | Pre–gate-change | Multi-model consensus | `routes/lifeos-gate-change-routes.js`, deliberation v2.7 | Document which caller still hits v1 before delete |
| **HIST-SPINE-006** | `src/`, root `frontend/`, `apps/`, `workflow-server/` | 2024–2025 | Parallel app attempts | Production overlays under `public/overlay/` | **Not mounted** from spine — Hist archive |
| **HIST-SPINE-007** | Root `migrations/`, `database/` vs `db/migrations/` | Drift era | Multiple migration roots | **`db/migrations/`** only for new schema | Hist — do not add to dead roots |
| **HIST-SPINE-008** | `docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md` (early memory) | 2025 | First memory SSOT | `AMENDMENT_48`, memory authority map | Reference only |

### 2C — In-repo experiment buckets (not separate Git repos — Hist archive)

Not mounted from `server.js` / `register-runtime-routes.js` unless a receipt proves otherwise.

| Hist ID | Top-level bucket | Notes |
|---------|------------------|-------|
| **HIST-BUCKET-001** | `• Lumin-Memory/`, `•	Lumin-Memory/`, `Lumin-Memory/` | Duplicate unicode paths — **Hist only** |
| **HIST-BUCKET-002** | `backups/`, `logs/` (tracked) | Should not be product code |
| **HIST-BUCKET-003** | `my_project/`, `my-project/`, `ar-project/` | Scratch spikes |
| **HIST-BUCKET-004** | `quantum/`, `kafka/`, `k8s/`, `blockchain/`, `chaincode/` | One-file experiments |
| **HIST-BUCKET-005** | `services/health-nexus/`, `services/workflow-automation/`, `services/rapid-prototype/`, `services/code-service/`, `services/automation/` | Nested package.json microservices — **not spine** |
| **HIST-BUCKET-006** | `.claude/worktrees/` | Agent worktrees — **never** production authority |
| **HIST-BUCKET-007** | `docs/THREAD_REALITY/` | Large dump tree — external archive candidate |
| **HIST-BUCKET-008** | `factory-staging/factory-core/canon/services/council-service.js` | Canon **mirror** of legacy council — prefer `services/council-service.js` for live behavior truth |

Full bucket list: `docs/REPO_BUCKET_INDEX.md` + human verdicts `docs/REPO_TRIAGE_NOTES.md`.

### 2D — Retired provider / routing (Hist policy)

| Hist ID | Artifact | Retired | Replacement |
|---------|----------|---------|-------------|
| **HIST-PROV-001** | OpenRouter (`OPENROUTER_API_KEY`, `claude_via_openrouter`) | 2026-05-24 | Direct `ANTHROPIC_API_KEY` → `claude_sonnet` |
| **HIST-PROV-002** | Together AI (`TOGETHER_API_KEY`, `together_free`) | 2026-05-24 | Groq / Gemini / DeepSeek fallbacks |

Remove keys from Railway when convenient; code routing cleanup may be local until deploy.

### 2E — Autopilot / mission-queue plumbing (**Hist domain — Historian owns**)

Adam locked **2026-06-11:** **Blueprints in priority order ARE the queue.** Legacy files belong to **History** — **Historian (Hist) department** owns them: read, salvage, cite — **do not extend** without Hist mandatory case (`§4`).

| Hist ID | Artifact | Was | Use instead now | Hist instructions |
|---------|----------|-----|-----------------|-------------------|
| **HIST-AUTO-001** | `builderos-reboot/MISSION_QUEUE.json` | Factory reboot mission order + old autopilot driver | **`builderos-reboot/BP_PRIORITY.json`** for product work | **HIST_OWNED** — `_authority.domain: Hist` |
| **HIST-AUTO-002** | `builderos-reboot/MISSION_PACK_INDEX.json` | Generated index from MISSION_QUEUE | **`BP_PRIORITY.json`** | **HIST_OWNED** — historical index only |
| **HIST-AUTO-003** | `CURRENT_SLICE.json`, `OVERNIGHT_SCOREBOARD.json`, overnight receipts | Overnight experiment pointers | **`BP_PRIORITY.json`** rank #1 | **HIST_OWNED** — evidence only |
| **HIST-AUTO-004** | `scripts/autopilot*.mjs`, `run-overnight*.mjs`, `mission-recovery-owner.mjs` | Factory autopilot runners | BPB → `BLUEPRINT.json` → execute → acceptance | **HIST_OWNED** — factory recovery scope only |
| **HIST-AUTO-005** | `services/factory-autopilot-scheduler.js` | Cron invoker for factory recovery | Same as HIST-AUTO-004 | **HIST_OWNED** |
| **HIST-AUTO-006** | `scripts/governed-overnight-*.mjs`, `data/governed-autonomy-backlog-state.json` | Overnight backlog churn | **`BP_PRIORITY.json`** | **HIST_OWNED** — sidecar meta required |

**Registry:** `builderos-reboot/HIST_DOMAIN_REGISTRY.json`  
**Canonical product queue (NOT Hist):** `builderos-reboot/BP_PRIORITY.json`  
**Enforcement:** `npm run lifeos:bp-priority:verify` (pre-commit HARD)

**Working-tree snapshots (Hist review queue):** when uncommitted local churn must not block `main`, park copies under `builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/<stamp>/` (`MANIFEST.json` + `files/`). Index: `builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/INDEX.json`. Restore working tree to `HEAD` after archive — **do not** leave dirty trees on operator machines.

---

## 3. Decision tree (agents)

```text
Adam asked for a change?
  ├─ Factory / BuilderOS / mission / execute-step?
  │    └─ YES → factory-staging/ + builderos-reboot/MISSIONS/
  ├─ Live LifeOS on Railway (CRM, overlay, deploy, env)?
  │    └─ YES → production spine (builder-first §2.11)
  ├─ Salvage idea from old code/docs?
  │    └─ YES → Hist case → SALVAGE registry → factory mission
  └─ Touching HIST-BUCKET-* or HIST-SPINE legacy locked paths?
       └─ YES → Hist mandatory case; default HALT unless ADAPT/GAP-FILL receipt
```

---

## 4. Hist mandatory case (template)

When reading or citing legacy material, append to handoff or mission:

```text
HIST_CASE:
  artifact: <Hist ID or path>
  read_reason: <why now>
  replacement: <active system path>
  action: read_only | salvage | gap_fill
  receipt: <command or commit>
```

---

## 5. Related docs

| Doc | Purpose |
|-----|---------|
| `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` | Four layers — factory vs spine |
| `docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md` | Rebuild map + cutover |
| `docs/architecture/BUILDEROS_CLASSIFICATION_LOCK.md` | Locked legacy vs canonical **within** spine |
| `docs/architecture/BUILDEROS_SALVAGE_REGISTRY.md` | Good ideas from bad execution |
| `docs/REPO_DEEP_AUDIT.md` | Archive waves |
| `docs/BUILDEROS_VOCABULARY.md` | Hist dept definition (§ acronyms) |
| `builderos-reboot/HANDOFF.md` | Operator one-liner |

---

## Change log

| Date | Change |
|------|--------|
| 2026-05-24 | Initial registry — Adam: legacy repos/trees → Hist |
| 2026-05-24 | Mandatory entry prompt `prompts/00-HIST-LEGACY-BOUNDARY.md` (QUICK_LAUNCH #2, compact rules header, cold-start) — no README.hist pattern |
| 2026-06-11 | **§2E Autopilot plumbing registry** — Adam: BPs in `BP_PRIORITY.json` ARE the queue; `MISSION_QUEUE.json` and overnight/autopilot files marked LEGACY at file top + `.cursor/rules/` |
| 2026-06-11 | **Hist domain lock** — legacy artifacts `_authority.domain: Hist`, `owner_department: Historian`, `status: HIST_OWNED`; `HIST_DOMAIN_REGISTRY.json`; verifier enforces Hist ownership (22 checks PASS) |
| 2026-06-11 | **`services/bp-priority-sync.js`** — machine law: acceptance PASS syncs `BP_PRIORITY.json`, mission `BLUEPRINT.json`, `FOUNDER_PACKET.json`; `verify-bp-priority-guardrails.mjs` checks receipt alignment (23 checks) |
| 2026-06-11 | **BP law hardwired (no oops)** — `scripts/lib/bp-acceptance-finish.mjs` mandatory choke point; pre-commit `--staged` co-commit gate; `BP_PRIORITY_GUARDRAILS=off` removed; PASS receipts require `bp_sync`; fingerprint + acceptance-script wiring checks; tracked `githooks/commit-msg` |
| 2026-06-12 | **§2.18 orphan PASS enforcement** — `checkOrphanProductPassReceipts()` in `services/bp-priority-sync.js` (repo-wide: any `products/receipts/*.json` with `verdict: PASS` must be in `BP_PRIORITY.json` + carry `bp_sync`); wired to `verify-bp-priority-guardrails.mjs` (26 checks); `system-maturity-check.mjs` CI runs `lifeos:bp-priority:verify`; test `tests/bp-priority-orphan-pass-guard.test.js` |
| 2026-06-12 | **Working-tree snapshot archive** — 99 uncommitted files (autopilot/overnight churn, amendment title bulk edits, runtime `data/` sidecars) parked at `builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/2026-06-12T20-06-17Z/`; index `WORKING_TREE_SNAPSHOTS/INDEX.json`; operator tree restored to `f2555dfeee` |
