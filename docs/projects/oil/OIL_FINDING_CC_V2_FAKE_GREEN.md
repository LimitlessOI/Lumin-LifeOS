<!-- SYNOPSIS: OIL Finding — Command Center V2 Fake Green / Fallback Data -->

# OIL Finding — Command Center V2 Fake Green / Fallback Data

**Finding ID:** OIL-SEC-FIND-20260524-002  
**Severity:** P1  
**Status:** OPEN → route to Builder  
**Detected by:** C2 Phase 0 audit (Adam-directed)

## Issues OIL missed

1. **Phase wheel center hardcoded "ALPHA READY"** — `buildPhaseWheel()` in `lifeos-command-center.html` always renders center text "ALPHA" / "READY" regardless of `certData.alpha_ready` or ledger state. Misleading when NOT_ALPHA_READY.
2. **DEFAULT_LANES fallback** — When `/api/v1/projects` fails, UI injects hardcoded lanes with invented `pct`, `phase: 'Phase 14: ALPHA_READY'`, etc. Violates receipt-only truth.
3. **SSOT Docs infra node** — Always `status: 'ok'` with subtitle "static — page loaded". Not derived from any endpoint; invented health.
4. **Phase panel tries dead endpoint first** — `GET /api/v1/builder/cert/phase14` returns 404 on Railway; wastes a round trip before fallback.

## Required repair (Builder)

- Phase wheel center must reflect actual cert status (ALPHA_READY / NOT_ALPHA_READY / UNKNOWN).
- Remove DEFAULT_LANES; show NOT_WIRED or empty when projects API unavailable.
- Infra nodes: LIVE / ERROR / UNKNOWN / NOT_WIRED from real responses only.
- Phase 1–3 cockpit upgrades per Adam spec (read-only queue, proof drawers, infra truth).

## Canonical endpoints

- Phase 14: `GET /api/v1/lifeos/command-center/phase14`
- Security: `GET /api/v1/lifeos/command-center/security`
- Queue: `GET /api/v1/pending-adam`
