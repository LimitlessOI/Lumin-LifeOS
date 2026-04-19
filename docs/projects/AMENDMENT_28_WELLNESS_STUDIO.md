# AMENDMENT 28 — Wellness Studio

| Field | Value |
|---|---|
| **Lifecycle** | `planning` |
| **Reversibility** | `two-way-door` |
| **Stability** | `draft` |
| **Last Updated** | 2026-04-03 (initial draft — features from memory file, conversation dump analysis, and LifeOS Core gap analysis) |
| **Verification Command** | `node scripts/verify-project.mjs --project wellness_studio` |
| **Manifest** | `docs/projects/AMENDMENT_28_WELLNESS_STUDIO.manifest.json` |
| **Build Ready** | `NOT_READY` — Gate 1: Detailed feature specs needed; Gate 2: LifeOS Core must ship first (this extends it) |

---

## Mission

The Wellness Studio is the **specialized clinical and recovery extension** of LifeOS. Where LifeOS Core serves the general human flourishing journey, Wellness Studio serves the harder edge: addiction recovery, special needs parenting, caregiver support, clinical therapy integration, and the deep relational repair work that requires more than a personal OS can hold alone.

This module is not built for everyone. It is built for the people for whom the stakes of getting well are highest.

---

## North Star Anchor

Every feature here must pass the same constitutional test as LifeOS Core: Does this serve what the person declared they want? Does it maintain their sovereignty? Does it never manipulate, surveil, or monetize suffering?

The added test for Wellness Studio: **Does this help at the boundary where AI coaching ends and clinical care begins?** This module does not replace therapists, addiction counselors, or psychiatrists. It serves the gap between appointments and extends the impact of those relationships.

---

## Feature Modules

### Module 1: Recovery & Relapse Support

For users in active recovery from addiction, behavioral cycles, or destructive patterns.

- **Recovery baseline onboarding** — user declares their recovery context (substance, behavior, timeline, current support structure); establishes baseline for pattern monitoring; never stored without explicit consent
- **Relapse early warning system** — monitors behavioral signals (sleep disruption, social withdrawal, stress spike, commitment breakdown, joy score crash) for patterns that historically precede relapse for this specific user; surfaces the pattern before the behavior, not during or after
- **Trigger mapping** — user and system collaboratively identify and tag their personal relapse triggers; over time the system gets better at catching the precursor signals
- **Accountability link** — user designates one trusted person (sponsor, therapist, partner); system can send anonymized alerts with user's pre-set consent ("I want you to know if my risk signals go high")
- **Overdose risk detection** — integrates with Apple Watch HR/SpO2 abnormality detection; immediate alert chain activation; designed for households where overdose risk is present, not just for the user themselves
- **Recovery milestone tracking** — celebrates clean time without making the number the only thing; tracks the real growth happening in parallel (relationships repaired, commitments kept, joy sources rebuilt)
- **Honourable Exit from relapse** — if a relapse occurs, the system does not shame; it helps the person document what happened without editing, reset without catastrophizing, and reconnect to their recovery community

### Module 2: Special Needs Parenting

For parents of children with autism, ADHD, sensory processing disorders, developmental delays, and other special needs.

- **Child profile (special needs context)** — specific diagnosis/condition, communication style, sensory profile, known triggers, successful strategies that have worked
- **IEP and care plan companion** — help parents track, understand, and advocate for their child's educational and therapeutic plan; what was agreed to, what's being implemented, what needs follow-up
- **Behavior interpretation lens** — when a meltdown or behavioral event happens, the system helps the parent understand it through the child's actual experience (sensory overload, communication failure, routine disruption) rather than through a disciplinary lens
- **Parent regulation coaching** — special needs parenting has an extremely high caregiver burnout rate; the system monitors parental stress signals and provides regulation support before the parent reaches critical depletion
- **Sibling dynamics coaching** — support for neurotypical siblings who often feel invisible; helping parents allocate attention with intention
- **Transition support** — major life transitions (school changes, puberty, loss of a pet, changes in routine) are especially hard for many special needs children; the system provides advance preparation strategies

