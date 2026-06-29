<!-- SYNOPSIS: LifeOS Conversation Evidence + Programs Map SSOT -->

# LifeOS Conversation Evidence + Programs Map SSOT

**Purpose:** Canonical product SSOT for local-first conversation capture, evidence-backed coaching, program detection, therapist export, and cross-program "listen in" capability inside LifeOS.

**Last updated:** 2026-06-04

## Status

- This is a product SSOT for the LifeOS conversation evidence subsystem.
- This is not BuilderOS governance law.
- This defines what LifeOS should capture, what it must never pretend to know, and which existing product lanes consume the subsystem.

## Core product claim

LifeOS should not be framed as "always recording."

It should be framed as:

- local-first attention listening
- consent-driven evidence capture
- evidence-backed coaching
- relationship and behavior reflection
- program detection over time

The value is not the recording itself.
The value is:

- meaningful moment capture
- pattern memory
- evidence before interpretation
- coaching grounded in actual interactions

## Evidence Before Interpretation doctrine

Raw evidence must remain separate from interpretation.

LifeOS may store:

- audio snippet
- transcript
- timing
- speaker metadata
- setting metadata
- user-confirmed notes

LifeOS may layer on:

- summaries
- coaching observations
- pattern detection
- possible trigger/program hypotheses
- therapist export packets

But those are interpretations, not truth.

Hard rules:

- evidence first
- interpretation second
- interpretations remain challengeable
- raw evidence remains reviewable where user settings allow
- no emotional or motive claim may outrank the underlying evidence

## Product identity

This subsystem is not only "conversation recording."

It is:

- Life Evidence
- Behavior Reflection
- Relationship Intelligence
- Growth Memory
- Programs Map input

## Shared subsystem name

Canonical subsystem name:

`Interaction Evidence Engine`

This subsystem may be consumed by multiple programs:

- LifeOS core
- Family OS
- Mediation
- Growth / coaching
- TC / sales / listing / appointment workflows
- future therapist-facing exports

## Local-first operating model

### Mode 0 — Off

- no listening
- no buffering
- no metadata capture

### Mode 1 — Resting

- local wake detection only
- local voice activity detection only
- no cloud streaming
- no permanent save

### Mode 2 — Attention

- short local rolling buffer
- speech detected
- still not permanently saved
- waiting for explicit trigger or allowed auto-capture condition

### Mode 3 — Capture

- transcript and/or evidence snippet saved
- reason for capture saved
- consent context saved
- downstream coaching or review allowed only by policy level

### Mode 4 — Coaching / Patterning

- evidence available for summary
- coaching observations allowed
- pattern matching allowed
- Programs Map hypotheses allowed

### Mode 5 — Intervention

- real-time or near-real-time assistance prompt allowed
- user can accept, ignore, or disable

## Capture levels

Each user or linked context chooses a capture level.

### Level 0

- no recording

### Level 1

- metadata only
- duration
- participants
- location or context

### Level 2

- transcript
- no coaching

### Level 3

- transcript + notes

### Level 4

- transcript + coaching

### Level 5

- transcript + coaching + pattern detection

### Level 6

- transcript + coaching + pattern detection + intervention prompts

## Trigger model

The system should not default to saving every conversation.

Primary triggers:

- explicit wake phrase
- explicit save phrase
- explicit "coach this later" phrase
- explicit user button / tap / control
- pre-declared session type such as sales call, listing appointment, therapy-prep session, or mediation

Secondary triggers, only when enabled:

- likely conflict moment
- recurring pattern match
- strong emotional shift
- meaningful decision moment

Secondary triggers may prompt.
They must not silently overrule consent policy.

## Session-type policy

The same engine may behave differently by session type.

### Sales / listing / business calls

Default value:

- high evidence value
- transcript, tone, pacing, objection handling, follow-up extraction

Candidate captures:

- transcript
- objections
- talk/listen ratio
- interruption count
- buying signals
- next steps
- outcome

### Relationship conflict / repair

Default value:

- delicate
- evidence and reflection matter
- interpretation must stay humble

Candidate captures:

- transcript
- tone markers
- repeated loop detection
- validation vs explanation balance
- escalation / repair moments

### Therapist / counselor preparation

Default value:

- user-controlled export
- evidence packet
- not diagnosis

Candidate captures:

- representative moments
- recurring patterns
- validated Programs Map hypotheses
- user-approved notes

### Daily ambient living

Default value:

- mostly off or metadata-only
- selective capture only

## Consent and control rules

This subsystem is consent-driven.

Hard rules:

- no hidden cloud streaming
- no permanent save without trigger or policy allowance
- no stealth mode
- user controls retention
- user can delete evidence
- user can disable capture by context
- linked-person contexts need explicit rules

For pair or household interactions:

- each person should have configurable participation rules
- intervention prompts should be optional
- later coaching may be split by person if configured

## Privacy / coercion posture

