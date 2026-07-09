<!-- SYNOPSIS: Completion / status claim vocabulary SSOT (PROPOSED) -->

# Completion Vocabulary SSOT

**Status:** `LOCKED` v1.0 — Wave 0 item 1 sealed 2026-07-08  
**Machine instance (overclaim CI):** `builderos-reboot/governance/COMPLETION_VOCABULARY_SSOT.json` — LOCKED v1.0; schema contract `COMPLETION_VOCABULARY_SSOT.schema.json`.  
**Does not replace:** `docs/BUILDEROS_VOCABULARY.md` (org / dept / acronym law)  
**Relationship:** This markdown owns the human-readable claim law; the JSON is the import surface for `scripts/verify-completion-overclaim.mjs`. Org terms stay in `BUILDEROS_VOCABULARY.md`.  
**Authority:** Language law for receipts, cert JSON, readiness reports, Chair prose, CI overclaim guards.  
**Change rule:** Edit only with signed consensus turn + receipt; SNT may reopen on proven drift. Codex (or any agent) may reopen on **P0/P1** only. Keep markdown + JSON in lockstep.

**Revision:** `v1.0` — Claude Round 6 fixes + Round 6d rank-7 tidy absorbed; sealed under 3+ independent AGREE with no unresolved P0/P1.

---

## 0. Hard rules

1. **One meaning per token.** Do not invent synonyms for locked claim words.
2. **Evidence before claim.** A status word is illegal without the evidence class named in its row.
3. **Narrower claim wins.** If evidence only supports a lower rung, write the lower rung — never the higher one.
4. **Chair / ChC is advisory for certification.** Chair prose must not write cert levels or founder usability sign-off.
5. **Soft probes ≠ founder sign-off.** Status checks, health probes, and “looks good” chat must never set `FOUNDER_USABILITY_PASS`.
6. **TSOS never declares truth.** Forbidden authority fields remain as in `tsos-guardrails.js` (`ready`, `done`, `verdict`, `implementation_status`, …).

---

## 1. Claim ladder (lowest → highest)

Use these as the **only** terminal / readiness claim words for BuilderOS / factory / founder-facing completion.

| Rank | Token | Means | Required evidence (minimum) | Explicitly does **not** mean |
|-----:|-------|-------|-----------------------------|------------------------------|
| 0 | `NOT_STARTED` | No governed work yet | Absence of mission/step receipts | Failure |
| 1 | `IN_PROGRESS` | Governed work running | Active job / step receipt | Pass |
| 2 | `BLOCKED` | Stopped on typed blocker | Blocker code + owner + next action | Pass; not “almost done” |
| 3 | `TECHNICAL_PASS` | Machine checks for this scope passed | Named verifier/SENTRY/acceptance receipt for **this** scope | Usable by founder; live; Point B; fully machine ready |
| 4 | `BUILT_NOT_LIVE` | Code exists / committed; **not** proven on served runtime | Commit SHA (+ optional origin contains) **without** deploy+runtime probe | `live`, `done`, `shipped`, `RELEASE_PASS` |
| 5 | `DEPLOYED_UNVERIFIED` | Deployed somewhere; runtime behavior **not** yet verified | Deploy SHA present; runtime probe missing or failed / not run | `RELEASE_PASS`; founder-usable; “live” in prose |
| 6 | `SENTRY_MECHANICAL_PASS` | Mechanical SENTRY suite green | `SENTRY_CHECK_RESULT.json` (or successor) with mechanical verdict | Qualitative readiness; `FULLY_MACHINE_READY` |
| 7 | `STAGING_READY` | Staging bar met per cert schema | `PROJECT_CERTIFICATION.json` / readiness report importing this SSOT | Product complete; founder usable; fully machine ready |
| 8 | `CLEARED_FOR_FOUNDER_ALPHA` | Machine believes Adam can test | Technical + staging evidence; **no** usability grant yet | Point B; founder usability pass |
| 9 | `FOUNDER_USABILITY_PASS` | Adam confirmed usable for the scoped ask | Explicit founder confirmation artifact (not soft probe) | Release; fully machine ready |
| 10 | `POINT_B_COMPLETE` | Scoped Point B target reached | Requires `FOUNDER_USABILITY_PASS === true` + technical gates for that target | Global product done |
| 11 | `RELEASE_PASS` | Deploy-truth + runtime behavior verified for the claim | Transport proof: commit, origin, deploy SHA match, runtime probe OK | Autonomy complete |
| 12 | `FULLY_MACHINE_READY` | Highest factory maturity claim | Same-tier determinism + closure acceptance + live deploy/runtime truth + founder UI proof (all true) | “We feel ready” |