### Module 3: Caregiver Support (Alzheimer's / Dementia)

For adult children or partners caring for a parent or spouse with Alzheimer's or dementia.

- **Caregiver emotional triage** — caregiver grief (anticipatory grief, identity grief, relationship grief) is different from standard grief; this module recognizes those patterns specifically
- **Stage-appropriate communication strategies** — what to say, what not to say, how to redirect rather than correct; strategies that reduce conflict and preserve dignity
- **Caregiver burnout detection** — monitors for isolation, sleep loss, abandonment of self-care, resentment patterns; intervenes before collapse
- **Memory care documentation assistant** — what behaviors are new? What triggers difficult episodes? What brings peace? System helps track these so care can be calibrated
- **Family coordination layer** — when multiple family members share care responsibility, helps manage communication, task distribution, and emotional labor visibility
- **Respite planning** — builds and protects respite time; the system treats the caregiver's recovery as non-negotiable, not optional

### Module 4: Therapist Integration

The clinical hand-off protocol — making AI coaching and licensed therapy work together rather than substitute for each other.

- **Therapist profile setup** — user inputs their therapist's name, approach (CBT, IFS, EMDR, somatic, etc.), session frequency, and focus areas; system calibrates its own support to complement not compete
- **Between-session support** — the system does the work that belongs between appointments: tracking homework assignments, logging triggering events, capturing what came up since last session, preparing the user for what to bring in
- **Session prep brief** — 24 hours before a therapy appointment, system generates a structured brief: what came up this week, key emotional events, patterns observed, open questions for the therapist
- **Pattern sharing (consent-gated)** — with explicit user consent, system can export a structured summary for the therapist (never raw transcripts; always user-reviewed before sharing)
- **Crisis routing** — when the system detects signals beyond what AI coaching should hold (suicidal ideation language, acute trauma activation, psychiatric emergency), it immediately surfaces the therapist's contact, crisis line, and nearest emergency resource; does not attempt to coach through clinical crisis
- **Therapy effectiveness tracking** — over months and years, what approaches correlate with actual behavior change for this person? The system surfaces this back to the user (not to the therapist without consent)

### Module 5: Conflict Repair Simulator

Practice repairing relationships before doing it in real life. High-stakes conversations deserve rehearsal.

- **Scenario setup** — user describes the relationship, the rupture, and what they want to repair; system builds a realistic AI representation of the other person based on what the user knows about them
- **Repair conversation practice** — AI plays the other person with realistic emotional responses; not a pushover; challenges the user's framing if it's off; helps them find what is true and workable
- **Coaching between turns** — after each exchange, system can offer: "That landed well because..." or "That might have closed them down because..." — coaching in the gap, not during the moment
- **Empathy mapping** — what might the other person have needed that they didn't say? What might they have heard that isn't what you meant? System surfaces these blind spots
- **Outcome paths** — the user can try multiple approaches and see which ones the simulation suggests would lead toward repair vs further rupture
- **Bridge statement library** — phrases that open rather than close; specific to this relationship and this rupture; not generic scripts

### Module 6: Boundary Mastery

Boundaries are one of the most misunderstood and undertrained life skills. This module builds the actual skill.

- **Boundary inventory** — what boundaries does the user currently hold? Which ones do they struggle to maintain? Which ones don't exist but should?
- **Boundary language lab** — practice stating boundaries clearly; AI coaches on specificity, firmness, and non-escalation; common mistakes identified (JADE — Justify, Argue, Defend, Explain — is one of them)
- **Violation tracking** — with user consent, track when stated boundaries are violated (by whom, how often, whether addressed); pattern visibility
- **Boundary-setting practice** — role-play high-stakes boundary conversations with specific real-world scenarios the user provides; full coaching loop
- **Integrity alignment** — boundaries that aren't held score in the Integrity layer; the system connects boundary maintenance to the broader identity work

### Module 7: Partner Sync Mode

For couples who want to do the work together, with shared visibility where chosen and protected privacy where needed.

