<!-- SYNOPSIS: TSOS Platform Kernel — Architecture Index -->

# TSOS Platform Kernel — Architecture Index

| Field | Value |
|-------|--------|
| **Status** | **Phase 0 IMPLEMENTED on disk — deploy proof BLOCKED until Railway redeploy** |
| **Authority** | Subordinate to `docs/constitution/NORTH_STAR_SSOT.md`; does **not** amend North Star |
| **Last Updated** | 2026-05-24 |
| **Operating prompt** | `prompts/00-RESIDENT-ARCHITECT.md` |
| **Contradiction register** | `docs/architecture/OPEN_CONTRADICTIONS.md` |

---

## 1. Definition

The **TSOS Platform Kernel** is the single privileged execution layer for production-valid AI-mediated work on TokenSaverOS (TSOS).

It is **not** an HTTP router. It is the **syscall surface** that:

- authorizes execution (authority + policy)
- preserves meaning (plain English + future CCL)
- delegates to drivers (council, builder, OIL)
- enforces mandatory receipts (token, build, OIL, exceptions)
- updates memory selectively (performance, violations, lessons)

**Core invariant:** No production-valid AI/build/review path without ledger proof or explicit unmetered-exception receipt.

**Target API name:** `kernelExecute()` (preferred over `constitutionalExecute()` — constitutional rules are **invariants inside** the kernel, not the whole architecture label).

---

## 2. Why “Constitutional Router” is too small

| “Router” implies | Kernel actually requires |
|------------------|-------------------------|
| Dispatch by URL or model | **Authorize** before execute |
| Pass-through middleware | **Fail-closed** policy + receipts |
| One dimension (routing) | Accounting + OIL + build + memory + authority |
| Optional observability | **Invalid without proof** (“did not happen”) |

**KNOW:** Audits found no single choke point today. Choke **candidates:** `callCouncilMember` (`services/council-service.js`), `buildAndCommit` (`routes/lifeos-council-builder-routes.js`).

**THINK:** “Constitutional Router” is a useful **Phase 0 nickname** for the enforcement wrapper; the durable concept is **Platform Kernel**.

---

## 3. Why “LifeOS Kernel” confuses product vs platform

| Term | Meaning in this repo | Label |
|------|----------------------|-------|
| **LifeOS** | Consumer product — “operating system for a human life” (Am 21) | **KNOW** |
| **BuilderOS** | Internal autonomous programming machine (Blueprint §0) | **KNOW** |
| **TSOS / TokenSaverOS** | Platform — builder, council, ledgers, routing | **KNOW** |
| **LifeOS Kernel** | Sounds like consumer product core | **THINK** — **avoid** without qualifier |
| **TSOS Platform Kernel** | Platform execution governance | **THINK** — **preferred name** |

`docs/products/builderos/PRODUCT_HOME.md`: *“BuilderOS is not LifeOS… LifeOS is a product built by BuilderOS.”*

The kernel governs **platform execution**; LifeOS apps **invoke** it.

---

## 4. Relationship to sibling systems

| System | Amendment | Role relative to kernel |
|--------|-----------|-------------------------|
| **Token Accounting OS** | 44 | **Kernel accounting driver** — meter, budget, OCL, unified view, unmetered exceptions |
| **CCL** | 45 | **Kernel meaning transport** (future) — semantic capsules M2M; Phase 0 paper only |
| **BuilderOS Control Plane** | 46 | **Kernel process-control driver** — build ledger, health, `canMarkBuildDone` |
| **OIL** | 40, 19 | **Kernel verification driver** — `security_receipts`, runtime truth |
| **Memory Intelligence** | 39 | **Kernel memory driver** — facts, performance, violations; lessons subordinate |
| **AI Council** | 01 | **Execution driver** — models; must be wrapped, not bypassed |
| **BuilderOS** | 19, Blueprint | **Build driver** — `/build`, governed loop; kernel wraps `buildAndCommit` |
| **Decision Ledger** | 46 §4.4 (planned) | **Kernel authority driver** — **MISSING** today |

### Am 44 vs Am 46 tension

- Am 44: Token layer = “supreme **accounting** layer” for model usage.
- Am 46: Control plane = “supreme **measurement/control** plane” aggregating ledgers.

**THINK:** Both are kernel **drivers**. The kernel **orchestrates** them; neither amendment alone is the full OS kernel. See `OPEN_CONTRADICTIONS.md`.

---

## 5. Kernel execution pipeline

```text
[1] AUTHORITY     — Decision ledger / pending_adam / controlling SSOT ref  (MISSING unified)
[2] MEANING       — Plain English canonical + CCL attach (Am 45, future)
[3] POLICY        — Budget, health, TOKEN_ACCOUNTING_STRICT (Am 44)
[4] ROUTE HINT    — Model/task-class selection (record only)
[5] EXECUTE       — callCouncilMember | buildAndCommit | governed review
[6] ACCOUNT       — token_usage_log | ai_unmetered_exceptions (Am 44)
[7] VERIFY        — OIL / security_receipts (Am 40)
[8] RECORD        — build_task_ledger | builder_task_receipts (Am 46)
[9] MEMORY        — performance, violations, lessons (Am 39, selective)
[10] RETURN       — { result, receipts, proof_status, coverage }
```

