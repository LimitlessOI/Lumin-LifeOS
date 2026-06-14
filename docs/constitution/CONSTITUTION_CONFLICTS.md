# CONSTITUTION CONFLICTS
**Phase 1 — Observation only. No fixes applied. No files edited.**
**Produced:** 2026-06-13 by Claude Code (read-only pass)
**Purpose:** Surface contradictions, gaps, and stale references between constitutional documents so the founder can decide what to do in Phase 2.
**Severity legend:** CRITICAL = actively causes wrong agent behavior | MEDIUM = causes confusion but NSSOT resolves it | LOW = stale reference, no active harm

---

## C1 — PLATFORM IDENTITY NAME CONFLICT
**Severity:** MEDIUM  
**Status:** Partially resolved in NSSOT (2026-05-27 correction) but INDEX.md not updated

**What the docs say:**

- `docs/SSOT_NORTH_STAR.md` (SUPREME, version 2026-06-12): "**BuilderOS** is the canonical name of the internal autonomous programming machine... **TokenSaverOS (TSOS)** is the external AI efficiency/routing product."
- `docs/SSOT_COMPANION.md` (version 2026-06-12): Matches NSSOT. "BuilderOS" = machine. "TSOS" = external product.
- `docs/projects/INDEX.md` header (version 2026-05-24): "**Platform name (whole repo): TokenSaverOS (TSOS)** — short TSOS. LifeOS, LimitlessOS, TokenOS, TC, etc. are lanes/products inside TSOS."
- `prompts/00-LIFEOS-AGENT-CONTRACT.md` preamble: references "TSOS" as the machine name in several places (the §2.11a block uses "TokenSaverOS (TSOS): the builder is the meta-product").

**The conflict:** INDEX.md calls the whole platform "TSOS." NSSOT calls the machine "BuilderOS" and says TSOS is only the external efficiency/routing product. An agent reading INDEX.md first will form a different identity model than one reading NSSOT first.

**Resolution per NSSOT:** NSSOT wins. BuilderOS = machine. TSOS = external product + retained lexicon name in `docs/TSOS_SYSTEM_LANGUAGE.md`. INDEX.md is outdated on this point.

**Action needed (founder decision):** Update INDEX.md header to say "BuilderOS" not "TSOS" as platform name. Also audit `prompts/00-LIFEOS-AGENT-CONTRACT.md` for remaining TSOS-as-machine references.

---

## C2 — DUAL SUPREME AUTHORITY CLAIM
**Severity:** LOW  
**Status:** Documented in INVENTORY as a confusion point; not an active conflict

**What the docs say:**

- `docs/SSOT_NORTH_STAR.md`: "SUPREME AUTHORITY (wins all conflicts)"
- `docs/constitution/NORTH_STAR.md`: "SUPREME AUTHORITY (wins all conflicts)"

**The conflict:** Both files carry the same authority label. `docs/constitution/NORTH_STAR.md` is a 103-line digest of the 688-line `docs/SSOT_NORTH_STAR.md`. The digest explicitly says "Full text: `docs/SSOT_NORTH_STAR.md` — required for constitutional sessions." So the intent is clear: the digest is a convenience extract, not a second supreme source.

**The risk:** An agent that only reads the digest and encounters a topic not covered in the digest may miss law that exists only in the full text. The digest does not cover Art VIII (Kingsman), Art IX (AI Coexistence), §2.0D–§2.0J (Mission State Machine, BPB Determinism, Governance Routing, Founder Intent Model, Historian, Model Benchmarking), §2.13, §2.16, or detailed challenge criteria for any article.

**Action needed (founder decision):** Either (a) rename the digest to make clear it is subordinate (e.g., "NORTH_STAR_DIGEST.md"), or (b) add a prominent note to the digest that it is an extract and cannot be used as sole authority for constitutional questions. Do not delete either file — they serve different use cases.

---

## C3 — PRODUCT PRIORITY ORDER — THREE COMPETING SOURCES
**Severity:** MEDIUM  
**Status:** Unresolved. Multiple files disagree, and the designated canonical source (QUICK_LAUNCH.md) is not in the read order.

**What the docs say:**

