# SNT Gold Mining Doctrine — Innovation Council

**Signed by:** SNT + Founder consensus  
**Status:** Locked  
**Related:** `docs/architecture/factory-v1-blueprint-pack/GOLDMINE_PASS_V2.md`

---

## Purpose

Scheduled **outside-the-box** thinking: challenge assumptions, search for gaps, cross-pollinate ideas, refine gold for founder decision. **Must not interrupt the build loop** or become avoidance during blockers.

---

## Funnel (generation ≠ delivery)

| Phase | Count | Output |
|-------|-------|--------|
| **Diverge** | **≥25 ideas mandatory** | Raw list — push past obvious |
| **Cluster** | Group into buckets | Themed clusters |
| **Converge** | Top **5–7** scored | Cost / risk / feasibility |
| **Founder packet** | Top **3–5 refined** | Adam session — decision, not brainstorming |

**SNT “3 ideas”** = founder delivery count, **not** generation minimum. Generation without breadth produces recycled obviousness.

---

## Category grid (diverge requirement)

At least **one idea per bucket** (forces gap-finding):

1. Cost reduction / token efficiency
2. Evidence / truth / fail-closed
3. Memory / retrieval / capsules
4. Human attention reduction
5. Revenue / product / customer
6. Weird / nobody’s tried this

---

## Cadence — weekly slot vs biweekly (founder decision aid)

### The tension

| Weekly | Biweekly |
|--------|----------|
| Keeps innovation on the calendar | Less risk of “think instead of ship” |
| Matches fast-moving Alpha | Matches long blocker phases |
| Can feel like pressure during P0 | Can feel like innovation is forgotten |

### Recommended hybrid (locked default)

**Weekly calendar slot + automatic skip gate.**

- **Every week:** slot exists on calendar (rhythm matters)
- **If skip gate fires:** session becomes **Blocker Review** (30 min max) — not Gold Mining
- **If skip gate clear:** full Gold Mining session runs

**Skip gate (any = no Gold Mining):**

- Active mission with `telemetry_enforcement` + `TIER1_FAIL`
- P0 blocker on critical path
- Loop escalation at **escalate** or **hard_stop** tier
- No open `innovation_questions` in queue (useful-work guard)

**When skip fires:** log `GOLD_MINING_SKIPPED` with reason — not silent cancel.

### Why not pure biweekly?

Pure biweekly loses rhythm during intense build weeks when you *could* innovate safely. Pure weekly ignores that **innovation during unresolved evidence gaps is avoidance**. Hybrid gives rhythm without mandating burn.

Adam can override skip gate explicitly (`founder_force_gold_mining: true`) — costs attention budget consciously.

---

## Session rules

1. **Useful-work guard** — no open question → no session
2. **Web claims need URL or GUESS label** — no fiction mining
3. **Does not block build loop** — async to conductor observe path
4. **Output artifact:** `GOLD_MINING_RESULT.json` — 25+ raw, clusters, top 5–7, founder 3–5
5. **Free-tier first** for diverge/cluster; paid tier only for converge if needed (CFO hat)

---

## Founder participation

Near end of funnel: **3–5 refined ideas** with why / cost / risk / test-now|later|archive. Adam joins for **decision**, not 25-idea raw dump.

---

## Anti-patterns

- Gold Mining while Tier 1 failing on active mission (**avoidance**)
- 3 ideas only in diverge (**shallow**)
- 100 ideas to founder (**attention abuse**)
- Weekly session with no skip gate during P0 (**drift**)

---

## Schedule (default)

- **Slot:** Weekly (day TBD in `MISSION_QUEUE.json` or scheduler)
- **Gate:** Skip → Blocker Review or idle
- **Duration cap:** 90 min autonomous + 30 min founder optional

**Mechanical enforcement:** pending scheduler + `createUsefulWorkGuard()` — GAP-FILL after loop escalation wired.
