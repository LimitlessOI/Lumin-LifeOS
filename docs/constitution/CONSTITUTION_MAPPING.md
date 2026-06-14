# CONSTITUTION MAPPING
**Phase 1 — Non-destructive. Observation only.**
**Produced:** 2026-06-13 by Claude Code (read-only pass)
**Purpose:** Map which constitutional topics live in which files, and how the documents depend on each other.
**What this is NOT:** a merge proposal or a recommendation.

---

## TOPIC → FILE MAP

Each row names a topic, then every file that contains rules, definitions, or authoritative text about it.

| Topic | Primary | Also covers |
|-------|---------|-------------|
| **Platform identity / canonical machine name** | `docs/SSOT_NORTH_STAR.md` §2.11a | `docs/SSOT_COMPANION.md` §0.5F; `docs/projects/INDEX.md` header |
| **Mission — Healing** | `docs/SSOT_NORTH_STAR.md` §1.1 | `docs/NORTH_STAR_EDUCATION_HEALING.md`; `docs/constitution/NORTH_STAR.md` Art I |
| **Mission — Education** | `docs/SSOT_NORTH_STAR.md` §1.2 | `docs/NORTH_STAR_EDUCATION_HEALING.md` §I–§IX; `docs/constitution/NORTH_STAR.md` Art I |
| **Authority hierarchy / conflict resolution** | `docs/SSOT_NORTH_STAR.md` §2.0A | `docs/SSOT_COMPANION.md` §0.1–§0.2; `CLAUDE.md` §HARD RULES; `prompts/00-LIFEOS-AGENT-CONTRACT.md` §Relationship to other law |
| **Truth ladder** | `docs/SSOT_NORTH_STAR.md` §2.0B | `docs/SSOT_COMPANION.md` §0.8 |
| **Law challenge / review cadence** | `docs/SSOT_NORTH_STAR.md` §2.0C | `docs/SSOT_COMPANION.md` §0.10 |
| **Mission state machine** | `docs/SSOT_NORTH_STAR.md` §2.0D | `docs/SSOT_COMPANION.md` §0.9 |
| **BPB determinism** | `docs/SSOT_NORTH_STAR.md` §2.0E | `docs/SSOT_COMPANION.md` §0.5D |
| **Governance routing (Autonomous/Supervised/Founder)** | `docs/SSOT_NORTH_STAR.md` §2.0F | `docs/SSOT_COMPANION.md` §0.5J; `docs/constitution/NORTH_STAR.md` Art III |
| **Founder Intent Model** | `docs/SSOT_NORTH_STAR.md` §2.0H | — |
| **Historian law** | `docs/SSOT_NORTH_STAR.md` §2.0I | `docs/SSOT_COMPANION.md` §7 (Memory Model) |
| **User sovereignty** | `docs/SSOT_NORTH_STAR.md` §2.1 | `docs/SSOT_COMPANION.md` §2.4; `docs/constitution/NORTH_STAR.md` Art II; `CLAUDE.md` §HARD RULES |
| **Radical honesty / claim classification** | `docs/SSOT_NORTH_STAR.md` §2.2, §2.6 | `docs/SSOT_COMPANION.md` §2.5, §6; `docs/constitution/NORTH_STAR.md` Art II + Claim Classification; `docs/AGENT_RULES.compact.md` §SUPREME LAWS; `prompts/00-LIFEOS-AGENT-CONTRACT.md` §Non-negotiables |
| **Evidence rule** | `docs/SSOT_NORTH_STAR.md` §2.3 | `docs/SSOT_COMPANION.md` §2.2, §0.3; `CLAUDE.md` §HARD RULES |
| **Zero-degree / no drift** | `docs/SSOT_NORTH_STAR.md` §2.4 | `docs/SSOT_COMPANION.md` §2.1; `CLAUDE.md` §HARD RULES |
| **Fail-closed** | `docs/SSOT_NORTH_STAR.md` §2.5 | `docs/SSOT_COMPANION.md` §0.3, §4.3; `CLAUDE.md` §HARD RULES |
| **Observability / grading / self-improvement** | `docs/SSOT_NORTH_STAR.md` §2.10 | `docs/SSOT_COMPANION.md` §0.4 |
| **Builder-first / system builds product** | `docs/SSOT_NORTH_STAR.md` §2.11, §2.11a–c | `docs/SSOT_COMPANION.md` §0.5D–§0.5G; `CLAUDE.md` §SERVER.JS; `docs/AGENT_RULES.compact.md` §BUILDER-FIRST; `prompts/00-LIFEOS-AGENT-CONTRACT.md` |
| **Council / load-bearing decisions** | `docs/SSOT_NORTH_STAR.md` §2.12 | `docs/SSOT_COMPANION.md` §0.5E, §5; `docs/AGENT_RULES.compact.md` §COUNCIL |
| **No regression** | `docs/SSOT_NORTH_STAR.md` §2.13 | — |
| **Machine channel lexicon (TSOS)** | `docs/SSOT_NORTH_STAR.md` §2.14 | `docs/SSOT_COMPANION.md` §0.5H; `docs/SSOT_DUAL_CHANNEL.md` |
| **Operator instruction supremacy** | `docs/SSOT_NORTH_STAR.md` §2.15 | `docs/SSOT_COMPANION.md` §0.5I; `CLAUDE.md` §HARD RULES; `prompts/00-LIFEOS-AGENT-CONTRACT.md` §Operator instruction |
| **No unnecessary bottlenecks** | `docs/SSOT_NORTH_STAR.md` §2.16 | `docs/SSOT_COMPANION.md` §0.5J |
| **Mandate completion bar** | `docs/SSOT_NORTH_STAR.md` §2.17 | `docs/SSOT_COMPANION.md` §0.5G; `docs/constitution/NORTH_STAR.md` Art II |
| **Compound drift / zero angular error** | `docs/SSOT_NORTH_STAR.md` §2.18 | `docs/SSOT_COMPANION.md` §0.11 |
| **Human veto / guardian authority** | `docs/SSOT_NORTH_STAR.md` Art III | `docs/constitution/NORTH_STAR.md` Art III |
| **Constitution change control** | `docs/SSOT_NORTH_STAR.md` Art IV | `docs/constitution/NORTH_STAR.md` Art VII |
| **Secrets protection** | `docs/SSOT_NORTH_STAR.md` Art V §5.1 | `docs/SSOT_COMPANION.md` §9; `CLAUDE.md` §HARD RULES; `docs/constitution/NORTH_STAR.md` Art V |
| **Spending limits** | `docs/SSOT_NORTH_STAR.md` Art V §5.3 | `docs/SSOT_COMPANION.md` §4.2; `docs/constitution/NORTH_STAR.md` Art V |
| **Hardship Protocol** | `docs/SSOT_NORTH_STAR.md` Art V-B | `docs/NORTH_STAR_EDUCATION_HEALING.md` §X; `docs/constitution/NORTH_STAR.md` Art V-B; `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` §Pricing — Never Gate |
| **Kingsman Protocol** | `docs/SSOT_NORTH_STAR.md` Art VIII | — |
| **AI Coexistence** | `docs/SSOT_NORTH_STAR.md` Art IX | — |
| **SSOT maintenance (atomic, per-file)** | `CLAUDE.md` §SSOT MAINTENANCE | `docs/AGENT_RULES.compact.md` §SSOT; `prompts/00-LIFEOS-AGENT-CONTRACT.md` item 7 |
| **Read before edit** | `CLAUDE.md` §READ-BEFORE-EDIT | `prompts/00-LIFEOS-AGENT-CONTRACT.md` item 7 |
| **Zero Waste AI guard** | `CLAUDE.md` §ZERO WASTE AI | `docs/SSOT_COMPANION.md` §0.5F; `prompts/00-LIFEOS-AGENT-CONTRACT.md` item 8 |
| **Push by default** | `CLAUDE.md` §OPERATOR STANDING ORDERS | no other file covers this rule |
| **Legacy boundary / Hist** | `prompts/00-HIST-LEGACY-BOUNDARY.md` | `prompts/00-SYSTEM-AUTHORITY-LAYERS.md`; `prompts/00-LIFEOS-AGENT-CONTRACT.md` header |
| **Repo layer authority routing** | `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` | — |
| **Product priority / revenue order** | `docs/SSOT_COMPANION.md` §0.4 (defers to QUICK_LAUNCH) | `docs/projects/INDEX.md` §PROJECT REGISTRY; `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` §PRIORITY ALIGNMENT; memory/project_priority_order.md |
| **Agent inbox / AI dispute resolution** | `CLAUDE.md` §AGENT INBOX | `docs/AGENT_INBOX.md` |
| **LifeOS product law** | `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` | `docs/products/LIFEOS.md` (separate doc — see Conflict C4) |
| **Deliberation / BPB/Council before build** | `docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md` | referenced from AM21 Change Receipts |
| **Token accounting** | `docs/projects/AMENDMENT_44_TOKEN_ACCOUNTING_OS.md` | `docs/SSOT_COMPANION.md` §12 (TCO) |

