<!-- SYNOPSIS: Platform Gap Register -->

# Platform Gap Register

| Field | Value |
|-------|--------|
| **Purpose** | Ranked backlog of architectural gaps — kernel / accounting / control plane / governance |
| **Authority** | Audit tier — subordinate to SSOT |
| **Last Updated** | 2026-05-31 — C2 end-to-end proof: GAP-003/005/013 RESOLVED |
| **Maintainer** | Resident Architect gap hunts (`prompts/00-RESIDENT-ARCHITECT.md`) |
| **Coverage scores** | `docs/architecture/PLATFORM_COVERAGE_MAP.md` |
| **Verify** | `npm run platform:coverage` |

**Legend:** P0 = trust/accounting break · P1 = high leverage · P2 = medium · P3 = research

---

## Ranked gaps (top 25)

| Rank | ID | Gap | Priority | Group | Label |
|------|-----|-----|----------|-------|-------|
| 1 | GAP-001 | `builder-council-review.js` — 8 direct provider fetches bypass kernel + token ledger | P0 | 1-day | **KNOW** |
| 2 | GAP-002 | No unified **Decision Ledger** — kernel authority stub only | P0 | foundational | **KNOW** |
| 3 | GAP-003 | **Live build receipt** — C2 job `da7e9c4d` + `1cf7aa3f` both committed; `oil.verified: true`, `token.verified: true`, `build_task_ledger` rows created | P0 | 1-day | **RESOLVED 2026-05-31** |
| 4 | GAP-004 | **TOKEN_ACCOUNTING_STRICT** never proven fail-closed on deploy | P0 | 1-day | **UNVERIFIED** |
| 5 | GAP-005 | **Zero token rows / 24h** — 52 total rows, 18 today (2026-05-31); last write `06:59:26 UTC` | P1 | 1-day | **RESOLVED 2026-05-31** |
| 6 | GAP-006 | `metered-ai-call.js` exists but **not wired** into any bypass path | P1 | 1-day | **KNOW** |
| 7 | GAP-007 | **OCL unused** — table exists, 0 rows; no operator ingest habit or automation | P1 | 1-week | **KNOW** |
| 8 | GAP-008 | **CI / scheduler AI** paths may bypass useful-work-guard (audit incomplete) | P1 | 1-week | **THINK** |
| 9 | GAP-009 | **TCO routes** direct OpenAI/Anthropic fetch (3 hits) — product bypass | P1 | 1-week | **KNOW** |
| 10 | GAP-010 | **premium-api.js** adapter bypasses council/kernel | P1 | 1-week | **KNOW** |
| 11 | GAP-011 | **Scripts** (builder-daemon, build-task, memory-import) unmetered offline AI | P2 | 1-week | **KNOW** |
| 12 | GAP-012 | **Kernel coverage ~70%** — server-internal paths (ciMonitor, autoBuilder) use wrapped council but scripts don't | P1 | 1-week | **THINK** |
| 13 | GAP-013 | **OIL async race** — RESOLVED: (1) `await writeSecurityReceipt` in builder route; (2) `verifyOilReceipt` now queries `payload->'details'->>'task_id'` path. Proof: C2 job `1cf7aa3f` → `oil.verified: true, id: e72fce8a` | P1 | 1-day | **RESOLVED 2026-05-31** |
| 14 | GAP-014 | No **platform coverage score** in control plane API (only health RED/YELLOW) | P1 | 1-day | **KNOW** → addressing |
| 15 | GAP-015 | No **trust coverage map** (OIL + build + token joint view) | P1 | 1-day | **KNOW** → addressing |
| 16 | GAP-016 | **CCL** hook placeholder only — no compiler, no round-trip | P3 | future research | **KNOW** |
| 17 | GAP-017 | **Founder decision chain** missing — SSOT receipts not queryable as ledger | P0 | foundational | **KNOW** |
| 18 | GAP-018 | **Contradiction resolution system** manual only — no automated OC closure verifier | P2 | 1-week | **KNOW** |
| 19 | GAP-019 | **Model governance score** — model-performance exists but not joined to token/build ledger | P2 | 1-week | **KNOW** |
| 20 | GAP-020 | `routes/tsos-task-ledger-routes.js` orphaned — drift vs `build_task_ledger` | P2 | 1-day | **KNOW** |
| 21 | GAP-021 | **Am 44 vs Am 46 supremacy** text unresolved in amendments (kernel orchestrates — doc only) | P2 | 1-day | **THINK** |
| 22 | GAP-022 | **Memory lessons** not auto-captured from builder failures/successes | P2 | 1-week | **THINK** |
| 23 | GAP-023 | **Governed loop** health preflight optional — not default wired to control plane fetch | P2 | 1-day | **KNOW** |
| 24 | GAP-024 | **token_optimizer_daily** table absent on Neon — unified view omits rollup arm | P2 | 1-week | **KNOW** |
| 25 | GAP-025 | No **architectural health score** composite for Adam-facing dashboard | P2 | foundational | **KNOW** → partial |

