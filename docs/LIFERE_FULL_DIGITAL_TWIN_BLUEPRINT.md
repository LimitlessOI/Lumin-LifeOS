<!-- SYNOPSIS: LifeRE — Full Digital Twin Blueprint (Universal Framework + Founder Extensions) -->

# LifeRE — Full Digital Twin Blueprint

**Authority:** `docs/LIFERE_MASTER_BLUEPRINT.md` · `docs/products/LIFERE.md`
**Part Two:** `docs/LIFERE_PROMPT_PART_TWO_ADDENDUM.md`
**Last Updated:** 2026-06-13 (Architect revision — per-user twins, not shared monolith)

---

## CORE RULE

**Every user owns their twins.** There is no single system twin that holds everyone's data.

LifeRE consumes **projections** from user-scoped twins. Founder Extensions and Relationship Twins are **optional layers** with explicit consent boundaries.

Twin updates require **evidence + receipt**. LLM may propose; storage accepts only labeled, reviewable mutations.

---

## LAYER MODEL

```
┌─────────────────────────────────────────────────────────────┐
│  Lumin Chair (front door) + Council Router                  │
│  Autonomy Ladder (0–5) + Permission Twin                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  FOUNDER EXTENSIONS (Adam/Sherry household only)                │
│  Adam · Sherry · Marriage · Family · Household · Founder Gov  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  RELATIONSHIP TWINS (edges: marriage, client, team, broker)   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  UNIVERSAL TWIN FRAMEWORK (every user_id)                     │
│  Personal · Personality · Communication · Goal · Skill      │
│  Performance · Future · Memory                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  OPTIONAL MODULE TWINS (LifeRE business lane)                 │
│  Business · Marketing · Client · Lead · Recruiting · Txn · …  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  ENGINES (cross-cutting)                                      │
│  Scenario · Opportunity Cost · Experiment · Best Practice   │
│  Strategy Evolution                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  MEMORY INPUTS (evidence)                                     │
│  BoldTrail · TC · Marketing · Activity · LifeOS · Receipts    │
└─────────────────────────────────────────────────────────────┘
```

---

## UNIVERSAL TWIN FRAMEWORK (every user)

Storage root: `data/twins/{tenant_id}/{user_id}/{twin_key}.json`

| Twin | Models | Key fields |
|------|--------|------------|
| **Personal Twin** | Whole-person context | name, roles, timezone, energy_pattern, motivations, demotivators, decision_patterns, blind_spots, strengths, weaknesses, fears, constraints |
| **Personality Twin** | Character | humor, beliefs, confidence, warmth, directness |
| **Communication Twin** | Voice | phrases[], tone_vector, story_style, banned_phrases[] |
| **Goal Twin** | Outcomes | horizons: 90d, 1y, 5y; weights: income, family, freedom, health |
| **Skill Twin** | Capability | modules[], scores{}, practice_hours{}, last_drill |
| **Performance Twin** | Activity math | funnel_counts{}, conversion_rates{}, source_roi{} |
| **Future Twin** | Trajectory | current_path_projection, confidence, assumptions[] |
| **Memory Twin** | Recall index | capsule_refs[], episodic_summaries[] (pointers only) |
| **Permission Twin** | Autonomy | action_type → level 0–5, bounds JSON (mirrors DB) |

---

## OPTIONAL MODULE TWINS (LifeRE)

Enabled per subscription / role. Same storage pattern under `modules/`.

| Module twin | Purpose |
|-------------|---------|
| Business Twin | GCI targets, team structure, broker rules |
| Marketing Twin | Channels, content ROI, ad spend |
| Client Twin | Buyer/seller profiles (lawful scope) |
| Lead Twin | Pipeline stages, speed-to-lead |
| Buyer / Seller / Listing Twin | Deal-side context |
| Transaction Twin | File stage, blockers (from Am 17) |
| Market Twin | Comps, inventory (API-fed) |
| Content Twin | Formats, hooks library, calendar |
| Recruiting Twin | Candidate pipeline |
| Finance Twin | Commission forecast, runway (mirror-first) |
| Motivation Twin | Milestones, streaks (non-dark-pattern) |