---

## DEPENDENCY TREE

```
docs/SSOT_NORTH_STAR.md  (SUPREME)
  └── docs/constitution/NORTH_STAR.md  (DIGEST — points back up)
  └── docs/SSOT_COMPANION.md  (COMPANION — operational detail)
        └── docs/SSOT_DUAL_CHANNEL.md  (derived view)
  └── CLAUDE.md  (project instructions, below Companion)
        └── docs/AGENT_RULES.compact.md  (generated from CLAUDE.md + NSSOT)
  └── prompts/00-LIFEOS-AGENT-CONTRACT.md  (session gate — references NSSOT)
        └── prompts/00-HIST-LEGACY-BOUNDARY.md  (mandatory stop-read)
        └── prompts/00-SYSTEM-AUTHORITY-LAYERS.md  (repo layer map)
        └── prompts/00-SSOT-READ-SEQUENCE.md  (read order)
        └── prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md
        └── prompts/00-PROVIDER-STRATEGY-LOCK.md
  └── docs/NORTH_STAR_EDUCATION_HEALING.md  (mission philosophy, referenced by §1.1, §1.2)
  └── docs/projects/INDEX.md  (amendment registry, subordinate to NSSOT)
        └── docs/projects/AMENDMENT_01–AMENDMENT_48  (45 product SSOTs)
  └── docs/products/INDEX.md  (product registry, referenced in CLAUDE.md read order)
        └── docs/products/LIFEOS.md  (LifeOS product spec — parallel to AM21)
```

