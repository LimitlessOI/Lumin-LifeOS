<!-- SYNOPSIS: Phase 1 requirements-to-reality traceability for the Taloa architecture (2026-08-03). Audit deliverable. -->

# Constitutional Requirements Traceability (Phase 1) — 2026-08-03

Each row translates a constitutional promise into a behavioral requirement and records the observed installed-state. Legend: **PROSE** (documented only), **LIB** (library exists, runtime=0), **WIRED** (real runtime call site), **LOOP** (measurable calibration loop).

| Req | Intended behavior | Layer | Expected owner | Required runtime path | Installed state | Finding |
|---|---|---|---|---|---|---|
| R-01 | Constitution changes only via Article VII ratification | Governance | ratification gate | pre-commit + all ship paths | **PARTIAL** (local hook only; machine path open) | F-01,F-02 |
| R-02 | Single canonical framework document | Governance | NORTH_STAR_SSOT + framework | doc authority | **BROKEN** (fork) | F-13 |
| R-03 | Reality Alignment adjudicates claims vs reality | Learning | reality-alignment.js | decision path | **LIB** (runtime=0) | F-03 |
| R-04 | Confidence Vectors carry evidence provenance + calibration | Learning | confidence-vectors.js | claim path | **LIB** (runtime=0); duplicated | F-03,F-09 |
| R-05 | Human/Institutional Constellation = reusable weighted-edge framework | Learning | *-constellation.js | belief/office path | **LIB** (in-memory factory, runtime=0) | F-03,F-10 |
| R-06 | Causality Engine links actions→outcomes | Learning | causality-engine.js | outcome path | **LIB** (runtime=0) | F-03 |
| R-07 | Readiness Engine gauges readiness for guidance | Learning/Safety | readiness-engine.js | coaching path | **LIB** (runtime=0) | F-03 |
| R-08 | Calibration Ledger durably records prediction→outcome | Learning | calibration-ledger.js | decision→outcome | **LIB, NO LOOP** (in-memory Map) | F-04 |
| R-09 | Office Trust Ledger accrues/decays trust from outcomes | Governance | office-trust-ledger.js | office decisions | **LIB, NO LOOP** | F-05 |
| R-10 | Chair–Solomon separation; withheld independent recommendation | Governance | solomon-withheld-recommendation.js | live council decision | **LIB** (correct logic, runtime=0) | F-06 |
| R-11 | Coaching = earned, progressive, demonstrate-understanding-first | Product | lifeos-coaching-protocol.js / coaching-conversation-monitor.js | chat runtime | **PARTIAL** (coaching-monitor imported by lifeos-core-routes; protocol runtime=0) | F-03 |
| R-12 | Safety: early-risk trajectory + least-invasive intervention | Safety | readiness/coaching | risk path | **PROSE/LIB** (no trajectory model verified) | F-03 |
| R-13 | Constitutional observability: which principle governed this action | Observability | PRINCIPLE_RUNTIME_MAP + logs | runtime logging | **PROSE** (map checks doc text) | F-07 |
| R-14 | Entity Twin Framework generalized across instances | Learning | (none) | twin instantiation | **NOT GENERALIZED** (bespoke per-domain twins) | F-10 |
| R-15 | Communication law: translation not formula, twin-matched, no execution lies | Product/Runtime | lumin-communication-guard.js | every Chair/agent reply | **WIRED** (enforceCommunicationLaw on live path; 7/7 verify) | (success) |
| R-16 | Reality is final authority (deployed behavior matches claims) | Runtime | deploy path | production | **NOT MET** (Taloa routes 404) | F-11 |

**Summary:** 1 of 16 core requirements (R-15, the pre-existing communication law) is genuinely WIRED. The rest are PROSE or LIB. No requirement achieves LOOP. The single WIRED requirement predates Taloa and was built earlier.