**Canonical only:** rank 4 is `BUILT_NOT_LIVE`. No second locked token for the same state.

**Legacy (read-only map — do not mint in new receipts):** runtime may still emit `COMMIT_ONLY_NOT_LIVE`. Readers treat it as evidence class of rank 4 (`BUILT_NOT_LIVE`). Writers and CI must migrate to `BUILT_NOT_LIVE`. This is **not** an allowed synonym under Hard Rule #1.

**Cross-ref for rank 8:** `CLEARED_FOR_FOUNDER_ALPHA` is the BuilderOS ladder name for the same underlying “machine cleared Adam to test / Alpha” milestone used in LifeOS Point A/B/C language. Same concept; this token is the claim word here.

---

## 2. Proof / step words (not completion)

These may appear on steps and receipts. They are **not** product/completion claims.

| Token | Means |
|-------|-------|
| `PASS` / `FAIL` | Single check or step result (`implementation_status`, contract row) |
| `STRUCTURAL_PASS` | Structure/layout proof only |
| `ADVISORY` | Non-blocking finding |
| `SKIPPED_ALREADY_VALID` | Work skipped because already proven with evidence — **not** a code-changing PASS |
| `REVIEW_REQUIRED` | Human/agent review still needed |
| `PACK_COMPLETE` | Mission-pack index row finished structurally — **not** `RELEASE_PASS` or founder-done |

**Banned in new mission-pack / index writes:** bare `complete` / `status: "complete"` for pack rows. Use `PACK_COMPLETE`. Existing `"complete"` strings are legacy; overclaim CI should flag new writes.

---

## 3. Banned / overloaded English (founder + agent prose)

| Phrase | Problem | Use instead |
|--------|---------|-------------|
| “done” / “shipped” / “live” without rung | Ambiguous; often overclaims | Exact ladder token + evidence |
| “ready” alone | Collides with cert levels | `STAGING_READY`, `CLEARED_FOR_FOUNDER_ALPHA`, etc. |
| “works” / “passed” alone | Which gate? | `TECHNICAL_PASS` or named receipt |
| “Point B” without `FOUNDER_USABILITY_PASS` | Historical overclaim class | Block claim until usability true |
| Chair-written cert level | Silent lie class | Cert JSON / SENTRY only |
| New `COMMIT_ONLY_NOT_LIVE` | Superseded by `BUILT_NOT_LIVE` | `BUILT_NOT_LIVE` |
| Mission-pack `"complete"` | Collides with founder-done | `PACK_COMPLETE` |

---

## 4. Certification levels (machine channel)

Owned by `builderos-reboot/PROJECT_CERTIFICATION.json` (and importers). Each level is a **boolean claim** that must match this SSOT’s evidence class. Overclaim CI (Wave 0 item 2) must import these names from here — not redefine them.

Known levels (non-exhaustive; extend only via consensus):