---

## Grouped backlog

### 1-day fixes (execute first)

| ID | Gap | Next action |
|----|-----|-------------|
| GAP-001 | builder-council-review bypass | Inject `callCouncilMember` wrapper; deprecate direct fetch helpers |
| GAP-003 | Live build receipt proof | Supervised `/build` dry spec + verify `build_task_ledger` + `kernel_receipts` |
| GAP-004 | Strict mode proof | Staging `TOKEN_ACCOUNTING_STRICT=true` + expect 409 on missing receipt |
| GAP-005 | Token traffic | One metered council call via API + confirm row in last 24h |
| GAP-006 | metered-ai-call unwired | Wire into bypass adapter layer |
| GAP-013 | OIL race | Await `writeSecurityReceipt` before `recordBuildComplete` or retry gate |
| GAP-014 | Platform coverage score | `npm run platform:coverage` + control plane summary field |
| GAP-020 | Orphan task ledger routes | Mount or delete with receipt |
| GAP-023 | Governed loop health | Default `fetchControlPlaneHealth` in executor |

### 1-week projects

| ID | Gap |
|----|-----|
| GAP-007 | OCL operator workflow + Cursor ingest automation |
| GAP-008 | Scheduled AI useful-work-guard audit + fixes |
| GAP-009 | TCO → council/kernel proxy |
| GAP-010 | premium-api → metered path |
| GAP-011 | Script bypass policy (forbid vs exception receipt) |
| GAP-012 | Kernel wrap for offline scripts where feasible |
| GAP-018 | OC auto-verifier script |
| GAP-019 | Model governance join view |
| GAP-022 | Builder → memory lessons post-hook |
| GAP-024 | token_optimizer_daily migration or remove from view spec |

### Foundational systems

| ID | Gap |
|----|-----|
| GAP-002 | Decision Ledger (`founder_decision_ledger` + kernel authority driver) |
| GAP-017 | Founder decision chain query API |
| GAP-025 | Architectural health composite (coverage + contradictions + bypass P0 count) |

### Future research

| ID | Gap |
|----|-----|
| GAP-016 | CCL codec + multi-model round-trip (Am 45) |

---

## Top 3 executed this hunt (2026-05-31)

| # | Gap | Deliverable |
|---|-----|-------------|
| 1 | GAP-014 / GAP-015 / GAP-025 | `docs/architecture/PLATFORM_COVERAGE_MAP.md` + `scripts/verify-platform-coverage.mjs` + `npm run platform:coverage` |
| 2 | GAP-018 (partial) | This register + mission law update in `prompts/00-RESIDENT-ARCHITECT.md` |
| 3 | OC-005 stale | `OPEN_CONTRADICTIONS.md` OC-005 → RESOLVED (deploy SHA `240982b809`) |

**Deferred to next Conductor slice:** GAP-001 (builder-council-review refactor — ~1000 LOC, needs injected `callCouncilMember`).

---

## Change history

| Date | Change |
|------|--------|
| 2026-05-31 | v1 — initial 25-gap hunt after Kernel Phase 0 |
| 2026-05-31 | v2 — GAP-003/005/013 RESOLVED via C2 end-to-end proof mission. OIL JSONB path fix + await race fix. |
