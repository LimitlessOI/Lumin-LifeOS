<!-- SYNOPSIS: SO-004 capture — V1 Voice Presence governed-build debugging session + Voice Rail retirement lessons + captured voice UX ideas -->

# 2026-08-07 — V1 Voice Presence build session, Voice Rail retirement lessons, captured voice UX ideas

**Context:** Live session getting `services/interaction-decision-service.js` (V1 Voice Presence, mission `PRODUCT-COMMUNICATION-V1-VOICE-PRESENCE-0001`) through the real governed factory pipeline for the first time as a genuinely new (greenfield) file. Five real, previously-undiscovered pipeline bugs were found and fixed live (see `docs/products/builderos/PRODUCT_HOME.md` Change Receipts, 2026-08-07 rows, for the technical detail). Mid-debugging a real codegen bug (generated `computeTurnCompletionConfidence` throws `Cannot read properties of undefined (reading 'trim')` on every attempt), Adam asked a grounding question.

## Adam's question: did scrapping Voice Rail cause this bug?

Adam: *"I wonder if it's because I scrapped the original voice mail and had it start over... Called Voice rail. I actually think I like the design of it better, but I was not getting good advice, good results."*

**Investigated directly, not assumed:**
- Voice Rail (`PRODUCT-VOICE-RAIL-V1-0001`, founder packet locked 2026-06-11) was a full standalone voice communication surface. Adam scrapped it as a standalone program on 2026-06-22 (`docs/VOICE_RAIL_HISTORY_ONLY.md`) — **not** because the underlying pieces were bad, but because it competed as a second "founder front door" instead of routing through Lumin Chair.
- Read Voice Rail's actual retired code (`services/voice-rail-tts.js`, `services/voice-rail-command-executor.js`, `services/voice-rail-intent-router.js`) directly: **no** turn-completion or interruption/barge-in logic exists anywhere in it. Nothing relevant was lost or orphaned there — tonight's crash is a fresh bug in code generated minutes earlier, unrelated to the archive decision.
- Real, validating find: Voice Rail's own founder packet, written two months before tonight's mission, already locked the exact constraint tonight's mission exists to satisfy: *"Never interrupt an unfinished thought — pause/resume without auto-send mid-thought."* Adam identified this need in June; it was never built because the standalone-surface program was cut first, not because the idea was wrong.
- The retirement doc's own salvage list explicitly kept `public/shared/lifeos-voice-chat.js` and the STT/TTS services as reuse candidates — exactly the file tonight's mission's next step (CV1P-S02) already targets for the fade-out logic. The salvageable design DNA is already correctly wired into the current build; it's just arriving through Lumin Chair now instead of a separate surface, consistent with Adam's own 2026-06-22 call.

**Conclusion given to Adam, plainly:** design instinct validated (Voice Rail correctly named this problem in June), nothing of substance was lost in the archive, and the current bug is an ordinary fresh implementation mistake, not a ghost of the old system.

## Captured voice UX ideas (Adam, "lessons of value" from Voice Rail — not yet scheduled)

Adam, prompted by looking back at Voice Rail: *"a couple things I had and I like is..."*

1. **TTS playback speed control, as a sliding bar.** Speed up or slow down the spoken reply during playback, not just a fixed rate.
2. **A dedicated dictation-only mode**, distinct from interactive conversation: drop a raw thought via voice-to-text with **no** system "communication"/response processing — just capture and transcribe. In return, have the system **read the thought back** so Adam can confirm it captured correctly. Pure voice-to-text-to-voice-back, no conversational overhead.
3. **Live transcript + explicit manual Send control.** Words appear on screen in real time as spoken; Adam hits "Send" at the end of a statement rather than the system auto-sending. Complementary to, not in conflict with, tonight's V1 auto-detected turn-completion/interruption-decay work — auto-detection backs off gracefully when interrupted; explicit Send is a separate, manual finalize action for when Adam wants full control over turn-taking.
4. **Ability to tag/address specific council members, offices, or officers directly** in a given voice input (e.g. address Chair, Architect, the Efficiency Officer, etc. by name in the same way `responsibilities` already routes reasoning-plan work in `factory-staging/factory-core/builder/reasoning-plan.mjs`).
5. **Lens selection — deliberately NOT manual.** Adam considered being able to pick which "lens" (cognitive asset, e.g. steve-jobs, toyota-lean, red-team — `data/lenses/LENS_REGISTRY.json`) Chair reasons through, then explicitly said he'd rather **not** do that manually, prefers it automatic. This already matches the real, existing design: `deriveLenses()` in `reasoning-plan.mjs` auto-selects lenses from mission classification and responsibilities today, with no manual picker — confirms the current auto-selection approach is the right call, not a gap.

**Not yet filed as an active mission** — captured here per SO-004 and cross-filed to IdeaVault (see product home) so it isn't lost. Natural next-look point: once V1 Voice Presence ships, revisit against V2 (Evidence Fusion) and V3 (Perception) scope, since #3 and #4 touch the same conversational-turn substrate V1 is building now.
