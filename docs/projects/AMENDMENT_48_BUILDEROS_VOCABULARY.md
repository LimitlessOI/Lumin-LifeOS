# AMENDMENT 48 — BuilderOS Vocabulary (Language Law)

| Field | Value |
|---|---|
| **Lifecycle** | `constitutional-adjunct` |
| **Reversibility** | `two-way-door` |
| **Stability** | `safe` |
| **Last Updated** | 2026-05-24 (**Claude live SENTRY L1–L12 fixes — immutable gate, validators, rate limit**) |
| **Verification Command** | `rg -l "C2\\|AIC\\|PSSOT\\|Lens" docs/ --glob '*.md' \| head -20` (deprecation audit) |
| **Canonical body** | **`docs/BUILDEROS_VOCABULARY.md`** |
| **Governance body** | **`docs/architecture/DELIBERATION_ARCHITECTURE.md`** |

---

## Mission

One official meaning for every core BuilderOS / Lumin term so language drift does not become architecture drift; plus **separation-of-powers governance** for deliberation and build.

---

## Scope

**In scope:**
- Vocabulary v2.7: seven depts (ChC, Hist, SNT, **CFO**, BPB, SDO, **CDR**), **REP** capsules, authority vs REP stacks, Coder tier vs CDR dept, TSOS as CFO subsystem
- Separation of powers; mandatory dept cases; BPB/CDR session law; lean Cncl; composition scorecard; Founder Debrief template
- Consensus protocol extensions: multi-horizon future-back, competitive scan, synthesis E/K, brainstorm linkage
- Deprecated: C2, AIC, PSSOT, Mission (factory), Lens, TSOS-as-dept

**Out of scope:**
- TSOS machine-channel token grammar (`docs/TSOS_SYSTEM_LANGUAGE.md`)
- Founder Debrief auto-generation UI (template only — job not built)

**Out of scope (deferred):**
- REP catalog registry overlay UI
- Founder Debrief delivery to FM/Lumin chat overlay

---

## Authority rule

**`docs/BUILDEROS_VOCABULARY.md` wins for terminology** over older docs when terms conflict, except where `SSOT_NORTH_STAR.md` explicitly defines the term.

**`docs/architecture/DELIBERATION_ARCHITECTURE.md` wins for deliberation/governance mechanics** unless North Star conflicts.

---

## Change Receipts