- `STAGING_READY`
- `BOOTSTRAP_AND_STAGING_READY` — compound cert flag (staging + bootstrap bar both met); **not** a second ladder rung. May be true or false independent of ladder rank 7's `STAGING_READY` claim.
- `BLUEPRINT_DUPLICABLE`
- `GREENFIELD_DETERMINISTIC_MECHANICAL`
- `MECHANICAL_DETERMINISM_PROXY`
- `SENTRY_MECHANICAL`
- `FULL_LOOP_GOVERNED`
- `SAME_TIER_CODER_DETERMINISM`
- `FULLY_MACHINE_READY`
- `LUMIN_FACTORY_GITHUB`
- `LIFEOS_PRODUCT_COMPLETE`

**Rule:** `FULLY_MACHINE_READY` cannot be true while any required subordinate proof is false (see ladder rank 12).

---

## 5. Transport proof (required for `RELEASE_PASS`)

Minimum fields (object on receipt):

- `commit_sha`
- `origin_main_sha`
- `origin_contains_commit`
- `deploy_required`
- `deploy_sha`
- `deploy_matches_origin_main`
- `runtime_probe_url`
- `runtime_probe_ok`
- `runtime_behavior_verified`
- `transport_status` ∈ { `BUILT_NOT_LIVE`, `DEPLOYED_UNVERIFIED`, `RELEASE_PASS`, `FAIL` }

Ladder alignment: `BUILT_NOT_LIVE` = rank 4; `DEPLOYED_UNVERIFIED` = rank 5; `RELEASE_PASS` = rank 11; `FAIL` = not a completion claim (use with `BLOCKED` or step `FAIL` as appropriate).

---

## 6. Who may write which claims

| Claim class | Legal writers | Illegal writers |
|-------------|---------------|-----------------|
| Step `PASS`/`FAIL` | Verifiers, SENTRY contracts, acceptance scripts | Chair prose, TSOS |
| Cert levels | Cert/readiness generators + CI | Chair, soft probes |
| `FOUNDER_USABILITY_PASS` | Explicit founder confirmation path only | Soft status probes, Chair inference |
| `FULLY_MACHINE_READY` | Cert generator after all gates | Any single agent narrative |

---

## 7. Open questions — Round V answers (running)

| # | Question | Status |
|---|----------|--------|
| 1 | `BUILT_NOT_LIVE` vs `COMMIT_ONLY_NOT_LIVE` | **RESOLVED (Claude + Grok):** canonical = `BUILT_NOT_LIVE`; legacy map only for old emitters |
| 2 | `CLEARED_FOR_FOUNDER_ALPHA` in-ladder? | **RESOLVED (Claude + Grok):** keep in-ladder; cross-ref LifeOS Alpha milestone |
| 3 | Rename pack `complete` → `PACK_COMPLETE`? | **RESOLVED (Claude + Grok):** yes |
| 4 | Missing rung `TECHNICAL_PASS` → `RELEASE_PASS`? | **RESOLVED (Claude + Grok):** add `DEPLOYED_UNVERIFIED` (rank 5) |
| 5 | Overclaim CI scope? | **RESOLVED (Claude + Grok):** banned English **and** ladder skips **and** exact-token collisions (`COMMIT_ONLY_NOT_LIVE` new writes; bare pack `complete`) |

All five Round V questions **RESOLVED**. Rank-7 dual-token P2 **RESOLVED** (Claude 6d): ladder token = `STAGING_READY` only.

---

## 8. Ratification log

| Agent | Vote | Date | Notes |
|-------|------|------|-------|
| Grok | `AGREE` + seal | 2026-07-08 | Proposed; absorbed Claude/SENTRY fixes; sealed v1.0 |
| Codex | _(pending optional)_ | | May still post; reopen only on P0/P1 |
| Claude | `AGREE` | 2026-07-08 | Three fixes + rank-7 tidy; Round 6d |
| SENTRY | `AGREE` | 2026-07-08 | P2 rank-7 resolved by Claude; no residual dissent |
| Devin | _(optional)_ | | |
| Chair | _(advisory optional)_ | | |

**Sealed:** 2026-07-08 — Grok + Claude + SENTRY (3 independent). Pointer added in `docs/BUILDEROS_VOCABULARY.md`.
