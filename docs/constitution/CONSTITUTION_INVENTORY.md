<!-- SYNOPSIS: CONSTITUTION INVENTORY -->

# CONSTITUTION INVENTORY
**Phase 1 — Non-destructive audit only. No consolidation, no rewriting, no deletion.**
**Produced:** 2026-06-13 by Claude Code (read-only pass)
**Purpose:** Enumerate every file that has constitutional or SSOT authority so the founder can see what exists before deciding whether to reorganize.
**What this is NOT:** a merge proposal, a consolidation plan, or a recommendation to delete anything.

---

## TIER 1 — SUPREME AUTHORITY

These files explicitly claim supreme or constitutional authority over everything else.

| File | Lines | Claims | Key Articles |
|------|-------|--------|-------------|
| `docs/SSOT_NORTH_STAR.md` | 688 | "SUPREME AUTHORITY (wins all conflicts)" | Art I Mission, Art II §2.0–§2.18, Art III Human Guardian, Art V Safety, Art V-B Hardship, Art VI–IX, Amendments |
| `docs/constitution/NORTH_STAR.md` | 103 | "SUPREME AUTHORITY (wins all conflicts)" — same claim as above; describes itself as the law digest for routine sessions | Digest of all Articles; pointers to full text |

**Note:** Both claim supreme authority. `docs/constitution/NORTH_STAR.md` explicitly says `docs/SSOT_NORTH_STAR.md` is the full text and required for constitutional sessions. The digest is an extract, not a second supreme authority. But both carry the "SUPREME" label — a potential confusion point.

---

## TIER 2 — CANONICAL COMPANION (SSOT-ADJACENT)

| File | Lines | Claims | Key Sections |
|------|-------|--------|-------------|
| `docs/SSOT_COMPANION.md` | 883 | "CANONICAL COMPANION (SSOT-adjacent)" — loses to NSSOT in conflicts | §0 Boot/Non-negotiables, §1 What this system is, §2 Constitutional rules, §3 Glossary, §4 Enforcement, §5 Council/Consensus, §6 Honesty, §7 Memory, §8 Visibility, §9 Security, §10 Products, §11 Builder/Money, §12 TCO, §13 Micro Protocol, Appendices A–B |

---

## TIER 3 — OPERATING LAW (CLAUDE.md)

| File | Lines | Claims | Key Sections |
|------|-------|--------|-------------|
| `CLAUDE.md` | 184 | "priority: NSSOT > Companion > this file > everything else" | Operator Standing Orders, Read Order, Session Checklists, Hard Rules, Zero Waste AI, Server.js Boundary, SSOT Maintenance, Code Output Rules |

---

## TIER 4 — MISSION DOMAIN PHILOSOPHY (Constitutional scope, not rule-grade law)

| File | Lines | Claims | Key Sections |
|------|-------|--------|-------------|
| `docs/NORTH_STAR_EDUCATION_HEALING.md` | 371 | Not a law file — philosophical foundation for education + healing mission domains | Education (I–IX sections), Healing, Hardship Protocol, Kids OS, Teacher OS, Music Studio, Future Self Simulator, Bullying, Abuse Detection |

**Note:** NSSOT §1.1 and §1.2 reference this file. It is the "why" behind constitutional commitments, not additional enforceable law. No conflict resolution priority assigned.

---

## TIER 5 — COMPACT ENFORCEMENT PACKET (DERIVED)

| File | Lines | Claims | How produced |
|------|-------|--------|-------------|
| `docs/AGENT_RULES.compact.md` | 42 | No explicit authority claim — generated from canonical sources | `npm run gen:rules` (script: `scripts/generate-agent-rules.mjs`) |

**Note:** This file is derived from canonical sources. Edits to it are overwritten on next `gen:rules` run. Authoritative version is the source files it summarizes.

---

## TIER 6 — PLATFORM EPISTEMIC CONTRACTS (Per-session mandatory reads)

These files govern how every agent session must behave. They reference NSSOT as supreme.

