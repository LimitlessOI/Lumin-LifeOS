# FACTORY-DELIBERATION-SENTRY-REGRESSION-0001

**SENTRY regression harness** for deliberation v2.7 — first BuilderOS spin test.

| Artifact | Purpose |
|----------|---------|
| `FOUNDER_PACKET.json` | BPB machine intake |
| `FOUNDER_PACKET.md` | Human-readable spec |
| `REGRESSION_PROBE_CATALOG.json` | Locked probe IDs + expectations |
| `PRODUCT_DEVELOPMENT_RESULT.json` | PD gate PASS |
| `OBSERVE.md` | Real-time watch commands |

**Status:** FP ready — **BLUEPRINT.json not yet created** (BPB phase 1).

**Sequence:** FP → BPB → SENTRY audit BP → CDR implement → `npm run lifeos:deliberation:regression`

**Parent mission:** [FACTORY-DELIBERATION-V27-0001](../FACTORY-DELIBERATION-V27-0001/README.md)

## Quick validate FP

```bash
node -e "
import { runBpbIntakeGate } from '../../factory-staging/factory-core/bpb/intake-gate.js';
const r = runBpbIntakeGate('FACTORY-DELIBERATION-SENTRY-REGRESSION-0001');
console.log(r.status, r.violations);
"
```

See `OBSERVE.md` for full operator watch list.

## Exact commands (BLUEPRINT)

- `npm run lifeos:deliberation:regression`
- `npm run lifeos:deliberation:regression -- --layer=local`
- `npm run lifeos:deliberation:regression -- --layer=live`
- `node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs --verify-railway`
- `node builderos-reboot/scripts/run-mission-acceptance.mjs FACTORY-DELIBERATION-SENTRY-REGRESSION-0001`