| Date | Change | Why |
|------|--------|-----|
| 2026-06-09 | Created Amendment 48 + `docs/BUILDEROS_VOCABULARY.md` | Founder: canonize vocabulary; stop jargon drift |
| 2026-06-09 | **v2 SEAL** — C2/AIC/FM/ChC/Cncl/Objective; six depts; deliberation loop | Founder consensus |
| 2026-06-09 | **v2.1–v2.4** — LSSOT; SDO; partial Cncl; ChC 6th dept | Founder clarifications |
| 2026-06-09 | **v2.5–v2.6** — model roster; DELIBERATION_ARCHITECTURE (dept/product/lens); Position E; C2 deprecated | Architecture clarification |
| 2026-06-09 | **v2.7 SEAL** — full governance package | Founder final consensus session |
| 2026-06-09 | **`docs/BUILDEROS_VOCABULARY.md` v2.7** — seven depts; CFO/CDR; REP; separation of powers; sealed-for-build; Hist mandatory case; CFO stewardship; BPB/CDR session law | Founder: document entire session |
| 2026-06-09 | **`docs/architecture/DELIBERATION_ARCHITECTURE.md`** — rewritten: authority/REP/model; judgment chain; lean default; scoring; org evolution | Same |
| 2026-06-09 | **`docs/architecture/FOUNDER_VOCABULARY_CONSENSUS_REPORT.md` v2.7** — complete shareable report (GPT parity + governance) | Founder: single handoff doc |
| 2026-06-09 | **`docs/architecture/FOUNDER_DEBRIEF_TEMPLATE.md`** — Layer 1 synopsis + Layer 2 pack | Founder offline debrief |
| 2026-06-09 | Morning archaeology unchanged — cross-linked: MEMORY/TRUTH/PERSONAL architecture + EVIDENCE_VAULT | Prior session deliverables |
| 2026-06-09 | **BUILD v2.7** — `db/migrations/20260609_deliberation_governance_v27.sql` | Seven tables: roster, consensus, scorecard, hist, cfo, evidence_vault, gate |
| 2026-06-09 | **BUILD** — `config/deliberation-governance.js`, `services/deliberation-governance-service.js`, `routes/deliberation-governance-routes.js` | API `/api/v1/lifeos/deliberation/*` |
| 2026-06-09 | **BUILD** — gate-change synthesis round + deliberation auto-persist | Council v4 + Hist/CFO on run-preset |
| 2026-06-09 | **BUILD** — factory deliberation gate + historian persist | BPB intake hook; jsonl ledger |
| 2026-06-09 | **BUILD** — `scripts/verify-deliberation-governance.mjs` | Local validation |
| 2026-06-09 | **A→Z completion** — `db/migrations/20260609b_founder_debrief_rep_catalog.sql` | `founder_debriefs`, `rep_catalog_entries` |
| 2026-06-09 | **A→Z** — `services/founder-debrief-service.js`; pipeline seed/finalize/debrief/reps API routes | Full session bundle + Founder Debrief generator |
| 2026-06-09 | **A→Z** — `scripts/deliberation-a-to-z-smoke.mjs` + `npm run lifeos:deliberation:a-to-z-smoke` | Factory + optional Railway API smoke |
| 2026-06-09 | **A→Z** — `services/builder-deliberation-hook.js` + `/build` wire in `lifeos-council-builder-routes.js` | Seed before codegen; finalize + debrief after commit |
| 2026-06-09 | **A→Z** — `bootDeliberationRepCatalog` in `startup/boot-domains.js` | REP catalog sync on boot (idempotent) |
| 2026-06-09 | **Factory loop** — `builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/` FP+BP+acceptance+SENTRY | Reverse-BP formalization; 18 tests pass; SENTRY WIRED |
| 2026-06-09 | **SENTRY aspect loop** — 14 aspects (`A01`–`A14`), 54 acceptance tests, `npm run factory:deliberation-v27:sentry-loop` | Per-aspect FP→BP→verify; `SENTRY_SESSION_PASS` |
| 2026-06-10 | **SENTRY audit fixes (Claude Code)** — `getGateStatus(session_id, { load_bearing })`; `passDeliberationGate` honors payload load_bearing; builder seed **fail-closed** on exception; `no_pool` returns fail not skip; `MISSION_QUEUE` → `wired_uncommitted`; `HANDOFF.md` v2.7 block | P0/P1 from qualitative SENTRY — honest status until commit+deploy |
| 2026-06-10 | **Codex SENTRY behavioral fixes** — `validateConsensusSession()` (non-empty synthesis/participants/votes/horizons); load-bearing gate validates consensus **substance** not row count; `finalizePipeline` no debrief on gate fail; factory `validateDeliberationGate({ load_bearing })`; `scripts/deliberation-governance-behavior.mjs` + AT-BEH-1..4 (22 acceptance tests) | Fail-closed law was breakable with `{}` consensus and debrief-on-fail |
| 2026-06-10 | **Codex adversarial probe fixes** — BPB+CDR session law (require focus + distinct ids); `clampQueryLimit`; whitespace `case_text`; `skip_intake_gate` env-gated; factory consensus validation; `force_reseed`; `run-mission` missing import + blueprint sort try/catch; behavior suite **17 assertions**, acceptance **24/24** | Adversarial SENTRY found exploitable paths tests did not cover |
| 2026-05-24 | **Claude live SENTRY L1–L12 (GAP-FILL)** — `validateHistCase` min 20 chars + trim; `validateCfoReceipt` role min 3; `validateEvidenceVaultEntry` allowlist + path traversal block; `VALID_REP_CATALOG` enforced; roster size caps (20 reps / 10 models / 7 authorities); `passDeliberationGate` immutable PASS + corrupt PASS revocation + `passed_at` COALESCE; ghost debrief guard (404 on empty session); `respondDeliberationError` PG 23505→409; deliberation rate limit 60/min; boot REP sync warn + 2s retry; `scripts/deliberation-sentry-probe-cleanup.mjs`; behavior suite **22/22 PASS** | Live Neon probe found whitespace hist PASS, corrupt load-bearing PASS, ghost debriefs, XSS evidence, constraint leak, no throttle |

---

## Agent Handoff Notes

**Current state:** **v2.7 SENTRY fixes committed — pending Railway deploy proof.** Mission `FACTORY-DELIBERATION-V27-0001`: **`deployed_pending_sentry_proven`** until live re-probe + cleanup; behavior **22/22 PASS** locally.

**Next priority:**
1. **Deploy Railway** — `npm run system:railway:redeploy` (build-from-latest) until `deploy_commit_sha` matches HEAD
2. **Neon cleanup** — `node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs --confirm`
3. **Live smoke** — `npm run lifeos:deliberation:a-to-z-smoke`; Codex pass 3 with dedupe list (L1–L12 already fixed)
4. REP catalog registry UI; Founder Debrief push to FM/Lumin

**Legacy code:** Many files still say TSOS dept or six depts — read v2.7 vocabulary; rename on touch with receipt.

**⚠️ INCOMPLETE:** Live SENTRY re-probe after deploy; REP catalog UI; Founder Debrief auto-delivery.
