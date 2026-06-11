# SNT Epistemic Language — BuilderOS / Cursor Communications

**Standing principle for all agents (Cursor, Conductor, SNT, BPB, CDR):**

> **FAIL is feedback, not defeat. The objective is truth, not green status.**

> **A verified FAIL advances the mission further than an unverified PASS.**

---

## Do not conflate these three states

| State | Verdict | Meaning |
|-------|---------|---------|
| **BuilderOS Alpha Foundation** | PASS | Platform spine, governance, routing — operational |
| **Deliberation v2.7 SNT Live** | PASS / PROVEN | 9/9 live verification on Railway |
| **FACTORY-DELIBERATION-SENTRY-REGRESSION-0001 BP Audit** | Evidence not yet established | Exit criteria unsatisfied — **not** an architecture failure |

---

## Say this — not that

| Avoid | Prefer |
|-------|--------|
| Mission failed | Current hypothesis failed validation |
| Mission failed | Exit criteria not yet satisfied |
| Mission failed | Evidence gap identified |
| We need a PASS | We need a **trustworthy verdict** |
| BP phase failed (emotional) | BP phase: mechanical receipt missing |
| Green = success | Truth = success |

---

## What failure means in engineering terms

Failure is:

- An **observation**
- A **receipt**
- A narrowing of the **search space**
- A reduction in **uncertainty**

Failure is **not**:

- A negative outcome to apologize for
- A reason to stop the autonomous loop
- Emotional defeat

The BP phase is doing its job when it discovers that the current implementation path **cannot yet support a trustworthy verdict**. That is valuable information — it tells the system where to focus next.

---

## Desired outcome (this mission)

**Not:** “Produce PASS.”

**Yes:** “Produce a trustworthy verdict.”

A mechanically generated **`BP_AUDIT_FAIL` with evidence** is **progress**. It satisfies a large part of the proof requirement because it demonstrates:

- Governance works
- Evidence gates work
- BPB return routing works
- Unsupported completion claims are rejected
- The system can audit itself without Adam intervention

**SNT preference order:**

1. `BP_AUDIT_FAIL` with evidence (improves the system)
2. `BP_AUDIT_PASS` with evidence (exit if criteria met)
3. ~~`BP_AUDIT_PASS` with weak evidence~~ (hidden risk — reject)
4. ~~Prose/narrative PASS without receipt~~ (fake-green — reject)

---

## BP exit criteria (unchanged, reframed)

The mission is **not** failing because the verdict is FAIL.

The mission is **not complete** because there is **no authoritative mechanical verdict yet**.

Exit requires a runnable script that:

1. Executes successfully (`node --check` + run)
2. Produces `SENTRY_CHECK_RESULT.json`
3. Includes evidence-backed `checks[]`
4. Returns honest `BP_AUDIT_PASS` or `BP_AUDIT_FAIL`
5. Exits 0 only on PASS; FAIL routes to BPB automatically

---

## Current SNT status (observation)

| Signal | State |
|--------|-------|
| Loop active | YES |
| Governance active | YES |
| Self-healing active | YES |
| Fake-green prevention active | YES |
| Mechanical audit receipt present | NO |
| BP phase complete | NO |

**SNT verdict:** `BP_PHASE_FAIL` — **evidence not yet established**

The autonomous pipeline appears **alive and behaving substantially better** than earlier fake-green attempts (attempt #5 blocked: invalid async, wrong paths, hallucinated probe IDs — correct behavior).

---

## For Cursor / Conductor responses

When reporting BP phase status, use:

```text
Status: Exit criteria not yet satisfied (evidence gap)
Milestone: Produce trustworthy verdict (PASS or FAIL with SENTRY_CHECK_RESULT.json)
Architecture: Healthy — governance rejecting unsupported claims
Next: Mechanical runner → honest receipt → BPB return if FAIL
```

Do **not** frame as “the mission failed” without the evidence-gap qualifier.

---

## Telemetry doctrine (companion)

See **`builderos-reboot/SNT_TELEMETRY_DOCTRINE.md`** — measure structural beams (Tier 1), not every nail. Alpha exit bar: nine questions answered on every mission. Full Mission Forensics comes **after** Tier 1 is habitual.
