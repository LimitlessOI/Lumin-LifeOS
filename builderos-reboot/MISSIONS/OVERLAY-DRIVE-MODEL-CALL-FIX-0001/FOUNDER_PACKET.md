<!-- SYNOPSIS: Founder Packet — fix the model-call bug found on the first real live-driven browser test. -->

# Founder Packet — Overlay Drive Model Call Fix

**Mission ID:** `OVERLAY-DRIVE-MODEL-CALL-FIX-0001`
**Locked:** 2026-08-09 (found live on the very first successful auto-pickup test — real navigate succeeded, then `give_up:all_tiers_failed`)

## Priority

The CORS root cause is fixed and auto-pickup now genuinely drives Adam's real browser (confirmed: a real `navigate` action executed with `ok:true`). The very next step failed because `makeCallModel` in `routes/extension-drive-routes.js` calls `callCouncilMember('anthropic', {model,system,messages,max_tokens})` -- an Anthropic-SDK-shaped object as the second argument. The real, already-proven-working signature (`routes/general-browser-agent-routes.js`) is `callCouncilMember(member, promptString, {taskType})`, and `'anthropic'` is not a valid member id -- real ones are `groq_llama`, `gemini_flash`, `cerebras_llama`, `openai_gpt`, `claude_sonnet`.

## Desired outcome

`makeCallModel` calls `callCouncilMember` with the correct signature and real tier ids, matching the already-proven pattern exactly.

## FOUNDER SUCCESS TEST

A real driven goal produces a real decided action (navigate/click/type) past the first observe step, not an immediate `give_up`.

## Acceptance command

```bash
npm run overlay:drive-model-call-fix:acceptance
```
