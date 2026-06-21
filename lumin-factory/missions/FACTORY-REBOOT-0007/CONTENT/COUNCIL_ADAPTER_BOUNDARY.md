<!-- SYNOPSIS: Council Adapter Boundary -->

# Council Adapter Boundary

Council service code exists under `factory-core/canon/services/council-service.js` as a **byte-identical parts-car import**.

## Rules

- **Do not** import `council-service.js` directly from routes or builder code.
- **Use** `council-adapter.js` for status and quarantine checks only.
- Live council calls require a future mission with explicit founder approval and adapter contract.

## Environment

Setting `COUNCIL_LIVE=1` must throw in quarantine mode — this prevents accidental live wiring.