| File | Lines | Purpose |
|------|-------|---------|
| `prompts/00-LIFEOS-AGENT-CONTRACT.md` | 62 | Platform epistemic contract — non-negotiables (no lies, mandate completion, builder-first, env claims) |
| `prompts/00-HIST-LEGACY-BOUNDARY.md` | 43 | STOP gate — legacy/Hist-owned repos vs active paths |
| `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` | 80 | Repo layer map — doctrine/machine/factory-runtime/production spine authority routing |
| `prompts/00-SSOT-READ-SEQUENCE.md` | ~60 | Anti-hallucination read sequence — Channel A vs B |
| `prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md` | ~30 | Think vs execute model routing |
| `prompts/00-PROVIDER-STRATEGY-LOCK.md` | ~30 | Locked provider tier decisions |
| `prompts/00-MODEL-ESCALATION-GATE.md` | ~25 | Model escalation rules |
| `prompts/00-RESIDENT-ARCHITECT.md` | ~25 | Architect persona rules |
| `prompts/00-TSOS-CONTINUOUS-AUTONOMOUS-OPERATIONS.md` | ~30 | Continuous autonomous ops rules |

---

## TIER 7 — PRODUCT-LEVEL SSOT AMENDMENTS (45 files)

Each file is canonical for one project/lane inside the platform. All amendments are explicitly subordinate to the North Star.

| Amendment | File | Domain |
|-----------|------|--------|
| AM01 | `docs/projects/AMENDMENT_01_AI_COUNCIL.md` | AI Council system, model routing, council members |
| AM02 | `docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md` | Memory + conversation retrieval |
| AM03 | `docs/projects/AMENDMENT_03_FINANCIAL_REVENUE.md` | Financial + revenue infrastructure |
| AM04 | `docs/projects/AMENDMENT_04_AUTO_BUILDER.md` | Auto-builder platform |
| AM05 | `docs/projects/AMENDMENT_05_SITE_BUILDER.md` | Site builder + prospect pipeline |
| AM06 | `docs/projects/AMENDMENT_06_GAME_PUBLISHER.md` | Game publisher |
| AM07 | `docs/projects/AMENDMENT_07_VIDEO_PIPELINE.md` | Video pipeline |
| AM08 | `docs/projects/AMENDMENT_08_OUTREACH_CRM.md` | Outreach + CRM |
| AM09 | `docs/projects/AMENDMENT_09_LIFE_COACHING.md` | Life coaching / Digital Twin |
| AM10 | `docs/projects/AMENDMENT_10_API_COST_SAVINGS.md` | API cost savings / TokenOS |
| AM11 | `docs/projects/AMENDMENT_11_BOLDTRAIL_REALESTATE.md` | BoldTrail real estate CRM |
| AM12 | `docs/projects/AMENDMENT_12_COMMAND_CENTER.md` | Command Center dashboard |
| AM13 | `docs/projects/AMENDMENT_13_KNOWLEDGE_BASE.md` | Knowledge base |
| AM14 | `docs/projects/AMENDMENT_14_WHITE_LABEL.md` | White label |
| AM15 | `docs/projects/AMENDMENT_15_BUSINESS_TOOLS.md` | Business tools |
| AM16 | `docs/projects/AMENDMENT_16_WORD_KEEPER.md` | Word Keeper |
| AM17 | `docs/projects/AMENDMENT_17_TC_SERVICE.md` | TC Service / MLS |
| AM18 | `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` | ClientCare billing/recovery |
| AM19 | `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md` | Project governance |
| AM20 | `docs/projects/AMENDMENT_20_CAPABILITY_MAP.md` | Capability map |
| AM21 | `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` | LifeOS Core — all 18+ phases |
| AM22 | `docs/projects/AMENDMENT_22_STORY_STUDIO.md` | Story Studio |
| AM23 | `docs/projects/AMENDMENT_23_CREATOR_MEDIA_OS.md` | Creator Media OS |
| AM24 | `docs/projects/AMENDMENT_24_FAITH_STUDIO.md` | Faith Studio |
| AM25 | `docs/projects/AMENDMENT_25_CONFLICT_ARBITRATOR.md` | Conflict Arbitrator |
| AM26 | `docs/projects/AMENDMENT_26_PERSONAL_FINANCE_OS.md` | Personal Finance OS |
| AM27 | `docs/projects/AMENDMENT_27_PRODUCTIZED_SPRINT.md` | Productized Sprint |
| AM28 | `docs/projects/AMENDMENT_28_WELLNESS_STUDIO.md` | Wellness Studio |
| AM29 | `docs/projects/AMENDMENT_29_AI_RECEPTIONIST.md` | AI Receptionist |
| AM30 | `docs/projects/AMENDMENT_30_ENTERPRISE_AI_GOVERNANCE.md` | Enterprise AI Governance |
| AM31 | `docs/projects/AMENDMENT_31_TEACHER_OS.md` | Teacher OS |
| AM32 | `docs/projects/AMENDMENT_32_MUSIC_TALENT_STUDIO.md` | Music Talent Studio |
| AM33 | `docs/projects/AMENDMENT_33_KINGSMAN_PROTOCOL.md` | Kingsman Protocol |
| AM34 | `docs/projects/AMENDMENT_34_KIDS_OS.md` | Kids OS |
| AM35 | `docs/projects/AMENDMENT_35_LUMIN_UNIVERSITY.md` | Lumin University |
| AM36 | `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` | Zero-drift handoff protocol |
| AM37 | `docs/projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md` | Universal overlay |
| AM38 | `docs/projects/AMENDMENT_38_IDEA_VAULT.md` | Idea vault |
| AM39 | `docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md` | Memory intelligence |
| AM40 | `docs/projects/AMENDMENT_40_OIL_SECURITY_DIVISIONS.md` | OIL security divisions |
| AM41 | `docs/projects/AMENDMENT_41_MARKETINGOS.md` | MarketingOS |
| AM44 | `docs/projects/AMENDMENT_44_TOKEN_ACCOUNTING_OS.md` | Token Accounting OS |
| AM46 | `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md` | BuilderOS control plane |
| AM47 | `docs/projects/AMENDMENT_47_MISSION_RUNTIME.md` | Mission runtime |
| AM48 | `docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md` | BuilderOS vocabulary |

