<!-- SYNOPSIS: Voice Rail — History Only (Failed Program) -->

# Voice Rail — History Only (Failed Program)

Status: **RETIRED / HIST_ONLY** (product surface)

Voice Rail as a **standalone founder program** is retired. Legacy overlay URLs redirect to **`/lifeos?direct_system=1`**.

**What remains (intentionally):**
- **`/api/v1/lifeos/voice-rail/stt` + `/tts`** — server STT/TTS utilities
- **`public/overlay/lifeos-voice.js`** — browser mic + **"Lumin" wake word** → **Lumin Chair** only (`founder-interface/message` → `lumin-chair-orchestrator.js`)

**What is gone:**
- Voice Rail overlay UI, capability-proof npm scripts, command→builder side doors outside Lumin Chair

## Enforcement

- Runtime route is intentionally not mounted in `startup/register-runtime-routes.js`.
- Deprecated npm scripts are hard-blocked by `scripts/hist-voice-rail-retired.mjs`.
- Guardrail verifier: `scripts/verify-voice-rail-history-only.mjs`.
- Preflight includes this verifier and fails closed if Voice Rail is reactivated.

## Active system path

Use terminal-native BuilderOS commands:

- `npm run builderos:intake:direct -- --text-file "<path>" --stage development`
- `npm run builderos:system-path -- <MISSION_ID> --force`

Law: if a real command did not run and produce real receipts, it did not happen.
