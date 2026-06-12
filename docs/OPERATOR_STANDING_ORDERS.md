# Operator Standing Orders (Adam)

**Last updated:** 2026-05-24

## Push by default

After every change from a conversation that Adam asked for (or clearly approved):

1. Commit (scoped to that slice only)
2. Push to `main`
3. Trigger Railway deploy (`POST /api/v1/railway/managed-env/build-from-latest`)
4. Report commit SHA + deploy SHA (or named blocker)

**Override:** Adam says `don't push`, `hold`, or `local only` for that slice.

## Founder comms fail-closed

Voice Rail (and founder comms surfaces): if LifeOS context is not connected to minimum bar, **return an error — never a model reply that fakes integration**.

- Probe without chatting: `GET /api/v1/lifeos/voice-rail/context-probe`
- Disable fail-closed locally only: `VOICE_RAIL_FAIL_CLOSED=0`

Also recorded in `CLAUDE.md` → **OPERATOR STANDING ORDERS**.