**Agent Twin (RE role):** Composition of Personal + Personality + Communication + Business + Performance for the **agent user** — not a separate global entity.

---

## FOUNDER EXTENSIONS (Adam household)

**DECISION MADE:** Only users with `founder_extension: true` or `household_member: sherry` load these twins.

| Twin | Owner | Consumes | Produces |
|------|-------|----------|----------|
| **Adam Twin** | Adam | LifeOS personal, decisions, energy, motivations, demotivators, fears, strengths, weaknesses, decision patterns, blind spots, opportunity cost, time allocation, BuilderOS telemetry (consent), relationship with Sherry | Chair context, opportunity cost inputs, governance optimization |
| **Sherry Twin** | Sherry | Sherry LifeOS lane ( walled ) | Household wisdom signals (consent) |
| **Marriage Twin** | Relationship | Both communication prefs + shared goals | Tradeoff flags for Chair |
| **Family Twin** | Household | Family OS, children goals | Calendar protection rules |
| **Household Twin** | Shared | Calendar, shared finance view | Shared weekly plan |
| **Founder Governance Twin** | Platform | BP_PRIORITY, receipts, Point B | Not personal therapy data |

**BuilderOS learning:** May read **aggregated, non-PII patterns** from Adam Twin execution (task success rates) — never Sherry's private lane without her consent.

---

## RELATIONSHIP TWIN

Storage: `data/twins/{tenant_id}/relationships/{edge_id}.json`

```json
{
  "edge_id": "adam_sherry_marriage",
  "type": "marriage",
  "parties": ["user_adam", "user_sherry"],
  "trust_level": 0.92,
  "communication_style": "direct_with_humor",
  "friction_points": ["schedule_overload", "builder_hours"],
  "shared_goals": ["family_dinner_4x_week", "financial_runway"],
  "history_summary_ref": "memory_capsule:..."
}
```

Edge types: `marriage`, `client`, `team`, `broker`, `coach`, `recruit`.

---

## FUTURE · SCENARIO · OPPORTUNITY COST

| Engine | Question |
|--------|----------|
| **Future Twin** | If current behavior continues for 90 days, what likely happens? |
| **Scenario Twin** | Compare branch A vs B vs C (time allocation scenarios) |
| **Opportunity Cost Engine** | Rank paths by Goal Twin weight vector |

Example scenarios (founder):
- 20h BuilderOS/week → product velocity ↑, prospecting ↓, family hours ↓
- 20h prospecting/week → pipeline ↑, BuilderOS stall risk
- Mixed path → Pareto frontier surfaced to Chair

Output schema: `data/lifere-scenarios/{user_id}/{scenario_id}.json` with `paths[]`, `goal_scores{}`, `label: KNOW|THINK`.

---

## LEARNING ENGINE

| Engine | Input | Output |
|--------|-------|--------|
| **Experiment Engine** | A/B variant IDs, exposure, conversion | `experiment_receipt.json` |
| **Best Practice Engine** | Winning experiments above threshold | Playbook row promotion |
| **Strategy Evolution Engine** | Drift in conversion rates | Updated recommendation weights |

Learning updates **recommendation weights** — never auto-executes outbound without Autonomy Ladder check.

---

## LUMIN COUNCIL (invoke matrix)

Lumin routes; roles advise. Disputes: **Sentry > CFO > Chair > Adam** on safety/cost; **Advocate > Chair** on user sovereignty.

| Role | Invoke when | Authority ceiling | Context slice |
|------|-------------|-------------------|---------------|
| **Chair** | Every turn | Orchestrate, no silent execute | All twins (scoped) |
| **CFO** | Cost, ROI, model pick | Block expensive path | Performance, Finance |
| **Builder** | Code/blueprint execute | Route to BuilderOS only | Founder Gov |
| **Sentry** | Risk, compliance, honesty | Veto outbound | Permission, compliance |
| **Wisdom** | Lessons, drift | Advisory | Memory, receipts |
| **Oracle** | Forecast, scenario | Advisory | Future, Scenario |
| **Advocate** | User sovereignty | Veto manipulation | Goal, Personal |
| **Marketing Director** | Content, ads | Draft/queue | Marketing, Content |
| **Recruiting Director** | Hiring pipeline | Draft/queue | Recruiting |
| **TC Director** | Transaction blockers | Draft/queue | Transaction |