The system should be designed to minimize stored risk.

Product posture:

- local-first where possible
- minimal cloud dependence where possible
- explicit retention windows
- explicit export and delete controls
- explicit legal / therapist / household visibility settings

The system should never promise absolute immunity from external legal force.
It should instead:

- minimize unnecessary storage
- store only what the user asked for
- make retention and export choices explicit
- avoid capturing low-value material

## Intervention doctrine

The system may ask:

- "I may be detecting a conflict pattern. Am I reading that right?"
- "Would you like help de-escalating?"
- "Would you like me to save this for later coaching?"

The system should not say:

- "You are angry."
- "You are acting like a child."
- "You are definitely doing pattern X."

Interventions should be:

- optional
- humble
- evidence-linked
- non-shaming

## Programs Map integration

Programs Map remains a hypothesis system, not a diagnosis system.

Conversation evidence is one of its strongest inputs.

Programs Map records may include:

- program name
- common triggers
- body signals
- emotional signals
- recurring phrases
- typical thoughts
- typical actions
- protective purpose
- cost of the program
- healthier response options
- repair actions
- evidence examples
- confidence level
- user validation status

Programs begin as hypotheses.
They strengthen only through:

- repeated evidence
- user validation
- therapist validation where applicable
- successful coaching outcomes

No program label may become a weapon.

## Relationship pattern mapping

LifeOS should be able to map recurring loops such as:

- one person expresses hurt
- the other hears accusation
- explanation replaces validation
- escalation follows

The system should present the loop as:

- shared pattern
- evidence-backed sequence
- repair opportunity

Never as:

- villain story
- blame frame

## Therapist integration

With explicit user consent, LifeOS may produce therapist-facing exports containing:

- recurring programs
- evidence clips
- validated examples
- conflict loops
- repair attempts
- coaching summaries
- progress over time

This should help therapy become:

- more evidence-backed
- less memory-distorted

It must not pretend to replace therapy.

## What the system should measure

### For sales / business coaching

- talk/listen ratio
- interruption count
- objection handling quality
- next-step clarity
- pacing
- emotional temperature

### For relationship coaching

- expression of hurt
- validation attempts
- explanation / defense balance
- escalation rate
- repair attempts
- repeated trigger loops

### For self-reflection

- tone shifts
- recurring triggers
- repeated phrases
- shutdown or defensiveness markers
- distance between feeling and action

## What the system must not overclaim

It must not claim:

- motive certainty
- diagnostic certainty
- emotional certainty beyond evidence
- coaching truth without transcript or evidence support

It may say:

- "I may be detecting..."
- "This appears similar to..."
- "Would you like help reviewing this?"

## Existing repo alignment

This subsystem should align to and eventually unify with:

- `routes/lifeos-family-routes.js`
- `routes/lifeos-mediation-routes.js`
- `routes/lifeos-growth-routes.js`
- `routes/lifeos-ambient-routes.js`
- `services/tc-interaction-service.js`

Current reality:

- lawful interaction capture already exists for TC workflows
- family debrief and tone analysis already exist
- mediation already exists
- ambient context already exists
- Programs Map SSOT already exists

Missing canonical product layer this file adds:

- one shared Interaction Evidence Engine
- local-first resting/attention/capture model
- evidence-before-interpretation doctrine for conversations
- capture levels
- session-type policy
- therapist export posture
- program-detection connection to real interaction evidence

## Other programs that should inherit this option

The "listen in" option should not be LifeOS-only in a narrow sense.
It should be exposed as a governed capability reusable by:

- sales coaching
- TC coordination
- mediation
- relationship debrief
- live co-pilot sessions
- future education / parenting / therapy-support contexts

But each program must define:

- allowed trigger types
- consent requirements
- retention defaults
- whether intervention is allowed
- whether coaching is allowed
- whether only metadata is allowed

## Recommended MVP

Build order:

1. explicit manual capture
2. wake phrase + local rolling buffer
3. transcript + evidence packet
4. sales / TC session capture
5. family conflict evidence packet
6. Programs Map evidence linking
7. intervention prompts
8. therapist export packets

Do not start with deep emotional inference.
Start with:

- explicit capture
- evidence retention
- transcript
- later coaching

## Anti-drift rules

- do not call this "always recording"
- do not promise privacy guarantees the system cannot prove
- do not let interpretation outrank evidence
- do not let program labels become certainty
- do not silently widen this to all conversations
- do not let one program's consent policy leak into another

## Related docs

- `docs/LIFEOS_PROGRAM_MAP_SSOT.md`
- `docs/constitution/NORTH_STAR_SSOT.md`
- `docs/SSOT_COMPANION.md`
- `services/tc-interaction-service.js`
- `routes/lifeos-family-routes.js`
- `routes/lifeos-mediation-routes.js`
- `routes/lifeos-growth-routes.js`
- `routes/lifeos-ambient-routes.js`
