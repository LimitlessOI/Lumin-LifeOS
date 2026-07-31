<!-- SYNOPSIS: Phase 1 Trigger Spec — Chair Reasoning in Live Conversation -->

# Phase 1 Trigger Spec — Chair Reasoning in Live Conversation

## Trigger condition

`runChairNativeTurn` invokes `composeReasoning()` only when **all** of the following hold:

1. `cleanedInput` is a non-empty string.
2. `systemFacts.personal_turn` is `false` (do not reason over personal-life turns).
3. `chairContext.domain` is not `listening_onboarding`.
4. `resolveGroundedDirectAnswer(cleanedInput, systemFacts)` returns `null` (no deterministic system-knowledge or program-direct short-circuit).
5. The trimmed input is at least 30 characters long.
6. The input matches at least one decision marker: `should|want to|need to|decide|choose|pick|plan|build|create|make|deploy|ship|fix|change|update|implement|next step|what do you think|recommend|ratify|sign off|approve|go with|let's|mission|product|blueprint|factory|sentry|receipt|lens|chair|council|governance|priority|strategy|roadmap`.

## Classification

The trigger is a deterministic regex guard in `services/chair-lumin-unified.js#shouldRunCognitiveReasoning`. It uses no model call, satisfying SO-003 (no cheap-tier model on classification).

## Outcome

When the trigger fires:
- `composeReasoning()` is called with responsibility `chair` and a mission derived from the user turn.
- Each lens/synthesis model call is scored in `model_capability_ledger` and `model-roi-ledger`.
- The user's input is recorded in `founder_decision_log` with `source: 'live_conversation'`.
- The full Chair transcript, including `named_disagreements`, is appended to `data/chair-reasoning-log.jsonl`.
- The Chair reasoning object is attached to `systemFacts.chair_reasoning` and passed to `translatePersonality`.

## Non-examples (trigger does NOT fire)

- "hi" — too short.
- "what is the status of LifeRE?" — may be answered by grounded direct answer.
- "I feel overwhelmed today" — `personal_turn` true.