Config source: `config/lifere-council-roles.json` (locked) + `services/lifere-council-router.js`

Per role — **responsibilities, authority ceiling, inputs, outputs, invoke triggers, escalation** — see config file. Summary:

| Role | Responsibilities | Authority | Escalation |
|------|------------------|-----------|------------|
| **Chair** | Orchestrate every turn; plain English + receipts | No silent execute | Adam on tie / blocker |
| **CFO** | Model cost, ROI, ad spend caps | Block expensive path | Chair |
| **Builder** | Route build/deploy to BuilderOS | BuilderOS only | Chair |
| **Sentry** | Compliance, TCPA, fair housing, honesty | Veto outbound | Advocate → Adam |
| **Wisdom** | Lessons, drift, playbook history | Advisory | Chair |
| **Oracle** | Forecast, scenario, opportunity cost | Advisory | Chair |
| **Advocate** | User sovereignty, anti-manipulation | Veto dark patterns | Adam |
| **Marketing Director** | Content, hooks, calendar, social | Draft/queue L2 | Sentry |
| **Recruiting Director** | Pipeline, agendas, hire follow-up | Draft/queue L2 | Sentry |
| **TC Director** | Deadlines, missing docs, client TC updates | Draft/queue L2 | Sentry |

---

## AUTONOMY LADDER (Permission Twin)

Per `action_type` (e.g. `sms_client`, `email_lead`, `post_social`, `boldtrail_note`):

| Level | Name | Behavior |
|-------|------|----------|
| 0 | suggest | Show idea only |
| 1 | draft | Generate draft |
| 2 | draft_queue | Draft + approval queue |
| 3 | pattern_execute | Send if matches approved template hash |
| 4 | bounded | Auto within caps (count/day, recipient class) |
| 5 | full | Auto in defined domain |

**DECISION MADE:** Default outbound = **level 1**. Adam founder = may grant **level 4** for `boldtrail_note` after explicit receipt.

---

## LIFEOS INTEGRATION (life-optimal rule)

Before LifeRE ranks a business action top-1:

1. Read Goal Twin weights (income vs family vs health)
2. Read calendar load + health signal from LifeOS (consent)
3. If conflict → Chair returns **tradeoff prose**, not silent override

Marriage Twin may elevate family constraint above GCI for a given window (e.g. date night block).

---

## FEEDBACK LOOPS

1. Approve/reject draft → Communication Twin
2. Activity log → Performance Twin
3. Experiment result → Best Practice Engine
4. Close/lose deal → Skill + Performance cohort
5. Founder usability → product receipt (not model training)

---

## RECEIPTS

Schema: `lifere_twin_update_v1`, `lifere_scenario_v1`, `lifere_experiment_v1`

Chair must emit: `COMMAND_RAN | NO_COMMAND_RAN`, `receipt_path`, `first_blocker`.

---

## IMPLEMENTATION PHASES (runtime — post blueprint)

| Phase | Deliverable |
|-------|-------------|
| BP | MASTER + FULL_DIGITAL_TWIN + BUILDER_DIGITAL_TWIN + config/lifere-*.json |
| W1 | Performance Twin + twin storage + command center panel |
| W2 | Permission Twin + follow-up + client comms + LifeOS crosscheck |
| W3 | Personality calibration + skill coaching (24 modules) |
| W4 | Full MarketingModule (30 video types, hooks, calendar, funnel, social) |
| W5 | TC + recruiting + finance + opportunity + receptionist + outreach |
| W6 | Founder extensions + relationship + scenario + learning + council |

See `docs/LIFERE_BLUEPRINT_ROADMAP.json` and `docs/LIFERE_BUILDER_DIGITAL_TWIN.md`.
