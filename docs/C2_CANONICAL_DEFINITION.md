# C2 — Canonical Definition (anti-drift)

**Authority:** Founder-aligned with `CODER_ZERO_DECISION_BUILD_SPEC_V1.md`, `FULL_FOUNDER_PACKET_V1.md`, `AMENDMENT_12_COMMAND_CENTER.md`.  
**Last updated:** 2026-06-09 (founder confirmation session)

---

## Founder's one-liner

**C2 is Adam's bridge to communicate with the system.**

Today that bridge is often **Cursor** (or another IDE). The **target** is a **LifeOS module** in one place — because LifeOS runs your life and you want everything convenient, not scattered across tools.

C2 is **not** the system. C2 is **how you talk to the system and how it talks back.**

---

## Formal name

**C2 = Command, Control, and Communication**

A **module inside LifeOS** — not a department, not a separate product, not a governance brain.

---

## What C2 is

| Role | Meaning |
|------|---------|
| **Bridge** | Your channel to send instructions and receive responses |
| **Cockpit** | See mission state, queues, what needs you, what's running |
| **Control surface** | Adjust detail density (headline vs deep dive); halt; approve |
| **Escalation lane** | Rare critical alerts only when harm is real and you can reduce damage |

**Implementation today (partial):** Command Center overlay + mission dashboard + communications API on Railway (`AMENDMENT_12`).

**Implementation target:** Same capabilities **inside LifeOS** so you don't need Cursor as the default bridge.

---

## What C2 is NOT (common agent drift — forbidden)

Agents have repeatedly drifted. **Stop the line** if you see these:

| Drift | Wrong | Correct |
|-------|-------|---------|
| **C2 = the brain** | "C2 runs/decides the system" | Council + governed loops decide; C2 surfaces and routes |
| **C2 = a department** | Listed alongside BPB, SENTRY, Builder as a "team" | C2 is a **LifeOS module**; others are factory actors |
| **C2 = BuilderOS** | Conflating command-control jobs with blueprint/build authority | C2 **intake**; BuilderOS **executes** governed build jobs |
| **C2 = strategy** | Product direction set in C2 chat | Strategy locks in **Product Development + Founder Packet** before BPB |
| **C2 = truth** | Dashboard green means done | SENTRY + receipts + readiness surfaces declare truth; C2 **displays** them |
| **C2 assigns work** | C2 tells Builder what to code | BPB blueprints + governed jobs assign work; C2 does **not** |
| **C2 replaces Council** | C2 chat substitutes multi-model review | Council governs; C2 communicates outcomes |
| **Cursor = permanent C2** | Assuming IDE is the architecture | Cursor is **interim bridge** until LifeOS C2 module is complete |

Receipt: `BUILDEROS_ALPHA_BLUEPRINT.md` 2026-06-02 **C2 drift correction** — replaced "C2 primary operating layer" with cockpit definition.

---

## Where C2 sits in the factory loop

C2 is **downstream of execution truth**, not upstream of blueprinting:

```text
Product Development → Founder Packet → BPB → SENTRY/Council (blueprint)
  → Builder → SENTRY verify → Historian → TSOS
  → C2 update (show Adam truthful state)
  → Alpha / Beta → loop
```

C2 **consumes** receipts and state. It does **not** replace SENTRY, Historian, TSOS, or Council.

---

## Critical escalation (narrow)

Escalate to founder **only** when **all** are true:

- Money, trust, or critical live operation is being harmed
- System could not stop or contain it
- Founder awareness reduces damage

**Not** for: routine builder blockers, low-confidence warnings, normal queue noise.

Source: `lifeos/c2/C2_ESCALATION_RULES.json`

---

## Cursor vs LifeOS C2 (today vs target)

| | Today | Target |
|---|--------|--------|
| **Talk to system** | Cursor chat, Command Center comms API | LifeOS C2 module (primary) |
| **See status** | Command Center / mission dashboard | Same, embedded in LifeOS |
| **Approve / halt** | Command Center, `pending_adam`, halt flag | Same, unified in LifeOS |
| **Build / blueprint** | Builder API, factory (not C2) | Unchanged — not C2's job |

---

## Files agents must read before mentioning C2

1. This file (`docs/C2_CANONICAL_DEFINITION.md`)
2. `factory-staging/lifeos/c2/C2_MODULE_CHARTER.md`
3. `docs/projects/AMENDMENT_12_COMMAND_CENTER.md` (runtime implementation)
4. `docs/architecture/BUILDEROS_COMMAND_CONTROL_PROTOCOL.md` — "C2 remains intake/control"

---

## Agent contract (one paragraph)

When you write or talk about C2: **bridge + cockpit inside LifeOS**, founder-facing communication and truthful status, adaptive density, rare critical escalation. Never call C2 the brain, a department, or the blueprint/build authority. Cursor is interim; LifeOS is home.