- **Shared commitment visibility** — what each partner committed to the relationship; tracked; celebrated when kept; the system doesn't adjudicate — it just reflects
- **Relationship weather dashboard** — both partners see the same relationship health view; transparent, not one-sided; requires both to opt in
- **Aligned goals view** — where do your goals overlap? Where do they diverge? The system surfaces this as information, not conflict
- **Mutual morning intention** — optional shared daily intention; "what are we building today together?"
- **Protected individual space** — each person has fully private space the other cannot see; Partner Sync is opt-in at the feature level, not a surveillance layer
- **Couples work mode** — when both partners are actively doing inner work, system can surface connective insights: "You both logged high depletion this week — here's what that usually means for couples in your pattern"

---

## Revenue Model

| Tier | Price | What's Included |
|---|---|---|
| LifeOS Core | $29–$97/mo | Everything in AMENDMENT_21 |
| Wellness Studio Add-on | +$29/mo | All Wellness Studio modules (Recovery, Special Needs, Caregiver, Therapist, etc.) |
| Clinical Partnership | $500–$2,000/mo | Therapist dashboard, patient brief exports, practice integration |
| Recovery Program Bundle | $197/mo | Designed for recovery programs to offer to clients as an accountability tool |

---

## Pre-Build Readiness Gates

### Gate 1: Feature Detail
- [x] Recovery module: full feature set defined
- [x] Special needs parenting: full feature set defined
- [x] Caregiver support: full feature set defined
- [x] Therapist integration: full feature set defined
- [x] Conflict repair simulator: full feature set defined
- [x] Boundary mastery: full feature set defined
- [x] Partner sync mode: full feature set defined

### Gate 2: Dependency on LifeOS Core
- [ ] LifeOS Core Phase 1-8 must be deployed and stable
- [ ] This module extends existing tables (joy_checkins, integrity_score_log, wearable_data, emotional_patterns) — no schema conflicts allowed before build
- [ ] Therapist integration requires communication-profile.js and truth-delivery.js already wired (Phase 8 ✓)

### Gate 3: Competitive Landscape
- No existing product combines recovery monitoring + AI coaching + therapist hand-off in one platform
- BetterHelp / Talkspace: pure therapy matching, no behavioral monitoring
- Sober Grid / Loosid: recovery community apps, no AI coaching layer
- Differentiation: Wellness Studio is the connective tissue between self-work and clinical care — a category that doesn't exist yet

### Gate 4: Risk Analysis
- **Clinical liability risk**: System must never represent itself as providing clinical care; crisis routing must be instant and unambiguous; HIPAA implications if therapists access user data (must consult before building therapist dashboard)
- **Overdose detection false positive risk**: Too many false alerts = feature abandoned; must be calibrated conservatively with explicit user-set threshold
- **Recovery module sensitivity**: Relapse data is among the most sensitive possible; extra encryption + extra access controls + full local-only option

### Gate 5: Differentiation
- Purpose-first framing (not disease management)
- Sovereignty model: user controls everything including what their therapist sees
- Emotional Wealth Engine: tracks what's being built, not just what's going wrong
- Family-aware: caregiver support, special needs, partner sync — not just individual-centric

---

## Build Priority (Post LifeOS Core)

1. **Therapist Integration** — clearest value, lowest liability risk, directly extends existing architecture
2. **Conflict Repair Simulator** — standalone, high demand, builds on mediation engine already built
3. **Boundary Mastery** — standalone module, no external dependencies
4. **Partner Sync Mode** — extends Family OS, most of the infrastructure exists
5. **Special Needs Parenting** — extends Parenting Module, high emotional value, niche but loyal market
6. **Recovery & Relapse Support** — highest impact, highest risk, most careful build required
7. **Caregiver Support** — overlaps with Recovery module emotionally; build last so shared patterns can be reused

---

## Change Receipts

| Date | Change | Author |
|---|---|---|
| 2026-04-03 | Initial draft — all 7 modules defined; revenue model; readiness gates | Claude |
