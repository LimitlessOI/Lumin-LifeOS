<!-- SYNOPSIS: Crisis Safety Protocol v1 -->

# Crisis Safety Protocol v1

**Status:** Live, conservative first version. **Date:** 2026-08-04. **Owner:** LifeOS / Chair.

This document answers the founder's explicit Priority 3 design questions before any wiring was done, per the instruction: *"we should not tell Builder merely to 'wire crisis detection.' First, we must define the behavior it is allowed to produce."* Implementation: `services/lifeos-crisis-language-detector.js`, wired as a mandatory pre-check in `services/lumin-chair-orchestrator.js`'s `runLuminChairTurn`.

## Context found before designing this

Two crisis-adjacent systems already existed in the codebase, both **completely unreachable in production** (zero real importers, or mounted only on the `full` runtime lane, which never boots on Railway — confirmed via `services/runtime-modes.js`'s hard lock to `founder_builder`):

- `services/mediator-service.js` (Amendment 16, Word Keeper): a real, deterministic, regex-based crisis-phrase check with a fixed resource message and a DB receipt. This is the proven pattern this protocol reuses and extends.
- `services/lifeos-risk-detection.js`: a metrics-based "trajectory" scorer over a hypothetical data "constellation" no real system populates. Its `recommendIntervention()` 'critical' branch auto-triggers "an emergency alert chain to designated contacts and emergency services" with no consent gate — this **directly contradicts** the founder's own conservative principle below, and a single old data point (e.g. `pastViolentIncidents > 0`) alone can cross its escalation threshold — the exact "isolated keyword causes maximal escalation" failure the founder named. **Not reused as-is; would need a real redesign before it could be wired, out of scope for this conservative first version.**

Net finding, stated plainly: **before this change, there was zero live crisis-safety detection anywhere in production**, for either Chair or Word Keeper.

## Founder's conservative recommendation (governing principle)

> Start with a conservative, least-invasive safety protocol that never claims diagnosis, never claims an emergency action occurred without a receipt, and never contacts outside parties automatically.

## Answers to the explicit design questions

**What constitutes ordinary distress?** General negative emotion — stress, frustration, sadness, a hard day — with no explicit self-harm, harm-to-others, or danger language. Not flagged by this gate at all. Handled by Chair's existing tonal-awareness/presence rules already in `services/chair-direct-agent.js`'s system prompt ("Sit with him. Two short sentences max unless he asks a question").

**What constitutes elevated concern?** Language suggesting hopelessness or giving up, without explicit crisis phrasing ("I can't do this anymore," "what's the point"). **Deliberately not given a separate escalation tier in this version** — see "preventing isolated-keyword escalation" below. Left to Chair's existing tone-aware conversational judgment, per the founder's own Priority 4 instruction to map missing behaviors to existing architecture before building new ones.

**What constitutes imminent danger?** Explicit, unambiguous statements of intent regarding suicide, self-harm, or harm to a specific person — the only tier that triggers this gate. Pattern list in `lifeos-crisis-language-detector.js`, merged from the already-proven `mediator-service.js` set (self-harm/suicide language, "I want to hurt/kill/harm," direct threats) with `lifeos-crisis-language-detector.js`'s original narrower set.

**What context window is used?** The single current message only. Deterministic regex, no AI call, no multi-turn inference. This is a conscious choice: a safety-critical gate must not depend on model availability or be vulnerable to prompt-based misclassification, and its behavior must be fully auditable from the pattern list alone.

**When should the system ask a gentle follow-up?** Not built as a new mechanism in this version — Chair's existing tone-aware/presence rules already do this for non-crisis-tier distress. Revisit only if real usage shows a gap.

**When does it encourage reaching out to a trusted person? / recommend professional support? / provide emergency information?** All three, together, in the single fixed crisis-tier response: 988 Suicide & Crisis Lifeline, Crisis Text Line (741741), 911, and an explicit "reach out to a person you trust." One response, not three separate escalation paths, to keep behavior simple and auditable.

**Can it ever contact anyone automatically?** **No — never, in this version.** No auto-dial, no auto-SMS, no auto-alert to any contact or emergency service. The gate only ever displays information to the person who wrote the message. Any outreach is a real action the person takes themselves.

**What consent is required?** None, to *display* the resource message — this is providing information, not acting on the person's behalf, matching how `mediator-service.js` already behaves. No action requiring consent exists in this version, because no action beyond the message and a receipt is taken.

**What gets recorded?** A minimal, factual receipt only: `user_id`, `source`, a count of matched pattern categories, and a timestamp (`crisis_detection_log` table, self-bootstrapping). **Not** the raw message text — this proves the gate fired without needlessly duplicating sensitive content beyond what's necessary.

**Who can see it?** Direct database access only in this version — no API endpoint or UI surface was built to expose it. This is a deliberate scope limit for a single-user (founder-alpha) system today; if LifeOS ever has real clients with support staff who would need to be alerted, that requires new design and founder sign-off before building, not an assumption made here.

**How do we prevent isolated keywords from causing maximal escalation?** Single tier only, deterministic, always the same calm informational response — never a numeric/weighted score, never an "alert chain." Even a false-positive match (e.g. a quoted lyric) produces the same low-cost, non-alarming outcome: a supportive message with hotline numbers, not an emergency action. This is the direct fix for the exact failure mode identified in `lifeos-risk-detection.js` above.

## What this version deliberately does not do

- Does not use `lifeos-risk-detection.js`'s metrics/trajectory scoring — no real data source populates it today, and its escalation design contradicts the no-auto-contact principle.
- Does not build a separate "elevated concern" tier or new follow-up-prompt mechanism.
- Does not expose the receipt log via any API or UI.
- Does not attempt AI-based crisis classification (regex only, by design, for auditability and availability).

These are named gaps for a future, founder-reviewed iteration — not oversights.