**Gaps in numbering:** AM42, AM43, AM45 have no corresponding files in `docs/projects/`.

---

## TIER 8 — PRODUCT SPECS (docs/products/)

These exist alongside the amendment system and are referenced in `CLAUDE.md` read order.

| File | Purpose |
|------|---------|
| `docs/products/LIFEOS.md` | LifeOS product spec (separate from AM21) |
| `docs/products/BUILD_PLAN.md` | Build plan |
| `docs/products/COMPLETE_PRODUCT_SPEC.md` | Complete product spec |
| `docs/products/LLM_FEEDBACK_REQUEST.md` | LLM feedback |
| `docs/products/conflict-arbitrator.md` | Conflict arbitrator spec |
| `docs/products/INDEX.md` | Product registry + priority order |

---

## AMENDMENT SUPPORT FILES (not law, but SSOT-adjacent)

| File | Purpose |
|------|---------|
| `docs/projects/AMENDMENT_READINESS_CHECKLIST.md` | Readiness checklist template |
| `docs/projects/AMENDMENT_TEMPLATE.md` | Template for new amendments |
| `docs/projects/INDEX.md` | Amendment registry + priority row |

---

## TOTAL COUNT

| Tier | Count |
|------|-------|
| Supreme authority | 2 (SSOT_NORTH_STAR + constitution/NORTH_STAR digest) |
| Canonical companion | 1 |
| Operating law (CLAUDE.md) | 1 |
| Mission philosophy | 1 |
| Compact (derived) | 1 |
| Epistemic contracts (prompts/00-) | 9 |
| Product amendments | 45 |
| Product specs | 6 |
| Support files | 3 |
| **Total** | **69 files** |
