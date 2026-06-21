<!-- SYNOPSIS: Voice Rail — History Only (Failed Program) -->

# Voice Rail — History Only (Failed Program)

Status: **RETIRED / HIST_ONLY**

Voice Rail is retained for historical analysis and lessons learned. It is **not** an active BuilderOS execution interface.

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
