<!-- SYNOPSIS: Constitutional Framework — the manufacturing process for law. Authority hierarchy, Knowledge Ladder, two-score Confidence Model, Constitutional Research Registry, and Processes. -->

# BuilderOS Constitutional Framework v1

**Status:** RATIFIED — subordinate to and embedded in `docs/constitution/NORTH_STAR_SSOT.md` §2.0M.  
**Canonical path:** `docs/constitution/CONSTITUTIONAL_FRAMEWORK.md`  
**Machine registry:** `data/constitutional-framework/REGISTRY.json`  
**Process detail:** `docs/constitution/CONSTITUTIONAL_PROCESSES.md`  
**Research registry:** `data/constitutional-framework/RESEARCH_REGISTRY.json` (proposals/candidates)  
**CLI:** `node scripts/constitutional-framework.mjs --help`

---

## The Missing Piece

The Constitution does not define truth. It defines how BuilderOS **discovers, tests, promotes, protects, challenges, and, when necessary, replaces** its understanding of truth.

That is the difference between a book of rules and a constitutional operating system for the pursuit of wisdom. The framework makes the Constitution itself a truth-finding machine.

---

## Two structures

The framework intentionally separates two structures that are often confused:

| Structure | Purpose | Location |
|---|---|---|
| **Authority hierarchy** | What currently governs decisions | `NORTH_STAR_SSOT.md`, registry Level 0–3 and 4–7, `SSOT_COMPANION.md` |
| **Knowledge-maturity ladder** | How an idea earns increasing confidence and may eventually become governing authority | Constitutional Research Registry + individual item metadata |

Candidate principles, provisional theories, and proposed Laws of Success live in the research registry. They may influence experiments, but they do **not** silently govern the company.

---

## Levels of Constitutional Authority

Every governing statement is classified into exactly one level. Levels inherit upward: a lower level cannot contradict a higher level, but it can add specificity. Implementation (Level 8) has no constitutional authority.

| Level | Name | Question answered | Change frequency | Enforced by |
|---|---|---|---|---|
| 0 | **North Star — Purpose** | Why do we exist? | Almost never | Culture, founder intent, every receipt |
| 1 | **Foundational Principles** | What do we believe to be fundamentally true? | Very rarely | Council debate, research registry, confidence model |
| 2 | **Constitutional Laws** | What must always happen? | Rarely, by amendment | `builder:preflight`, runtime gates, SENTRY |
| 3 | **Constitutional Processes** | How do constitutional decisions occur? | Occasionally | Amendment workflow, promotion/demotion flow |
| 4 | **Organizational Governance** | Who decides and builds? | As needed | `BP_PRIORITY.json`, `COUNCIL` registry, office contracts |
| 5 | **Operating Doctrine** | How do we currently execute? | Constantly | `docs/SSOT_COMPANION.md`, `docs/AGENT_RULES.compact.md`, runbooks |
| 6 | **Product Governance** | What is true for one product? | Per product | `docs/products/<id>/PRODUCT_HOME.md` + optional `GOVERNANCE.md` |
| 7 | **Implementation (Level 7)** | What did we actually ship? | Every commit | Code, prompts, schemas, APIs — no constitutional voice |

### Relationship to existing documents

- `docs/constitution/NORTH_STAR_SSOT.md` is **Level 2** constitutional law and contains **Level 0** purpose and **Level 1** foundational principles.
- `docs/SSOT_COMPANION.md` and `docs/AGENT_RULES.compact.md` are **Level 5** operating doctrine.
- `docs/products/<id>/PRODUCT_HOME.md` (and optional `GOVERNANCE.md`) are **Level 6** product governance.
- Every `.js`, `.mjs`, `.sql`, `.json` file is **Level 7 implementation**. If code starts acting like law, the error is in Level 2/3/5/6, not in Level 7.

---

## The Knowledge Ladder

Nothing jumps a rung. Reality is allowed to promote or demote any item.

```text
Idea
  ↓ (recorded as observation)
Observation
  ↓ (tested as explanation)
Hypothesis
  ↓ (repeated evidence)
Emerging Pattern
  ↓ (outcomes improve consistently)
Supported Principle
  ↓ (survives challenge, earns enforcement)
Candidate Law
  ↓ (ratified through amendment process)
Constitutional Law
  ↓ (deeply validated, part of identity)
Foundational Principle
```

