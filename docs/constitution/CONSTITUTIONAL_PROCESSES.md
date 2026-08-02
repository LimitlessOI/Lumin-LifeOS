<!-- SYNOPSIS: Constitutional processes — amendment, promotion, demotion, challenge, review, retirement. -->

# Constitutional Processes (Level 4)

**Status:** RATIFIED — subordinate to `docs/constitution/NORTH_STAR_SSOT.md` and `docs/constitution/CONSTITUTIONAL_FRAMEWORK.md`.  
**Registry:** `data/constitutional-framework/REGISTRY.json`  
**History log:** `data/constitutional-framework/HISTORY.jsonl`  
**CLI:** `node scripts/constitutional-framework.mjs`

---

## 1. Amendment Process

### 1.1 Propose

Any agent or human may propose a new constitutional item by creating a file in `docs/constitution/proposals/`:

```text
docs/constitution/proposals/YYYY-MM-DD-title.md
```

The proposal must contain:
- **Title** and proposed level
- **Purpose** (one sentence)
- **Source** (idea, observation, hypothesis, pattern, principle, or law)
- **Evidence** (observations, experiments, outcomes)
- **Prediction** (what will happen if adopted)
- **Failure conditions** (what would prove it wrong)
- **Open questions**

### 1.2 Challenge

The Chair convenes a council with at least:
- `skeptic` lens
- `red-team` lens
- `devils-advocate` lens
- the lens most closely related to the proposal's domain

The council must produce:
- a list of unresolved objections, if any
- an `unknowns`, `assumptions`, and `risks` list
- named disagreements with per-lens confidence scores

If objections cannot be answered, the proposal is demoted or returned for more evidence.

### 1.3 Experiment

The proposal is applied to a bounded slice (one product, one script, one verification gate) and reality is measured.

### 1.4 Predict → Reality → Calibrate

Before the experiment, record a prediction. After the experiment, compare to reality. Update confidence, model ranking, and capsule trust from the delta per `NORTH_STAR_SSOT.md` §2.0L.

### 1.5 Ratify

For **Level 3 Constitutional Law**:
- AI council unanimous or near-unanimous vote
- 7-day review window
- Human Guardian approval for high-risk, money, auth, or constitutional-structure changes
- Registry updated
- `NORTH_STAR_SSOT.md` amended with the new clause
- Receipt written to `products/receipts/CONSTITUTIONAL_*.json`

For **Level 1 Foundational Principle**:
- 30-day review window
- Independent verification by SENTRY or external audit
- Founder approval

For **Level 7 Product Constitution**:
- Product council review
- No contradiction with higher levels
- Product home `GOVERNANCE.md` updated

---

## 2. Promotion Process

A candidate moves up the Knowledge Ladder when:
- evidence and replication meet the next level's threshold
- it has survived explicit challenges
- a prediction it made has been confirmed by reality

The CLI command:

```bash
node scripts/constitutional-framework.mjs promote --id <id> \
  --evidence "experiment X, receipts Y" \
  --confidence 82 \
  --review-cadence 90
```

This appends a `PROMOTED` event to `HISTORY.jsonl` and updates the registry.

---

## 3. Demotion Process

An item is demoted when:
- new evidence contradicts it
- its confidence score falls below the level threshold for two consecutive reviews
- a better explanation survives more challenges
- it has been superseded by another item

The CLI command:

```bash
node scripts/constitutional-framework.mjs demote --id <id> \
  --reason "contradicted by experiment Z" \
  --superseded-by <new-id>
```

Demotion does not delete. The item remains in the registry with `superseded_by` and `status: demoted`. `NORTH_STAR_SSOT.md` is amended to note the supersession.

---

## 4. Challenge Process

Any agent or human may challenge any constitutional item at any time.

```bash
node scripts/constitutional-framework.mjs challenge --id <id> \
  --question "Does this hold when X?" \
  --evidence "observation file or receipt"
```

The challenge:
- sets `last_challenge`
- triggers a council review
- updates confidence if evidence is strong
- may trigger demotion

There is no shame in challenge. There is shame in unchallenged certainty.

---

## 5. Review Process

Each level has a default review cadence:

| Level | Review cadence |
|---|---|
| North Star | annual |
| Foundational Principle | semi-annual |
| Constitutional Law | quarterly |
| Product Governance | per product release or quarterly |
| Process / Governance / Doctrine | quarterly |
| Research candidate | monthly while active |

```bash
node scripts/constitutional-framework.mjs review --id <id>
```

A review updates:
- `last_review`
- confidence score
- evidence score
- open questions
- related items

---

## 6. Retirement Process

An item is retired only when:
- it has been superseded by another item, or
- it has been demoted to Candidate and then disproven, or
- it explicitly violates a higher-level item.

Retirement does not delete. The registry marks `status: retired` and `superseded_by`. `NORTH_STAR_SSOT.md` may be edited to remove or annotate the clause through the amendment process.

---

## 7. Emergency Change

In rare cases, a higher-level item may need emergency change to prevent harm.

1. Record the emergency in `data/constitutional-framework/EMERGENCY_DECISIONS.jsonl`.
2. Apply the minimal change needed to prevent harm.
3. Convene council within 24 hours to confirm, amend, or revert.
4. Update registry and `NORTH_STAR_SSOT.md`.

Emergency change is not a shortcut. It is a temporary override with a mandatory review.

---

## 8. Dispute Resolution

If the Chair and Council cannot reach consensus:
1. Record named disagreements.
2. Escalate to the Human Guardian (founder) with a structured recommendation and a prediction of each option.
3. The founder decides or sends the matter back for more evidence.
4. The decision is recorded in the registry and `NORTH_STAR_SSOT.md` if it changes law.

---

## 9. Enforcement Process

1. `builder:preflight` runs `node scripts/constitutional-framework.mjs verify`.
2. The verifier checks that every clause in `NORTH_STAR_SSOT.md` and every product constitution is represented in the registry.
3. It checks that confidence scores and review dates are within thresholds.
4. It checks that no Level 8 implementation file claims constitutional authority.
5. Failures are recorded in `data/constitutional-framework/VERIFICATION_FAILURES.jsonl` and fail the preflight.

---

**Next step:** `node scripts/constitutional-framework.mjs seed` then `node scripts/constitutional-framework.mjs verify`.