---

## WHO READS WHAT (per session type)

| Session type | Read sequence per CLAUDE.md |
|---|---|
| **Normal build** | `AGENT_INBOX.md` → `AGENT_RULES.compact.md` → `00-HIST-LEGACY-BOUNDARY.md` → `00-SYSTEM-AUTHORITY-LAYERS.md` → `docs/products/INDEX.md` → `docs/products/[product].md` → `docs/CONTINUITY_LOG.md` |
| **Constitutional edit** | All of above + `docs/constitution/NORTH_STAR.md` + `docs/SSOT_NORTH_STAR.md` |
| **LifeOS build** | All of above + `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` (owned by CLAUDE.md SSOT mapping) |
| **Cold-start (per 00-LIFEOS-AGENT-CONTRACT.md)** | `00-HIST-LEGACY-BOUNDARY.md` → `00-SYSTEM-AUTHORITY-LAYERS.md` → `00-SSOT-READ-SEQUENCE.md` → NSSOT → Companion → CLAUDE.md |

---

## WHAT EACH FILE EXCLUSIVELY OWNS (no other file covers it)

| File | Topic owned exclusively |
|------|------------------------|
| `docs/SSOT_NORTH_STAR.md` | Art VIII Kingsman Protocol; Art IX AI Coexistence; §2.0H Founder Intent Model; §2.0I Historian Law; §2.13 No Regression; §2.16 PB execution authority; all Article text with evidence + challenge criteria |
| `docs/NORTH_STAR_EDUCATION_HEALING.md` | Full philosophical depth on education (misidentification crisis, Irlen Syndrome, music as soul's language, bullying philosophy, abuse detection) |
| `CLAUDE.md` | Push-by-default operator standing order; server.js boundary enforcement; agent inbox routing rule; file pattern → amendment table |
| `prompts/00-HIST-LEGACY-BOUNDARY.md` | The specific STOP gate and Hist-ownership boundary for legacy repos |
| `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` | Doctrine/machine/factory-runtime/production-spine four-layer classification |
| `docs/SSOT_COMPANION.md` | §12 TCO (25 mechanisms); §13 Micro Protocol; §8 Permissioned Visibility; §10–§11 Products/Builder-Money pod definitions; Appendices A–B (agent bootstrap + CAO audit prompts) |