A principle can move **down** the ladder at any time if:
- new evidence contradicts it,
- its predictive success drops,
- it fails independent verification,
- a better explanation appears and survives more challenges.

**No grandfathering.** Nothing stays in the Constitution because it was once useful, because the founder likes it, or because it is embarrassing to remove.

---

## Confidence Model

Every constitutional statement receives two scores. Not because truth is relative, but because **our confidence is** and because a binding commitment is different from an empirical belief.

| Score | Meaning | Range |
|---|---|---|
| **Epistemic confidence** | How confident are we that this accurately describes reality or reliably produces the claimed outcome? | 0–100 |
| **Constitutional commitment** | How strongly has the organization committed to behaving according to this principle while it remains active? | 0–100 |

Example:
- “Never exploit a client’s vulnerability for company gain” may have epistemic confidence 99/100 and constitutional commitment 100/100.
- A provisional founder theory may have epistemic confidence 35/100, constitutional commitment 10/100, and research priority 80/100.

This prevents a low-confidence theory from becoming a powerful behavioral mandate merely because it appears in a constitutional discussion.

### Confidence dimensions

| Dimension | Weight | How measured |
|---|---|---|
| Evidence | 20% | Quantity and quality of supporting observations |
| Replication | 15% | Reproduced outcomes across contexts |
| Cross-cultural evidence | 10% | Holds across users, markets, teams, models |
| Longitudinal evidence | 15% | Holds over time and across versions |
| Independent verification | 15% | Confirmed by SENTRY, receipts, or external audit |
| Predictive success | 15% | Forecasts matched reality |
| Challenges survived | 10% | Number and severity of explicit challenges answered |

Epistemic confidence is computed from the registry metadata and updated after every review, challenge, or outcome comparison.

A confidence score below a level's threshold blocks promotion:
- Foundational Principle: epistemic ≥ 90
- Constitutional Law: epistemic ≥ 80
- Candidate Law: epistemic ≥ 60
- Supported Principle: epistemic ≥ 50
- Emerging Pattern: epistemic ≥ 40

A score can decrease. A law whose epistemic confidence falls below 70 enters mandatory review; below 60, it becomes a candidate for demotion.

---

## Constitutional Registry

The registry is the canonical machine-readable record of every item in the authority hierarchy. It is not optional documentation. It is the enforcement surface.

**Location:** `data/constitutional-framework/REGISTRY.json`

Each entry contains:

```text
- id                         (unique, e.g. "nssot-2-6")
- title                      (short human name)
- level                      (NorthStar|Principle|Law|Process|Governance|Doctrine|ProductGovernance|Implementation)
- purpose                    (one sentence)
- epistemic_confidence_score (0-100)
- constitutional_commitment_score (0-100)
- evidence_score             (0-100)
- evidence_level             (Idea|Observation|Hypothesis|EmergingPattern|SupportedPrinciple|CandidateLaw|ConstitutionalLaw|FoundationalPrinciple)
- enforcement_status         (enforced|partial|none|aspirational)
- enforcement_method         (preflight|runtime|manual|receipt|governance)
- promotion_date             (ISO 8601 or null)
- last_challenge             (ISO 8601 or null)
- last_review                (ISO 8601 or null)
- related_items              (list of ids)
- supersedes                 (list of ids)
- superseded_by              (list of ids)
- open_questions             (list of strings)
- source_file                (canonical file path)
- source_anchor              (heading/section reference, e.g. "§2.6")
```

### Registry rules

1. **No constitutional statement exists until it is in the registry.** If `NORTH_STAR_SSOT.md` says something but the registry has no entry, it is a draft, not law.
2. **The registry is append-only.** Superseded items are marked `superseded_by`, never deleted.
3. **The registry is machine-verified.** `node scripts/constitutional-framework.mjs verify` checks every `§` in `NORTH_STAR_SSOT.md` and every product governance file against the registry, and fails if an item is missing or has stale metadata.
4. **Product governance entries are registry entries.** Every `PRODUCT_HOME.md`/`GOVERNANCE.md` is represented as a Level 6 item in the registry.
5. **Implementation files must not appear in the registry as law.** Code is Level 7. If a code file claims constitutional authority, the registry verifier flags it as a drift violation.
6. **Aspirational statements are allowed but must be labeled.** If a principle or law has no enforcement mechanism, its `enforcement_status` is `aspirational` and its `constitutional_commitment_score` is low.