### Human → Meaning → Execution → Receipt → Memory

```text
Human intent (Adam, SSOT, gate-change, pending_adam)
    → Meaning (plain English authoritative; CCL optional future)
    → kernelExecute authorize + policy
    → Execution (council / builder drivers)
    → Receipt (token + OIL + build ledgers)
    → Memory (performance / lessons / violations)
    → Human (continuity, handoff, next mission)
```

---

## 6. Kernel services

| Service | Status | Primary repo anchor |
|---------|--------|---------------------|
| **Token Accounting** | PARTIAL — council metered on disk | `services/token-accounting-service.js`, `services/savings-ledger.js` |
| **OIL / verification** | PARTIAL — not on all paths | `services/oil-security-receipts.js` |
| **Memory Intelligence** | PARTIAL — builder/gate-change biased | `services/memory-intelligence-service.js` |
| **BuilderOS Control Plane** | IN_BUILD — DONE gate not wired to `/build` | `services/builderos-control-plane-service.js` |
| **CCL** | BLOCKED — Am 45 Phase 0 | placeholder cols on `token_usage_log` |
| **Decision Ledger** | MISSING — Am 46 Phase 3 target | `pending_adam`, SSOT receipts scattered |
| **Routing / model selection** | PARTIAL — recorded in some paths | `services/builderos-tsos-routing.js`, council config |
| **Lessons / failure patterns** | PARTIAL — mostly manual API | `lessons_learned`, `recordLesson()` |

---

## 7. What is NOT a kernel service

| Layer | Why user-space / product |
|-------|--------------------------|
| LifeOS product routes (chat, family, finance, …) | Applications invoking platform |
| TokenOS B2B proxy | Product on platform (Am 10) |
| MarketingOS, TC, site-builder | Product lanes |
| SSOT markdown amendments | Constitution — kernel enforces, does not replace |
| Railway / Neon / GitHub | Host drivers |
| `src/services/architect-reviewer.js` | PR stub — **not** Resident Architect (different concern) |
| Enhanced AI usage tracker | NOT MOUNTED — superseded by Am 44 |

---

## 8. Current coverage status (2026-05-24)

Evidence: `docs/SYSTEM_COVERAGE_REPORT.md`, `docs/architecture/OPEN_CONTRADICTIONS.md`.

| Dimension | Estimate | Label |
|-----------|----------|-------|
| Single kernel entry (`kernelExecute`) | 0% | **KNOW** — not implemented |
| Token accounting (HTTP AI via council) | Partial — 7 `recordMetered` paths | **KNOW** |
| Token ledger freshness | Stale — 52 rows, last 2026-03-22, 0 / 24h | **KNOW** (Neon verify script) |
| Build ledger enforcement | `canMarkBuildDone` exists; `/build` unwired | **KNOW** |
| OIL on all execution paths | ~25–30% (audit estimate) | **THINK** |
| Memory auto-capture from builder | Low | **THINK** |
| CCL production | 0% | **KNOW** |
| Decision Ledger | 0% unified | **KNOW** |
| Deployed APIs `/api/v1/tokens/*`, `/api/v1/builderos/control-plane/*` | 404 until deploy | **KNOW** (audit) |

**Verdict:** Platform is **pre-kernel** — kernel-shaped drivers exist without a syscall layer.

---

## 9. Next implementation candidate (Conductor Mode — not this doc)

Ordered minimum path toward Phase 0 kernel:

1. **Fix OCL boot bug** — add missing import for `createOperatorConsumptionLedgerRoutes` in `startup/register-runtime-routes.js` (**KNOW** — called line 334, not imported lines 1–81).
2. **Deploy + apply migrations** — `20260531`, `20260532`, `20260601` on Neon.
3. **Phase 0 `kernelExecute`** — new `services/lifeos-kernel.js` (or `tsos-kernel.js`):
   - wrap `callCouncilMember` at `server.js` injection point
   - wrap `buildAndCommit` in builder routes
   - token verify + budget for `kind: 'ai'` only in v0
4. **Wire** `canMarkBuildDone` + control plane start/complete on `/build`.
5. **Phase 2** — eliminate `services/builder-council-review.js` direct provider fetch bypass.

Architect Mode **documents** this sequence; Conductor Mode **implements** after Adam directs.

---

## 10. Approval gate

This document becomes **durable architecture index** when Adam approves. Until then:

- Do **not** create Amendment 47 “Kernel” from this file alone.
- Do **not** claim kernel is shipped.
- Update `OPEN_CONTRADICTIONS.md` when repo evidence changes.

---

## Change history

| Date | Change |
|------|--------|
| 2026-05-24 | v1 DRAFT — kernel definition, pipeline, service map, coverage, next implementation candidate |
