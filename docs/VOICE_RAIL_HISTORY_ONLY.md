<!-- SYNOPSIS: Voice Rail — History Only (Failed Program) -->

# Voice Rail — Scrapped (Salvage Only)

Status: **SCRAPPED / SALVAGE ONLY** — not active product queue work.

Adam 2026-06-22: Voice Rail as a **standalone program is scrapped**. Reusable pieces may move into Lumin Chair / LifeOS where needed. Do not revive as a separate founder front door.

**Salvage manifest:** `builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/SALVAGE_MANIFEST.json`

**Queue:** moved to `BP_PRIORITY.json` → `scrapped_items` (not in active `items[]`).

Voice Rail overlay URLs redirect to **`/lifeos?direct_system=1`**.

**What remains (salvage — intentional):**
- **`/api/v1/lifeos/voice-rail/stt` + `/tts`** — server STT/TTS utilities
- **`public/overlay/lifeos-voice.js`** — browser mic + **"Lumin" wake word** → **Lumin Chair** only (`founder-interface/message` → `lumin-chair-orchestrator.js`)
- **`public/shared/lifeos-voice-chat.js`** — dictation semantics
- **`services/voice-rail-stt.js`**, **`services/voice-rail-tts.js`** — reuse candidates

**What is gone:**
- Voice Rail as BP_PRIORITY active rank
- Standalone Voice Rail overlay UI as product surface
- Capability-proof npm scripts, command→builder side doors outside Lumin Chair + Founder Packet V2 gates

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