---

## Constitutional Research Registry

This is **not** an authority layer and does not govern production behavior.

It is the permanent laboratory for developing the Laws of Success, human-development principles, governance principles, and other candidate truths.

**Possible location:** `docs/research/principles/`

```text
PRINCIPLE_REGISTRY.json
LAWS_OF_SUCCESS.md
hypotheses/
evidence/
reviews/
```

Its maturity ladder is the Knowledge Ladder above. Items may also track:

- empirical support score
- replication score
- cross-cultural durability
- longitudinal durability
- predictive usefulness
- causal confidence
- ethical implications
- boundary conditions
- disconfirming cases
- research priority

The Constitution protects the honest process. The research registry holds the evolving discoveries.

---

## Constitutional Processes (Level 3)

See `docs/constitution/CONSTITUTIONAL_PROCESSES.md` for the full amendment, promotion, demotion, challenge, review, and retirement workflows.

The short form:

1. **Propose** — any agent or human records a candidate with evidence.
2. **Challenge** — the council (and `red-team`, `skeptic` lenses) must raise objections.
3. **Predict** — what will happen if the candidate is adopted?
4. **Experiment** — apply it in a bounded slice, measure outcomes.
5. **Compare** — reality vs. prediction.
6. **Promote or demote** — based on evidence, not preference.
7. **Record** — registry updated, `NORTH_STAR_SSOT.md` amended, receipt written.
8. **Review** — cadence set by the item's level; challenges restart the clock.

---

## Constitutional Manufacturing Pipeline

```text
Founder Intent
        ↓
       Chair
        ↓
   Conversation
        ↓
Context Assembly
        ↓
Council Selection
        ↓
Independent Reasoning
        ↓
    Consensus
        ↓
    Blueprint
        ↓
Blueprint Validation
        ↓
    Builder
        ↓
    SENTRY
        ↓
    Reality
        ↓
    Wisdom
        ↓
Blueprint Evolution
```

In this pipeline, the **Chair is an office, not a role or a fixed model.** The office may be held by OpenAI, Anthropic, another reasoning engine, or a human, selected by demonstrated capability for the specific decision. The Constitution protects the required properties of the office, not its current holder.

This pipeline is **operating doctrine** (Level 5). The Constitution protects the principles beneath it: independence, challenge, synthesis, evidence, calibration, and institutional learning.

---

## Enforcement

| Mechanism | Scope |
|---|---|
| `node scripts/constitutional-framework.mjs verify` | Pre-commit / `builder:preflight` — checks registry completeness and confidence thresholds |
| `node scripts/constitutional-framework.mjs review --id <id>` | Per-item review cadence check |
| `node scripts/constitutional-framework.mjs promote/demote` | Governance state transitions with receipt |
| Runtime council gates | Load-bearing decisions route through Chair/Council per `NORTH_STAR_SSOT.md` §2.0K |
| SENTRY Layer A+B | Reality verification before any product feature is called done |

---

## Transition from old structure

- `NORTH_STAR_SSOT.md` remains the supreme constitutional law file. It is now explicitly **Level 2** with **Level 0** and **Level 1** embedded.
- `POINT_B_DNA.md`, `LUMIN_COMMUNICATION_DNA.md`, and `LUMIN_DISPLAY_DNA.md` are **Level 5** operating doctrine unless they assert universal principle, in which case they are **Level 1** and must appear in the registry.
- `AMENDMENT_*.md` files in `docs/constitution/` that are product/mission amendments are reclassified as **Level 6** product governance or mission artifacts. The canonical path for ratification is now the registry + `NORTH_STAR_SSOT.md` amendment process.
- `SSOT_COMPANION.md` is **Level 5** operating doctrine.
- Product “constitutions” are renamed **product governance**. They inherit the company Constitution; they do not create sovereign mini-constitutions.

---

## Open constitutional questions

1. Should the confidence thresholds be level-specific or uniform?
2. How often should the entire registry be independently audited?
3. What is the minimum challenge protocol for a Level 1 demotion?
4. Which products should create an optional `GOVERNANCE.md` first, and who owns them?

---

**Next step:** Run `node scripts/constitutional-framework.mjs seed` to populate the registry from `NORTH_STAR_SSOT.md` and product governance files, then `node scripts/constitutional-framework.mjs verify` to review gaps.
