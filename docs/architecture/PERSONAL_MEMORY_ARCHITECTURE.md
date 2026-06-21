<!-- SYNOPSIS: Personal Memory Architecture -->

# Personal Memory Architecture

**Agent role:** Historian / Architecture Archaeologist  
**Mission date:** 2026-05-24  
**Companion:** [`MEMORY_ARCHITECTURE_ARCHAEOLOGY.md`](MEMORY_ARCHITECTURE_ARCHAEOLOGY.md), [`TRUTH_SYSTEM_ARCHITECTURE.md`](TRUTH_SYSTEM_ARCHITECTURE.md)  
**Status:** Archaeology only — **no new architecture proposed**

---

## Executive summary

Personal memory in LifeOS is **not one store**. It spans **product memory (capsules)**, **behavioral integrity tracking**, **conversation evidence**, **relationship intelligence**, **coaching/mirror systems**, and **backlog visions** (Victory Vault, relationship accounting, programs map). The **strongest cross-generation ideas** cluster around:

1. **Evidence before interpretation** (never confuse coaching insight with raw truth)
2. **Mirror-first identity** (reflect, don't flatter)
3. **Integrity / promise memory** (Word Keeper)
4. **Relationship as dyadic opt-in mirror** (not surveillance)
5. **Programs map** (cross-domain growth patterns)
6. **Adaptive voice** (communication profile + anti-formulaic — partial)

Institutional/evidence memory (Amendment 39) serves **system truth**. Personal memory serves **user outcomes** — and must stay **private by default** (C2 mission lock, AM21 sovereignty rules).

---

## 1. How the system proposes to remember individuals

### 1A. Identity & preferences

| Mechanism | Generation | Location | Implementation |
|-----------|------------|----------|----------------|
| **Communication profile** | Current | `services/communication-profile.js` | Weighted style selection from past interactions |
| **Response variety log** | Current | `response_variety_log` | Anti-repetition, forbidden phrases |
| **Lumin thread modes** | Current | `lifeos-lumin.js` | general, mirror, coach, finance, relationship, health, planning |
| **Personal idiom layer** | Backlog | AM21 #15 in backlog | Phrases/metaphors sounding like user — **not built** |
| **Assessment battery** | Backlog | AM21 P1 | Attachment, love language, conflict style — **not shipped** |
| **Adam twin / digital twin** | Partial | AM09, `twin-routes.js`, `outcome-tracker.js` | Idea ROI, not full identity map |
| **Voice preference onboarding** | Brainstorm | AM21, brainstorm catalog | Partial elsewhere |
| **Anchored declarations** | Backlog | AM21 #25 | Signed major life statements — **not built** |

**Strongest idea:** Adaptive communication profile + epistemic contract (honest, not flatter) — **partially wired** in Lumin only.

**Weakest link:** Personal idiom + assessment priors — spec-rich, code-thin.

### 1B. Goals & purpose

| Mechanism | Location | Status |
|-----------|----------|--------|
| **Commitments** | `commitment-tracker.js`, `lifeos_commitments` / `commitments` tables | Production — **split-brain** between tables (C2 mission) |
| **Vision / purpose profile** | AM21, chatgpt-import purpose signals | Partial import |
| **Joy checkins** | LifeOS core routes | Production |
| **Daily mirror log** | LifeOS core | Production |
| **Inner work log** | LifeOS core | Production |
| **Compounding timeline / future-you** | AM21 backlog #18 | Spec only |
| **Purpose-aligned energy windows** | AM21 differentiator #4 | Backlog |

**Strongest idea:** Commitments as **evidence-based** tracking (C2 founder lock) — canonical direction is `commitments` via tracker, not manual pick.

**Forgotten high-value:** Future-you nightly micro-commit — ties vision to daily action without streak guilt.

### 1C. Behavioral patterns

| Mechanism | Location | Status |
|-----------|----------|--------|
| **Integrity engine / Word Keeper** | `integrity-engine.js`, word-keeper routes | Production — scores, patterns, weekly coaching |
| **Emotional pattern engine** | AM21 Layer 4 spec | Partial — health/joy/mood correlations in backlog |
| **Decision intelligence** | `decision-intelligence.js` | Production — bias detection, energy profile |
| **Contradiction / belief archaeology** | `contradiction-engine.js` | Production |
| **Future-self simulator** | `future-self-simulator.js` | Production |
| **Interaction Evidence → pattern detection** | Conversation Evidence SSOT | Doc-strong — coaching hypotheses challengeable |
| **Cycle-aware decision guard** | AM21 #1 | Backlog — requires health+cycle+decisions fusion |
| **Health-adjusted commitment load** | AM21 #14 | Backlog |

**Strongest idea:** Integrity scoring + **evidence-backed** pattern detection (not motive claims over raw evidence).

---

## 2. Relationships & marriage context

### 2A. Implemented or partially implemented

| System | Location | What it remembers |
|--------|----------|-------------------|
| **Relationship intelligence** | `relationship-intelligence.js` | Patterns in relationship domain |
| **Relationship debrief** | `relationship-debrief.js` | Post-conflict reflection |
| **Mediation engine** | `mediation-engine.js` | Facilitated resolution (+ response variety) |
| **Communication coach** | `communication-coach.js` | Style coaching (+ variety) |
| **Memory relationship gates** | `memory-relationship.js` | truth_class guards for relationship-sensitive capsules |
| **Family OS tables** | `20260331_lifeos_family.sql` | `conversation_debriefs`, household structures |
| **Life coaching routes** | `routes/life-coaching-routes.js` | Coaching entry points |
| **Conflict intelligence** | `conflict-intelligence.js` | Conflict pattern support |

### 2B. Specified but not fully built (high-value backlog)

| Concept | AM21 reference | Description |
|---------|----------------|-------------|
| **Relationship integrity accounting** | Differentiator #16 | Dyadic promise mirror — what each said vs did, opt-in both sides |
| **Family integrity rollup** | #7 | Household aggregate "family keeps X% of promises to each other" |
| **Pair-calibrated truth delivery** | Sovereignty rules §616 | Truth style matched to partner being mirrored |
| **Joint mediation** | Communication OS | Shared mirror, not surveillance |
| **Parenting after-the-moment coaching** | AM21 parenting module | Not during conflict; repair paths |
| **Marriage as financial mirror** | AM21 finance layer | Money stress ↔ identity ↔ marriage linkage |

### 2C. Conversation-era ideas (dumps / idea vault)

| Theme | Source |
|-------|--------|
| Repair paths after rupture | Lumin-Memory dumps, AM38 Stream A |
| Household sync / opt-in dyad rules | AM21 sovereignty §616 |
| Mediation as product lane | Conversation Evidence SSOT consumers |
| "Never individual blame, always dyadic" | Family integrity rollup spec |

**Strongest cross-generation idea:** **Relationship memory as shared opt-in mirror** — not surveillance, not generic therapy-speak. Evidence before interpretation applies here too: store raw interaction evidence; layer coaching interpretation separately.

**Gap:** Marriage-specific **persistent dyadic store** is spec-rich (relationship integrity accounting) but **not a shipped unified table/service**.

---

## 3. Business & professional context

| System | Location | Scope |
|--------|----------|-------|
| **TC / ClientCare** | AM17, AM18 | Transaction coordination, billing recovery |
| **BoldTrail / CRM** | AM11 | Real estate CRM overlay |
| **Commitments (work)** | commitment tracker | Professional promises |
| **Command Center (C2)** | AM12, C2 mission | Operator cockpit — **private by default** founder lock |
| **Programs map — TC/sales/listing** | Conversation Evidence SSOT | Appointment workflows as consumers |
| **Financial mirror layer** | AM21 finance section | Mirror-first money clarity |
| **Decision ledger (founder)** | `decision-ledger.js` | Mission/control-plane decisions |

**Note:** Business context memory often lives in **CRM tables** and **commitments**, not capsule/evidence engine — unless explicitly imported.

---

## 4. Coaching systems & growth memory

### 4A. Production coaching surfaces

| Surface | Code | Epistemic hygiene |
|---------|------|-------------------|
| **Lumin coach mode** | `lifeos-lumin.js` | Full epistemic contract + variety |
| **Truth delivery** | `truth-delivery.js` | Variety + calibration log |
| **Integrity weekly coaching** | `integrity-engine.js` | Uses council |
| **Communication coach** | `communication-coach.js` | Variety; no explicit KNOW/THINK/GUESS |
| **Life coaching routes** | `life-coaching-routes.js` | Product entry |
| **Memory healing** | `memory-healing.js` | Therapeutic — different "memory" word |
| **Therapist integration boundary** | AM21 spec | Hand-off when AI reaches clinical boundary |

### 4B. Growth memory concepts (doc > code)

| Concept | Location | Status |
|---------|----------|--------|
| **Victory Vault** | AM21 Layer 5 | Capture real courage/repair moments — **backlog UI** |
| **Real-voice Victory Vault** | AM21 #15 | User's own audio as proof — **backlog** |
| **Failure museum** | AM21 #14 | Mistakes + what changed — **backlog** |
| **Emotional Wealth Engine** | AM21 Layer 5 | Emotional capital tracking — **backlog** |
| **Growth Memory** | Conversation Evidence SSOT | Subsystem identity name |
| **Programs map input** | Conversation Evidence SSOT | Pattern detection feeds map |

**Strongest idea:** **Victory Vault** — replay **actual proof** when doubt spikes instead of generic encouragement. Pairs with integrity engine and emotional pattern detection.

**Anti-pattern found:** Generic AI encouragement without variety engine — partially fixed on Lumin path only (see archaeology § voice gap).

---

## 5. Programs map

### 5A. Canonical hub

**File:** `docs/LIFEOS_PROGRAM_MAP_SSOT.md`  
**Role:** Navigation + queue authority — "where things live" before changing product  
**Companion:** `LIFEOS_DASHBOARD_BUILDER_QUEUE.json`, mockups in `docs/mockups/`

### 5B. Relationship to personal memory

The Programs Map is the **routing layer** for personal growth domains:

| Program lane | Personal memory input |
|--------------|----------------------|
| LifeOS core | Mirror, commitments, integrity |
| Family OS | Debriefs, household |
| Mediation | Shared conflict memory |
| Growth/coaching | Interaction evidence patterns |
| TC/sales/listing | Professional interaction evidence |
| Therapist export | Evidence packets (interpretation separated) |

**Interaction Evidence Engine** (`LIFEOS_CONVERSATION_EVIDENCE_SSOT.md`) is the **shared substrate** feeding multiple programs — not siloed per program.

### 5C. Operating modes (local-first)

| Mode | Behavior |
|------|----------|
| 0 Off | No capture |
| 1 Resting | Minimal |
| 2+ Active listening tiers | Consent-driven evidence capture |

**Archaeology note:** Modes are **specified in SSOT**; universal runtime enforcement across all overlays is **not verified** in this archaeology pass.

---

## 6. Long-term growth & compounding

| Concept | Generation | Location | Status |
|---------|------------|----------|--------|
| **Compounding institutional knowledge (system)** | 2026 design brief | MOAT for platform | AM39 path |
| **Compounding personal alignment** | AM21 mission | LifeOS north star | Product mission |
| **Joy correlation / energy observations** | LifeOS core | joy_checkins, health | Production tables |
| **HRV → stress → relationship** | AM21 pattern engine | Spec | Backlog fusion |
| **Emotional reserves tracking** | Emotional Wealth Engine | AM21 | Backlog |
| **Privacy-preserving aggregate research** | AM21 §601 | Architecture principle | Doc |
| **Deletion sovereignty** | AM21 | User owns raw records | Doc + partial |

**Strongest cross-generation principle:** Learn at ingest what can be learned; user retains destroy rights on raw records — **architecture principle in AM21**, implementation completeness varies by lane.

---

## 7. Strongest ideas across all generations (ranked)

Archaeology ranking for **personal/user outcome** value:

| Rank | Idea | Why it survived multiple generations |
|------|------|--------------------------------------|
| 1 | **Evidence before interpretation** | Appears in Conversation Evidence SSOT, C2 mission, AM21 honesty, design brief — consistent doctrine |
| 2 | **Mirror-first (don't flatter)** | AM21, Lumin contract, truth delivery, C2 density control |
| 3 | **Integrity / Word Keeper** | Implemented; crosses personal + relational promises |
| 4 | **Commitments as evidence-based** | C2 founder lock; chatgpt-import; event stream |
| 5 | **Relationship opt-in dyadic mirror** | AM21 sovereignty + relationship accounting backlog |
| 6 | **Victory Vault (real proof replay)** | Repeated in dumps, AM21, brainstorm — not yet UI |
| 7 | **Programs map as growth router** | SSOT hub + interaction evidence consumers |
| 8 | **Adaptive voice (anti-formulaic)** | AM21 + response-variety — partial wiring |
| 9 | **Local-first consent capture** | Conversation Evidence SSOT — privacy-forward |
| 10 | **Therapist boundary hand-off** | AM21 clinical limit — repeated in coaching specs |

---

## 8. Generation map (what each era contributed)

| Era | Approx date | Personal memory contribution | Fate |
|-----|-------------|------------------------------|------|
| **Early LifeOS / Notion dump** | Jan 2026 | Embedded vision in `memories.json` — parenting, integrity, mirror | Superseded; archive |
| **conversation_memory phase** | Jan–Mar 2026 | Chat turn storage | Legacy; not canonical |
| **LifeOS core tables** | Mar 2026 | commitments, integrity, joy, mirror, health, inner-work | **Production** |
| **Family / healing** | Mar 2026 | debriefs, memory healing, memory palace | Production (niche) |
| **Conversation Evidence SSOT** | Jun 2026 | Interaction Evidence Engine doctrine | **Doc-canonical** |
| **C2 / PSSOT mission** | 2026 | Private by default, evidence-first commitments | **Founder-locked direction** |
| **Capsule layer** | May 2026 | Governed product memory with relationship truth_class | Production |
| **Idea vault / dumps** | Ongoing | Brainstorm preservation | Input only |
| **Victory Vault / idiom / emotional wealth** | Brainstorm → AM21 backlog | Personal differentiation | **Deferred** |

---

## 9. Duplicate / contradictory personal memory paths

| Problem | Competing paths | Notes |
|---------|-----------------|-------|
| Commitments storage | `lifeos_commitments` vs `commitments` | C2 mission flagged — must consolidate in blueprint |
| Coaching voice | Lumin (variety) vs council/coach services (default voice) | Formulaic risk |
| Raw conversation | conversation-store vs interaction evidence vs event stream | Different purposes; easy to merge wrongly |
| Import pipelines | chatgpt-import vs lumin-memory-fetcher vs manual paste | Parallel ingest |
| Therapeutic vs institutional "memory" | memory-healing vs AM39 | Namespace collision |
| Interpretation vs evidence | Coaching outputs vs raw capture | Doctrine clear; enforcement partial |

---

## 10. Personal memory vs institutional memory (boundary)

```text
┌────────────────────────────────────────────────────────────┐
│              PERSONAL / PRODUCT MEMORY                        │
│  Capsules · integrity · conversations · interaction evidence│
│  Lumin threads · coaching · relationships · programs map      │
│  Private by default · user sovereignty · opt-in dyad          │
└──────────────────────────┬─────────────────────────────────┘
                           │ may inform (not auto-promote)
                           ▼
┌────────────────────────────────────────────────────────────┐
│           INSTITUTIONAL / BUILDEROS EVIDENCE                  │
│  epistemic_facts · OIL receipts · self-repair lessons       │
│  BuilderOS proof · agent performance · intent drift           │
└────────────────────────────────────────────────────────────┘
```

**Rule (KNOW):** Personal coaching insights **must not** silently promote to BuilderOS epistemic proof without governed write path.

---

## 11. Forgotten personal-memory concepts worth revisiting

| Concept | Source | Value |
|---------|--------|-------|
| Real-voice Victory Vault | AM21 #15 | Highest personal outcome impact |
| Relationship integrity accounting | AM21 #16 | Marriage/household differentiator |
| Personal idiom layer | AM21 backlog | Voice authenticity |
| Assessment battery priors | AM21 P1 | Pattern engine inputs |
| Cycle-aware decision guard | AM21 #1 | Unique fusion moat |
| Family integrity rollup | AM21 #7 | Household without blame |
| Emotional Wealth Engine | AM21 Layer 5 | Parallel to financial mirror |
| Failure museum | AM21 #14 | Pairs with Victory Vault |
| Programs map ← interaction evidence | Conversation SSOT | Cross-program growth |
| Financial empathy mode (dyad) | AM21 sovereignty | Money + marriage mirror |

---

## 12. Personal memory concepts to retire

| Retire | Reason |
|--------|--------|
| Generic encouragement without real proof | Violates mirror-first + Victory Vault direction |
| Surveillance framing for relationship features | Contradicts opt-in dyad sovereignty |
| Storing coaching interpretation as immutable truth | Violates evidence-before-interpretation |
| Using legacy memories.json for personal profile | Stale dumps, not live store |
| Formulaic AI voice on coaching paths | AM21 explicit anti-pattern; partial fix insufficient |

---

## 13. Implementation matrix (personal domains)

| Domain | Doc spec | Code | UI | Evidence hygiene |
|--------|----------|------|-----|------------------|
| Preferences/voice | Strong | Partial | Partial | Lumin only |
| Goals/commitments | Strong | Production | Partial | C2 lock |
| Behavioral patterns | Strong | Partial | Partial | Integrity yes |
| Relationships | Strong | Partial | Partial | Debrief yes |
| Marriage dyad | Strong | Backlog | No | Spec only |
| Business/professional | Medium | Production | Partial | CRM separate |
| Coaching | Strong | Production | Partial | Variable by path |
| Programs map | Strong | Hub doc | Partial | Router not fully live |
| Long-term growth | Strong | Backlog-heavy | Minimal | Victory Vault missing |

---

## 14. Cross-references

| Document | Role |
|----------|------|
| [`MEMORY_ARCHITECTURE_ARCHAEOLOGY.md`](MEMORY_ARCHITECTURE_ARCHAEOLOGY.md) | Full system inventory + Top 50 |
| [`TRUTH_SYSTEM_ARCHITECTURE.md`](TRUTH_SYSTEM_ARCHITECTURE.md) | Evidence → Confidence → Truth → Law |
| [`LIFEOS_CONVERSATION_EVIDENCE_SSOT.md`](../LIFEOS_CONVERSATION_EVIDENCE_SSOT.md) | Interaction Evidence Engine |
| [`LIFEOS_PROGRAM_MAP_SSOT.md`](../LIFEOS_PROGRAM_MAP_SSOT.md) | Programs hub |
| [`AMENDMENT_21_LIFEOS_CORE.md`](../projects/AMENDMENT_21_LIFEOS_CORE.md) | LifeOS mission + backlog |
| C2 mission `PSSOT.md` | Founder locks (private, evidence-first) |

**No new architecture proposed in this document.**
