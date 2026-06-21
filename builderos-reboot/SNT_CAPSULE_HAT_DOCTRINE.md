<!-- SYNOPSIS: SNT Capsule-Hat Doctrine — BuilderOS Alpha -->

# SNT Capsule-Hat Doctrine — BuilderOS Alpha

**Signed by:** SNT + Conductor consensus  
**Status:** Locked  
**Companion:** `SNT_LOOP_ESCALATION_DOCTRINE.md`, `LOOP_ESCALATION_CONTRACT.json`

---

## Separation of concerns

| Layer | Role | Replaceable? |
|-------|------|--------------|
| **Model** | Reasoning engine (gemini_flash, claude, etc.) | Yes — routing policy chooses |
| **Department hat** | Authority frame + veto domain (SNT, BPB, Hist, CFO, …) | No — governance identity |
| **REP capsule** | Domain toolbox (BuilderOS, LifeOS, Revenue, Relationship, …) | Loaded per task |
| **Task context** | Specific mission, phase, failure packet | Ephemeral |

**Analogy (Adam):**

- Long-term memory = **warehouse** (indexed, not loaded whole)
- Capsules = **toolboxes** (pull when needed)
- Active prompt = **workbench** (only what’s in use)

---

## Multi-hat without theater

One AI **can** wear multiple hats **only if**:

1. Each hat answers a **distinct required question**
2. Each hat has **veto power** on specific claim types (not decorative labels)
3. Output is **structured per hat**, not one blended essay

**Anti-pattern:** “As BPB and SNT and CFO, I agree everything looks good.”

**Pattern:** Per-hat sections with explicit PASS/FAIL/BLOCKED and veto lines.

### Default escalation pairing (2 AIs, not 6)

| AI | Hats | Primary question |
|----|------|------------------|
| **AI 1** | BPB + Hist + BuilderOS REP | Is the spec complete and historically consistent? |
| **AI 2** | SNT + CFO + Founder REP | Is evidence sufficient and cost proportionate? |

**AI 3 (optional):** SDO + LifeOS REP — only when security/platform boundary is in dispute.

This creates **real tension** without paying for six separate calls.

---

## Hat veto matrix (minimum)

| Hat | Can veto |
|-----|----------|
| SNT | Unsupported PASS, missing mechanical receipt, fake-green |
| BPB | Incomplete spec, ambiguous step, missing probe ID |
| CFO | Paid tier upgrade without budget flag |
| Hist | Contradiction with locked ledger / probe catalog |
| Founder REP | Scope creep, founder-attention budget violation |

---

## Free-tier routing (corrected)

**Not:** “We only use free tokens.”  
**Yes:** **Free-tier models are first priority daily** for tasks they are appropriate for (routing table in `config/task-model-routing.js`). Paid tiers when task class requires it — with CFO hat / budget flag.

---

## Build sequence

1. Loop escalation + failure packets (**now**)
2. Structured multi-hat Council prompts via gate-change API
3. Capsule retrieval router (warehouse → toolbox pull) — **after** Tier 1 habitual

Do not build full capsule router before mechanical receipts and escalation work.

---

## Memory integration (future)

`memory_capsules` + associative links exist in DB. Runtime should:

- Index warehouse by mission, domain, truth_class
- Pull 1–3 capsules per hat, not full memory dump
- Emit retrieval receipt (which toolbox opened)

**GAP:** Mission-aware pull not wired to builder loop yet.
