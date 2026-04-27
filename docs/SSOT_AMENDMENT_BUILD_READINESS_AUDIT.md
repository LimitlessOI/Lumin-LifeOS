# Amendment build-readiness audit

**Purpose:** Honest check: *if an agent had only SSOT + repo*, could they implement a project **without inventing missing product law**?  
**Method:** Criteria-based review + registry reality check — not a line-by-line proof of all 37 amendments (that would be a standing program).

**Last reviewed:** 2026-04-25  
**Companion:** `docs/projects/INDEX.md`, `docs/projects/AMENDMENT_READINESS_CHECKLIST.md` (if present), `scripts/verify-project.mjs` project IDs.

---

## Criteria (all should be “yes” for autonomous build)

For a given amendment **in active build**, a cold agent should find:

| Criterion | Question |
|-----------|----------|
| **Scope** | Clear in/out of scope and revenue / priority position vs North Star. |
| **Surfaces** | Named routes, services, migrations, overlays (or explicit “none yet”). |
| **Data model** | Tables/columns or explicit deferral — not “TBD” on load-bearing entities. |
| **Acceptance** | Testable outcomes or verifier hooks (smoke script, `verify-project` project id, CI job). |
| **Handoff** | `Agent Handoff Notes` + `Change Receipts` current within the last few sessions. |
| **Manifest** | Where the repo uses `*.manifest.json`, owned files list matches reality (or CI warns). |

If any load-bearing row is **missing**, the amendment is **not** “flush enough” to build the *whole* product without human design — only incremental gaps.

---

## KNOW — registry vs “paper only”

From `docs/projects/INDEX.md` status column:

| Bucket | Build-from-SSOT-alone | Notes |
|--------|------------------------|--------|
| **LIVE** | **Sometimes** | Still need per-amendment gates; “LIVE” does not mean “fully specified for every future feature.” |
| **BUILDING / IN_BUILD / active-build** | **Partial** | Expect gaps; conductor + receipts required. |
| **planning / candidate / experimental** | **No** | These are option value and narrative — **not** executable blueprints until promoted with schema + APIs + acceptance. |
| **constitutional / specification phase** (e.g. Kingsman) | **No** | Law or spec in progress — implementation is gated on explicit phases. |

**THINK:** Several “future verticals” (25–32, 34–35, etc.) are **morally correct backlog** but **not** at the same detail density as Amendment 17/18/21 for a no-surprises build.

---

## KNOW — cross-cutting gaps (affect “the whole picture”)

1. **INDEX route inventory** — The route list in `INDEX.md` is **aspirational / historical** in places; the repo’s **actual** `routes/` set can diverge after refactors. **Trust `routes/` + `register-runtime-routes.js` (or boot) over a static markdown table** unless the table was receipted the same session.

2. **Council vs SSOT injection** — Council calls do **not** automatically receive full NSSOT + all amendments in prompt form; builder codegen skips the thin memory-SOT snippet. **Product behavior from “model read the constitution” is not guaranteed** — see architecture notes in lane logs / future SSOT work.

3. **Manifest ↔ readiness** — Amendment 36 backlog calls out wiring **readiness:check** to **fail** CI when manifests claim `build_ready: true` but Pre-Build Readiness gates are empty — today may be **warn-only**. That means **machine enforcement of “specced enough” is incomplete**.

4. **Docker / docs packaging** — If `docs/` is excluded from production images, **SOURCE_OF_TRUTH.md** and other file-based context **won’t exist at runtime** unless you change packaging or load from DB.

---

## Per-cluster summary (not every file)

| Cluster | Representative amendments | Flush for full autonomous build? |
|---------|---------------------------|----------------------------------|
| AI platform | 01, 02, 04, 10, 13, 36 | **01/02/36** strong ops; **04** guarded; **10** product path still maturing — **partial**. |
| Revenue / ops | 03, 05, 08, 11, 17, 18, 27 | **17/18** highest economic attention — still **conductor + verification** needed; not “frozen spec.” |
| LifeOS | 09, 21 | **21** is large and living; many backlog items are **approved-not-built** — **partial** by design. |
| Command / overlay | 12, 37 | **Active**; treat as **BUILDING** truth from code + amendment receipts. |
| Future verticals | 25–32, 34–35 | **No** — planning/candidate; expect **design sprints** before “build all.” |
| Kingsman | 33 | **Spec phase** — not a full implementation SSOT yet. |

---

## Recommended next steps (pick by priority)

1. **Promote “planning” → “BUILDING”** only when: migration sketch + route names + acceptance tests are in the amendment body (or linked manifest).
2. **Automate drift signal:** tighten `ssot-compliance.yml` / readiness per Amendment 36 backlog item 5.
3. **Single route manifest:** generate route list from code in CI and diff against `INDEX.md` (optional — reduces stale tables).
4. **Builder SSOT bundle (optional product work):** inject bounded NSSOT + Companion excerpts for codegen when you want constitutional coupling — separate design; see council SSOT discussion in continuity logs.

---

## SSOT

- `docs/SSOT_DUAL_CHANNEL.md` — agent vs system channels without duplicate law.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — handoff + readiness tooling owner.