- `docs/SSOT_COMPANION.md` §0.4 (version 2026-06-12): "Canonical priority is in `docs/QUICK_LAUNCH.md` — if this section conflicts, QUICK_LAUNCH wins."
- `docs/projects/INDEX.md` §PROJECT REGISTRY (version 2026-05-24): Amendment 05 (Site Builder) = "#1 — Fastest to $500/day"; Amendment 08 (Outreach) = "#2 — Feeds Site Builder." Revenue priority chain: AM18 (ClientCare) → AM17 (TC) → AM10 (Cost Savings) → AM11 (BoldTrail).
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` §PRIORITY ALIGNMENT (operator directive 2026-05-03): "Adam declares LifeOS shipped + stabilized + approved backlog features working as program priority one."
- Session memory (`memory/project_priority_order.md`): "C2 first → SocialMediaOS second → LifeOS/LimitlessOS third → Cursor eventually audit-only." (Founder directive 2026-06-02)
- `CLAUDE.md` §OPERATOR STANDING ORDERS: Does not name a priority order.

**The conflict:** Four different priority orders exist across four documents, and the designated canonical source (QUICK_LAUNCH.md) is not in `CLAUDE.md`'s read order for a normal session. An agent can end up with any of these priorities depending on which file it reads.

**Action needed (founder decision):** Designate one file as the single source of truth for current priority order. Update CLAUDE.md read order to include it. Archive or supersede the conflicting entries in INDEX.md and AM21.

---

## C4 — LIFEOS PRODUCT SPEC — TWO PARALLEL FILES
**Severity:** MEDIUM  
**Status:** Active. Both files exist. CLAUDE.md read order points to `docs/products/LIFEOS.md`. Service code points to AMENDMENT_21.

**What the docs say:**

- `CLAUDE.md` §READ ORDER item 6: `docs/products/[product].md` — "the product you're building (e.g. `docs/products/LIFEOS.md`)"
- `docs/products/LIFEOS.md` exists, last state "2026-06-11." It opens by deferring to AMENDMENT_21 ("Amendment: `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` (full history + receipts)") but still exists as a separate file.
- `services/voice-rail-v1.js` line 294: reads `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` (was patched from the products path per AM21 Change Receipt 2026-06-11 — "readLifeOSProductBrief() read docs/products/LIFEOS.md which no longer exists").
- `CLAUDE.md` §SSOT READ-BEFORE-WRITE: lists `docs/products/*.md` as in-scope for SSOT read-before-write rules.

**The conflict:** The Change Receipt says `docs/products/LIFEOS.md` "no longer exists" — but it does exist. The voice-rail service was patched to read AM21 instead. CLAUDE.md still points to the products/ path. An agent following CLAUDE.md's read order will read the products file; the file itself immediately defers to AM21. Double indirection, stale comment in Change Receipt.

**Action needed (founder decision):** Either (a) make `docs/products/LIFEOS.md` a redirect stub only (just the pointer to AM21, nothing else), or (b) remove it and update CLAUDE.md read order to point directly to AM21. Decision belongs to founder.

---

## C5 — MISSING FILE REFERENCED IN CHANGE RECEIPTS
**Severity:** LOW  
**Status:** Gap. File was declared "NEW" in a Change Receipt but never committed.

**What the docs say:**

- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` Change Receipt (2026-06-11): "§2.17 Operator mandate completion bar... `prompts/00-OPERATOR-MANDATE-COMPLETION.md` (NEW)... Adam directive: good instructions in → results out; subsystem wins ≠ completion."
- File does not exist at `prompts/00-OPERATOR-MANDATE-COMPLETION.md`.

**The conflict:** A Change Receipt claims a file was created (marked ✅). The file is missing. Any agent looking for that file in response to a §2.17 question will find nothing.

**Action needed (founder decision):** Either (a) create the file with the mandate completion rules it was supposed to contain, or (b) add a note to the Change Receipt that the file was not committed and the rules live in `prompts/00-LIFEOS-AGENT-CONTRACT.md` instead. Low severity because the rules themselves are captured in NSSOT §2.17 and the agent contract.

---

## C6 — AMENDMENT NUMBERING GAPS (AM42, AM43, AM45)
**Severity:** LOW  
**Status:** Numbers missing from the sequence. No active wrong-behavior risk.

**What the docs say:**

- Amendments exist for 01–40, 41, 44, 46, 47, 48. Numbers 42, 43, 45 have no corresponding files.

**Action needed (founder decision):** If AM42/43/45 were planned but never created, note this in INDEX.md so agents don't assume the gaps are accidental omissions they should fill. If they were created and later deleted, confirm deletion was intentional.

---

## C7 — COMPACT PACKET REGENERATION NOT IN SESSION CHECKLIST
**Severity:** LOW  
**Status:** Procedural gap. No active wrong-behavior risk.

**What the docs say:**

- `docs/AGENT_RULES.compact.md` is generated by `npm run gen:rules`. Header says "Regenerate: `npm run gen:rules`".
- `CLAUDE.md` §SESSION END CHECKLIST: lists updating amendments and continuity log. Does not include regenerating the compact packet when constitutional changes are made.

**The risk:** When NSSOT or Companion changes, the compact packet may silently go stale. An agent reading only the compact packet operates on old law.

**Action needed (founder decision):** Add `npm run gen:rules` to the SESSION END CHECKLIST when any constitutional file is edited, or add a pre-commit hook that detects NSSOT/Companion changes and flags the compact for regeneration.

---

## SUMMARY TABLE

| # | Topic | Severity | Files in conflict | NSSOT resolves? | Action needed |
|---|-------|----------|------------------|----------------|---------------|
| C1 | Platform identity name | MEDIUM | INDEX.md vs NSSOT §2.11a | YES — BuilderOS wins | Update INDEX.md header |
| C2 | Dual supreme claim | LOW | constitution/NORTH_STAR.md vs SSOT_NORTH_STAR.md | YES — NSSOT is full text | Rename digest or add prominence note |
| C3 | Priority order | MEDIUM | INDEX.md vs AM21 vs memory vs QUICK_LAUNCH | NO — four files conflict | Designate one canonical source |
| C4 | LifeOS dual spec | MEDIUM | CLAUDE.md read order vs AM21 vs voice-rail code | NO — CLAUDE.md still points to old path | Founder decides: stub or redirect |
| C5 | Missing referenced file | LOW | AM21 Change Receipt vs prompts/ directory | N/A | Create file or annotate receipt |
| C6 | Amendment numbering gaps | LOW | docs/projects/ index | N/A | Note in INDEX.md |
| C7 | Compact regeneration not in checklist | LOW | CLAUDE.md SESSION END | N/A | Add to checklist or hook |

---

*Phase 2 (consolidation, rewriting, deletion) requires founder review of this document first.*
