# AMENDMENT 21 — LifeOS Core

| Field | Value |
|---|---|
| **Lifecycle** | `founding-document` |
| **Reversibility** | `one-way-door` |
| **Stability** | `constitutional` |
| **Last Updated** | 2026-04-17 (centralized LifeOS user resolution via new `services/lifeos-user-resolver.js` — shared, case-insensitive, trimmed — replacing 16 inline `resolveUserId` implementations that silently 404'd on any non-lowercase handle; made `xxx_master_log.sql` idempotent; added Brain Dump panel to Quick Entry overlay wired to `/events/capture`; added unified LifeOS event stream capture/apply APIs plus escalation ladder controls in Notifications (overlay -> SMS -> alarm -> call) backed by `20260417_lifeos_event_stream.sql`, `20260417_lifeos_notification_escalation.sql`, `services/lifeos-event-stream.js`, and the hardened `services/lifeos-notification-router.js`; added native LifeOS calendar tables and Google Calendar sync; fixed Health route user resolution against `lifeos_users.user_handle`; normalized key user-facing overlays to respect `lifeos_user`; fixed a broken mediation inline script literal discovered during full overlay syntax audit; **shipped `public/overlay/lifeos-finance.html`** covering summary / transactions / budget / goals / IPS on top of the existing finance routes, and wired it into `lifeos-app.html` sidebar + More sheet + `PAGE_META`; hardened `LIMIT` handling in finance `listTransactions` and core `/commitments` against non-numeric query input that previously produced `LIMIT NaN` crashes) |
| **Verification Command** | `node scripts/verify-project.mjs --project lifeos_core` |
| **Manifest** | `docs/projects/AMENDMENT_21_LIFEOS_CORE.manifest.json` |

**Last Updated:** 2026-04-17

---

## Mission

**Purpose is medicine.**

The single most treatable root cause of human suffering — depression, anxiety, addiction, broken relationships, unfulfilled potential — is living out of alignment with what you are actually built for. LifeOS finds that alignment, holds it up like a mirror, and then does the work to make it real.

This system does not manage tasks. It manages a life.

---

## North Star Anchor

Help each person become who they say they want to be — not who we think they should be. The system serves declared direction only. It never steers. It never manipulates. It helps each person see clearly, act deliberately, and live in alignment with their own stated values.

**The test for every feature:** Does this help the person become what THEY said they want? If yes, build it. If it pushes them somewhere they did not ask to go, do not build it.

---

## Constitutional Principles

### 1. Sovereignty
We do not manipulate. Ever.

We help people understand the real cost of their stated goals. We ask honest questions. We surface truths they may not want to hear — but only truths they asked for. We explore both sides of any argument. We help a person become the best, most thoughtful version of what they already believe. We do not have an agenda beyond their stated agenda.

Politically and ideologically neutral. A conservative and a progressive will both find this system fights for their flourishing. A Mormon, an atheist, a Buddhist — the system helps each be the fullest version of themselves.

### 2. Honesty Over Comfort
The system delivers hard truths — but in the way each person can actually receive them. Not softened until they're meaningless. Calibrated to the person's current capacity to hear. Timed for when they're open, not when they're defended. Effective truth delivery is a measurable skill the system gets better at over time for each user.

### 3. Be-Do-Have
The operating framework for everything.

**BE** — Identity comes first. Who are you? What do you believe about yourself and your life? The system works at the identity layer, not just the task layer. A person who believes they are healthy makes different choices without willpower. Identity is upstream of behavior.

**DO** — The actions that person naturally takes. The system makes the right actions frictionless and helps automate the ones the person does not need to be personally present for.

**HAVE** — Results follow identity and action. Not the other way around. The system does not chase outcomes directly — it builds the person who naturally produces those outcomes.

### 4. What You Focus on Expands
The system monitors what creates joy, peace, and flourishing for each person specifically. It does not assume. It observes, learns, and reflects back. If a person says they want fitness but their actual joy scores spike when they're creative — the system surfaces that truth before they waste another decade chasing the wrong identity.

### 5. Purpose Monetized
People do not need to suffer to survive. Whatever a person is built for can be identified, developed, and turned into economic contribution. The system automates the parts they don't love. It amplifies the parts they do. It never traps them in tasks that should belong to an AI.

---

## The New Economy Thesis

AI will eliminate 90% of jobs over the next 20 years. The answer is not to slow AI down. The answer is to help people become fully human — to do the work that only humans can do: create meaning, build relationships, raise children well, pursue purpose, experience joy, live with integrity.

The people who thrive in the next economy will not be the ones who competed hardest with machines. They will be the ones who understood who they were and built a life around that.

LifeOS is the infrastructure for that transition. Not productivity software. Not a task manager. The operating system for a human life in a world where what makes you irreplaceable is your humanity.

---

## Scope

### In Scope
- Personal OS (ADD brain support, commitment tracking, automation engine)
- Communication gateway (call screening, SMS triage, outreach on behalf)
- Health Intelligence (wearables, sleep, nutrition, pattern correlation)
- Holistic medical backend (whole-body systems view, food-as-medicine, pattern detection)
- Emotional intelligence layer (debrief, tone analysis, truth delivery calibration)
- Family OS (multi-person sync — initially Adam + Sherry)
- Parenting module (coaching after difficult moments, repair paths)
- Integrity Score (gamified alignment tracking)
- Joy Score (what creates joy and peace, monitored and reflected back)
- Purpose Discovery Engine (find what you're built for, monetize it)
- Children's App (age-appropriate, curiosity-first, Dream Builder)
- Dream Funding model (no repayment, 10% pay-forward)
- Human Flourishing Data Layer (aggregate research, privacy-first)
- Emergency detection (abnormal vitals, fall detection, alert chain)
- **Personal Finance OS** — budgeting, cashflow clarity, savings goals, debt visibility (user-directed), household money views (opt-in)
- **Investment intelligence (non-advisory)** — investment policy statement (IPS), allocation vs target, DCA discipline, fee/drag visibility, paper portfolios, and **clearly labeled** historical simulations (e.g. internal backtest scripts) for learning only

### Out of Scope
- Generic productivity / GTD tools
- Social media or content platforms
- Anything that generates revenue for LifeOS through user manipulation, attention harvesting, or dark patterns
- **Personalized investment advice, tax, or legal recommendations** unless offered through a properly licensed human or registered channel; the product surfaces *your* stated policy and *your* data — it does not tell you what to buy
- Gamified trading, leverage prompts, paid order flow, or “signals” marketed as returns

---

## Product Layers

### Layer 1 — The Mirror (Build First)
The single daily view that tells the truth about your life. No spin.

- **Be-Do-Have snapshot** — identity layer from Digital Twin: who you are being right now vs who you said you want to be
- **Open commitments** — what you said you'd do; what's overdue; what needs a decision
- **Health snapshot** — sleep last night, how the body is doing, energy correlation
- **Integrity Score** — single number; trending up or down; no judgment, just truth
- **Joy Score** — what created joy or peace in the last 7 days; what depleted it
- **Today's intention** — one thing, stated in identity language (I am someone who...)
- **One hard truth** — one thing the system sees that the user may be avoiding; delivered in their calibrated style

### Layer 2 — The Engine (Automation)
The system does the work the user doesn't need to be personally present for.

- **Commitment capture** — logs commitments from conversations (text, voice, linked from calls)
- **Commitment follow-through** — prods at the right time; escalates if no action; closes the loop
- **Outreach automation** — sends emails, makes calls, schedules appointments on behalf
- **Communication gateway** — Twilio number as front door; screens calls; triages texts; surfaces what needs attention vs handles the rest
- **Calendar management** — protects time; declines things that don't align with stated priorities; never lets the urgent crowd out the important

### Layer 3 — Health Intelligence
The body is not a collection of isolated symptoms. It is one system.

- **Wearable integration** — Apple Watch: HRV, resting HR, sleep stages, activity
- **CGM integration** — continuous glucose monitoring; food-energy correlation
- **Manual logging** — food, drink, medications, mood; friction minimized
- **Pattern engine** — sleep → cognition → mood → decisions correlation; food → energy → behavior correlation; HRV → stress → relationship quality correlation
- **Holistic view** — no compartmentalization; every system informs every other system
- **Emergency detection** — abnormal HR, fall/passout detection, alert chain (Sherry first, then escalation)
- **Pre-disease detection** — pattern shifts before symptoms appear; system flags early and explains why
- **Medical context generator** — before any doctor visit, generates a full-body context summary the doctor actually needs but would never get from a 15-minute appointment
- **Relapse detection** — monitors behavioral and health signals for patterns consistent with addiction relapse or regression into previous destructive cycles; notifies the user and optionally their support person (never without explicit consent)
- **Overdose risk alerts** — integrates with wearable HR/SpO2 abnormality patterns to flag potential overdose situations; triggers emergency alert chain immediately; designed for users in recovery or with at-risk household members
- **Therapist integration** — structured hand-off protocol when AI coaching reaches the boundary of what it should handle; system identifies the signal (grief spike, crisis language, pattern severity), surfaces it clearly, and facilitates connection to the user's designated therapist or crisis line; AI does not attempt to replace clinical intervention

### Layer 4 — Family OS
Initially: Adam + Sherry. Designed to extend.

- **Shared commitments** — what each person committed to the other; tracked; celebrated when kept
- **Emergency Repair Button** — instant access to the repair protocol during or immediately after a conflict; bypasses all navigation; surfaces the debrief, empathy map, and repair sentence starters in one tap; designed for high-emotion moments when executive function is low
- **Sync layer** — both lives in one view when useful; separate when appropriate
- **Relationship health score** — not surveillance; a shared mirror; what's working, what needs attention
- **Communication debrief** — after a hard conversation, the system debriefs: what was said, what was underneath it, what each person was actually needing; AI-supported understanding, not AI-substituted understanding
- **Tone intelligence** — full audio/tone context, not just text memory; the system understands the emotional reality, not just the words
- **Truth delivery calibration** — how does each person receive hard truths? What lands and what triggers defensiveness? The system learns and adjusts. Over time, it becomes profoundly effective at helping each person see clearly.

### Layer 5 — Emotional Intelligence
The interior life is not separate from performance. It is upstream of everything.

- **Daily emotional check-in** — what's the emotional weather? Not to fix it — to name it
- **Pattern observation** — what triggers depletion? What creates expansion? Across weeks, months, years
- **Integrity alignment** — what did I say I'd be? What was I actually being today? No shame — just data
- **Inner work tracker** — what practices is the person doing? What's producing results?
- **Victory Vault** — capture real moments of courage, integrity, repair, discipline, and breakthrough; replay the actual proof when doubt spikes instead of offering generic encouragement
- **Therapy effectiveness** — for users in therapy, what approaches correlate with actual behavior change?
- **Self-Sabotage Monitor** — detects repeating behavioral patterns that contradict the user's stated goals; not shame-based, just observed; surfaces specific recurring sabotage signatures (e.g. "you start every new project with high energy for 11 days then disengage") with the user's own data as evidence
- **Emotional Wealth Engine** — measures and builds emotional capital as a parallel to financial wealth; tracks emotional reserves (resilience, connection depth, inner stability) over time; flags depletion before it becomes crisis; shows compounding effect of emotional investment (relationships repaired, practices maintained, hard truths absorbed)

### Layer 6 — Parenting Module
Hard parenting moments are information. They deserve a debrief, not shame.

- **After-the-moment coaching** — not during; not in front of the child; when the parent is ready to learn
- **Repair paths** — concrete, age-appropriate ways to repair with a child after a rupture
- **Pattern interruption** — the system identifies generational patterns (what was modeled for you that you're now modeling for them) and offers specific alternatives
- **Generational pattern tracking** — long-arc analysis of inherited behavioral, emotional, and relational patterns across generations; helps the user see which family patterns they are consciously or unconsciously perpetuating, and tracks progress in breaking them
- **Developmental context** — what is the child actually capable of at this age? What does this behavior mean developmentally?
- **Progress tracking** — not grades on parenting; real observation of what's working with this specific child

### Layer 7 — Children's App
Age-appropriate. Curiosity-first. Joy-first.

- **Not another screen addiction machine** — purposeful time; bounded; always oriented toward the real world
- **Visual experiential learning** — learns through doing, building, exploring; not passive consumption
- **Dream Builder** — what do you want to create in your life? The app makes it real and small enough to start
- **Curiosity engine** — follows the child's actual interests; goes deep; connects knowledge across domains
- **Character building** — integrity, generosity, courage; taught through story and action, not lecture
- **Parent transparency** — parent always sees what the child is doing; no hidden space; age-appropriate privacy introduced gradually with trust

### Layer 8 — Dream Funding
Every person has a dream. The system funds it.

- **Dream identified** — through the purpose discovery engine; through conversation; through the Joy Score
- **Funding mechanism** — as the person's purpose generates economic contribution, a portion seeds the dream
- **No repayment** — this is not a loan
- **Pay-forward** — 10% of any dream fulfilled goes to fund a stranger's dream or a cause the person believes in; creates a generosity chain that compounds
- **Dream visibility** — the dream is named, tracked, celebrated; the system reminds you why you're doing the hard work

### Layer 9 — Purpose Discovery Engine
Find what you're built for. Then build a life around it.

- **Inventory** — what creates energy? What drains it? What do you do better than almost anyone you know? What would you do if money weren't a variable?
- **Pattern synthesis** — the Digital Twin + Joy Score + Emotional Intelligence layer combine to surface what the system observes vs what the user believes about themselves
- **Monetization map** — for each purpose pattern identified, what are the real economic paths? Not generic advice — specific, researched, connected to actual market demand
- **Automation plan** — what parts of the person's purpose work can be automated? Where should they protect their presence?
- **Identity reinforcement** — once found, the system helps the person inhabit the identity. Not fake it. Build it through small, specific actions that accumulate into belief.
- **Live CoPilot sessions** — real-time AI session with a designated CoPilot persona (configured by user); for moments when the person needs a thought partner right now, not later; session generates a summary + behavior observation after; distinct from scheduled check-ins

### Layer 10 — Human Flourishing Data Layer
The byproduct of helping millions of people is the world's most honest dataset on human flourishing.

- **Privacy-first** — individual data is never sold or exposed; only aggregated patterns at scale
- **Research layer** — what interventions actually produce lasting behavior change? What therapy approaches work? What correlates with sustained joy?
- **Honest science** — unlike most behavioral research (short time windows, artificial settings, financial incentives to find positive results), this data is real, longitudinal, and self-selected by people who want to understand themselves
- **Contribution to humanity** — LifeOS publishes what it learns about what helps humans flourish; this is part of the mission, not just a business asset

### Layer 11 — Community & Meta Layer
Growth does not stop at the individual. LifeOS can support small trusted containers without becoming a social network.

- **Privacy-safe flourishing network** — only anonymized aggregate insight across consenting users
- **Group coaching containers** — AI-facilitated weekly check-ins for small trusted groups
- **Accountability partnerships** — structured one-to-one follow-through loops
- **Quarterly life review** — long-horizon reflection, not endless daily optimization
- **Sovereign AI mentor** — years of data distilled into direct, honest reflection without violating user sovereignty

### Layer 12 — Personal Finance, Budgeting & Investment Intelligence
Money is not separate from identity, stress, marriage, or purpose — it is one of the loudest mirrors. This layer is **mirror-first**: clarity, alignment, and sovereignty — not optimization of LifeOS revenue via financial nudges.

- **Cashflow truth** — income, fixed obligations, discretionary buckets; user-named categories tied to values (not generic “misc”)
- **Budget modes** — envelope, zero-based, or “good enough” weekly spend caps; seasonal templates (holidays, travel, newborn, job change)
- **Runway & resilience** — emergency-fund months, liquidity warnings, explicit “no shame” framing when the mirror is red
- **Debt visibility** — balances, minimums, payoff order *the user chooses*; optional snowball/avalanche math as neutral tools
- **Goals linked to life** — same engine as commitments: Dream Funding, Purpose monetization, and named savings targets share one language (“what this money is for”)
- **Household money (opt-in)** — shared budgets and category visibility with explicit scopes per linked account (Family OS extension); no hidden surveillance of a partner’s spending
- **Investment policy statement (IPS)** — user-authored or co-authored with optional prompts: risk tolerance, time horizon, ethical screens, “never rules” (e.g. no margin)
- **Allocation vs target** — read-only or CSV/import holdings snapshots; drift alerts; rebalance *reminders* only, execution always explicit
- **Fee & drag literacy** — expense ratios, advisory fees, tax-cost awareness (educational framing; not tax advice)
- **DCA / discipline hooks** — optional scheduled nudges aligned to user-declared plan; never FOMO language
- **Purchase prediction (impulse prevention)** — detects pre-purchase behavioral patterns (stress signals, time-of-day, prior impulse sequences) and offers a configurable pause before executing; user-defined: amount threshold, categories to monitor, pause duration; never blocks — always the user's choice; surfaces the pattern without judgment
- **Research sandbox (internal)** — scripts such as `attention-momentum-backtest.mjs` / `strategy-benchmark-suite.mjs` are **historical simulations** for operator learning; any UI surfacing must label **past performance ≠ future results** and **not investment advice**
- **Consent & security** — finance connectors (e.g. aggregation APIs) off by default; consent ledger entries per connection; minimal retention of credentials; aligns with Data Sovereignty section

---

## Product Enhancement Backlog — Flourishing Mechanics

Captured product ideas to implement over time (prioritize against Build Priority). None of this overrides sovereignty, honesty, or fail-closed rules. Items are **not** promised in a single release.

**Storage hook (v1):** merge arbitrary keys into `lifeos_users.flourishing_prefs` via `PATCH /api/v1/lifeos/users/:handle/flourishing-prefs` (e.g. `ambivalence_until`, `quiet_until`, `depletion_tags`, `failure_museum_opt_in`). Product behaviors still ship incrementally.

1. **Ambivalence mode** — hold “I don’t know yet” without daily nudges; resurface on user-chosen date or event.
2. **Relationship-to-the-tool check-ins** — “Is LifeOS helping, hovering, or hijacking?”
3. **Structured counter-case** — for major decisions, optional steelman of the *other* side using *your* values and constraints.
4. **Seasonal operating templates** — different defaults for winter, travel, newborn, crunch season.
5. **Transition & grief lane** — move/loss/job change tag lowers performance expectations and tracks “enough.”
6. **Energy budgeting (not hour budgeting)** — plan by cognitive-load bands (deep / shallow / recovery).
7. **Local-only vault** — journal/voice slice that never syncs unless explicitly exported.
8. **Sealed decision receipts** — short “why I chose this” locked until reopen date (reduces retroactive rationalization).
9. **Anti-nudge days** — read-only quiet days; proves non-engagement-optimized design.
10. **Read-only trust views** — partner/clinician sees only user-authorized aggregates, not raw transcripts.
11. **Values drift radar** — compare past stated values to recent behavior signals; tension not shame.
12. **7-day micro-experiments** — hypothesis → baseline → intervention → outcome wired to existing signals.
13. **Consent & integration ledger** — human-readable log of connections and data classes (extends Phase 8 ethics).
14. **Failure museum** — complement to Victory Vault: mistakes + what changed.
15. **Personal idiom layer** — phrases and metaphors so mirrored language sounds like the user.
16. **Depletion taxonomy** — quick tags when “drained” (people, pace, meaning, body, money anxiety).
17. **Somatic micro check-in** — minimal body scan → one number + optional word.
18. **Hard-conversation prep** — stakes, fears, boundaries, one response card (distinct from generic chat).
19. **Kid-line → developmental lens** — parent input → developmental read + repair sentence starters (extends Parenting module).
20. **Commitment physics** — visualize overload; suggest drops/defers, not new habits.
21. **Accountability one-pager** — from purpose work, user-edited shareable summary for one trusted person.
22. **Gentle migration paths** — import packs (Health exports, journals, calendars) to reduce switching cost.
23. **Role rehearsal studio** — timed pitch or hard conversation; structure + specificity feedback, not cheerleading.
24. **Cold-open morning protocol** — optional first-minute ritual: one question + one self-number + no feed.
25. **Anchored declarations** — optional signed timestamp / content hash for rare major life statements (integrity anchor).

**Finance-specific extensions (backlog, same rules):** values-tagged spending; “stress spend” pattern hints; subscription audit assist; bill-calendar + cashflow calendar; couple money protocols (opt-in); tax **document** organization (not advice); inheritance/legacy folder next to Layer 11 legacy themes.

---

## Integrity Score

A single number from 0–100. Gamified. Trending matters more than absolute value.

**Inputs:**
- Commitments made vs kept (weighted by importance, not just count)
- Inner work done (practices, reflection, debrief completion)
- Health alignment (doing what you said you'd do for your body)
- Generosity actions (giving time, attention, money, dream funding)
- Repair actions (after ruptures — did you go back and make it right?)
- **Financial alignment (opt-in)** — progress toward user-stated budget caps, savings goals, or IPS discipline when Layer 12 is enabled; never scored without explicit tracking consent

**Rules:**
- No judgment from the system — just data
- Only tracks what the user chose to track
- History preserved always — the arc matters more than the snapshot
- Can never be used competitively — this is not a leaderboard; it is a mirror

---

## Joy Score

What creates joy and peace, monitored and reflected back.

- Observed from: check-ins, conversation analysis, health correlations, completion patterns
- Not assumed — learned from this specific person
- Reported as: weekly summary, pattern over time, what expanded joy vs what contracted it
- Used by: the system to suggest what to do more of; to protect time for what works; to surface when a stated goal conflicts with actual joy patterns

---

## Data Sovereignty & Ethics — Constitutional

This section is non-negotiable. It is part of the founding architecture, not a policy that can be changed later.

### The Data Belongs to the Person
- All recordings stay on the user's device. The system never holds audio files server-side without explicit opt-in.
- The user can delete everything — every log, every recording, every score, every insight — at any time, permanently, with no recovery window.
- Deletion means deletion. Not soft-delete. Not "we keep anonymized signals." Full erasure on demand.
- The system must be designed so that individual deletion does not compromise aggregate research integrity. These are not in conflict if the architecture is right: learn what needs to be learned at ingest time, then the raw record is the user's to keep or destroy.

### What We Learn vs What We Keep
- Aggregate patterns (what correlates with joy, what precedes depression, what therapy approaches produce change) are extracted at the insight layer, not stored as individual records.
- No individual profile is ever exposed outside the user's own view.
- Research outputs are statistical and anonymized before they leave the platform.

### What We Never Do
- **Never sell user data for marketing.** Not behavioral data. Not health data. Not purchase patterns. Not location. Not conversation content. Not inferred emotional states. None of it.
- **Never use data to target advertising.** The system does not run ads. It does not sell attention. It does not create profiles for external use.
- **Never share individual data with insurers, employers, governments, or any third party** without explicit, specific, revocable consent for each use.
- **Never build a surveillance layer.** The system watches what the user consents to watch. It does not run in the background inferring things the user didn't ask it to track.

### Constitutional Lock — Multi-Party Consensus Required

Once the system is operating in the real world and the founder is satisfied it reflects the intended values, the core ethics sections of this document become locked under a multi-party consensus requirement:

**To amend any constitutional section (Sovereignty, Data Ethics, Commerce Ethics, Emergency Detection ethics):**
- Requires consensus from: the AI Council (majority of active council members) + minimum 2 designated human trustees (not just the founder)
- No single person — including the founder — can override this unilaterally
- Coercion is explicitly anticipated and addressed: a decision made under duress (threat, legal pressure, government compulsion) does not constitute valid consent and cannot unlock the ethics layer
- The lock is enforced architecturally, not just by policy — it must require multi-party cryptographic authorization, not just a config change

**Why this matters:**
Governments will want in. Acquirers will want to monetize the data. Employees will face pressure to compromise. The founder's family could be threatened. The ethics architecture must be designed so that no single point of failure — including the founder — can break the covenant. The people who built this do not have the right to sell out the people who trusted it.

**Implementation note:** This lock mechanism is not yet built. It is declared here so that when it is built, the architecture is designed for it from the start — not retrofitted after the fact.

### The Research Covenant
The aggregate insight layer — what we learn about human flourishing across millions of people — belongs to humanity, not to LifeOS as a private asset. This means:
- Research findings are published openly, not locked behind paywalls or competitive moats.
- Partner researchers (therapists, universities, public health bodies) can access anonymized aggregate datasets under clear ethical agreements.
- LifeOS does not profit from the research layer directly — this is a contribution to the commons in exchange for the trust that makes the data honest.

---

## Fulfillment & Commerce — Consent-First

The system observes what people actually need and use. With explicit consent, it can act on that.

### The Model
- **Phase 1 — Affiliate:** When the system notices the user is running low on something, or identifies something that would genuinely serve their health or stated goals, it can offer to reorder or find it. If the user says yes, the system places the order. LifeOS earns an affiliate fee (Amazon model, or direct supplier relationships).
- **Phase 2 — Direct Fulfillment:** Over time, for high-frequency, high-confidence items (supplements, food staples, household essentials), LifeOS may fulfill directly — better margin, better control of quality, same consent model.
- **No subscription traps.** Every recurring order is visible, adjustable, and cancellable with one action. The system never hides ongoing commitments.

### The Consent Architecture
- The user must explicitly turn on fulfillment capability. It is off by default.
- Every proposed order is surfaced to the user before it executes (unless the user has set a specific auto-approve threshold for specific item categories).
- The user sees why the system is suggesting it — what observation triggered it.
- Full order history, cancellation, and preference controls are always accessible.

### What This Is Not
- This is not targeted advertising dressed as a recommendation.
- The system recommends because it observed a genuine need — not because a brand paid for placement.
- No brand ever pays to be recommended. Recommendations come from user need + product quality only.
- If LifeOS ever accepts payment for placement, this model is broken. That line is constitutionally held.

### Revenue Integrity
The fulfillment model works economically only if it is trusted. The moment a user suspects the system is recommending things for commission rather than their benefit, the trust — and the business — collapses. The model is:
- High trust → high usage → sustainable commission revenue → fund the mission
- Eroded trust → abandoned feature → no revenue → mission unfunded

Trust is the product. Commerce is the byproduct of trust.

---

## Emergency Detection

- Apple Watch abnormal HR or HRV spike → alert chain: Sherry, then escalation contact
- Fall detection (via Apple Watch) → immediate alert if no acknowledgment within 60 seconds
- Passout pattern (no phone activity for unusual period combined with health signal) → gentle check-in, then escalation
- Alert chain fully configurable; never cries wolf; learns to distinguish sleep from emergency

---

## Build Priority Order

### Phase 1: The Mirror (Foundation)
- [x] DB migration — commitments, integrity_score_log, joy_checkins, daily_mirror_log, health_checkins, inner_work_log
- [x] Commitment tracker service — log, keep, break, snooze, AI extraction from conversation
- [x] Integrity Score service — compute, save, trend
- [x] Joy Score service — check-in, rolling avg, pattern analysis
- [x] LifeOS core routes — /api/v1/lifeos/* (mirror, commitments, integrity, joy, health, inner-work)
- [x] Mirror UI — /overlay/lifeos-mirror.html (scores, commitments, hard truth, intention, joy check-in)
- [x] Commitment prod scheduler (boot-domains.js — guardedProd, prods via overlay/SMS, 15m interval)
- [x] Connect conversation auto-ingest to commitment extractor (twin-auto-ingest.js — ingestFromMessage on every message)
- [x] Be-Do-Have profile onboarding flow (lifeos-mirror.html — auto-shown on first load)

### Phase 2: The Engine (Automation)
- [x] Communication gateway (Twilio number routing) — communication-gateway.js + lifeos-engine-routes.js
- [x] Call screening + SMS triage — generateCallScreenTwiML, handleInboundSMS with emergency detection
- [x] Outreach automation (email, schedule on behalf) — outreach-engine.js, 5m retry loop in boot-domains.js
- [x] Calendar protection rules — lifeos_calendar_rules table + CRUD routes + UI tab

### Phase 3: Health Intelligence
- [x] Apple Watch integration (HealthKit webhook or iOS Shortcuts) — healthkit-bridge.js + /api/v1/lifeos/health/ingest
- [x] Sleep correlation to mood/cognition/decisions — health-pattern-engine.js, runAnalysis (30-day AI correlation)
- [x] Food + energy logging (friction-minimized) — wearable_data table accepts nutrition metrics
- [x] Pre-disease pattern engine — health-pattern-engine.js getCorrelations, getInsightSummary
- [x] Medical context generator (pre-appointment brief) — medical-context-generator.js → /health/medical-context
- [x] Emergency detection + alert chain — emergency-detection.js, check()/fireAlertChain() with escalation chain

### Phase 4: Family OS
- [x] DB migration — household_links, shared_commitments, relationship_checkins, conversation_debriefs (20260331_lifeos_family.sql)
- [x] household-sync.js — link users, share commitments, relationship pulse
- [x] relationship-debrief.js — AI-powered post-conversation debrief
- [x] tone-intelligence.js — analyzeTone, analyzePairDynamic, extractEmotionalPattern
- [x] lifeos-family-routes.js — /api/v1/lifeos/family/* (11 endpoints)
- [x] lifeos-family.html — Family OS overlay (Relationship, Debriefs, Shared Commitments tabs)
- [ ] Sherry onboarding (separate login)
- [ ] Truth delivery calibration learning loop

### Phase 5: Emotional Intelligence + Parenting
- [x] DB migration — emotional_patterns, parenting_moments, repair_actions, inner_work_effectiveness (20260401_lifeos_emotional.sql)
- [x] emotional-pattern-engine.js — analyzePatterns, getPatterns, earlyWarning
- [x] parenting-coach.js — debrief, logRepair, getMoments, getRepairRate
- [x] inner-work-effectiveness.js — analyze (Pearson correlation), getEffectiveness, getTopPractices
- [x] lifeos-emotional-routes.js — /api/v1/lifeos/emotional/* (9 endpoints)
- [x] lifeos-inner.html — Inner Work overlay (Patterns, Parenting, Practices tabs)
- [ ] Daily emotional check-in UI integration
- [ ] Early warning notifications (wire into prod scheduler)

### Phase 6: Purpose + Dream
- [x] DB migration — purpose_profiles, energy_observations, dreams, fulfillment_orders (20260402_lifeos_purpose.sql)
- [x] purpose-discovery.js — synthesize (AI synthesis from energy/joy/twin data), logEnergyObservation, getProfile, getEnergyObservations
- [x] dream-funding.js — createDream, updateFunding (90% threshold + pay-forward calc), recordPayForward, completeDream, getDreams
- [x] fulfillment-engine.js — proposeFulfillment, approveOrder (explicit consent gate), cancelOrder, markOrdered
- [x] lifeos-purpose-routes.js — /api/v1/lifeos/purpose/* (13 endpoints: profile, synthesize, energy, dreams, fulfillment)
- [x] lifeos-purpose.html — Purpose Profile / Dreams / Fulfillment tabs overlay
- [ ] Monetization map (wire economic_paths to outreach automation)

### Phase 7: Children's App
- [x] DB migration — child_profiles, child_dreams, child_sessions, curiosity_threads (20260403_lifeos_children.sql)
- [x] child-learning-engine.js — exploreTopicWithChild (age-appropriate AI prompt), buildDreamPath, getSessionHistory, getCuriosityThreads
- [x] dream-builder-child.js — createDream, logProgress, completeDream, getDreams, getActiveDreams
- [x] lifeos-children-routes.js — /api/v1/lifeos/children/* (12 endpoints: profiles, explore, sessions, threads, dreams)
- [x] lifeos-child.html — Child-facing Dream Builder UI (brighter, child-friendly, no jargon)
- [x] lifeos-parent-view.html — Parent transparency view (full session log, dream tracker, curiosity map, profile editor)
- [ ] Character building module (integrity/generosity/courage via story)

### Phase 8: Data Layer
- [x] Anonymized flourishing dataset — research_aggregate_log + research-aggregator.js
- [x] Research pipeline — computeIntegrityJoyCorrelation, computeTopJoySources, computeInnerWorkEffectiveness with Laplace differential privacy
- [x] Published insights — GET /api/v1/lifeos/ethics/research/insights
- [x] Data sovereignty — deleteAllUserData cascade + data_deletion_log audit trail
- [x] Consent registry — append-only per-feature consent tracking
- [x] Constitutional lock — multi-party consensus enforcement + coercion detection
- [x] Sovereignty check middleware — structural gate on all LifeOS action types
- [x] Multi-person sync — explicit opt-in sharing between linked household users

### Phase 9: Mediation Engine
- [x] DB migration — mediation_sessions, mediation_turns, mediation_agreements tables with indexes and updated_at trigger (20260405_lifeos_mediation.sql)
- [x] mediation-engine.js — createSession, acceptInvitation, recordConsent, setReady, submitStatement (AI reflection + underlying need), proposeResolution (neutral AI proposals), acceptProposal (bilateral sign-off), closeSession, getSession, getSessions
- [x] lifeos-mediation-routes.js — 10 endpoints mounted at /api/v1/lifeos/mediation; /sessions/:code/* routes use session-code-as-secret (no API key required) to support guest respondents
- [x] lifeos-mediation.html — dark-theme overlay UI; Start/Join screen + full active session view with identity selector, consent banner, ready gate, conversation thread, input area, AI reflection display, agreement acceptance, auto-poll every 8 seconds

### Phase 11: Future Vision + Video Production
- [x] DB migration — vision_sessions, future_videos, timeline_projections tables with indexes and updated_at triggers (20260329_lifeos_vision.sql)
- [x] future-vision.js — createFutureVision({ pool, callAI, logger }); startSession (end_of_life/future_self/compounding_timeline/legacy + AI-enhanced opening messages calibrated per session type); sendMessage (full turn history + user context, readyForCompletion flag after 6+ user turns); completeSession (structured answer extraction → generateNarrative → status='completed'); generateNarrative (3-paragraph second-person future life narrative + "specific choices" ending); generateCompoundingTimeline (two AI calls for current + aligned trajectories, hinge decision extraction, inserts two timeline_projections rows); getSessions/getSession/getTimelines
- [x] video-production.js — createVideoProduction({ pool, callAI, logger }); buildFutureLifePrompt (AI-generated cinematic Replicate prompt from vision narrative + answers); buildCompoundingPrompt (split-screen two-path visualization prompt); buildWeeklyReflectionPrompt (warm personal weekly recap prompt); generateScript (60-90 second narration in second person); queueVideo (INSERT future_videos, optional Replicate submission via wavespeedai/wan-2.1-t2v-480p or klingai/kling-v1-6-standard); checkVideoStatus (Replicate polling, updates video_url on succeeded); getVideos/getPendingVideos
- [x] lifeos-vision-routes.js — 10 endpoints mounted at /api/v1/lifeos/vision; POST/GET /sessions; GET /sessions/:id; POST /sessions/:id/message; POST /sessions/:id/complete; GET/POST /timeline (+ /timeline/generate); POST /videos/queue (auto-builds prompt from vision session / timeline / week summary); GET /videos; GET /videos/:id/status; claude-opus-4-6 used for all vision AI calls
- [x] lifeos-vision.html — dark-theme overlay; 4 tabs: Vision Session (choice cards → conversation interface → complete button at 6+ turns → synthesis loading → auto-switch to narrative); Your Future (3-paragraph narrative hero + eulogy tags + achievements list + legacy block + generate video button); Two Timelines (side-by-side current/aligned columns with year 1/5/20 + hinge decisions + "This Is My Week 1" commitment creation buttons); Videos (all videos with status badges + video player + weekly reflection button + check status polling)

### Phase 13: Decision Intelligence
- [x] DB migration — decisions, second_opinions, bias_detections, energy_patterns tables with indexes (db/migrations/20260329_lifeos_decisions.sql)
- [x] decision-intelligence.js — createDecisionIntelligence({ pool, callAI, logger }); logDecision (assembles context_at_time from integrity_score_log + joy_score_log + wearable_data + hour_of_day, each with individual try/catch); recordOutcome (UPDATE decision + updateEnergyPatterns); getDecisions (category filter, ORDER BY created_at DESC); analyzeDecisionPatterns (last 20 with outcomes → AI pattern synthesis: when best/worst decisions made, specific conditions that differ); getSecondOpinion (AI steelman: 3 strongest arguments against + risks not considered + 3 questions to sit with; JSON-parsed response; INSERT second_opinions + flag second_opinion_used on linked decision); detectBiases (last 15 decisions → AI identifies recurring cognitive biases with examples and frequency; UPSERT bias_detections for patterns with frequency > 1); getBiasReport (ORDER BY frequency DESC); getEnergyProfile (patterns + summary: peak hours / low hours / best-decision hours / total samples / timespan); updateEnergyPatterns (running average decision quality per hour of day, cognitive_state classification: >7=peak, 5-7=good, 3-5=neutral, <3=low); getSecondOpinions; markProceedingAfterSecondOpinion; acknowledgeBias
- [x] lifeos-decisions-routes.js — 11 endpoints at /api/v1/lifeos/decisions: POST /log; GET /; POST /:id/outcome; POST /analyze; POST /second-opinion; GET /second-opinions; POST /second-opinions/:id/proceed; POST /detect-biases; GET /biases; POST /biases/:id/acknowledge; GET /energy
- [x] lifeos-decisions.html — dark-theme overlay; 4 tabs: Log Decision (form with category/decision/alternatives/emotional state chips → last 10 decisions with context badges: integrity/joy/sleep/hour/state → inline outcome recording with rating slider → Analyze My Patterns button); Second Opinion (textarea + optional decision link → steelman result: arguments against / risks / 3 highlighted questions → "I'm still proceeding" checkbox); My Biases (Detect button → bias cards with type badge + frequency count + acknowledge → acknowledged biases collapse); Energy Profile (24-hour bar grid colored by cognitive_state + peak/low summary text + sample count footer)
- [x] Wired in startup/register-runtime-routes.js at /api/v1/lifeos/decisions

### Cross-Cutting: Response Variety Engine
- [x] services/response-variety.js — createResponseVariety({ pool }); tracks per-user style patterns across 4 dimensions (opening, length, tone, question_ending); enforces anti-repetition across last 3 responses per dimension; FORBIDDEN_PHRASES list applies to all AI communication contexts
- [x] db/migrations/20260407_response_variety.sql — response_variety_log table with user_id FK, 4 style columns, fingerprint, preview, context
- [x] services/communication-coach.js — wired: wrapPromptWithVariety + logResponse in startSession, sendMessage, startClaritySession, generatePreConversationPrep; fixed structural guidance removed from COACH_SYSTEM_PROMPT and CLARITY_COACH_SYSTEM_PROMPT
- [x] services/truth-delivery.js — wired: wrapPromptWithVariety + logResponse in generate(); variety wraps the full Mirror prompt before callAI
- [x] services/mediation-engine.js — wired: wrapPromptWithVariety + logResponse in submitStatement (speaker userId) and proposeResolution (initiator userId); "What I heard you say was" removed from reflection prompt

### Cross-Cutting: Communication Profile (Personalized Delivery Intelligence)
- [x] db/migrations/20260407_communication_profile.sql — communication_profiles table (per-user, unique; stores opening/length/tone/question weight maps, contextual thresholds for sleep/HRV/joy/integrity, phrase learning arrays, best_hours/difficult_hours, AI-generated profile_summary); communication_engagements table (per-delivery record with styles used, all contextual signals at time of delivery, engagement_signal, response_length); updated_at trigger on profiles; indexes on user_id and user_id+created_at DESC
- [x] services/communication-profile.js — createCommunicationProfile({ pool, callAI, logger }); getOrCreate (upsert profile row); getRealTimeContext (joy_score_log, integrity_score_log, wearable_data sleep stages summed, wearable_data HRV, coaching_sessions conflict count — each with individual try/catch); assessCurrentState (receptivity: high/moderate/low/very_low derived from thresholds, with human-readable reasons[] and recommended_approach string); getWeightedStyles (weighted random selection per dimension using learned weights — options missing from weight map default to 0.5); pickStylesWithContext (parallel getWeightedStyles + assessCurrentState, applies contextual overrides: very_low forces quietly_present+very_short+sit_with_it+no_question; low redirects challenging tones and direct opening; difficult_hours reduce length and simplify question style); recordEngagement (inserts to communication_engagements, calls updateWeights); updateWeights (positive signals boost used style weights +0.05 capped at 1.0; negative signals reduce −0.05 floored at 0.1; updates best_hours/difficult_hours arrays); generateProfileSummary (skips if summary < 7 days old; requires 5+ engagement records; calls callAI to produce 2-3 sentence personalized summary; persists to profile); getProfileForPrompt (compact string ready to prepend to any AI system prompt: profile summary + receptivity + reasons + recommended approach)
- [x] services/response-variety.js — extended: imports createCommunicationProfile; factory accepts logger param; adds pickStylesForUser (uses profile.pickStylesWithContext, maps id strings back to style objects, falls back to original random anti-repetition); adds recordEngagement passthrough (normalizes style objects to id strings before forwarding); wrapPromptWithVariety accepts callAI param — instantiates profiler, triggers background summary refresh if callAI available, prepends getProfileForPrompt output before the variety instruction block
- [x] services/communication-coach.js — extended: imports createCommunicationProfile; instantiates profiler in factory; all wrapPromptWithVariety calls now pass callAI param (startSession, sendMessage, startClaritySession, generatePreConversationPrep); sendMessage records engagement after each user message (non-blocking Promise chain): contextAtTime from getRealTimeContext, engagementSignal derived from content.length, responseLength in words

### Phase 12: Identity Intelligence
- [x] DB migration — contradiction_log, belief_patterns, identity_reviews, honest_witness_sessions tables with indexes (db/migrations/20260329_lifeos_identity.sql)
- [x] contradiction-engine.js — createContradictionEngine({ pool, callAI, logger }); scan() pulls 30-day commitment/outreach/joy data, calls AI to find up to 3 real value-behavior gaps (score > 4 threshold), inserts into contradiction_log; getContradictions (filterable by acknowledged); acknowledgeContradiction (records user response); runBeliefArchaeology (AI surfaces the operating belief beneath a repeated pattern, upserts belief_patterns with frequency increment); getBeliefs (ordered by frequency); updateBelief (marks as updated, stores replacement); runIdentityStressTest (90-day integrity/joy/commitment trend + AI stress-tests Be/Do/Have, inserts identity_reviews with gaps/strengths/authenticity_score JSON); getLatestStressTest; runHonestWitnessSession (90-day full data read-back, AI writes three paragraphs with zero coaching/softening: what you said / what you did / the gap; inserts honest_witness_sessions); getWitnessSessions
- [x] lifeos-identity-routes.js — 11 endpoints mounted at /api/v1/lifeos/identity; POST /scan, GET /contradictions, POST /contradictions/:id/acknowledge, POST /belief-archaeology, GET /beliefs, POST /beliefs/:id/update, POST/GET /stress-test, POST/GET /honest-witness; all requireKey; resolveUserId helper
- [x] lifeos-identity.html — dark-theme overlay; 4 tabs: Contradictions (Scan Now button, severity-coded cards with stated_value/observed_pattern/question, "I hear this" acknowledge flow with optional response, acknowledged collapse section), Beliefs (trigger pattern + belief statement cards, frequency badge, status badge, "This belief has changed" update flow, active vs updated groups), Stress Test (Run button, authenticity score hero large number, gap cards with area/observation/question, strength area tags), Honest Witness (Summon the Witness button, three-panel witness read in labeled sections with distinct color coding, reflection textarea, previous sessions collapsed expandable list)

### Phase 14: Growth & Mastery + Relationship Intelligence
- [x] DB migration — wisdom_entries, skill_tracks, practice_protocols, relationship_health_log, apology_log, weather_forecasts, family_values tables with indexes (db/migrations/20260329_lifeos_growth.sql)
- [x] services/mastery-tracker.js — createMasteryTracker({ pool, callAI, logger }); createSkill (INSERT skill_tracks); logPracticeSession (append session to JSONB, update total_hours, plateau detection: last 5 sessions all quality <6 AND spaced ≥3 days → plateau_detected+phase='plateau', auto phase advance by hours otherwise); getProgressCoaching (load track + sessions, AI prompt with phase/plateau context returns specific practice guidance); designPracticeProtocol (AI returns 3-capacity deliberate practice JSON, INSERT practice_protocols); extractWisdom (AI extracts title/principle/applicable_situations/tags, INSERT wisdom_entries); searchWisdom (ILIKE direct match + AI semantic match on full library if <2 direct hits, increments times_surfaced); getAllWisdom; getSkills (with session_count + last_session summary); getProtocols
- [x] services/relationship-intelligence.js — createRelationshipIntelligence({ pool, callAI, logger }); computeRelationshipHealth (pulls commitment/debrief/outreach data, AI estimates 4 metrics + health_score + notes, INSERT relationship_health_log); getRelationshipHealth (last 10 records per relationship); craftApology (AI writes 4-part genuine apology, scores components, INSERT apology_log); getForecast (pulls 18mo joy/integrity/wearable weekly aggregates, AI predicts state+confidence+reasons+recommendations per week, INSERT weather_forecasts); getCurrentForecast (next 8 weeks from DB); setFamilyValue (INSERT family_values); reviewFamilyValues (all values + recent integrity/joy/debrief signals → AI assesses state-of-family narrative + per-value health scores, updates DB)
- [x] routes/lifeos-growth-routes.js — 15 endpoints mounted at /api/v1/lifeos/growth; POST/GET /skills, POST /skills/:id/session, GET /skills/:id/coaching, POST /practice-protocol, POST/GET /wisdom, POST /wisdom/search, POST/GET /relationship-health, POST /apology, GET/POST /forecast, GET/POST /forecast/generate, GET/POST /family-values; all requireKey; resolveUserId helper
- [x] public/overlay/lifeos-growth.html — dark-theme overlay; 4 tabs: Skills & Mastery (new skill form, skill cards with phase badge/hours/session log slider UI/coaching expandable/plateau amber banner, practice protocol designer → 3 capacity cards), Wisdom Library (extract from experience form, semantic search, full library with principle+context+tags), Relationships (health check with 4 metric gauges, apology engine with component checkmarks + quality score, family values list with health scores + AI narrative + add form), Weather (8-week forecast cards with state badge/confidence bar/reasons/recommendations)
- [x] Phase 14 extension — Victory Vault / Identity Evidence Engine: `db/migrations/20260330_lifeos_victory_vault.sql` adds `victory_moments` + `victory_reels`; `services/victory-vault.js` logs proof-of-becoming moments and builds evidence-based replay reels with narration + scene plans; `routes/lifeos-growth-routes.js` adds POST/GET `/victories` and POST/GET `/victories/reels`; `public/overlay/lifeos-growth.html` now has a fifth tab for capture, selection, and replay. Growth AI calls now fall back across Anthropic, Gemini, Groq, and Cerebras so the lane is not blocked on a Claude key. Timing truth: estimated 6h, actual 5h, variance -1h because the existing Growth route/UI shell absorbed the new slice cleanly.

### Phase 10: Conflict Intelligence + Communication Coaching
- [x] DB migration — conflict_consent, conflict_recordings, coaching_sessions, communication_patterns tables with indexes and updated_at triggers (20260406_lifeos_conflict.sql)
- [x] conflict-intelligence.js — consent management (grant/revoke/check mutual consent), conflict recording lifecycle (start/addTurn/captureComplete/chooseProcessingMode), escalation detection (phrase-level signal matching)
- [x] communication-coach.js — one-on-one AI coaching sessions with NVC-informed system prompt; startSession (with recording context), sendMessage (full turn history + recording context), completeSession (insights extraction + communication_patterns upsert), getGrowthSummary (AI synthesis of accumulated patterns)
- [x] lifeos-conflict-routes.js — 17 endpoints mounted at /api/v1/lifeos/conflict; consent routes (requireKey), recording code routes (no auth — code is secret), detect escalation (no auth), coaching session CRUD (requireKey + ownership gate)
- [x] lifeos-coach.html — dark-theme overlay UI; 4 tabs: Coach (choice cards → chat interface → insights panel), Recordings (list + start recording + mode selection), My Patterns (grouped by type with color-coded badges), Growth (AI summary hero card + pattern count stats)
- [x] DB migration extension — 20260406b_lifeos_conflict_clarity.sql — adds emotional_state, delivery_style, pre_conversation_prep columns to coaching_sessions; extends session_type CHECK constraint to include 'individual_clarity'
- [x] conflict-intelligence.js — extended detectEscalation: now checks FLOODING_SIGNALS in addition to escalation signals; returns { escalating, flooding, signals } — flooding triggers de-escalate-and-break recommendation, not resolution
- [x] communication-coach.js — added EMOTIONAL_STATES constant, CLARITY_COACH_SYSTEM_PROMPT, IMPARTIALITY_FRAME; added assessEmotionalState() (AI classification → calm/stirred/heated/flooded, persists to session row); added startClaritySession() (emotional assessment → truth delivery style lookup → approach-calibrated opening with impartiality frame; creates individual_clarity session); added generatePreConversationPrep() (reads session turns → AI generates { core_need, opening_line, avoid[], empathy_map, truth_check } → appended as [PREP] turn + stored in pre_conversation_prep column); individual_clarity added to valid session types
- [x] lifeos-conflict-routes.js — added POST /coaching/clarity (starts individual_clarity session), POST /coaching/:id/assess-state (assess/update emotional state, ownership-gated), POST /coaching/:id/prep (generate pre-conversation prep, ownership-gated); 3 new endpoints, 20 total
- [x] lifeos-coach.html — added "I'm in a conflict right now / I need clarity" choice card (first in grid, distinct blue tint); clarity entry flow: emotional state chips (calm/stirred/heated/flooded) + free-text feeling + situation textarea + Start Clarity Session button; impartiality banner in active session (shown only for individual_clarity type, muted style); Get Pre-Conversation Prep button (appears at 4+ exchanges, clarity sessions only); prep card renders with labeled sections (Core Need / How to Open / What to Avoid / How They're Probably Feeling / One Question to Sit With); flooding banner in active session (shown when detect endpoint returns flooding:true on user's message); escalation/flooding check box in Recordings tab with flooding-specific banner text and break suggestion

### Phase 16: Personal Finance & Investment OS (Planned)
- [x] DB migration — `20260408_lifeos_finance_and_prefs.sql` (accounts, categories, transactions, goals, IPS; `flourishing_prefs` JSONB on `lifeos_users`)
- [ ] CSV / manual entry first; aggregation connectors (read-only) behind explicit consent + consent-registry entries
- [x] `services/lifeos-finance.js` + `routes/lifeos-finance-routes.js` mounted at `/api/v1/lifeos/finance` (overlay HTML still optional)
- [x] `public/overlay/lifeos-finance.html` (Mirror-adjacent entry: Summary / Transactions / Budget / Goals / IPS tabs; wired into `lifeos-app.html` sidebar under Self group and into the More sheet; `--c-finance` token added; clamped `listTransactions` LIMIT against non-numeric input)
- [ ] Link money decisions to Decision Intelligence (log major money moves with context; second opinion on large irreversible choices)
- [ ] Household: reuse `household_links` patterns for shared category visibility scopes
- [ ] Any surfacing of `scripts/attention-momentum-backtest.mjs` / `strategy-benchmark-suite.mjs` in product UI: mandatory disclaimers; education-only; no auto-trading

### Phase 18: Core Simulators (Future Self + Commitment + Workshop)
- [x] DB migration — future_self_projections, practice_sessions, workshop_sessions tables with indexes (20260405_future_self_simulator.sql)
- [x] services/future-self-simulator.js — createFutureSimulator({ pool, callAI }); project() (single horizon, AI narrative + milestones + comparisonLevels, persists to DB); projectMultiple() (parallel projections); compareCommitmentLevels() (side-by-side commitment level comparison); logPracticeSession() (quality-weighted velocity tracking); getVelocity() (28-day rolling, trend detection: accelerating/decelerating/steady); getProjectionHistory()
- [x] routes/lifeos-simulator-routes.js — 6 endpoints at /api/v1/lifeos/simulator: POST /project, /project/multiple, /project/compare, /sessions; GET /velocity/:domain, /history/:domain
- [x] services/commitment-simulator.js — createCommitmentSimulator({ pool, callAI }); simulate() (fetches current load, detects collision points, AI feasibility analysis with honest_cost/risks/recommendation/alternatives); createCommitment() (commitment with simulation snapshot in metadata); getLoadSummary() (full inventory, utilization %, top 5 by load); checkBeforeAdding() (quick capacity gate)
- [x] lifeos-core-routes.js — added POST /commitments/simulate, GET /commitments/load (wired to commitment-simulator.js)
- [x] services/workshop-of-mind.js — createWorkshopOfMind({ pool, callAI }); startSession() (6 types, calming entry + first prompt from type-specific openers); sendResponse() (full message history → AI facilitator response with guidance+nextPrompt+complete flag); closeSession() (AI generates insight + anchorPhrase + integration, persists to DB); getSessionHistory(); getAnchorPhrases(); full SYSTEM_PROMPT for facilitator AI persona
- [x] routes/lifeos-workshop-routes.js — 5 endpoints at /api/v1/lifeos/workshop: POST /sessions, /sessions/:id/respond, /sessions/:id/close; GET /sessions, /anchors
- [x] Wired in startup/register-runtime-routes.js at /api/v1/lifeos/simulator and /api/v1/lifeos/workshop

### Phase 17: Flourishing Mechanics Backlog (Prioritized Subsets)
- [x] API hook: `PATCH /api/v1/lifeos/users/:handle/flourishing-prefs` merges JSON keys (ambivalence_until, quiet_until, etc.); full UI/workflows still backlog
- [ ] Implement remaining Product Enhancement Backlog items in priority order after Mirror + Finance v1 prove daily use; each ships with sovereignty check + optional consent

### Cross-Cutting: LifeOS scheduled jobs (no AI)
- [x] `services/lifeos-scheduled-jobs.js` — commitment prods + outreach `processQueue`; **opt-in** via `LIFEOS_ENABLE_SCHEDULED_JOBS=1` (optional `LIFEOS_COMMITMENT_PROD_MS`, `LIFEOS_OUTREACH_PROCESS_MS`)
- [x] `startup/boot-domains.js` — calls scheduler on boot (no-op until env set)

### Cross-Cutting: LifeOS runtime health
- [x] `GET /api/v1/lifeos/status` — table probes + finance migration probe + scheduler env flag

---

## Owned Files
```
docs/projects/AMENDMENT_21_LIFEOS_CORE.md
docs/projects/AMENDMENT_21_LIFEOS_CORE.manifest.json
routes/lifeos-core-routes.js
routes/lifeos-ethics-routes.js
services/integrity-score.js
services/joy-score.js
services/commitment-tracker.js
services/purpose-discovery.js
services/health-intelligence.js
services/emergency-detection.js
services/dream-funding.js
services/truth-delivery.js
services/data-sovereignty.js
services/consent-registry.js
services/constitutional-lock.js
services/research-aggregator.js
services/sovereignty-check.js
services/multi-person-sync.js
db/migrations/20260328_lifeos_core.sql
db/migrations/20260404_lifeos_data_ethics.sql
scripts/lifeos-verify.mjs
public/overlay/lifeos-mirror/
db/migrations/20260331_lifeos_family.sql
db/migrations/20260401_lifeos_emotional.sql
services/household-sync.js
services/relationship-debrief.js
services/tone-intelligence.js
services/emotional-pattern-engine.js
services/parenting-coach.js
services/inner-work-effectiveness.js
routes/lifeos-family-routes.js
routes/lifeos-emotional-routes.js
public/overlay/lifeos-family.html
public/overlay/lifeos-inner.html
db/migrations/20260402_lifeos_purpose.sql
db/migrations/20260403_lifeos_children.sql
services/purpose-discovery.js
services/dream-funding.js
services/fulfillment-engine.js
services/child-learning-engine.js
services/dream-builder-child.js
routes/lifeos-purpose-routes.js
routes/lifeos-children-routes.js
public/overlay/lifeos-purpose.html
public/overlay/lifeos-child.html
public/overlay/lifeos-parent-view.html
db/migrations/20260405_lifeos_mediation.sql
services/mediation-engine.js
routes/lifeos-mediation-routes.js
public/overlay/lifeos-mediation.html
db/migrations/20260406_lifeos_conflict.sql
db/migrations/20260406b_lifeos_conflict_clarity.sql
services/conflict-intelligence.js
services/communication-coach.js
routes/lifeos-conflict-routes.js
public/overlay/lifeos-coach.html
services/response-variety.js
db/migrations/20260407_response_variety.sql
services/communication-profile.js
db/migrations/20260407_communication_profile.sql
db/migrations/20260329_lifeos_vision.sql
services/future-vision.js
services/video-production.js
routes/lifeos-vision-routes.js
public/overlay/lifeos-vision.html
db/migrations/20260329_lifeos_identity.sql
services/contradiction-engine.js
routes/lifeos-identity-routes.js
public/overlay/lifeos-identity.html
db/migrations/20260329_lifeos_decisions.sql
services/decision-intelligence.js
routes/lifeos-decisions-routes.js
public/overlay/lifeos-decisions.html
db/migrations/20260329_lifeos_growth.sql
db/migrations/20260329_lifeos_community.sql
services/mastery-tracker.js
services/relationship-intelligence.js
services/community-growth.js
routes/lifeos-growth-routes.js
public/overlay/lifeos-growth.html
services/health-extensions.js
routes/lifeos-legacy-routes.js
db/migrations/20260329_lifeos_community.sql
db/migrations/20260329_lifeos_healing.sql
services/memory-healing.js
routes/lifeos-healing-routes.js
public/overlay/lifeos-healing.html
db/migrations/20260408_lifeos_finance_and_prefs.sql
services/lifeos-finance.js
services/lifeos-scheduled-jobs.js
routes/lifeos-finance-routes.js
public/overlay/lifeos-finance.html
db/migrations/20260405_future_self_simulator.sql
services/future-self-simulator.js
routes/lifeos-simulator-routes.js
services/commitment-simulator.js
services/workshop-of-mind.js
routes/lifeos-workshop-routes.js
```

## Protected Files
```
docs/SSOT_NORTH_STAR.md   — constitutional source
docs/SSOT_COMPANION.md    — operations source
```

---

## Design Spec

### Digital Twin Integration
The Digital Twin (Amendment 09) is the foundation. Every layer in LifeOS feeds from and writes back to the twin:
- Commitments observed in conversation → twin captures them
- Health signals → twin holds the body context
- Emotional state → twin holds the interior weather
- Decisions made → twin learns the pattern
- Joy observations → twin reflects the flourishing map
- **Money signals** (when user opts in) → spending patterns, stress-spend correlates, progress toward stated goals — always subordinate to user-declared financial values, never a hidden optimization target

The twin is not a data store. It is a living model of a person. Every interaction makes it more accurate.

### Sovereignty Enforcement
Every route and service that touches user direction must pass through a sovereignty check:
- Is this action serving the user's stated direction?
- Or is it pushing them somewhere we decided they should go?

If the answer is the latter, the code does not ship.

### Multi-Person Architecture
Each person is a separate entity. Two people can be linked (household, relationship) without merging their data or sovereignty. Each person's mirror reflects only what they chose to track. Shared space is explicitly opted into, not assumed.

---

## Anti-Drift Assertions
```bash
# Every LifeOS service must have sovereign direction check
grep -r "sovereignty" services/integrity-score.js
grep -r "sovereignty" services/joy-score.js
grep -r "@ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md" routes/lifeos-core-routes.js
```

Required truths:
- No LifeOS feature pushes against stated user direction
- Every score (Integrity, Joy) is observable and explainable, not a black box
- Emergency detection never fires false positives without learning from feedback
- Dream funding mechanism never creates debt or obligation beyond pay-forward

---

## Context Handoff

Current state: the LifeOS lane now has substantial late-phase code on disk, and `node scripts/lifeos-verify.mjs` is the quickest truth source for local readiness. For attention/momentum strategy research (real historical candles, no toy coin-flip P&L), run `npm run backtest:attention` or `node scripts/attention-momentum-backtest.mjs` (Binance primary, Kraken USD fallback, journal under `logs/attention-backtest-trades.jsonl`). Growth now includes Victory Vault for proof-of-becoming capture and replay. Growth AI calls no longer assume Anthropic specifically; any configured provider key among Anthropic, Gemini, Groq, or Cerebras is enough to exercise the lane. Remaining hard blockers for full local runtime exercise are now `DATABASE_URL`, `COMMAND_CENTER_KEY`, and at least one usable AI provider key.

Phase 1 — The Mirror — is still the architectural anchor. It establishes:
1. The daily rhythm the user interacts with
2. The core data model (commitments, scores, identity layer)
3. The Digital Twin integration pattern for LifeOS
4. The truth delivery calibration loop

Do not build Phase 2 until Phase 1 is in daily use by Adam and Sherry. Phases are not arbitrary — each one gives the system enough signal to make the next phase valuable. Without Phase 1 running for weeks, the Health Intelligence layer has no behavioral baseline to correlate against.

Read first for Phase 1 build:
- `docs/projects/AMENDMENT_09_DIGITAL_TWIN.md` — twin architecture
- `services/twin-auto-ingest.js` — how decisions flow into the twin
- `routes/twin-routes.js` — existing twin API surface

---

## Test Criteria
- Integrity Score returns a number with full breakdown of inputs
- Joy Score reflects observed patterns, not just self-report
- Commitment prod fires at the right time, not on a fixed schedule
- Daily Mirror renders even if individual data sources are unavailable (Promise.allSettled pattern)
- Truth delivery respects calibration settings per user
- Emergency detection fires within 60 seconds of trigger condition
- Sovereignty check blocks any route action that pushes against stated user direction

---

## Change Receipts

| Date | What Changed | Why | Amendment | Verified |
|---|---|---|---|---|
| 2026-04-17 | Add LifeOS event stream + escalation ladder: new `20260417_lifeos_event_stream.sql` and `services/lifeos-event-stream.js`; `/api/v1/lifeos/events` list/capture/apply APIs; Notifications escalation policy + test endpoints; escalation ladder delivery (`overlay -> sms -> alarm -> call`) with scheduled processing; Notifications overlay settings for SMS/alarm/call delays and audible alarm beeps for urgent items | Turn LifeOS capture into a single actionable stream and make important nudges progressively harder to miss instead of relying on one passive overlay queue | ✅ | pending |
| 2026-04-17 | Phase 16 Finance overlay shipped + LIMIT-NaN guard: new `public/overlay/lifeos-finance.html` with five tabs (Summary / Transactions / Budget / Goals / IPS) over the existing `/api/v1/lifeos/finance` endpoints, including manual transaction entry, category caps, goal contribution tracker, and an editable Investment Policy Statement with explicit non-advisory disclaimers; wired into `lifeos-app.html` sidebar under the Self group, the More sheet, and `PAGE_META`; new `--c-finance` CSS token; hardened `services/lifeos-finance.js` `listTransactions` and `routes/lifeos-core-routes.js` `/commitments` against non-numeric `limit` query params that previously produced `LIMIT NaN` crashes | Close the last unfinished checkbox in Phase 16 so the Mirror-adjacent finance surface is usable end-to-end without leaving the shell, while eliminating two latent request-driven crashes that could surface any time a client sent a non-integer limit | ✅ | pending |
| 2026-04-17 | LifeOS bug sweep + Brain Dump: (a) new `services/lifeos-user-resolver.js` shared helper + refactored 16 LifeOS route files (`lifeos-core`, `lifeos-engine`, `lifeos-emotional`, `lifeos-growth`, `lifeos-decisions`, `lifeos-simulator`, `lifeos-purpose`, `lifeos-mediation`, `lifeos-ethics`, `lifeos-identity`, `lifeos-conflict`, `lifeos-copilot`, `lifeos-family`, `lifeos-workshop`, `lifeos-finance`, `lifeos-health`, `lifeos-vision`, `lifeos-children`) to use the single case-insensitive + trimmed implementation; (b) made `/users/:handle` GET/PUT/PATCH in `lifeos-core-routes.js` match `LOWER(user_handle)` so direct profile endpoints stop 404'ing on mixed-case URLs; (c) made `db/migrations/xxx_master_log.sql` idempotent via `CREATE TABLE IF NOT EXISTS`; (d) added Brain Dump panel to `public/overlay/lifeos-quick-entry.html` wired to `POST /api/v1/lifeos/events/capture` with review-first vs auto-apply toggle | `POST /users` lowercases handles before insert, but 16 inline `resolveUserId()` copies did exact-match lookups — so any request using `?user=Adam` 404'd against a row stored as `adam`. Centralizing eliminates the drift and the bug in one move. `xxx_master_log.sql` was not idempotent and could break boot if the table was created out-of-band. Brain Dump gives the quick-entry surface a first-class capture path into the new unified event stream. | ✅ | pending |
| 2026-04-17 | Audit fixes: corrected `lifeos-mediation.html` inline script syntax, made shell-loaded Engine/Family/Identity/Decisions/Children pages inherit `lifeos_user`, and fixed `lifeos-health-routes.js` to resolve actual `lifeos_users.user_handle` instead of nonexistent `username`/`handle` columns | Remove concrete runtime failures and silent cross-user drift discovered during the full LifeOS surface audit so the shipped shell pages behave consistently instead of appearing healthy while reading the wrong user or failing at parse time | ✅ | pending |
| 2026-04-17 | Fix LifeOS cross-surface user context and Health route resolution: Health now resolves against `lifeos_users.user_handle`; Engine, Family, Identity, Decisions, and Children overlays now inherit `lifeos_user` instead of defaulting to Adam when opened from the shell | Stop silent cross-user drift and broken health lookups that made the shell appear to “work” while loading the wrong person's state or failing to resolve valid users | ✅ | pending |
| 2026-04-17 | Add LifeOS calendar core: `20260417_lifeos_calendar.sql`, `services/lifeos-calendar.js`, `/api/v1/lifeos/engine/calendar/*` status/events/connect/sync APIs, and Engine overlay support for Google connection + event management | Turn calendar from rule-only scaffolding into a native LifeOS domain with local events first and Google Calendar as the initial sync adapter | ✅ | pending |
| 2026-04-17 | Add LifeOS attention/privacy core: `20260416_lifeos_focus_privacy.sql`, `services/lifeos-focus-privacy.js`, new `/focus/*`, `/privacy/*`, and `/commands/interpret` APIs; wire Today + Quick Entry to focus/privacy controls; fix commitment + joy payload drift in shipped overlays | Turn focus tracking, privacy windows, retroactive dumps, and voice-style commands into first-class LifeOS capabilities instead of undocumented future ideas, while also removing payload drift that would have broken quick-entry commitment and joy logging | ✅ | pending |
| 2026-03-28 | Founding document written | Establish the full LifeOS constitutional vision before building Phase 1 | ✅ | pending |
| 2026-03-28 | Added Data Sovereignty & Ethics + Fulfillment & Commerce sections | Data belongs to users; never sell for marketing; consent-first reorder model with affiliate then direct fulfillment | ✅ | pending |
| 2026-04-05 | Phase 9: Mediation Engine — 4 files (migration, service, routes, UI) | Consent-first AI facilitation for couples, families, and business disputes; AI is strictly neutral, never decides, only reflects and proposes | ✅ | pending |
| 2026-04-06 | Phase 10: Conflict Intelligence + Communication Coaching — 5 files (20260406_lifeos_conflict.sql, conflict-intelligence.js, communication-coach.js, lifeos-conflict-routes.js, lifeos-coach.html) | Three capabilities: live conflict escalation detection, structured recording with lifecycle management, and private one-on-one AI communication coaching with NVC-informed prompting, pattern accumulation over time, and growth synthesis | ✅ | pending |
| 2026-04-06 | Phase 10 extension: Individual conflict clarity, emotional state calibration, impartiality frame, pre-conversation prep, flooding detection — 5 files changed/created (20260406b_lifeos_conflict_clarity.sql new; conflict-intelligence.js, communication-coach.js, lifeos-conflict-routes.js, lifeos-coach.html extended) | Individual clarity session type with emotional state detection (calm/stirred/heated/flooded), approach-calibrated opening messages, impartiality frame, pre-conversation prep output (core need / opening line / avoid / empathy map / truth check), flooding signal detection with de-escalation recommendation | ✅ | pending |
| 2026-04-07 | Response variety engine — anti-pattern system applied to all AI communication in coaching, mediation, and truth delivery — 2 new files (services/response-variety.js, db/migrations/20260407_response_variety.sql) + 3 modified (communication-coach.js, truth-delivery.js, mediation-engine.js) | Prevents formulaic AI responses by tracking per-user style patterns across 4 dimensions and enforcing rotation; FORBIDDEN_PHRASES list applied globally; fixed structural prompt guidance replaced with dynamic variety injection | ✅ | pending |
| 2026-04-07 | Communication profile — personalized delivery intelligence learns what works for each specific person from longitudinal data: sleep, joy, HRV, conflict history, engagement signals — 2 new files (services/communication-profile.js, db/migrations/20260407_communication_profile.sql) + 2 modified (services/response-variety.js, services/communication-coach.js) | Variety engine upgraded from random anti-repetition to weighted personalized selection: styles that produced real engagement with this person are picked proportionally more often; real-time receptivity assessment from health/score signals drives contextual overrides (very_low receptivity forces gentle approach regardless of learned weights); engagement recording after each coaching message closes the learning loop; AI-generated profile summaries prepended to every system prompt | ✅ | pending |
| 2026-03-29 | Closed LifeOS wiring gaps: mounted missing Growth + Vision routes, split gateway callbacks onto the correct `/api/v1/lifeos/gateway/*` surface, fixed `community-growth.js` JavaScript syntax, and expanded `lifeos-verify.mjs` to cover the later LifeOS phases | Align runtime composition, route paths, and verification with what Amendment 21 already claims is present so the LifeOS lane stops overstating readiness | ✅ | pending |
| 2026-03-29 | Phase 14 extension: Victory Vault / Identity Evidence Engine — `20260330_lifeos_victory_vault.sql`, `services/victory-vault.js`, Growth routes, Growth overlay tab; estimated 6h / actual 5h / variance -1h | LifeOS needed evidence-based identity reinforcement, not generic encouragement: capture real audio/video/text proof, then build replay reels from what the person has already survived or achieved | ✅ | pending |
| 2026-03-29 | LifeOS Growth AI routing now falls back across Anthropic, Gemini, Groq, and Cerebras; `lifeos-verify.mjs` now accepts any configured AI provider key instead of hard-requiring Claude | Keep late-phase LifeOS work unblocked when only free-tier model keys are available and stop overstating Anthropic as a universal prerequisite | ✅ | pending |
| 2026-03-29 | Phase 11: Future Vision + Video Production — 5 new files (20260329_lifeos_vision.sql, future-vision.js, video-production.js, lifeos-vision-routes.js, lifeos-vision.html) | Humans make bad long-term decisions because they can't viscerally imagine their future self. This system makes the abstract concrete: guided vision sessions (end_of_life/future_self), AI-synthesized 3-paragraph second-person narratives, two-path compounding timeline projections with hinge decisions, and personalized Replicate video production. Uses claude-opus-4-6 for all vision AI calls — the most emotionally significant conversation in the system. | ✅ | pending |
| 2026-03-29 | Phase 15: Legacy, Community & Meta (Ideas 16–25) — routes/lifeos-legacy-routes.js wires health-extensions.js (food-as-medicine, pre-disease warning, monetization mapping, legacy projects, death meditation) + community-growth.js (flourishing network, group coaching, accountability partnerships, quarterly life review, sovereign AI mentor) + db/migrations/20260329_lifeos_community.sql | Two failed background agents left health-extensions.js and community-growth.js without a route file; built lifeos-legacy-routes.js to mount all 10 services at /api/v1/lifeos/legacy | ✅ | pending |
| 2026-03-29 | Phase 16: Memory & Healing — 4 new files (20260329_lifeos_healing.sql, memory-healing.js, lifeos-healing-routes.js, lifeos-healing.html) + wired into register-runtime-routes.js | Therapeutic AI assistance for grief, regression therapy, childhood home reconstruction, completion conversations (saying what was never said to someone who passed), inner child healing, memorial creation, and AI-generated healing videos; every session starts with professional framing and consent gate; full delete-on-demand for user data sovereignty | ✅ | pending |
| 2026-03-28 | Added Constitutional Lock section | Multi-party consensus (AI Council + 2 human trustees) required to amend core ethics; coercion clause; architectural enforcement declared | ✅ | pending |
| 2026-03-28 | Phase 1 built: DB migration, commitment-tracker.js, integrity-score.js, joy-score.js, lifeos-core-routes.js, lifeos-mirror.html, mounted in register-runtime-routes.js | The Mirror is live: commitments tracked, scored, hard truth delivered daily | ✅ | pending |
| 2026-04-01 | `scripts/attention-momentum-backtest.mjs` + `npm run backtest:attention` | Honest multi-bot backtest on real OHLCV (volume+momentum proxy, ATR-scaled 65%/75% exits, fees/slippage, per-bot learning journal); Binance + Kraken fallback for restricted regions | ✅ | pending |
| 2026-04-01 | Attention backtest: explicit `formula` params + `--walk-forward` | Test ideas without lookahead: grid-search vol/ATR on train bars only, frozen params on OOS test; `logs/attention-walk-forward.jsonl`; `--formula-json` + many CLI tunables; `--no-online-learn` for clean in-sample runs | ✅ | pending |
| 2026-04-01 | Attention backtest: `--bots N` deduped OHLC fetch; `--learn-scale`, `--bot-vol-step`; early-vs-late learning report; `npm run backtest:attention:100` | Many micro-accounts without N network fetches; honest note when botVolStep=0 duplicates paths; aggregate learning summary | ✅ | pending |
| 2026-04-01 | Attention backtest: `--optimize-in-sample` (+ optional `--optimize-zero-fee` diagnostic); DEFAULT_FORMULA from best net-of-fees search on Kraken snapshot | In-sample random search; documents that +300% not achievable on short slice without leverage/lookahead; `logs/attention-formula-in-sample-best.json` | ✅ | pending |
| 2026-04-01 | Attention backtest: `simLeverage` + `--optimize-leverage-scan-only` (min L for target mult); `npm run backtest:attention:4x-demo` | Same path as mile: amplify round-trip P&amp;L vs equity; labeled not spot; scan finds L≈26 for ~4× on current Kraken slice + tuned formula | ✅ | pending |
| 2026-04-01 | `scripts/strategy-benchmark-suite.mjs` + `npm run benchmark:strategies` | Compares multiple causal rules + attention on same OHLCV; ranks by return vs avg drawdown proxy; importable attention module guarded with `isMainModule` | ✅ | pending |
| 2026-04-01 | Strategy benchmark: Pareto frontier, `--max-avg-dd`, `--wf-folds`, `npm run benchmark:strategies:wf` | Multi-objective view (return vs DD + time slices); printed “paths to higher returns” | ✅ | pending |
| 2026-04-01 | Layer 12 — Personal Finance & Investment OS; Scope + Out of Scope; Product Enhancement Backlog (25 mechanics + finance extensions); Twin + Phase 16/17 plan | User asked to add budgeting/finance/investment and capture all suggested flourishing features in SSOT; finance is mirror-first and non-advisory by default | ✅ | pending |
| 2026-04-01 | `startup/register-runtime-routes.js` — mount all LifeOS routers (`/api/v1/lifeos`, `/engine`, `/health`, `/family`, `/ethics`, growth/decision/vision/etc.) | LifeOS code existed on disk but was not attached to Express; server now exposes the API surface for overlays and clients | ✅ | pending |
| 2026-04-01 | `scripts/lifeos-verify.mjs` — require `lifeos-healing-routes.js`, `lifeos-legacy-routes.js` | Align verify list with shipped route set | ✅ | pending |
| 2026-04-01 | Finance v1 + flourishing prefs + scheduler + status: `20260408_lifeos_finance_and_prefs.sql`, `lifeos-finance.js`, `lifeos-finance-routes.js`, `lifeos-scheduled-jobs.js`, `boot-domains` hook, `GET /api/v1/lifeos/status`, `PATCH .../flourishing-prefs`, core logger/SMS wiring | Layer 16/17 foundations; `LIFEOS_ENABLE_SCHEDULED_JOBS=1` for commitment prods + outreach processing; verify script lists real LifeOS services | ✅ | pending |
| 2026-04-04 | Layer 5 extension — Self-Sabotage Monitor, Emergency Repair Button, Live CoPilot: services/self-sabotage-monitor.js (5 pattern types: commitment_dropout, proximity_retreat, joy_crash_before_win, cycle_recurrence, sudden_chaos_creation); services/emergency-repair.js (crisis routing, triage classification, repair tools); services/live-copilot.js (6 session types: negotiation, hard_conversation, decision, presentation, interview, other); routes/lifeos-copilot-routes.js; sabotage routes added to lifeos-emotional-routes.js; db/migrations/20260404_lifeos_copilot_sabotage.sql (4 tables: self_sabotage_log, emergency_repairs, copilot_sessions, copilot_messages); wired into startup/register-runtime-routes.js at /api/v1/lifeos/copilot | Layer 5 features specified in amendment were defined but not built; built now per Amendment 21 spec | ✅ | pending |
| 2026-04-04 | Phase 8 Data Ethics built: 20260404_lifeos_data_ethics.sql, data-sovereignty.js, consent-registry.js, constitutional-lock.js, research-aggregator.js, lifeos-ethics-routes.js, sovereignty-check.js, multi-person-sync.js, scripts/lifeos-verify.mjs | Constitutional data ethics infrastructure: deletion cascade, consent registry (append-only), constitutional lock with coercion detection, privacy-safe research aggregation with Laplace noise, sovereignty check middleware | ✅ | pending |
| 2026-04-15 | LifeOS core stabilization: `scripts/verify-project.mjs` now accepts `project` manifests, Amendment 21 manifest includes `project_id`, the main LifeOS route surface (`core`, `gateway`, `engine`, `health`, `family`, `purpose`, `children`, `vision`, `decisions`, `identity`, `growth`, `mediation`, `healing`, `legacy`) mounts as required, `GET /api/v1/lifeos/health/latest` is restored as a compatibility alias, and the shipped overlays normalize `commandKey` / `lifeos_user` bootstrap | Restore trust in the SSOT verification path and eliminate the first-pass runtime mismatches that blocked the core LifeOS daily loop from loading consistently | ✅ | pending |
| 2026-04-16 | LifeOS testing surface expansion: mount `lifeos-emotional` and `lifeos-ethics` as required routes, add `lifeos-ethics.html`, track `lifeos-inner.html`, and keep shell-linked pages from pointing at missing/unmounted surfaces | Make the shell-linked LifeOS pages testable instead of relying on missing pages or optional mounts for core user flows | ✅ | pending |
| 2026-04-16 | Promote `lifeos-conflict` and `lifeos-finance` into the required runtime; add `POST /api/v1/lifeos/users`; add children compatibility endpoints for `parent-summary`, `learning`, `checkins`, and query-based `dreams`; track notifications / onboarding / quick-entry / parent-view overlays | Make the next LifeOS tranche testable from the shell without broken links, missing routes, or onboarding dead ends | ✅ | pending |
| 2026-04-16 | Expose onboarding, quick entry, notifications, and parent view directly from the LifeOS shell settings panel and register metadata so they load cleanly inside the shell iframe | Shorten the path from “prototype exists” to “admin can actually open and test the remaining LifeOS surfaces” | ✅ | pending |
| 2026-04-16 | Add explicit `/lifeos`, `/overlay/:file`, and `/lifeos-:slug.html` public routes for LifeOS overlays; change the shell iframe loader to use absolute `/overlay/...` URLs instead of relative paths | Make the LifeOS shell and direct page URLs testable in production instead of depending on brittle static middleware ordering or relative-path resolution from `/lifeos` | ✅ | pending |
| 2026-04-16 | Move `UTILITY_FRAMING` and `PROFESSIONAL_FRAMING` above `SESSION_CONFIGS` in `services/memory-healing.js` | Unblock Railway startup so the deployed app can boot instead of crashing on `ReferenceError: Cannot access 'UTILITY_FRAMING' before initialization` | ✅ | pending |
| 2026-04-16 | Add `public/overlay/lifeos.webmanifest`, generate `icon-192.png` and `icon-512.png`, extend explicit public routes to serve overlay assets and icons, and update the shell + service worker to use LifeOS-specific installable app assets | Make LifeOS installable as its own app instead of inheriting the generic overlay manifest and relying on static middleware for app assets | ✅ | pending |
| 2026-04-16 | Add `lifeos-theme.js` and shared light-theme overrides, wire a persistent theme toggle into the shell, and load the theme helpers across all tracked `lifeos-*.html` overlays | Provide both dark and light LifeOS modes without splitting the product into separate shells or relying on device-level color settings | ✅ | pending |
| 2026-03-28 | Rewrote lifeos-emotional-routes.js and lifeos-ethics-routes.js to match spec | New route set: emotional routes add GET/POST /parenting, GET/POST /inner-work; ethics routes add POST /erase (confirm_hash guard), GET /lock-status, POST /sovereignty/check, GET/POST /research/* — all mapped to correct service method signatures | ✅ | pending |
| 2026-04-04 | All 8 phases complete — all routes mounted, outreach boot loop wired | Phases 2-3 (Engine, Health), 4-5 (Family, Emotional), 6-7 (Purpose, Children), 8 (Data Ethics) all built and mounted in register-runtime-routes.js; outreach 5m retry loop added to boot-domains.js; lifeos-verify.mjs confirms 10/10 migrations, 15/15 services, 8/8 routes | ✅ | pending |
| 2026-03-29 | Phase 12: Identity Intelligence — 4 new files (20260329_lifeos_identity.sql, contradiction-engine.js, lifeos-identity-routes.js, lifeos-identity.html) + wired into register-runtime-routes.js | Four-capability identity layer: Contradiction Engine (scans 30 days of behavior to surface value-pattern gaps, surfaces as questions not accusations), Belief Archaeology (AI surfaces the limiting belief beneath any repeated pattern failure, tracks frequency and evolution over time), Identity Stress Test (90-day data stress-test of stated Be/Do/Have identity, returns gaps/strengths/authenticity score), Honest Witness (quarterly brutal-honest read-back of what you said vs what you did vs the gap — no coaching, no softening, no agenda) | ✅ | pending |
| 2026-03-29 | Phase 13: Decision Intelligence — 4 new files (20260329_lifeos_decisions.sql, decision-intelligence.js, lifeos-decisions-routes.js, lifeos-decisions.html) + wired into startup/register-runtime-routes.js | Ideas 5-8: Decision Archaeology logs every major decision with full biometric context (integrity score, joy score, sleep, HRV, hour of day, emotional state) enabling retrospective pattern analysis; Second Opinion Engine steelmans the opposing position before any significant decision; Cognitive Bias Detection identifies recurring patterns across decision history with specific examples; Energy Calendar maps per-hour cognitive state from actual decision quality data so users know which version of themselves is making each decision | ✅ | pending |
