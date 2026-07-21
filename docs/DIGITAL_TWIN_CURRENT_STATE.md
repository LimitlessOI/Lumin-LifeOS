<!-- SYNOPSIS: Receipted reality map of the Digital Twin as it exists today. Stops rediscovery; only verified findings are marked verified. -->

# Digital Twin — Current State (receipted reality map)

**Purpose:** turn conversation findings into institutional memory so no one re-runs a broad "find everything called a Twin" search. **Only rows I independently verified this session (2026-07-20) are marked `VERIFIED`.** Rows reported by others but not checked by me are marked `REPORTED — unverified`. Completing/closing the `GAP` rows is the first Integration-Investigator task.

| Component | Verified reality | Evidence | Required action |
|---|---|---|---|
| **Named `digital-twin.js`** | Dead/legacy — not a live canonical object | `docs/history/legacy-src/services/digital-twin.js.txt` only | Do not resurrect; canonical = Cognitive Core + Memory |
| **Cognitive Core (decision model)** | VERIFIED live — 16 services (programs, values, judgment, trust-by-domain, calibration, oracle) | `services/cognitive-core-*.js` (16 files) | Declare as canonical "how the person/org decides" |
| **Memory system (knowledge store)** | VERIFIED live — `memory_capsules` table with `trust_level PROPOSED→CANONICAL` promotion gate + evidence/truth-class fields | `services/memory-capsule.js` (createCapsule/getCapsule, promotion-bypass halt) | Adopt as the fact/hypothesis substrate; reuse its promotion gate |
| **Context Views / perspective ("hats")** | VERIFIED live — multi-wear attention lenses, scarce working memory, suppression contracts | `services/cognitive-core-perspective.js`; `config/judgment-capsule-contracts.js` | Rename formally to **Context View**; keep multi-wear |
| **`capsule` naming collision** | VERIFIED — two meanings: storage unit vs. attention lens | `memory-capsule.js` vs `cognitive-core-perspective.js` | RESOLVED: Context View = projection; `memory_capsules` keeps table name |
| **LifeRE twin cluster** | VERIFIED present (files exist) — store + relationship/motivation/permission/performance twins | `services/lifere-twin-store.js`, `lifere-relationship-twin.js`, `lifere-motivation-twin.js`, `lifere-permission-twin.js`, `lifere-performance-twin.js` | Federate behind one Twin interface (do not fork state) |
| **LifeOS twin** | VERIFIED present (files exist) — simulator + reaction-simulator + auto-ingest (the §2.0H Founder Intent Model) | `services/lifeos-twin-simulator.js`, `lifeos-twin-reaction-simulator.js`, `twin-auto-ingest.js` | Point the first slice's simulator here |
| **Creator persona twin** | VERIFIED present (file exists) | `services/creatorPersonaTwin.js` | Federate under canonical Twin |
| **Founder-centric / demo-thin data** | REPORTED — unverified by me | prior tri-AI audit | GAP: confirm which twin modules hold real vs. demo data |
| **Client-readiness (new external client today)** | GAP — not verified | — | Investigate: tenant/user hard-coding, consent capture, export/delete, shared multi-party twins |
| **Conflict handling (two sources disagree)** | GAP — not verified | — | Investigate: does any store reconcile contradictions or last-write-win? |

**Bottom line (KNOW):** the Twin is *real but fragmented* across Cognitive Core + Memory + LifeRE + LifeOS + Creator, with no single canonical read/write object yet. The correct move is an **adapter + federation layer** over the verified stores — not a rebuild.
