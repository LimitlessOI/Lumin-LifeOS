<!-- SYNOPSIS: Phase 2/5 runtime reachability map for Taloa engines (2026-08-03). Audit deliverable. -->

# Runtime Reachability Map (Phase 2) — 2026-08-03

**Method:** for each service, `grep -rl "services/<name>.js"` across runtime dirs (`routes/ startup/ config/ core/ middleware/ server.js`) vs `tests/ scripts/`. "runtime importers" = files on a real request/boot/scheduler path that import the module. Reproduced by `tests/audit-taloa-runtime-reachability.test.mjs`.

## Core Taloa engines — ALL runtime=0

| Engine | Runtime importers | Referenced only by | Classification |
|---|---|---|---|
| reality-alignment.js | **0** | fcla-engines-smoke, phase1-phase2-engines-smoke, 3 verify scripts | DEAD-TO-RUNTIME |
| confidence-vectors.js | **0** | phase1-phase2-engines-smoke, build script, observability verify, orphan-checker | DEAD-TO-RUNTIME |
| confidence-vector.js | **0** | (near-duplicate of above) | DEAD + DUPLICATE (F-09) |
| human-constellation.js | **0** | fcla/phase1-phase2 smoke, 2 verify scripts | DEAD-TO-RUNTIME |
| institutional-constellation.js | **0** | institutional-constellation-smoke, build script, observability verify | DEAD-TO-RUNTIME |
| causality-engine.js | **0** | fcla/phase1-phase2 smoke, acceptance verify | DEAD-TO-RUNTIME |
| readiness-engine.js | **0** | fcla/phase1-phase2 smoke, build+2 verify | DEAD-TO-RUNTIME |
| calibration-ledger.js | **0** | fcla/phase1-phase2 smoke, 2 verify | DEAD + IN-MEMORY (F-04) |
| office-trust-ledger.js | **0** | fcla/phase1-phase2 smoke, acceptance verify | DEAD + IN-MEMORY (F-05) |
| chair-solomon-calibration.js | **0** | phase2-safety-wisdom smoke, build script | DEAD-TO-RUNTIME |
| solomon-wisdom-lab.js | **0** | fcla/phase1-phase2 smoke, acceptance verify | DEAD-TO-RUNTIME |
| solomon-withheld-recommendation.js | **0** | phase2-safety-wisdom smoke, build script | DEAD (logic correct) F-06 |

## Services that ARE runtime-reachable (for contrast / fairness)

| Service | Runtime call site | Note |
|---|---|---|
| lumin-communication-guard.js (`enforceCommunicationLaw`) | chair-personality-translate.js:~153, chair-direct-agent.js → routes | **WIRED** — the pre-existing communication law; behavior-tested 7/7 |
| founder-communication-calibration.js | lumin-context-loader.js → 3 routes | Just wired in commit 8b1890fbc (this session) after being orphaned since 2026-08-02 |
| coaching-conversation-monitor.js | routes/lifeos-core-routes.js | Imported; depth of behavior not fully audited |
| cognitive-core-calibrate.js | routes/cognitive-core-routes.js | Imported |
| confidence-architecture.js (+route) | startup/register-runtime-routes.js → /api/v1/confidence-architecture | **NAME COLLISION**: a LifeOS child/wellness feature (child_id/win_description), NOT the Taloa confidence-vector engine (F-09) |

## Interpretation
The Taloa "learning architecture" is a shelf of libraries. Every core engine is imported only by the smoke test written alongside it, the build script that generated it, and the verifier that green-lights its existence. No route, boot step, scheduler, or the composition root (`server.js`) touches any of them. The contrast with `enforceCommunicationLaw` — an older law that IS on the live path — shows the difference between *installed* and *authored*.
